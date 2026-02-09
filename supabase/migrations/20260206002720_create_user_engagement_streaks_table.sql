/*
  # Create user engagement streaks tracking

  1. New Tables
    - `user_engagement_streaks`
      - `user_id` (uuid, primary key, FK to auth.users)
      - `current_streak` (integer) - consecutive days of assistant usage
      - `longest_streak` (integer) - all-time best streak
      - `last_active_date` (date) - last day the user interacted with assistant
      - `total_sessions` (integer) - total number of assistant sessions
      - `streak_milestones_shown` (jsonb) - track which milestone messages were displayed
      - `last_doc_count` (integer) - document count at last visit (for proactive nudges)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `update_user_engagement_streak` - RPC to update streak on each visit

  3. Security
    - RLS enabled
    - Users can read/update their own row
*/

CREATE TABLE IF NOT EXISTS user_engagement_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 1,
  longest_streak integer NOT NULL DEFAULT 1,
  last_active_date date NOT NULL DEFAULT CURRENT_DATE,
  total_sessions integer NOT NULL DEFAULT 1,
  streak_milestones_shown jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_doc_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_engagement_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own engagement streaks"
  ON user_engagement_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement streaks"
  ON user_engagement_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement streaks"
  ON user_engagement_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_user_engagement_streak(
  p_user_id uuid,
  p_current_doc_count integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_streak record;
  v_today date := CURRENT_DATE;
  v_new_streak integer;
  v_is_new_day boolean := false;
  v_docs_changed integer := 0;
BEGIN
  SELECT * INTO v_streak FROM user_engagement_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_engagement_streaks (user_id, current_streak, longest_streak, last_active_date, total_sessions, last_doc_count)
    VALUES (p_user_id, 1, 1, v_today, 1, p_current_doc_count);

    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'total_sessions', 1,
      'is_new_day', true,
      'docs_changed', 0,
      'days_away', 0
    );
  END IF;

  v_is_new_day := v_streak.last_active_date < v_today;
  v_docs_changed := p_current_doc_count - COALESCE(v_streak.last_doc_count, 0);

  IF v_is_new_day THEN
    IF v_streak.last_active_date = v_today - 1 THEN
      v_new_streak := v_streak.current_streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;

    UPDATE user_engagement_streaks SET
      current_streak = v_new_streak,
      longest_streak = GREATEST(v_streak.longest_streak, v_new_streak),
      last_active_date = v_today,
      total_sessions = v_streak.total_sessions + 1,
      last_doc_count = p_current_doc_count,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'current_streak', v_new_streak,
      'longest_streak', GREATEST(v_streak.longest_streak, v_new_streak),
      'total_sessions', v_streak.total_sessions + 1,
      'is_new_day', true,
      'docs_changed', v_docs_changed,
      'days_away', (v_today - v_streak.last_active_date)
    );
  ELSE
    UPDATE user_engagement_streaks SET
      total_sessions = v_streak.total_sessions + 1,
      last_doc_count = p_current_doc_count,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'current_streak', v_streak.current_streak,
      'longest_streak', v_streak.longest_streak,
      'total_sessions', v_streak.total_sessions + 1,
      'is_new_day', false,
      'docs_changed', v_docs_changed,
      'days_away', 0
    );
  END IF;
END;
$$;