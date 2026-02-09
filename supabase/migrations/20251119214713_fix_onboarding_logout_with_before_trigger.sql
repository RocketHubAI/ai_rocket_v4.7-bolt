/*
  # Fix Onboarding Logout with BEFORE Trigger

  1. Problem
    - Users get logged out immediately after reaching home screen
    - Previous migration tried to UPDATE auth.users during AFTER INSERT trigger
    - This causes session invalidation and automatic logout

  2. Root Cause
    - Cannot reliably UPDATE auth.users in AFTER INSERT trigger on same table
    - Session becomes invalid when metadata is updated during insertion

  3. Solution
    - Create BEFORE INSERT trigger to set metadata before row creation
    - Remove problematic UPDATE from AFTER INSERT trigger
    - This prevents session invalidation issues

  4. Changes
    - Add set_onboarding_metadata() BEFORE INSERT trigger
    - Update handle_new_user() to remove UPDATE auth.users statement
    - Metadata is now set cleanly before user creation
*/

-- Create function to set onboarding metadata BEFORE user creation
CREATE OR REPLACE FUNCTION set_onboarding_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_invite_code text;
  invite_team_id uuid;
BEGIN
  -- Extract invite code from user metadata
  user_invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  -- Only process if invite code exists
  IF user_invite_code IS NOT NULL THEN
    -- Get invite code details
    SELECT team_id
    INTO invite_team_id
    FROM invite_codes
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now())
      AND (invited_email IS NULL OR invited_email = NEW.email)
    LIMIT 1;
    
    -- If invite has a team_id, this is joining an existing team
    -- Set onboarding_dismissed so they don't see the welcome modal
    IF invite_team_id IS NOT NULL THEN
      NEW.raw_user_meta_data := jsonb_set(
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        '{onboarding_dismissed}',
        'true'::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new BEFORE INSERT trigger
DROP TRIGGER IF EXISTS before_auth_user_created ON auth.users;
CREATE TRIGGER before_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION set_onboarding_metadata();

-- Update handle_new_user() to REMOVE the problematic UPDATE statement
CREATE OR REPLACE FUNCTION handle_new_user()
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
BEGIN
  -- Extract invite code from user metadata
  user_invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  -- Only process if invite code exists
  IF user_invite_code IS NOT NULL THEN
    -- Get invite code details
    SELECT team_id, assigned_role, view_financial
    INTO invite_team_id, invite_role, invite_view_financial
    FROM invite_codes
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now())
      AND (invited_email IS NULL OR invited_email = NEW.email)
    LIMIT 1;
    
    -- If invite has a team_id, this is joining an existing team
    IF invite_team_id IS NOT NULL THEN
      -- Create public.users record with team assignment
      INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        invite_team_id,
        COALESCE(invite_role, 'member'),
        COALESCE(invite_view_financial, false),
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (id) DO UPDATE SET
        team_id = EXCLUDED.team_id,
        role = EXCLUDED.role,
        view_financial = EXCLUDED.view_financial,
        updated_at = now();
      
      -- Initialize feedback status
      INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
      VALUES (NEW.id, now(), now() + interval '24 hours')
      ON CONFLICT (user_id) DO NOTHING;
      
      -- REMOVED: UPDATE auth.users statement that was causing logout issues
      -- The onboarding_dismissed flag is now set by the BEFORE INSERT trigger
      
      -- Increment invite code usage
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE code = UPPER(user_invite_code)
        AND is_active = true
        AND current_uses < max_uses
        AND (expires_at IS NULL OR expires_at > now());
    ELSE
      -- Invite code exists but has no team_id (new team creation)
      -- Create basic user record, onboarding will complete the setup
      INSERT INTO public.users (id, email, name, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- Initialize feedback status
      INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
      VALUES (NEW.id, now(), now() + interval '24 hours')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  ELSE
    -- No invite code, create basic user record
    INSERT INTO public.users (id, email, name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Initialize feedback status
    INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
    VALUES (NEW.id, now(), now() + interval '24 hours')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_onboarding_metadata IS 'Sets onboarding_dismissed metadata for invited users BEFORE user creation to avoid session issues';
COMMENT ON FUNCTION handle_new_user IS 'Automatically creates public.users record and assigns team when user signs up with invite code';
