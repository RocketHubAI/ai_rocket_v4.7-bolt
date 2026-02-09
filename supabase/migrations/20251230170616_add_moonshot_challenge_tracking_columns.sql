/*
  # Moonshot Challenge Enhanced Tracking

  Adds comprehensive tracking columns to moonshot_registrations to support:
  - Distinguishing between new form registrations and auto-enrolled existing teams
  - Linking registrations to teams and users
  - Tracking challenge onboarding and participation status

  ## 1. Schema Changes

  ### moonshot_registrations - New Columns
  - `source` (text) - Registration source: 'new' (form submission) or 'existing' (auto-enrolled team)
  - `team_id` (uuid) - Links to teams table for existing users
  - `user_id` (uuid) - The user who registered (null for anonymous)
  - `onboarding_completed` (boolean) - Whether challenge onboarding is done
  - `challenge_started_at` (timestamptz) - When they started participating

  ## 2. Indexes
  - Index on team_id for efficient team lookups
  - Index on source for filtering by registration type

  ## 3. Notes
  - Existing registrations will default to source='new'
  - team_id and user_id are nullable to support anonymous registrations
  - All existing teams will be auto-enrolled on Jan 15 with source='existing'
*/

-- Add source column to track registration origin
ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'new';

-- Add team_id to link to existing teams
ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- Add user_id to link to registering user
ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add onboarding tracking
ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add challenge participation timestamp
ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS challenge_started_at timestamptz;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_moonshot_registrations_team_id 
ON moonshot_registrations(team_id);

CREATE INDEX IF NOT EXISTS idx_moonshot_registrations_source 
ON moonshot_registrations(source);

CREATE INDEX IF NOT EXISTS idx_moonshot_registrations_user_id 
ON moonshot_registrations(user_id);

-- Add constraint to ensure valid source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'moonshot_registrations_source_check'
  ) THEN
    ALTER TABLE moonshot_registrations 
    ADD CONSTRAINT moonshot_registrations_source_check 
    CHECK (source IN ('new', 'existing'));
  END IF;
END $$;
