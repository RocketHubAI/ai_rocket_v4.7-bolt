/*
  # Fix signup flow by removing trigger and using RPC function

  1. Problem
    - Triggers on auth.users are opaque - we can't see error details
    - RLS and trigger timing issues are hard to debug
    - Supabase just returns "Database error saving new user"
    
  2. Solution
    - Remove the signup trigger from auth.users
    - Create an RPC function complete_user_signup() that client calls after signup
    - Function handles team creation, user record creation, invite code processing
    - Returns detailed errors that client can display
    
  3. Flow
    - User signs up → auth.users created successfully
    - Client immediately calls complete_user_signup(invite_code, new_team_name)
    - Function validates invite, creates team if needed, creates public.users record
    - Function returns success or detailed error
    
  4. Benefits
    - Much better error visibility
    - Client has control over the flow
    - No fighting with trigger execution context
    - Can retry if needed without recreating auth user
*/

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_user_signup_increment_invite_code ON auth.users;

-- Create RPC function that client calls after signup
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
  
  -- Check if user already exists in public.users (already completed signup)
  IF EXISTS (SELECT 1 FROM public.users WHERE id = current_user_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already setup',
      'already_exists', true
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
      
      -- Create public.users record as admin
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
      -- Create public.users record with team assignment
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
    -- No invite code - create user without team
    INSERT INTO public.users (id, email, name, created_at, updated_at)
    VALUES (
      current_user_id,
      current_user_email,
      current_user_email,
      now(),
      now()
    );
    
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

COMMENT ON FUNCTION complete_user_signup IS 'Called by client after signup to complete user setup. Handles invite codes, team creation, and user record creation. Returns detailed success/error information.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_user_signup TO authenticated;
