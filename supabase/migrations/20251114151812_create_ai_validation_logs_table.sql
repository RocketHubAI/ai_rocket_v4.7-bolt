/*
  # Create AI Validation Logs Table

  1. New Tables
    - `ai_validation_logs`
      - `id` (uuid, primary key) - Unique identifier for the log entry
      - `message_id` (text) - ID of the message that was validated
      - `team_id` (uuid, foreign key) - Team the message belongs to
      - `user_id` (uuid, foreign key) - User who received the validated message
      - `is_valid` (boolean) - Whether the response passed validation
      - `confidence` (text) - Confidence level: 'high', 'medium', or 'low'
      - `issues` (jsonb) - Array of critical issues found
      - `warnings` (jsonb) - Array of warnings found
      - `message_preview` (text) - First 200 characters of the message
      - `created_at` (timestamptz) - When the validation occurred

  2. Security
    - Enable RLS on `ai_validation_logs` table
    - Add policy for super admins to view all validation logs
    - Add policy for team members to view their team's validation logs

  3. Indexes
    - Index on team_id for efficient team-based queries
    - Index on created_at for time-based queries
    - Index on is_valid for filtering failed validations
*/

-- Create ai_validation_logs table
CREATE TABLE IF NOT EXISTS ai_validation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_valid boolean NOT NULL DEFAULT true,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  issues jsonb DEFAULT '[]'::jsonb,
  warnings jsonb DEFAULT '[]'::jsonb,
  message_preview text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_validation_logs_team_id ON ai_validation_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_validation_logs_created_at ON ai_validation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_validation_logs_is_valid ON ai_validation_logs(is_valid);
CREATE INDEX IF NOT EXISTS idx_ai_validation_logs_confidence ON ai_validation_logs(confidence);

-- Enable RLS
ALTER TABLE ai_validation_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all validation logs
CREATE POLICY "Super admins can view all validation logs"
  ON ai_validation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN ('clay@rockethub.ai', 'nolan@rockethub.ai', 'info@rockethub.ai')
    )
  );

-- Team members can view their team's validation logs
CREATE POLICY "Team members can view their team validation logs"
  ON ai_validation_logs
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow authenticated users to insert validation logs
CREATE POLICY "Authenticated users can insert validation logs"
  ON ai_validation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );