/*
  # Auto-Sync Triggers for Category Access

  1. Triggers
    - `trigger_init_category_access_on_user_insert` - When a new user is added to a team, 
      initialize their category access with all existing team categories
    - `trigger_sync_category_on_document_chunk_insert` - When a new document chunk with 
      a new category is added, grant access to all team members

  2. Important Notes
    - All new users get full access to all existing categories by default
    - When a new category appears, all existing team members get access automatically
    - This ensures the permission system stays in sync with available data
*/

CREATE OR REPLACE FUNCTION init_category_access_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    PERFORM initialize_user_category_access(NEW.id, NEW.team_id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_init_category_access_on_user_insert ON users;
CREATE TRIGGER trigger_init_category_access_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_category_access_for_new_user();

CREATE OR REPLACE FUNCTION sync_category_access_on_new_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category text;
  v_user_id uuid;
  v_category_exists boolean;
BEGIN
  IF NEW.doc_category IS NOT NULL AND NEW.team_id IS NOT NULL THEN
    v_category := NEW.doc_category::text;
    
    SELECT EXISTS (
      SELECT 1 FROM user_category_access 
      WHERE team_id = NEW.team_id 
      AND category = v_category
      LIMIT 1
    ) INTO v_category_exists;
    
    IF NOT v_category_exists THEN
      FOR v_user_id IN
        SELECT id FROM users WHERE team_id = NEW.team_id
      LOOP
        INSERT INTO user_category_access (user_id, team_id, category, has_access)
        VALUES (v_user_id, NEW.team_id, v_category, true)
        ON CONFLICT (user_id, team_id, category) DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_category_on_document_chunk_insert ON document_chunks;
CREATE TRIGGER trigger_sync_category_on_document_chunk_insert
  AFTER INSERT ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION sync_category_access_on_new_category();
