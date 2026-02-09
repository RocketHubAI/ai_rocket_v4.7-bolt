/*
  # Fix Moonshot Invite Code Signup Flow

  1. Problem
    - Moonshot registration stores codes in `moonshot_invite_codes` table
    - Signup trigger only checks `invite_codes` table
    - Result: Users with MOON-* codes don't get teams created

  2. Solution
    - Update handle_new_user_signup to also check `moonshot_invite_codes`
    - When MOON code found: create team from moonshot_registrations.team_name
    - Mark code as redeemed and link user/team to moonshot_registrations

  3. Changes
    - Adds moonshot code lookup logic before regular invite_codes check
    - Creates team automatically for moonshot users
    - Updates moonshot tracking tables
*/

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
  v_moonshot_code record;
  v_moonshot_registration record;
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

  -- Check for MOONSHOT invite codes first (stored in moonshot_invite_codes table)
  v_step := 'check_moonshot_code';
  IF v_invite_code IS NOT NULL AND v_invite_code != '' AND UPPER(v_invite_code) LIKE 'MOON-%' THEN
    BEGIN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Looking up MOONSHOT code: ' || v_invite_code);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
    END;

    SELECT * INTO v_moonshot_code 
    FROM moonshot_invite_codes 
    WHERE code = UPPER(v_invite_code)
    AND is_redeemed = false
    AND valid_from <= now()
    AND expires_at > now();

    IF FOUND THEN
      BEGIN
        INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
        VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
          format('Found MOONSHOT code, registration_id=%s', v_moonshot_code.registration_id));
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
      END;

      -- Get the registration info to get team_name
      SELECT * INTO v_moonshot_registration
      FROM moonshot_registrations
      WHERE id = v_moonshot_code.registration_id;

      IF FOUND AND v_moonshot_registration.team_name IS NOT NULL THEN
        v_step := 'create_moonshot_team';
        BEGIN
          INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
          VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
            'Creating team from moonshot: ' || v_moonshot_registration.team_name);
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
        END;

        -- Create the team
        INSERT INTO teams (name, created_by)
        VALUES (TRIM(v_moonshot_registration.team_name), NEW.id)
        RETURNING id INTO v_team_id;

        v_user_role := 'admin';
        v_view_financial := true;

        v_step := 'update_moonshot_records';
        -- Mark code as redeemed
        UPDATE moonshot_invite_codes 
        SET is_redeemed = true, 
            redeemed_at = now(), 
            redeemed_by_user_id = NEW.id
        WHERE id = v_moonshot_code.id;

        -- Update moonshot registration with team and user
        UPDATE moonshot_registrations
        SET team_id = v_team_id,
            user_id = NEW.id,
            converted_at = now(),
            onboarding_started = true,
            updated_at = now()
        WHERE id = v_moonshot_code.registration_id;

        -- Use the name from moonshot registration if user didn't provide one
        IF v_full_name = '' OR v_full_name IS NULL THEN
          v_full_name := v_moonshot_registration.name;
        END IF;

        BEGIN
          INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
          VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
            format('Moonshot team created: id=%s, name=%s', v_team_id, v_moonshot_registration.team_name));
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
        END;
      ELSE
        BEGIN
          INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
          VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Moonshot registration not found or no team_name');
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
        END;
      END IF;
    ELSE
      BEGIN
        INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
        VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'MOONSHOT code not found, expired, or already redeemed');
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG '[handle_new_user_signup] Failed to write debug log: %', SQLERRM;
      END;
    END IF;
  END IF;

  -- Check regular invite_codes if no team assigned yet
  v_step := 'check_invite_code';
  IF v_team_id IS NULL AND v_invite_code IS NOT NULL AND v_invite_code != '' THEN
    BEGIN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Looking up regular invite code: ' || v_invite_code);
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
