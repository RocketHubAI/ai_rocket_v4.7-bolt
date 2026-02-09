/*
  # Feedback System - Core Tables

  ## Overview
  Implements a rotating daily feedback system where users rate 3 random questions (1-10 scale)
  with optional comments. Prompts appear every 24 hours and are mandatory.

  ## New Tables

  ### `feedback_questions`
  Stores the pool of rotating questions that users can be asked.
  - `id` (uuid, primary key)
  - `question_text` (text) - The actual question to display
  - `category` (text) - Question category (usability, value, features, nps, etc.)
  - `sort_order` (integer) - For consistent rotation order
  - `is_active` (boolean) - Whether to include in rotation
  - `created_at` (timestamptz)

  ### `user_feedback_submissions`
  Tracks each complete feedback submission (3 questions answered).
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users)
  - `team_id` (uuid, FK to teams)
  - `submitted_at` (timestamptz)
  - `created_at` (timestamptz)

  ### `user_feedback_answers`
  Individual question answers within a submission.
  - `id` (uuid, primary key)
  - `submission_id` (uuid, FK to user_feedback_submissions)
  - `question_id` (uuid, FK to feedback_questions)
  - `rating` (integer, 1-10)
  - `comment` (text, nullable) - Optional explanation
  - `created_at` (timestamptz)

  ### `user_feedback_status`
  Tracks when each user should see the next feedback prompt.
  - `user_id` (uuid, primary key, FK to auth.users)
  - `last_feedback_at` (timestamptz)
  - `next_feedback_due` (timestamptz)
  - `feedback_count` (integer) - Total submissions
  - `last_questions_shown` (uuid[]) - Array of last 3 question IDs to avoid immediate repeats
  - `onboarded_at` (timestamptz) - When user first used app
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only insert/view their own feedback
  - Admins can view all team feedback
*/

-- Create feedback_questions table
CREATE TABLE IF NOT EXISTS feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  category text NOT NULL,
  sort_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_feedback_submissions table
CREATE TABLE IF NOT EXISTS user_feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create user_feedback_answers table
CREATE TABLE IF NOT EXISTS user_feedback_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES user_feedback_submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES feedback_questions(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Create user_feedback_status table
CREATE TABLE IF NOT EXISTS user_feedback_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_feedback_at timestamptz,
  next_feedback_due timestamptz,
  feedback_count integer DEFAULT 0,
  last_questions_shown uuid[] DEFAULT ARRAY[]::uuid[],
  onboarded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON user_feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_team_id ON user_feedback_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_submitted_at ON user_feedback_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_submission_id ON user_feedback_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_question_id ON user_feedback_answers(question_id);

-- Enable RLS
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_questions (everyone can read active questions)
CREATE POLICY "Anyone can read active questions"
  ON feedback_questions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_feedback_submissions
CREATE POLICY "Users can insert own submissions"
  ON user_feedback_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own submissions"
  ON user_feedback_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view team submissions"
  ON user_feedback_submissions
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_feedback_answers
CREATE POLICY "Users can insert own answers"
  ON user_feedback_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submission_id IN (
      SELECT id FROM user_feedback_submissions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own answers"
  ON user_feedback_answers
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM user_feedback_submissions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view team answers"
  ON user_feedback_answers
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT s.id FROM user_feedback_submissions s
      INNER JOIN users u ON u.id = auth.uid()
      WHERE s.team_id = u.team_id AND u.role = 'admin'
    )
  );

-- RLS Policies for user_feedback_status
CREATE POLICY "Users can read own status"
  ON user_feedback_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own status"
  ON user_feedback_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
  ON user_feedback_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert the 12 rotating questions
INSERT INTO feedback_questions (question_text, category, sort_order) VALUES
  ('How effortless and reliable was your experience with Astra AI today?', 'usability', 1),
  ('How well did the insights and analysis provided by Astra AI help you achieve a meaningful outcome today?', 'value', 2),
  ('How effectively did Astra leverage ALL your connected data to provide comprehensive intelligence?', 'core_value', 3),
  ('How useful and actionable were the scheduled reports you received?', 'reports', 4),
  ('How effective was the team chat collaboration with AI assistance?', 'team_chat', 5),
  ('How valuable were the AI-generated visualizations in understanding your data?', 'visualizations', 6),
  ('How well did the Google Drive integration enhance Astra''s ability to provide insights?', 'drive_integration', 7),
  ('How effectively did Astra generate insights and reports on your financial data?', 'financial_data', 8),
  ('How well does Astra AI work on your mobile device?', 'mobile', 9),
  ('How accurate and relevant were Astra''s AI responses to your questions?', 'ai_quality', 10),
  ('How helpful were Astra''s help resources and assistance when you needed support?', 'support', 11),
  ('How likely are you to recommend Astra AI to a colleague or peer?', 'nps', 12);

-- Function to automatically initialize feedback status for new users
CREATE OR REPLACE FUNCTION initialize_user_feedback_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_feedback_status (user_id, onboarded_at, next_feedback_due)
  VALUES (NEW.id, now(), now() + interval '24 hours')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize feedback status on user signup
DROP TRIGGER IF EXISTS on_user_created_init_feedback ON auth.users;
CREATE TRIGGER on_user_created_init_feedback
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_feedback_status();