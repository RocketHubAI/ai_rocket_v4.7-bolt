/*
  # Create debug log table for trigger debugging
  
  This will help us verify if triggers are firing at all.
*/

-- Create a simple debug log table
CREATE TABLE IF NOT EXISTS public.trigger_debug_log (
  id serial PRIMARY KEY,
  trigger_name text NOT NULL,
  user_id uuid,
  user_email text,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Allow inserts from trigger functions
ALTER TABLE public.trigger_debug_log DISABLE ROW LEVEL SECURITY;

-- Update the handle_new_user_signup to log to this table
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
BEGIN
  -- DEBUG: Log that trigger fired
  INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
  VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Trigger started');
  
  -- Read user metadata
  v_invite_code := NEW.raw_user_meta_data->>'invite_code';
  v_new_team_name := NEW.raw_user_meta_data->>'new_team_name';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  
  -- DEBUG: Log metadata
  INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
  VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
    format('Metadata: invite_code=%s, new_team_name=%s, full_name=%s', v_invite_code, v_new_team_name, v_full_name));
  
  -- First, check if this user is a setup admin
  SELECT * INTO v_setup_delegation
  FROM setup_delegation
  WHERE delegated_to_email = LOWER(NEW.email)
    AND status = 'pending_invite'
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Found setup delegation');
    
    v_team_id := v_setup_delegation.team_id;
    v_user_role := 'admin';
    v_view_financial := true;
    v_is_setup_admin := true;
    
    UPDATE setup_delegation
    SET status = 'in_progress', delegated_to_user_id = NEW.id, started_at = now()
    WHERE team_id = v_setup_delegation.team_id;
    
    PERFORM upsert_user_bypass_rls(NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, true);
    
    INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched, is_setup_admin)
    VALUES (NEW.id, 'fuel', 0, false, true)
    ON CONFLICT (user_id) DO UPDATE SET is_setup_admin = true;
    
    INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
    VALUES 
      (NEW.id, 'fuel', 0, 0, '[]'::jsonb),
      (NEW.id, 'boosters', 0, 0, '[]'::jsonb),
      (NEW.id, 'guidance', 0, 0, '[]'::jsonb)
    ON CONFLICT (user_id, stage) DO NOTHING;
    
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Setup admin flow completed');
    
    RETURN NEW;
  END IF;
  
  -- Normal signup flow: check invite code
  IF v_invite_code IS NOT NULL AND v_invite_code != '' THEN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Looking up invite code: ' || v_invite_code);
    
    SELECT * INTO v_invite FROM invite_codes 
    WHERE code = UPPER(v_invite_code)
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR current_uses < max_uses);
    
    IF NOT FOUND THEN
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Invite code NOT FOUND or invalid');
    ELSE
      INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
      VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
        format('Found invite: team_id=%s, role=%s', v_invite.team_id, v_invite.assigned_role));
      
      IF v_invite.team_id IS NOT NULL THEN
        v_team_id := v_invite.team_id;
        v_user_role := COALESCE(v_invite.assigned_role, 'member');
        v_view_financial := COALESCE(v_invite.view_financial, false);
      END IF;
    END IF;
  END IF;
  
  -- If still no team but new_team_name provided, create new team
  IF v_team_id IS NULL AND v_new_team_name IS NOT NULL AND v_new_team_name != '' THEN
    INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
    VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Creating new team: ' || v_new_team_name);
    
    INSERT INTO teams (name, created_by)
    VALUES (v_new_team_name, NEW.id)
    RETURNING id INTO v_team_id;
    
    v_user_role := 'admin';
    v_view_financial := true;
  END IF;
  
  INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
  VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
    format('About to upsert user with team_id=%s, role=%s', v_team_id, v_user_role));
  
  -- Use helper function to bypass RLS - this will raise exception on failure
  PERFORM upsert_user_bypass_rls(NEW.id, NEW.email, v_full_name, v_team_id, v_user_role, v_view_financial, false);
  
  -- Verify team assignment
  SELECT team_id INTO v_final_team_id FROM public.users WHERE id = NEW.id;
  
  INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
  VALUES ('handle_new_user_signup', NEW.id, NEW.email, 
    format('After upsert - user team_id is: %s', v_final_team_id));
  
  -- Increment invite code usage
  IF v_invite IS NOT NULL THEN
    UPDATE invite_codes SET current_uses = current_uses + 1 WHERE id = v_invite.id;
  END IF;
  
  -- Auto-enroll in Launch Preparation
  INSERT INTO launch_preparation_eligible_users (email, notes)
  VALUES (NEW.email, 'Auto-enrolled on signup')
  ON CONFLICT (email) DO NOTHING;
  
  -- Initialize launch status
  INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched)
  VALUES (NEW.id, 'fuel', 0, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize launch preparation progress
  INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
  VALUES 
    (NEW.id, 'fuel', 0, 0, '[]'::jsonb),
    (NEW.id, 'boosters', 0, 0, '[]'::jsonb),
    (NEW.id, 'guidance', 0, 0, '[]'::jsonb)
  ON CONFLICT (user_id, stage) DO NOTHING;
  
  INSERT INTO trigger_debug_log (trigger_name, user_id, user_email, message)
  VALUES ('handle_new_user_signup', NEW.id, NEW.email, 'Trigger completed successfully');
  
  RETURN NEW;
END;
$$;