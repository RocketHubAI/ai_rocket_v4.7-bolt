/*
  # Add Category Access Creation to Signup Function

  1. Purpose
    - Ensures new users get default category access records on signup
    - Prevents n8n workflow failures due to missing category access

  2. Changes
    - Updates handle_new_user_signup to create default category access
    - Creates access for: meetings, strategy, projects, financial
    - Runs after user is created and team is assigned
*/

-- Create helper function to insert default category access
CREATE OR REPLACE FUNCTION create_default_category_access(
  p_user_id uuid,
  p_team_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_team_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO user_category_access (user_id, team_id, category, has_access)
  VALUES 
    (p_user_id, p_team_id, 'meetings', true),
    (p_user_id, p_team_id, 'strategy', true),
    (p_user_id, p_team_id, 'projects', true),
    (p_user_id, p_team_id, 'financial', true)
  ON CONFLICT (user_id, team_id, category) DO NOTHING;
END;
$$;

-- Update the main signup function to call the category access helper
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
  SET LOCAL row_security = off;
  
  v_step := 'debug_log_start';
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Trigger started');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  v_step := 'read_metadata';
  v_invite_code := NEW.raw_user_meta_data->>'invite_code';
  v_new_team_name := NEW.raw_user_meta_data->>'new_team_name';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');

  v_step := 'debug_log_metadata';
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('Metadata: invite_code=%s, new_team_name=%s, full_name=%s', v_invite_code, v_new_team_name, v_full_name));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  v_step := 'check_setup_delegation';
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
    BEGIN
      PERFORM update_setup_delegation_status_bypass_rls(v_setup_delegation.team_id, NEW.id, 'in_progress');
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to update setup_delegation: %', SQLERRM;
    END;

    v_step := 'upsert_user_setup_admin';
    PERFORM upsert_user_bypass_rls(NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, true);

    v_step := 'create_category_access_setup_admin';
    PERFORM create_default_category_access(NEW.id, v_team_id);

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

  PERFORM upsert_user_bypass_rls(NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, false);

  v_step := 'create_category_access';
  PERFORM create_default_category_access(NEW.id, v_team_id);

  v_step := 'verify_team';
  SELECT team_id INTO v_final_team_id FROM public.users WHERE id = NEW.id;

  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('After upsert - user team_id is: %s', v_final_team_id));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
  END;

  v_step := 'increment_invite_usage';
  IF v_invite IS NOT NULL THEN
    UPDATE invite_codes SET current_uses = current_uses + 1 WHERE id = v_invite.id;
  END IF;

  v_step := 'auto_enroll_launch_prep';
  INSERT INTO launch_preparation_eligible_users (email, notes)
  VALUES (NEW.email, 'Auto-enrolled on signup')
  ON CONFLICT (email) DO NOTHING;

  v_step := 'init_launch_status';
  INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched)
  VALUES (NEW.id, 'fuel', 0, false)
  ON CONFLICT (user_id) DO NOTHING;

  v_step := 'init_launch_progress';
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
  RAISE LOG '[handle_new_user_signup] ERROR at step "%": % (SQLSTATE: %)', v_step, SQLERRM, SQLSTATE;
  
  BEGIN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
      format('ERROR at step "%": %', v_step, SQLERRM));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RAISE EXCEPTION 'Signup failed at step "%": %', v_step, SQLERRM;
END;
$$;
