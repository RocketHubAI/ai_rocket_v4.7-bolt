/*
  # Sync Impact Progress from Feature Usage

  1. Changes
    - Creates function to sync is_completed status based on user_feature_usage
    - Creates trigger to auto-update impact progress when feature usage changes
    - Backfills existing users with their actual completion status

  2. Mapping
    - sync_documents: drive_sync_count > 0 OR based on document_chunks existing
    - run_first_report: Check astra_chats for report generation
    - create_visualization: visualizations_count > 0
    - view_team_dashboard: team_dashboard_count > 0
    - ask_data_question: ask_astra_count > 0
    - create_presentation: astra_create_count > 0
    - use_team_chat: team_chat_count > 0
*/

-- Function to sync impact progress from feature usage
CREATE OR REPLACE FUNCTION sync_impact_progress_from_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync documents (check if team has any document chunks)
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'sync_documents'
    AND is_completed = false
    AND (NEW.drive_sync_count > 0 OR NEW.local_uploads_count > 0 OR EXISTS (
      SELECT 1 FROM document_chunks dc 
      JOIN users u ON u.team_id = dc.team_id 
      WHERE u.id = NEW.user_id
      LIMIT 1
    ));

  -- Run first report (check if visualizations or scheduled reports exist)
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'run_first_report'
    AND is_completed = false
    AND (NEW.visualizations_count > 0 OR NEW.scheduled_reports_count > 0);

  -- Schedule report
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'schedule_report'
    AND is_completed = false
    AND NEW.scheduled_reports_count > 0;

  -- Create visualization
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'create_visualization'
    AND is_completed = false
    AND NEW.visualizations_count > 0;

  -- View team dashboard
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'view_team_dashboard'
    AND is_completed = false
    AND NEW.team_dashboard_count > 0;

  -- Ask data question
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'ask_data_question'
    AND is_completed = false
    AND NEW.ask_astra_count > 0;

  -- Create presentation (Astra Create)
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'create_presentation'
    AND is_completed = false
    AND NEW.astra_create_count > 0;

  -- Use team chat
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'use_team_chat'
    AND is_completed = false
    AND NEW.team_chat_count > 0;

  -- Upload local files
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'upload_local_files'
    AND is_completed = false
    AND NEW.local_uploads_count > 0;

  -- View team pulse
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'view_team_pulse'
    AND is_completed = false
    AND NEW.team_pulse_count > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_feature_usage updates
DROP TRIGGER IF EXISTS sync_impact_on_feature_usage ON user_feature_usage;
CREATE TRIGGER sync_impact_on_feature_usage
  AFTER INSERT OR UPDATE ON user_feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION sync_impact_progress_from_usage();

-- Backfill existing users based on their feature usage
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'sync_documents'
  AND uip.is_completed = false
  AND (ufu.drive_sync_count > 0 OR ufu.local_uploads_count > 0);

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'run_first_report'
  AND uip.is_completed = false
  AND (ufu.visualizations_count > 0 OR ufu.scheduled_reports_count > 0);

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'schedule_report'
  AND uip.is_completed = false
  AND ufu.scheduled_reports_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'create_visualization'
  AND uip.is_completed = false
  AND ufu.visualizations_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'view_team_dashboard'
  AND uip.is_completed = false
  AND ufu.team_dashboard_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'ask_data_question'
  AND uip.is_completed = false
  AND ufu.ask_astra_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'create_presentation'
  AND uip.is_completed = false
  AND ufu.astra_create_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'use_team_chat'
  AND uip.is_completed = false
  AND ufu.team_chat_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'upload_local_files'
  AND uip.is_completed = false
  AND ufu.local_uploads_count > 0;

UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM user_feature_usage ufu
WHERE uip.user_id = ufu.user_id
  AND uip.feature_key = 'view_team_pulse'
  AND uip.is_completed = false
  AND ufu.team_pulse_count > 0;

-- Also check if team has documents for sync_documents
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = now()
FROM users u
WHERE uip.user_id = u.id
  AND uip.feature_key = 'sync_documents'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM document_chunks dc WHERE dc.team_id = u.team_id LIMIT 1
  );
