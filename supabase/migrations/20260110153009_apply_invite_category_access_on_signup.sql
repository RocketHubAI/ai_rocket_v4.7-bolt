/*
  # Apply Invite Category Access on Signup

  1. New Function
    - `apply_invite_category_access` - applies category access from invite code when user signs up
    - Called after user is created and team is assigned

  2. Behavior
    - If invite code has `category_access` set, apply those settings
    - If invite code has no `category_access`, user gets full access to all categories (default)
    - Creates records in `user_category_access` table
*/

CREATE OR REPLACE FUNCTION apply_invite_category_access(
  p_user_id uuid,
  p_team_id uuid,
  p_invite_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category_access jsonb;
  v_category text;
  v_has_access boolean;
BEGIN
  SELECT category_access INTO v_category_access
  FROM invite_codes
  WHERE code = p_invite_code
  LIMIT 1;

  IF v_category_access IS NULL THEN
    PERFORM initialize_user_category_access(p_user_id, p_team_id, NULL);
  ELSE
    FOR v_category IN
      SELECT DISTINCT doc_category::text
      FROM document_chunks
      WHERE team_id = p_team_id
      AND doc_category IS NOT NULL
    LOOP
      v_has_access := COALESCE((v_category_access->>v_category)::boolean, true);
      
      INSERT INTO user_category_access (user_id, team_id, category, has_access)
      VALUES (p_user_id, p_team_id, v_category, v_has_access)
      ON CONFLICT (user_id, team_id, category) 
      DO UPDATE SET has_access = v_has_access, updated_at = now();
    END LOOP;
  END IF;
END;
$$;
