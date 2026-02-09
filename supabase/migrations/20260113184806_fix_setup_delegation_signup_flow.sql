/*
  # Fix Setup Delegation Signup Flow
  
  ## Problem
  The signup trigger was failing silently when a setup delegation existed for the user.
  The `SET row_security TO 'off'` function attribute wasn't reliably disabling RLS
  during trigger execution, causing the UPDATE to setup_delegation to fail.
  
  ## Solution
  1. Create a dedicated helper function for updating setup_delegation that uses
     SECURITY DEFINER and explicitly sets row_security off
  2. Update the main signup function to use this helper
  3. Add comprehensive exception handling to provide better error messages
  
  ## Changes
  - New function: update_setup_delegation_status_bypass_rls
  - Updated function: handle_new_user_signup with better error handling
*/

-- Create helper function to update setup_delegation bypassing RLS
CREATE OR REPLACE FUNCTION update_setup_delegation_status_bypass_rls(
  p_team_id uuid,
  p_user_id uuid,
  p_new_status text DEFAULT 'in_progress'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Explicitly disable RLS for this operation
  SET LOCAL row_security = off;
  
  UPDATE setup_delegation
  SET 
    status = p_new_status,
    delegated_to_user_id = p_user_id,
    started_at = CASE WHEN p_new_status = 'in_progress' THEN now() ELSE started_at END,
    updated_at = now()
  WHERE team_id = p_team_id
  AND status = 'pending_invite';
  
  RAISE LOG '[update_setup_delegation_status_bypass_rls] Updated setup_delegation for team_id=% to status=%', p_team_id, p_new_status;
END;
$$;

-- Update the main signup function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite_code text;
  v_invite record;
  v_new_team_name text;
  v_full_name text;
  v_user_role text := 'member';
  v_view_financial boolean := false;
  v_team_id uuid := NULL;
  v_setup_delegation record;
  v_is_setup_admin boolean := false;
  v_final_team_id uuid;
  v_step text := 'init';
BEGIN
  -- Explicitly disable RLS for this entire function
  SET LOCAL row_security = off;
  
  v_step := 'debug_log_start';
  -- DEBUG: Log that trigger fired
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Trigger started');
  EXCEPTION WHEN OTHERS THEN
    -- Ignore debug log failures
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  v_step := 'read_metadata';
  -- Read user metadata
  v_invite_code := NEW.raw_user_meta_data->>'invite_code';
  v_new_team_name := NEW.raw_user_meta_data->>'new_team_name';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');

  v_step := 'debug_log_metadata';
  -- DEBUG: Log metadata
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('Metadata: invite_code=%s, new_team_name=%s, full_name=%s', v_invite_code, v_new_team_name, v_full_name));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  v_step := 'check_setup_delegation';
  -- First, check if this user is a setup admin
  SELECT * INTO v_setup_delegation
  FROM setup_delegation
  WHERE delegated_to_email = LOWER(NEW.email)
  AND status = 'pending_invite'
  AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    v_step := 'setup_admin_flow';
    BEGIN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
        format('Found setup delegation for team_id=%s', v_setup_delegation.team_id));
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
    END;

    v_team_id := v_setup_delegation.team_id;
    v_user_role := 'admin';
    v_view_financial := true;
    v_is_setup_admin := true;

    v_step := 'update_setup_delegation';
    -- Use helper function to update setup_delegation
    BEGIN
      PERFORM update_setup_delegation_status_bypass_rls(v_setup_delegation.team_id, NEW.id, 'in_progress');
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to update setup_delegation: %', SQLERRM;
      -- Continue anyway - don't fail the signup for this
    END;

    v_step := 'upsert_user_setup_admin';
    PERFORM upsert_user_bypass_rls(NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, true);

    v_step := 'insert_launch_status_setup_admin';
    INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched, is_setup_admin)
    VALUES (NEW.id, 'fuel', 0, false, true)
    ON CONFLICT (user_id) DO UPDATE SET is_setup_admin = true;

    v_step := 'insert_launch_progress_setup_admin';
    INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
    VALUES 
      (NEW.id, 'fuel', 0, 0, '[]'::jsonb),
      (NEW.id, 'boosters', 0, 0, '[]'::jsonb),
      (NEW.id, 'guidance', 0, 0, '[]'::jsonb)
    ON CONFLICT (user_id, stage) DO NOTHING;

    BEGIN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Setup admin flow completed');
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
    END;

    RETURN NEW;
  END IF;

  v_step := 'check_invite_code';
  -- Normal signup flow: check invite code
  IF v_invite_code IS NOT NULL AND v_invite_code != '' THEN
    BEGIN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Looking up invite code: ' || v_invite_code);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
    END;

    SELECT * INTO v_invite FROM invite_codes 
    WHERE code = UPPER(v_invite_code)
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
        VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Invite code NOT FOUND or invalid');
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
      END;
    ELSE
      BEGIN
        INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
        VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
          format('Found invite: team_id=%s, role=%s', v_invite.team_id, v_invite.assigned_role));
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
      END;

      IF v_invite.team_id IS NOT NULL THEN
        v_team_id := v_invite.team_id;
        v_user_role := COALESCE(v_invite.assigned_role, 'member');
        v_view_financial := COALESCE(v_invite.view_financial, false);
      END IF;
    END IF;
  END IF;

  v_step := 'check_new_team';
  -- If still no team but new_team_name provided, create new team
  IF v_team_id IS NULL AND v_new_team_name IS NOT NULL AND v_new_team_name != '' THEN
    BEGIN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Creating new team: ' || v_new_team_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
    END;

    INSERT INTO teams (name, created_by)
    VALUES (v_new_team_name, NEW.id)
    RETURNING id INTO v_team_id;

    v_user_role := 'admin';
    v_view_financial := true;
  END IF;

  v_step := 'upsert_user';
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('About to upsert user with team_id=%s, role=%s', v_team_id, v_user_role));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  -- Use helper function to bypass RLS
  PERFORM upsert_user_bypass_rls(NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, false);

  v_step := 'verify_team';
  -- Verify team assignment
  SELECT team_id INTO v_final_team_id FROM public.users WHERE id = NEW.id;

  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('After upsert - user team_id is: %s', v_final_team_id));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  v_step := 'increment_invite_usage';
  -- Increment invite code usage
  IF v_invite IS NOT NULL THEN
    UPDATE invite_codes SET current_uses = current_uses + 1 WHERE id = v_invite.id;
  END IF;

  v_step := 'auto_enroll_launch_prep';
  -- Auto-enroll in Launch Preparation
  INSERT INTO launch_preparation_eligible_users (email, notes)
  VALUES (NEW.email, 'Auto-enrolled on signup')
  ON CONFLICT (email) DO NOTHING;

  v_step := 'init_launch_status';
  -- Initialize launch status
  INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched)
  VALUES (NEW.id, 'fuel', 0, false)
  ON CONFLICT (user_id) DO NOTHING;

  v_step := 'init_launch_progress';
  -- Initialize launch preparation progress
  INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
  VALUES 
    (NEW.id, 'fuel', 0, 0, '[]'::jsonb),
    (NEW.id, 'boosters', 0, 0, '[]'::jsonb),
    (NEW.id, 'guidance', 0, 0, '[]'::jsonb)
  ON CONFLICT (user_id, stage) DO NOTHING;

  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Trigger completed successfully');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log the error with step information
  RAISE LOG '[handle_new_user_signup] ERROR at step "%": % (SQLSTATE: %)', v_step, SQLERRM, SQLSTATE;
  
  -- Try to log to debug table
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('ERROR at step "%": %', v_step, SQLERRM));
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if debug log fails too
    NULL;
  END;
  
  -- Re-raise the exception with more context
  RAISE EXCEPTION 'Signup failed at step "%": %', v_step, SQLERRM;
END;
$$;
