/*
  # Add Email-Based Feature Flag Support

  1. Changes
    - Add optional `email` column to feature_flags table
    - Add check constraint to ensure either user_id OR email is provided
    - Add email-based RLS policy for unauthenticated users during signup
    - Enable Google Picker for clayspeakman@gmail.com (testing onboarding)

  2. Security
    - Email-based flags work even before user signs up
    - Once user signs up, migrate email flag to user_id flag
*/

-- Add email column to feature_flags (nullable, for pre-signup feature flags)
ALTER TABLE feature_flags
ADD COLUMN IF NOT EXISTS email text;

-- Add check constraint: must have either user_id OR email (not both, not neither)
ALTER TABLE feature_flags
ADD CONSTRAINT feature_flags_identifier_check
CHECK (
  (user_id IS NOT NULL AND email IS NULL) OR
  (user_id IS NULL AND email IS NOT NULL)
);

-- Drop old unique constraint and create new one that handles both cases
ALTER TABLE feature_flags
DROP CONSTRAINT IF EXISTS feature_flags_user_id_feature_name_key;

-- Create unique constraint for user_id + feature_name
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_user_id_feature_name_unique
  ON feature_flags(user_id, feature_name)
  WHERE user_id IS NOT NULL;

-- Create unique constraint for email + feature_name
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_email_feature_name_unique
  ON feature_flags(email, feature_name)
  WHERE email IS NOT NULL;

-- Add RLS policy for email-based feature flags (works during signup)
CREATE POLICY "Users can view feature flags by email"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (
    email IS NOT NULL AND
    (auth.jwt()->>'email') = email
  );

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_email_feature
  ON feature_flags(email, feature_name)
  WHERE email IS NOT NULL;

-- Enable Google Picker for clayspeakman@gmail.com (testing user)
INSERT INTO feature_flags (email, feature_name, enabled)
VALUES ('clayspeakman@gmail.com', 'google_picker_folder_selection', true)
ON CONFLICT DO NOTHING;

-- Create function to migrate email-based flags to user_id flags on signup
CREATE OR REPLACE FUNCTION migrate_email_feature_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Move any email-based feature flags to user_id based flags
  INSERT INTO feature_flags (user_id, feature_name, enabled, enabled_at)
  SELECT
    NEW.id,
    feature_name,
    enabled,
    enabled_at
  FROM feature_flags
  WHERE email = NEW.email
  ON CONFLICT (user_id, feature_name)
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    enabled_at = EXCLUDED.enabled_at;

  -- Delete the old email-based flags
  DELETE FROM feature_flags
  WHERE email = NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run migration on user signup
DROP TRIGGER IF EXISTS migrate_feature_flags_on_signup ON auth.users;
CREATE TRIGGER migrate_feature_flags_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION migrate_email_feature_flags();
