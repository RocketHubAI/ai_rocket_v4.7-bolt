/*
  # Backfill User Category Access for All Teams

  1. Purpose
    - Populate explicit category access records for all existing users
    - Ensures every user has a record for every category in their team
    - Preserves existing restrictions (has_access = false) - only adds missing records

  2. Behavior
    - For each team, find all distinct categories from document_chunks
    - For each user in that team, create access record with has_access = true
    - Uses ON CONFLICT DO NOTHING to preserve existing explicit restrictions
    - This makes all access explicit rather than relying on COALESCE defaults

  3. Benefits
    - Simplifies n8n workflow queries (direct lookup, no fallback logic)
    - Provides clear audit trail
    - Makes access control explicit and visible in admin panels

  4. Safety
    - Will NOT overwrite existing has_access = false records
    - Only fills in missing records with default true access
*/

DO $$
DECLARE
  v_team RECORD;
  v_category text;
  v_user_id uuid;
  v_records_created integer := 0;
BEGIN
  FOR v_team IN SELECT id FROM teams
  LOOP
    FOR v_category IN
      SELECT DISTINCT doc_category::text
      FROM document_chunks
      WHERE team_id = v_team.id
      AND doc_category IS NOT NULL
    LOOP
      FOR v_user_id IN
        SELECT id FROM users WHERE team_id = v_team.id
      LOOP
        INSERT INTO user_category_access (user_id, team_id, category, has_access)
        VALUES (v_user_id, v_team.id, v_category, true)
        ON CONFLICT (user_id, team_id, category) DO NOTHING;
        
        IF FOUND THEN
          v_records_created := v_records_created + 1;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: % new category access records created', v_records_created;
END $$;
