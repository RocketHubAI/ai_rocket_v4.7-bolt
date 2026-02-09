/*
  # Setup Delegation System
  
  This migration creates the infrastructure for allowing team creators to delegate
  the Launch Preparation setup to an admin member.
  
  1. New Tables
    - `setup_delegation`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `delegating_user_id` (uuid, references users - the original creator)
      - `delegated_to_email` (text, email of the invited admin)
      - `status` (text - pending_invite, accepted, in_progress, completed, cancelled)
      - `expires_at` (timestamptz, 7 days from creation)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. New Columns on user_launch_status
    - `awaiting_team_setup` (boolean) - true if user delegated setup
    - `setup_completed_by` (uuid) - ID of the admin who completed setup
    - `is_setup_admin` (boolean) - true if user was invited as setup admin
    - `simplified_onboarding_completed` (boolean) - true after simplified tour
  
  3. Security
    - Enable RLS on setup_delegation table
    - Policies for team members and delegating users
*/

-- Create setup_delegation table
CREATE TABLE IF NOT EXISTS setup_delegation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  delegating_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegated_to_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending_invite' CHECK (status IN ('pending_invite', 'accepted', 'in_progress', 'completed', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint (one active delegation per team)
CREATE UNIQUE INDEX IF NOT EXISTS setup_delegation_team_active_idx 
  ON setup_delegation(team_id) 
  WHERE status NOT IN ('cancelled', 'completed');

-- Enable RLS
ALTER TABLE setup_delegation ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view delegations for their team
CREATE POLICY "Users can view team delegations"
  ON setup_delegation
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create delegations for their team
CREATE POLICY "Users can create delegations"
  ON setup_delegation
  FOR INSERT
  TO authenticated
  WITH CHECK (
    delegating_user_id = auth.uid() AND
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their own delegations
CREATE POLICY "Users can update own delegations"
  ON setup_delegation
  FOR UPDATE
  TO authenticated
  USING (delegating_user_id = auth.uid())
  WITH CHECK (delegating_user_id = auth.uid());

-- Policy: Users can delete their own delegations
CREATE POLICY "Users can delete own delegations"
  ON setup_delegation
  FOR DELETE
  TO authenticated
  USING (delegating_user_id = auth.uid());

-- Add columns to user_launch_status if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_launch_status' AND column_name = 'awaiting_team_setup'
  ) THEN
    ALTER TABLE user_launch_status ADD COLUMN awaiting_team_setup boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_launch_status' AND column_name = 'setup_completed_by'
  ) THEN
    ALTER TABLE user_launch_status ADD COLUMN setup_completed_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_launch_status' AND column_name = 'is_setup_admin'
  ) THEN
    ALTER TABLE user_launch_status ADD COLUMN is_setup_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_launch_status' AND column_name = 'simplified_onboarding_completed'
  ) THEN
    ALTER TABLE user_launch_status ADD COLUMN simplified_onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create updated_at trigger for setup_delegation
CREATE OR REPLACE FUNCTION update_setup_delegation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS setup_delegation_updated_at ON setup_delegation;
CREATE TRIGGER setup_delegation_updated_at
  BEFORE UPDATE ON setup_delegation
  FOR EACH ROW
  EXECUTE FUNCTION update_setup_delegation_updated_at();

-- Enable realtime for setup_delegation
ALTER PUBLICATION supabase_realtime ADD TABLE setup_delegation;
