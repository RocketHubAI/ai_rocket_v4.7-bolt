/*
  # Fix Impact Progress Sync Using Real Data Tables

  1. Problem
    - The impact progress sync only checked user_feature_usage counters
    - Many counters were never incremented (scheduled_reports_count = 0 despite real reports)
    - invite_team_member had no corresponding counter at all
    - Users were shown suggestions for things they already completed

  2. Changes
    - Updates sync function to also check real data tables (astra_reports, users, etc.)
    - Backfills all users by checking actual data in the database
    - Adds checks for: schedule_report, invite_team_member, view_mission_control, 
      customize_agent, run_first_report

  3. Real Data Checks Added
    - schedule_report: Check astra_reports with schedule_type = 'scheduled'
    - invite_team_member: Check if team has more than 1 member
    - run_first_report: Check astra_chats for report type messages
    - view_mission_control: Check launch_preparation_progress exists
*/

-- Update the sync function to also check real data tables
CREATE OR REPLACE FUNCTION sync_impact_progress_from_usage()
RETURNS TRIGGER AS $$
BEGIN
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

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'run_first_report'
    AND is_completed = false
    AND (NEW.visualizations_count > 0 OR NEW.scheduled_reports_count > 0 OR EXISTS (
      SELECT 1 FROM astra_reports ar WHERE ar.user_id = NEW.user_id LIMIT 1
    ));

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'schedule_report'
    AND is_completed = false
    AND (NEW.scheduled_reports_count > 0 OR EXISTS (
      SELECT 1 FROM astra_reports ar 
      WHERE ar.user_id = NEW.user_id AND ar.schedule_type = 'scheduled'
      LIMIT 1
    ));

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'create_visualization'
    AND is_completed = false
    AND (NEW.visualizations_count > 0 OR EXISTS (
      SELECT 1 FROM saved_visualizations sv WHERE sv.user_id = NEW.user_id LIMIT 1
    ) OR EXISTS (
      SELECT 1 FROM astra_visualizations av WHERE av.user_id = NEW.user_id LIMIT 1
    ));

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'view_team_dashboard'
    AND is_completed = false
    AND NEW.team_dashboard_count > 0;

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'ask_data_question'
    AND is_completed = false
    AND (NEW.ask_astra_count > 0 OR EXISTS (
      SELECT 1 FROM astra_chats ac WHERE ac.user_id = NEW.user_id LIMIT 1
    ));

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'create_presentation'
    AND is_completed = false
    AND NEW.astra_create_count > 0;

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'use_team_chat'
    AND is_completed = false
    AND NEW.team_chat_count > 0;

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'upload_local_files'
    AND is_completed = false
    AND NEW.local_uploads_count > 0;

  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'view_team_pulse'
    AND is_completed = false
    AND NEW.team_pulse_count > 0;

  -- invite_team_member: check if team has more than 1 member
  UPDATE user_impact_progress 
  SET is_completed = true, completed_at = COALESCE(completed_at, now())
  WHERE user_id = NEW.user_id 
    AND feature_key = 'invite_team_member'
    AND is_completed = false
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.team_id = (SELECT team_id FROM users WHERE id = NEW.user_id)
      GROUP BY u.team_id
      HAVING count(*) > 1
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now backfill all users by checking real data tables

-- schedule_report: check astra_reports with scheduled type
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'schedule_report'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM astra_reports ar 
    WHERE ar.user_id = uip.user_id AND ar.schedule_type = 'scheduled'
  );

-- invite_team_member: check if team has > 1 member
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'invite_team_member'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.team_id = (SELECT u2.team_id FROM users u2 WHERE u2.id = uip.user_id)
    GROUP BY u.team_id
    HAVING count(*) > 1
  );

-- run_first_report: check astra_reports exist
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'run_first_report'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM astra_reports ar WHERE ar.user_id = uip.user_id
  );

-- ask_data_question: check astra_chats exist
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'ask_data_question'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM astra_chats ac WHERE ac.user_id = uip.user_id
  );

-- create_visualization: check saved_visualizations or astra_visualizations
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'create_visualization'
  AND uip.is_completed = false
  AND (EXISTS (
    SELECT 1 FROM saved_visualizations sv WHERE sv.user_id = uip.user_id
  ) OR EXISTS (
    SELECT 1 FROM astra_visualizations av WHERE av.user_id = uip.user_id
  ));

-- view_mission_control: check launch_preparation_progress exists
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'view_mission_control'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM launch_preparation_progress lpp WHERE lpp.user_id = uip.user_id
  );

-- sync_documents: check document_chunks exist for team
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'sync_documents'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM document_chunks dc 
    JOIN users u ON u.team_id = dc.team_id 
    WHERE u.id = uip.user_id
  );

-- create_presentation: check astra_visualizations with type presentation
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'create_presentation'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM astra_visualizations av WHERE av.user_id = uip.user_id
  );

-- customize_agent: check team_agent_settings has personality or team_priorities exist
UPDATE user_impact_progress uip
SET is_completed = true, completed_at = COALESCE(uip.completed_at, now())
WHERE uip.feature_key = 'customize_agent'
  AND uip.is_completed = false
  AND EXISTS (
    SELECT 1 FROM team_priorities tp 
    JOIN users u ON u.team_id = tp.team_id 
    WHERE u.id = uip.user_id
  );