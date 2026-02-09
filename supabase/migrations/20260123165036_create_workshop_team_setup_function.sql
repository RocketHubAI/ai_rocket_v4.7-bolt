/*
  # Create Workshop Team Setup Function

  1. New Functions
    - `setup_workshop_team`: Creates a team and updates user for workshop registration
      - Takes user_id, email, team_name, full_name as parameters
      - Creates the team with the user as creator
      - Updates/creates the user record with team assignment
      - Returns the created team data
      - Uses SECURITY DEFINER to bypass RLS (runs as function owner)

  2. Security
    - Function validates that user_id matches a real auth user
    - Only creates team if user doesn't already have one
    - Properly sets user as admin of the new team
*/

CREATE OR REPLACE FUNCTION setup_workshop_team(
  p_user_id uuid,
  p_email text,
  p_team_name text,
  p_full_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_existing_team_id uuid;
BEGIN
  -- Verify the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  -- Check if user already has a team
  SELECT team_id INTO v_existing_team_id
  FROM public.users
  WHERE id = p_user_id;

  IF v_existing_team_id IS NOT NULL THEN
    -- Return existing team info
    RETURN jsonb_build_object(
      'success', true,
      'team_id', v_existing_team_id,
      'message', 'User already has a team'
    );
  END IF;

  -- Create the team
  INSERT INTO public.teams (name, created_by)
  VALUES (p_team_name, p_user_id)
  RETURNING id INTO v_team_id;

  -- Upsert the user record with team assignment
  INSERT INTO public.users (id, email, team_id, role, view_financial)
  VALUES (p_user_id, lower(p_email), v_team_id, 'admin', true)
  ON CONFLICT (id) DO UPDATE SET
    team_id = v_team_id,
    role = 'admin',
    view_financial = true;

  -- Return success with team data
  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', p_team_name,
    'message', 'Team created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_workshop_team TO authenticated;

-- Also grant to anon for the brief moment after signup
GRANT EXECUTE ON FUNCTION setup_workshop_team TO anon;
