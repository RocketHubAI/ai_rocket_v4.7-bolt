/*
  # Fix double-counting of invite code usage for new team signups
  
  1. Problem
    - When a user signs up with a "new team" invite code (team_id IS NULL):
      - The signup trigger increments current_uses (+1)
      - The complete_user_signup RPC also increments current_uses (+1)
      - Result: Each new team signup uses 2 code uses instead of 1
    
  2. Solution
    - Remove the increment statements from complete_user_signup RPC
    - The trigger already handles incrementing for ALL invite codes
    - For existing team invites, complete_user_signup is never called anyway
    
  3. Impact
    - Fixes: New team invite codes now correctly count 1 use per signup
    - No change: Existing team member invites continue working (they don't use this RPC)
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
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  SELECT * INTO existing_user_record 
  FROM public.users 
  WHERE id = current_user_id;
  
  IF FOUND AND existing_user_record.team_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already setup',
      'already_exists', true,
      'team_id', existing_user_record.team_id
    );
  END IF;
  
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;
  
  IF p_invite_code IS NOT NULL THEN
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
    
    -- SCENARIO 1: Creating new team (team_id IS NULL on invite)
    IF invite_team_id IS NULL THEN
      IF p_new_team_name IS NULL OR TRIM(p_new_team_name) = '' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Team name required for new team signup'
        );
      END IF;
      
      INSERT INTO teams (name, created_by, created_at, updated_at)
      VALUES (TRIM(p_new_team_name), current_user_id, now(), now())
      RETURNING id INTO created_team_id;
      
      IF FOUND THEN
        UPDATE public.users 
        SET 
          team_id = created_team_id,
          role = 'admin',
          view_financial = true,
          updated_at = now()
        WHERE id = current_user_id;
      ELSE
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
      
      INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
      VALUES (current_user_id, now(), now() + interval '24 hours')
      ON CONFLICT (user_id) DO NOTHING;
      
      -- NOTE: Invite code increment REMOVED - trigger already handles this
      
      RETURN jsonb_build_object(
        'success', true,
        'team_id', created_team_id,
        'team_name', p_new_team_name,
        'role', 'admin',
        'message', 'New team created successfully'
      );
      
    -- SCENARIO 2: Joining existing team (team_id IS NOT NULL on invite)
    -- Note: This path is rarely used since CustomAuth handles existing team joins directly
    ELSE
      IF FOUND THEN
        UPDATE public.users 
        SET 
          team_id = invite_team_id,
          role = COALESCE(invite_role, 'member'),
          view_financial = COALESCE(invite_view_financial, true),
          updated_at = now()
        WHERE id = current_user_id;
      ELSE
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
      
      INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
      VALUES (current_user_id, now(), now() + interval '24 hours')
      ON CONFLICT (user_id) DO NOTHING;
      
      -- NOTE: Invite code increment REMOVED - trigger already handles this
      
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
    IF FOUND THEN
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
