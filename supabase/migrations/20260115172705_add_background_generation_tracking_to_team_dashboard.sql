/*
  # Add Background Generation Tracking to Team Dashboard

  1. Changes
    - Adds `generation_in_progress` boolean to track if a generation is currently running
    - Adds `generation_started_at` timestamp to know when generation began
    - Adds `generation_error` text to store any error message if generation fails

  2. Purpose
    - Allows Team Dashboard generation to continue in the background when user navigates away
    - Provides status information when user returns to the page
    - Enables proper error handling and recovery
*/

ALTER TABLE team_dashboard_settings
ADD COLUMN IF NOT EXISTS generation_in_progress boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_started_at timestamptz,
ADD COLUMN IF NOT EXISTS generation_error text;

COMMENT ON COLUMN team_dashboard_settings.generation_in_progress IS 'Whether a Team Dashboard generation is currently running in the background';
COMMENT ON COLUMN team_dashboard_settings.generation_started_at IS 'When the current generation started (for timeout detection)';
COMMENT ON COLUMN team_dashboard_settings.generation_error IS 'Error message if the last generation failed';

ALTER PUBLICATION supabase_realtime ADD TABLE team_dashboard_settings;
