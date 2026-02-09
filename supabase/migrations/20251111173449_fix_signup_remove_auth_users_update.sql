/*
  # Fix signup by removing auth.users UPDATE from trigger

  1. Issue
    - Trigger tries to UPDATE auth.users immediately after INSERT
    - This may cause locking or permission issues
    - Supabase auth.users table may not allow updates from triggers
    
  2. Solution
    - Remove the UPDATE auth.users statement from trigger
    - Only create team and public.users record
    - Let metadata from signup stay as-is in auth.users
    - RLS and app logic should use public.users table for team info
    
  3. Flow
    - User signs up with metadata including new_team_name
    - Trigger creates team
    - Trigger creates public.users with team_id and admin role
    - App reads from public.users for team information
*/

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_invite_code text;
  invite_team_id uuid;
  invite_role text;
  invite_view_financial boolean;
  new_team_name text;
  created_team_id uuid;
  error_message text;
BEGIN
  BEGIN
    -- Extract invite code and new team name from user metadata
    user_invite_code := NEW.raw_user_meta_data->>'invite_code';
    new_team_name := NEW.raw_user_meta_data->>'new_team_name';
    
    RAISE NOTICE 'Processing signup for user % with invite code % and new_team_name %', NEW.id, user_invite_code, new_team_name;

    -- If invite code exists, process it
    IF user_invite_code IS NOT NULL THEN
      -- Get invite code details (before incrementing)
      SELECT team_id, assigned_role, view_financial
      INTO invite_team_id, invite_role, invite_view_financial
      FROM invite_codes
      WHERE code = UPPER(user_invite_code)
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;

      RAISE NOTICE 'Invite code details - team_id: %, role: %, view_financial: %', invite_team_id, invite_role, invite_view_financial;

      -- SCENARIO 1: Creating a new team (invite has no team_id AND user provided team name)
      IF invite_team_id IS NULL AND new_team_name IS NOT NULL AND TRIM(new_team_name) != '' THEN
        -- Create the team
        INSERT INTO teams (name, created_at, updated_at)
        VALUES (TRIM(new_team_name), now(), now())
        RETURNING id INTO created_team_id;
        
        RAISE NOTICE 'Created new team "%" with id %', new_team_name, created_team_id;
        
        -- Create public.users record with admin role
        INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          created_team_id,
          'admin',
          true,
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (id) DO UPDATE SET
          team_id = EXCLUDED.team_id,
          role = EXCLUDED.role,
          view_financial = EXCLUDED.view_financial,
          updated_at = now();
        
        RAISE NOTICE 'Created public.users record for user % as admin of new team', NEW.id;
        
        -- Increment invite code usage
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now());
        
        RAISE NOTICE 'Incremented invite code usage for %', user_invite_code;
        
      -- SCENARIO 2: Joining existing team (invite has team_id)
      ELSIF invite_team_id IS NOT NULL THEN
        RAISE NOTICE 'User joining existing team %', invite_team_id;
        
        -- Create or update public.users with correct team info
        INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          invite_team_id,
          COALESCE(invite_role, 'member'),
          COALESCE(invite_view_financial, true),
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (id) DO UPDATE SET
          team_id = EXCLUDED.team_id,
          role = EXCLUDED.role,
          view_financial = EXCLUDED.view_financial,
          updated_at = now();
        
        RAISE NOTICE 'Created/updated public.users record for user % joining existing team', NEW.id;
        
        -- Increment invite code usage
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now());
        
        RAISE NOTICE 'Incremented invite code usage for %', user_invite_code;
        
      -- SCENARIO 3: Invalid invite (no team_id and no team_name provided)
      ELSE
        RAISE EXCEPTION 'Invalid signup: invite code has no team and no new team name provided';
      END IF;
    ELSE
      -- No invite code, create public.users without team
      INSERT INTO public.users (id, email, name, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Created public.users record without invite code for user %', NEW.id;
    END IF;

    RETURN NEW;
    
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE WARNING 'Error in handle_new_user_signup for user %: %', NEW.id, error_message;
    -- Re-raise the error so it's visible to the application
    RAISE EXCEPTION 'Database error saving new user: %', error_message;
  END;
END;
$$;

COMMENT ON FUNCTION handle_new_user_signup IS 'Handles new user signup: validates invite code, creates team if needed, creates public.users record with appropriate role and team assignment, and increments invite usage. Does not modify auth.users metadata.';
