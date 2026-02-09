/*
  # Add Custom Instructions to Team Dashboard

  1. Changes
    - Add `custom_instructions` column to team_dashboard_settings for admin customization
    - This allows admins to specify directions/preferences for dashboard generation
    
  2. Security
    - Existing RLS policies apply
*/

ALTER TABLE team_dashboard_settings
ADD COLUMN IF NOT EXISTS custom_instructions text DEFAULT NULL;

COMMENT ON COLUMN team_dashboard_settings.custom_instructions IS 'Admin-defined instructions/preferences for dashboard generation';