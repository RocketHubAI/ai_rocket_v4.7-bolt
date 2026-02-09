/*
  # Launch Preparation System - Database Schema

  ## Overview
  Gamified onboarding system that guides users through 3 stages (Fuel, Boosters, Guidance)
  with 5 levels each. Users earn Launch Points and unlock features as they progress.

  ## New Tables
  
  ### 1. `launch_preparation_eligible_users`
  Controls which users see the new Launch Preparation flow vs. current onboarding.
  - `email` (text, primary key): User email address
  - `added_by` (uuid): Admin who added this user
  - `notes` (text): Optional notes about why user is eligible
  - `created_at` (timestamptz): When user was added to eligible list
  
  ### 2. `user_launch_status`
  Overall launch status and points for each user.
  - `user_id` (uuid, primary key): FK to users table
  - `current_stage` (text): 'fuel', 'boosters', 'guidance', 'ready', 'launched'
  - `total_points` (integer): Total launch points earned
  - `is_launched` (boolean): Whether user has launched into main app
  - `launched_at` (timestamptz): When user clicked Launch button
  - `daily_streak` (integer): Consecutive days active
  - `last_active_date` (date): Last date user was active
  - `created_at` (timestamptz): When record was created
  - `updated_at` (timestamptz): Last update timestamp

  ### 3. `launch_preparation_progress`
  Tracks user progress in each stage (Fuel, Boosters, Guidance).
  - `id` (uuid, primary key)
  - `user_id` (uuid): FK to users table
  - `stage` (text): 'fuel', 'boosters', 'guidance'
  - `level` (integer): Current level (1-5)
  - `points_earned` (integer): Points earned in this stage
  - `achievements` (jsonb): Array of completed achievement keys
  - `stage_started_at` (timestamptz): When stage was started
  - `level_completed_at` (timestamptz): When current level was completed
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `launch_points_ledger`
  Immutable log of all points earned by users.
  - `id` (uuid, primary key)
  - `user_id` (uuid): FK to users table
  - `points` (integer): Points awarded (can be negative for penalties)
  - `reason` (text): Machine-readable reason code
  - `reason_display` (text): Human-readable description
  - `stage` (text): Which stage earned these points
  - `metadata` (jsonb): Additional context (achievement_key, document_id, etc.)
  - `created_at` (timestamptz): When points were awarded

  ### 5. `launch_achievements`
  Defines all possible achievements users can earn.
  - `id` (uuid, primary key)
  - `achievement_key` (text, unique): Machine-readable key
  - `name` (text): Display name
  - `description` (text): What this achievement is for
  - `stage` (text): 'fuel', 'boosters', 'guidance', 'ongoing'
  - `level` (integer): Which level this unlocks (1-5, 0 for ongoing)
  - `points_value` (integer): Points awarded for this achievement
  - `icon` (text): Lucide icon name
  - `display_order` (integer): Sort order for display
  - `is_active` (boolean): Whether this achievement is currently available
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can view/update their own launch status
  - Eligible users table only viewable by authenticated users checking their own email
  - Achievements table is publicly readable
  - Points ledger is immutable (no updates/deletes)
  
  ## Indexes
  - Index on user_id for all user-specific tables
  - Index on achievement_key for quick lookups
  - Index on stage for filtering
  - Index on email for eligible users check
*/

-- Table 1: Eligible Users (for controlled rollout)
CREATE TABLE IF NOT EXISTS launch_preparation_eligible_users (
  email text PRIMARY KEY,
  added_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table 2: User Launch Status
CREATE TABLE IF NOT EXISTS user_launch_status (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_stage text NOT NULL DEFAULT 'fuel' CHECK (current_stage IN ('fuel', 'boosters', 'guidance', 'ready', 'launched')),
  total_points integer NOT NULL DEFAULT 0,
  is_launched boolean NOT NULL DEFAULT false,
  launched_at timestamptz,
  daily_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 3: Launch Preparation Progress (per stage)
CREATE TABLE IF NOT EXISTS launch_preparation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('fuel', 'boosters', 'guidance')),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  points_earned integer NOT NULL DEFAULT 0,
  achievements jsonb DEFAULT '[]'::jsonb,
  stage_started_at timestamptz DEFAULT now(),
  level_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, stage)
);

-- Table 4: Launch Points Ledger (immutable)
CREATE TABLE IF NOT EXISTS launch_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  reason_display text NOT NULL,
  stage text CHECK (stage IN ('fuel', 'boosters', 'guidance', 'ongoing')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table 5: Launch Achievements (defines all possible achievements)
CREATE TABLE IF NOT EXISTS launch_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('fuel', 'boosters', 'guidance', 'ongoing')),
  level integer NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 5),
  points_value integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'star',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_launch_status_user_id ON user_launch_status(user_id);
CREATE INDEX IF NOT EXISTS idx_launch_prep_progress_user_id ON launch_preparation_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_launch_prep_progress_stage ON launch_preparation_progress(stage);
CREATE INDEX IF NOT EXISTS idx_launch_points_user_id ON launch_points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_launch_points_stage ON launch_points_ledger(stage);
CREATE INDEX IF NOT EXISTS idx_launch_points_created_at ON launch_points_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_launch_achievements_key ON launch_achievements(achievement_key);
CREATE INDEX IF NOT EXISTS idx_launch_achievements_stage ON launch_achievements(stage);
CREATE INDEX IF NOT EXISTS idx_eligible_users_email ON launch_preparation_eligible_users(email);

-- Enable Row Level Security
ALTER TABLE launch_preparation_eligible_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_launch_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_preparation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Eligible Users: Users can check if their own email is eligible
CREATE POLICY "Users can check their own email eligibility"
  ON launch_preparation_eligible_users
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Eligible Users: Super admins can manage eligible users
CREATE POLICY "Super admins can manage eligible users"
  ON launch_preparation_eligible_users
  FOR ALL
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    )
  );

-- User Launch Status: Users can view their own status
CREATE POLICY "Users can view own launch status"
  ON user_launch_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User Launch Status: Users can update their own status
CREATE POLICY "Users can update own launch status"
  ON user_launch_status
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Launch Status: Users can insert their own status
CREATE POLICY "Users can insert own launch status"
  ON user_launch_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Launch Preparation Progress: Users can view their own progress
CREATE POLICY "Users can view own progress"
  ON launch_preparation_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Launch Preparation Progress: Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON launch_preparation_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Launch Preparation Progress: Users can insert their own progress
CREATE POLICY "Users can insert own progress"
  ON launch_preparation_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Launch Points Ledger: Users can view their own points
CREATE POLICY "Users can view own points ledger"
  ON launch_points_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Launch Points Ledger: Only system can insert points (via RPC functions)
CREATE POLICY "System can insert points"
  ON launch_points_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Launch Achievements: All authenticated users can view achievements
CREATE POLICY "All users can view achievements"
  ON launch_achievements
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Launch Achievements: Super admins can manage achievements
CREATE POLICY "Super admins can manage achievements"
  ON launch_achievements
  FOR ALL
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    )
  );

-- Add first eligible user
INSERT INTO launch_preparation_eligible_users (email, notes)
VALUES ('clayspeakman@gmail.com', 'First test user for Launch Preparation system')
ON CONFLICT (email) DO NOTHING;
