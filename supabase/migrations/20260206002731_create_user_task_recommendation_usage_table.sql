/*
  # Create user task recommendation usage tracking

  1. New Tables
    - `user_task_recommendation_usage`
      - `user_id` (uuid, FK to auth.users)
      - `recommendation_id` (uuid, FK to task_recommendations)
      - `times_shown` (integer) - how many times this was shown to user
      - `times_used` (integer) - how many times user selected this
      - `last_shown_at` (timestamptz) - when it was last shown
      - `last_used_at` (timestamptz) - when it was last used
      - Primary key on (user_id, recommendation_id)

  2. Security
    - RLS enabled
    - Users can read/insert/update their own rows
*/

CREATE TABLE IF NOT EXISTS user_task_recommendation_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id uuid NOT NULL REFERENCES task_recommendations(id) ON DELETE CASCADE,
  times_shown integer NOT NULL DEFAULT 0,
  times_used integer NOT NULL DEFAULT 0,
  last_shown_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  PRIMARY KEY (user_id, recommendation_id)
);

ALTER TABLE user_task_recommendation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recommendation usage"
  ON user_task_recommendation_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendation usage"
  ON user_task_recommendation_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendation usage"
  ON user_task_recommendation_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_task_rec_usage_user_shown
  ON user_task_recommendation_usage(user_id, times_shown ASC);
