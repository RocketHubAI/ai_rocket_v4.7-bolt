/*
  # Add converted_at timestamp for tracking existing user engagement

  Tracks when existing users (auto-enrolled) complete the registration survey.

  ## 1. Schema Changes

  ### moonshot_registrations - New Column
  - `converted_at` (timestamptz) - When an existing user completed the survey form

  ## 2. Usage
  - source='existing' AND converted_at IS NOT NULL = engaged existing users
  - source='existing' AND converted_at IS NULL = passive existing users (auto-enrolled only)
  - source='new' = new registrations from form
*/

ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_moonshot_registrations_converted_at 
ON moonshot_registrations(converted_at) 
WHERE converted_at IS NOT NULL;
