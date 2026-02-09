/*
  # Add Team Report Features

  ## Overview
  Adds ability for admin users to create team-wide reports that are delivered to all team members.
  Team reports show special badges and identify the admin who created them.

  ## Changes
  1. Add `is_team_report` column to `astra_reports` table
     - Type: boolean
     - Default: false
     - Indicates if this is a team-wide report created by an admin
  
  2. Add `created_by_user_id` column to `astra_reports` table
     - Type: uuid
     - References: auth.users(id)
     - Stores the admin who created the team report

  ## Notes
  - Only admin users can create team reports
  - Team reports are delivered to all team members
  - Each team member sees the report with a "Team Report" badge
  - Admin sees which reports they created for the team in Manage Reports
*/

-- Add is_team_report column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astra_reports' AND column_name = 'is_team_report'
  ) THEN
    ALTER TABLE astra_reports ADD COLUMN is_team_report boolean DEFAULT false;
  END IF;
END $$;

-- Add created_by_user_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astra_reports' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE astra_reports ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_astra_reports_team ON astra_reports(is_team_report) WHERE is_team_report = true;
CREATE INDEX IF NOT EXISTS idx_astra_reports_created_by ON astra_reports(created_by_user_id);
