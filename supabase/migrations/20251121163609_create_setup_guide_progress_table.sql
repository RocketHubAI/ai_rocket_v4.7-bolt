/*
  # Create Setup Guide Progress Table

  1. New Tables
    - `setup_guide_progress`
      - Tracks user progress through the Astra Guided Setup
      - 11 steps total (onboarding through team invites)
      - Stores folder creation metadata
      - Tracks current step and completion status

  2. Security
    - Enable RLS
    - Users can only view/update their own progress
    - Policies for select, insert, and update operations

  3. Indexes
    - Index on user_id for fast lookups
    - Automatic timestamp updates
*/

-- Create the setup_guide_progress table
CREATE TABLE IF NOT EXISTS setup_guide_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step completion tracking
  step_1_onboarding_completed BOOLEAN DEFAULT false,
  step_2_google_drive_connected BOOLEAN DEFAULT false,
  step_3_folder_selected_or_created BOOLEAN DEFAULT false,
  step_4_files_placed_in_folder BOOLEAN DEFAULT false,
  step_5_data_synced BOOLEAN DEFAULT false,
  step_6_team_settings_configured BOOLEAN DEFAULT false,
  step_7_first_prompt_sent BOOLEAN DEFAULT false,
  step_8_visualization_created BOOLEAN DEFAULT false,
  step_9_manual_report_run BOOLEAN DEFAULT false,
  step_10_scheduled_report_created BOOLEAN DEFAULT false,
  step_11_team_members_invited BOOLEAN DEFAULT false,
  
  -- Additional metadata for folder creation path
  created_folder_type TEXT, -- 'strategy' | 'meetings' | 'financial'
  created_folder_id TEXT,
  selected_folder_path TEXT, -- 'existing' | 'created'
  
  -- Metadata
  current_step INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  is_skipped BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id),
  CHECK (current_step >= 1 AND current_step <= 11)
);

-- Enable RLS
ALTER TABLE setup_guide_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own setup progress"
  ON setup_guide_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own setup progress"
  ON setup_guide_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own setup progress"
  ON setup_guide_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_setup_guide_user ON setup_guide_progress(user_id);

-- Trigger to auto-update last_updated_at
CREATE OR REPLACE FUNCTION update_setup_guide_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_setup_guide_timestamp
  BEFORE UPDATE ON setup_guide_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_setup_guide_timestamp();