/*
  # Add signup trigger for immediate team assignment
  
  1. Problem
    - When users sign up with an invite code to join an existing team, there's a race condition
    - User record is created with team_id = null before complete_user_signup() can run
    - This causes the onboarding screen to show instead of immediate team access
    
  2. Root Cause
    - No trigger on auth.users to handle the initial signup
    - The RPC function complete_user_signup() runs after user creation
    - Something (possibly RLS or another process) creates a basic user record first
    
  3. Solution
    - Add a trigger on auth.users INSERT that immediately assigns team from invite code
    - This runs synchronously during signup, before any other code
    - Ensures user is created with correct team_id from the start
    
  4. Changes
    - Create handle_new_user() function that checks invite code and assigns team
    - Add AFTER INSERT trigger on auth.users
    - Only handles existing team joins (not new team creation, which needs a team name)
*/

-- Create function to handle new user signups
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

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Fix the current stuck user (clay2@allective.com)
UPDATE public.users 
SET 
  team_id = (
    SELECT team_id 
    FROM invite_codes 
    WHERE code = '7RY8H3V1' 
    LIMIT 1
  ),
  role = 'member',
  view_financial = false,
  updated_at = now()
WHERE email = 'clay2@allective.com' AND team_id IS NULL;

-- Increment the invite code usage
UPDATE invite_codes
SET current_uses = current_uses + 1
WHERE code = '7RY8H3V1' AND current_uses < max_uses;

COMMENT ON FUNCTION handle_new_user IS 'Automatically creates public.users record and assigns team when user signs up with invite code';
