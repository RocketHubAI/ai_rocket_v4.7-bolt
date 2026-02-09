/*
  # Add Design Style to Team Pulse Snapshots

  1. Changes
    - Adds `design_style` column to `team_pulse_snapshots` table
    - This column stores the design style used when generating each snapshot
    - Values can be: 'corporate-professional', 'tech-startup', 'creative-agency', etc.
    - NULL indicates custom description was used or default generation

  2. Purpose
    - Allows users to see which style was used for each snapshot
    - Enables displaying a style tag on the infographic header
*/

ALTER TABLE team_pulse_snapshots
ADD COLUMN IF NOT EXISTS design_style text;

COMMENT ON COLUMN team_pulse_snapshots.design_style IS 'The design style preset used for this snapshot (null if custom or default)';
