/*
  # Fix team assignment in signup trigger

  1. Changes
    - Use UPSERT with explicit NULL handling
    - Add verification step after INSERT to ensure team was assigned
    - Improve logging for debugging
    - Fix potential race condition with ON CONFLICT

  2. Security
    - Function remains SECURITY DEFINER to bypass RLS
*/

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
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
  v_error_context text;
  v_final_team_id uuid;
BEGIN
  BEGIN
    v_error_context := 'reading user metadata';
    v_invite_code := NEW.raw_user_meta_data->>'invite_code';
    v_new_team_name := NEW.raw_user_meta_data->>'new_team_name';
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');

    RAISE LOG '[Signup] Processing user: %, invite_code: %, new_team_name: %', 
      NEW.email, v_invite_code, v_new_team_name;

    -- First, check if this user is a setup admin (invited to set up someone else's team)
    v_error_context := 'checking setup delegation';
    SELECT * INTO v_setup_delegation
    FROM setup_delegation
    WHERE delegated_to_email = LOWER(NEW.email)
      AND status = 'pending_invite'
      AND expires_at > now()
    LIMIT 1;

    IF FOUND THEN
      RAISE LOG '[Signup] User % is a setup admin for team %', NEW.email, v_setup_delegation.team_id;
      
      v_team_id := v_setup_delegation.team_id;
      v_user_role := 'admin';
      v_view_financial := true;
      v_is_setup_admin := true;

      UPDATE setup_delegation
      SET 
        status = 'in_progress',
        delegated_to_user_id = NEW.id,
        started_at = now()
      WHERE team_id = v_setup_delegation.team_id;

      -- Insert setup admin user
      INSERT INTO public.users (id, email, name, team_id, role, view_financial, is_setup_admin)
      VALUES (NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, true)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        team_id = COALESCE(EXCLUDED.team_id, public.users.team_id),
        role = EXCLUDED.role,
        view_financial = EXCLUDED.view_financial,
        is_setup_admin = true;

      -- Initialize launch status for setup admin
      INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched, is_setup_admin)
      VALUES (NEW.id, 'fuel', 0, false, true)
      ON CONFLICT (user_id) DO UPDATE SET is_setup_admin = true;

      INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
      VALUES 
        (NEW.id, 'fuel', 0, 0, '[]'::jsonb),
        (NEW.id, 'boosters', 0, 0, '[]'::jsonb),
        (NEW.id, 'guidance', 0, 0, '[]'::jsonb)
      ON CONFLICT (user_id, stage) DO NOTHING;

      RETURN NEW;
    END IF;

    -- Normal signup flow: check invite code
    IF v_invite_code IS NOT NULL AND v_invite_code != '' THEN
      v_error_context := 'looking up invite code: ' || v_invite_code;
      
      SELECT * INTO v_invite FROM invite_codes 
      WHERE code = UPPER(v_invite_code)
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
        AND (max_uses IS NULL OR current_uses < max_uses);

      IF NOT FOUND THEN
        RAISE LOG '[Signup] Invalid or expired invite code: %', v_invite_code;
      ELSE
        RAISE LOG '[Signup] Found invite: team_id=%, role=%, view_financial=%', 
          v_invite.team_id, v_invite.assigned_role, v_invite.view_financial;
        
        -- Assign values from invite
        IF v_invite.team_id IS NOT NULL THEN
          v_team_id := v_invite.team_id;
          v_user_role := COALESCE(v_invite.assigned_role, 'member');
          v_view_financial := COALESCE(v_invite.view_financial, false);
          RAISE LOG '[Signup] Will assign to existing team: %', v_team_id;
        END IF;
      END IF;
    END IF;

    -- If still no team but new_team_name provided, create new team
    IF v_team_id IS NULL AND v_new_team_name IS NOT NULL AND v_new_team_name != '' THEN
      v_error_context := 'creating new team: ' || v_new_team_name;
      INSERT INTO teams (name, created_by)
      VALUES (v_new_team_name, NEW.id)
      RETURNING id INTO v_team_id;
      
      v_user_role := 'admin';
      v_view_financial := true;
      RAISE LOG '[Signup] Created new team: % with id: %', v_new_team_name, v_team_id;
    END IF;

    -- Log final values before insert
    RAISE LOG '[Signup] Final values - team_id: %, role: %, view_financial: %', 
      v_team_id, v_user_role, v_view_financial;

    -- Create or update user record
    v_error_context := 'inserting into public.users';
    INSERT INTO public.users (id, email, name, team_id, role, view_financial)
    VALUES (NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
      team_id = COALESCE(EXCLUDED.team_id, public.users.team_id),
      role = EXCLUDED.role,
      view_financial = EXCLUDED.view_financial,
      updated_at = now();

    -- Verify team assignment worked
    SELECT team_id INTO v_final_team_id FROM public.users WHERE id = NEW.id;
    RAISE LOG '[Signup] After INSERT - user team_id is: %', v_final_team_id;
    
    IF v_team_id IS NOT NULL AND v_final_team_id IS NULL THEN
      RAISE LOG '[Signup] WARNING: Team assignment failed! Expected %, got NULL', v_team_id;
      -- Force update as fallback
      UPDATE public.users SET team_id = v_team_id WHERE id = NEW.id;
      RAISE LOG '[Signup] Attempted force update of team_id';
    END IF;

    -- Increment invite code usage
    IF v_invite IS NOT NULL THEN
      v_error_context := 'incrementing invite usage';
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE id = v_invite.id;
    END IF;

    -- Auto-enroll in Launch Preparation
    v_error_context := 'auto-enrolling in launch prep';
    INSERT INTO launch_preparation_eligible_users (email, notes)
    VALUES (NEW.email, 'Auto-enrolled on signup')
    ON CONFLICT (email) DO NOTHING;

    -- Initialize launch status
    v_error_context := 'initializing launch status';
    INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched)
    VALUES (NEW.id, 'fuel', 0, false)
    ON CONFLICT (user_id) DO NOTHING;

    -- Initialize launch preparation progress
    v_error_context := 'initializing launch prep progress';
    INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
    VALUES 
      (NEW.id, 'fuel', 0, 0, '[]'::jsonb),
      (NEW.id, 'boosters', 0, 0, '[]'::jsonb),
      (NEW.id, 'guidance', 0, 0, '[]'::jsonb)
    ON CONFLICT (user_id, stage) DO NOTHING;

    RAISE LOG '[Signup] Successfully processed user: %', NEW.email;
    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[Signup Error] Context: %, Error: %, User: %', v_error_context, SQLERRM, NEW.email;
    
    -- Still try to create basic user record on error
    BEGIN
      INSERT INTO public.users (id, email, name)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[Signup Error] Failed to create fallback user record: %', SQLERRM;
    END;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;