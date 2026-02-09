/*
  # Fix Invited User Onboarding Flags
  
  1. Problem
    - When users join an existing team via invite, they see the Welcome Modal/Interactive Tour
    - Clicking "Start Interactive Tour" calls supabase.auth.updateUser() which may cause session issues
    - Users get logged out during the tour
    
  2. Root Cause
    - The handle_new_user() trigger doesn't set onboarding_dismissed or onboarding_completed in auth metadata
    - These users should skip onboarding since they're joining an existing team
    
  3. Solution
    - Update handle_new_user() to set onboarding_dismissed = true for invited users joining existing teams
    - This prevents the Welcome Modal from showing
    
  4. Changes
    - Modify handle_new_user() function to update auth.users metadata
    - Set onboarding_dismissed = true for users joining via invite
*/

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
      
      -- Update auth metadata to mark onboarding as dismissed
      -- Users joining an existing team should skip the welcome modal
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{onboarding_dismissed}',
        'true'::jsonb
      )
      WHERE id = NEW.id;
      
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

COMMENT ON FUNCTION handle_new_user IS 'Automatically creates public.users record, assigns team when user signs up with invite code, and sets onboarding flags for invited users';
