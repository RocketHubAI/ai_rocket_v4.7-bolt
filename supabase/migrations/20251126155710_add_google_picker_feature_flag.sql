/*
  # Add Google Picker Feature Flag
  
  1. New Table
    - `feature_flags` - Controls which users have access to beta features
    
  2. Initial Data
    - Enable Google Picker for clay@rockethub.ai
    
  3. Security
    - RLS policies for reading feature flags
*/

-- Create feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  enabled boolean DEFAULT true,
  enabled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, feature_name)
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Users can read their own feature flags
CREATE POLICY "Users can view own feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admins can manage all feature flags
CREATE POLICY "Super admins can manage all feature flags"
  ON feature_flags
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- Enable Google Picker for clay@rockethub.ai
INSERT INTO feature_flags (user_id, feature_name, enabled)
SELECT 
  id,
  'google_picker_folder_selection',
  true
FROM auth.users
WHERE email = 'clay@rockethub.ai'
ON CONFLICT (user_id, feature_name) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_user_feature 
  ON feature_flags(user_id, feature_name);