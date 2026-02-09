/*
  # Add Alternate Google OAuth App Support

  ## Overview
  Adds support for routing specific users to an alternate Google OAuth app
  when they've hit the 100-user test limit on the primary OAuth app.

  ## 1. Changes to user_drive_connections
    - Add `oauth_app_id` column to track which OAuth app was used
    - Default is 'primary' for existing connections
    - New users routed to 'alternate' will have that stored

  ## 2. Feature Flags
    - Add feature flag entries for users who should use alternate OAuth app
    - Flag name: 'use_alt_google_oauth'

  ## 3. Important Notes
    - The alternate credentials must be set as environment variables:
      - VITE_GOOGLE_CLIENT_ID_ALT (frontend)
      - GOOGLE_CLIENT_ID_ALT (edge functions)
      - GOOGLE_CLIENT_SECRET_ALT (edge functions)
    - Token refresh will use the same OAuth app that was used during initial auth
*/

-- Add oauth_app_id column to track which OAuth app was used for each connection
ALTER TABLE user_drive_connections
ADD COLUMN IF NOT EXISTS oauth_app_id text DEFAULT 'primary';

-- Add index for querying by oauth_app_id
CREATE INDEX IF NOT EXISTS idx_user_drive_connections_oauth_app_id
ON user_drive_connections(oauth_app_id);

-- Add comment explaining the column
COMMENT ON COLUMN user_drive_connections.oauth_app_id IS 'Identifies which Google OAuth app was used (primary or alternate). Used for token refresh.';

-- Insert feature flags for users who should use alternate OAuth app
-- These users will be routed to AI Rocket Test Auth 2
INSERT INTO feature_flags (email, feature_name, enabled)
VALUES 
  ('caleb@turnermangum.com', 'use_alt_google_oauth', true),
  ('dougdiamond0@gmail.com', 'use_alt_google_oauth', true),
  ('jarrodjoplin@gmail.com', 'use_alt_google_oauth', true),
  ('lchan@speedburst.com', 'use_alt_google_oauth', true),
  ('mpdrealestateinvestments@gmail.com', 'use_alt_google_oauth', true),
  ('speed.garrett@gmail.com', 'use_alt_google_oauth', true)
ON CONFLICT DO NOTHING;
