/*
  # Fix new team signup flow for partial users
  
  1. Problem
    - User may be created in public.users without team_id (partial setup)
    - RPC function currently returns early if user exists
    - Need to handle completing setup for partial users
    
  2. Solution
    - Check if existing user has no team_id
    - If so, complete their setup by creating team and updating user
    - Ensure idempotency for retry scenarios
    
  3. Changes
    - Update complete_user_signup() to handle partial users
    - Allow updating existing users who have no team
*/

CREATE OR REPLACE FUNCTION complete_user_signup(
  p_invite_code text DEFAULT NULL,
  p_new_team_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  invite_team_id uuid;
  invite_role text;
  invite_view_financial boolean;
  created_team_id uuid;
  existing_user_record record;
  result jsonb;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Check if user already exists in public.users
  SELECT * INTO existing_user_record 
  FROM public.users 
  WHERE id = current_user_id;
  
  -- If user exists and has a team, they're already setup
  IF FOUND AND existing_user_record.team_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already setup',
      'already_exists', true,
      'team_id', existing_user_record.team_id
    );
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;
  
  -- Process invite code if provided
  IF p_invite_code IS NOT NULL THEN
    -- Validate and get invite details
    SELECT team_id, assigned_role, view_financial
    INTO invite_team_id, invite_role, invite_view_financial
    FROM invite_codes
    WHERE code = UPPER(p_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now())
      AND (invited_email IS NULL OR invited_email = current_user_email)
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid, expired, or unauthorized invite code'
      );
    END IF;
    
    -- SCENARIO 1: Creating new team
    IF invite_team_id IS NULL THEN
      IF p_new_team_name IS NULL OR TRIM(p_new_team_name) = '' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Team name required for new team signup'
        );
      END IF;
      
      -- Create team
      INSERT INTO teams (name, created_at, updated_at)
      VALUES (TRIM(p_new_team_name), now(), now())
      RETURNING id INTO created_team_id;
      
      -- Update or create public.users record as admin
      IF FOUND THEN
        -- User exists but has no team - update them
        UPDATE public.users 
        SET 
          team_id = created_team_id,
          role = 'admin',
          view_financial = true,
          updated_at = now()
        WHERE id = current_user_id;
      ELSE
        -- User doesn't exist - create them
        INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
        VALUES (
          current_user_id,
          current_user_email,
          current_user_email,
          created_team_id,
          'admin',
          true,
          now(),
          now()
        );
      END IF;
      
      -- Initialize feedback status
      INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
      VALUES (current_user_id, now(), now() + interval '24 hours')
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Increment invite code usage
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE code = UPPER(p_invite_code);
      
      RETURN jsonb_build_object(
        'success', true,
        'team_id', created_team_id,
        'team_name', p_new_team_name,
        'role', 'admin',
        'message', 'New team created successfully'
      );
      
    -- SCENARIO 2: Joining existing team
    ELSE
      -- Update or create public.users record with team assignment
      IF FOUND THEN
        -- User exists but has no team - update them
        UPDATE public.users 
        SET 
          team_id = invite_team_id,
          role = COALESCE(invite_role, 'member'),
          view_financial = COALESCE(invite_view_financial, true),
          updated_at = now()
        WHERE id = current_user_id;
      ELSE
        -- User doesn't exist - create them
        INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
        VALUES (
          current_user_id,
          current_user_email,
          current_user_email,
          invite_team_id,
          COALESCE(invite_role, 'member'),
          COALESCE(invite_view_financial, true),
          now(),
          now()
        );
      END IF;
      
      -- Initialize feedback status
      INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
      VALUES (current_user_id, now(), now() + interval '24 hours')
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Increment invite code usage
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE code = UPPER(p_invite_code);
      
      -- Get team name for response
      SELECT name INTO result
      FROM teams
      WHERE id = invite_team_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'team_id', invite_team_id,
        'team_name', result,
        'role', COALESCE(invite_role, 'member'),
        'message', 'Successfully joined team'
      );
    END IF;
    
  ELSE
    -- No invite code - create or update user without team
    IF FOUND THEN
      -- User exists - just ensure they have basic info
      UPDATE public.users 
      SET updated_at = now()
      WHERE id = current_user_id;
    ELSE
      INSERT INTO public.users (id, email, name, created_at, updated_at)
      VALUES (
        current_user_id,
        current_user_email,
        current_user_email,
        now(),
        now()
      );
    END IF;
    
    -- Initialize feedback status
    INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
    VALUES (current_user_id, now(), now() + interval '24 hours')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User created without team'
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
