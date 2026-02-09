/*
  # Create Assistant Feedback Log and Friday Check-in Cron

  1. New Tables
    - `assistant_conversation_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `batch_id` (text) - links to the overnight batch that prompted feedback
      - `source` (text) - 'daily_overnight' or 'weekly_checkin'
      - `feedback_message` (text) - the user's conversational feedback
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `assistant_conversation_feedback` table
    - Users can insert and view their own feedback

  3. Cron Job
    - Weekly Friday 1pm EST (6pm UTC) check-in cron job
*/

CREATE TABLE IF NOT EXISTS assistant_conversation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  batch_id text,
  source text NOT NULL DEFAULT 'daily_overnight',
  feedback_message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assistant_conversation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON assistant_conversation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON assistant_conversation_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Friday 1pm EST = Friday 6pm UTC = cron: 0 18 * * 5
SELECT cron.schedule(
  'weekly-assistant-checkin-friday-1pm-est',
  '0 18 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://qdrtpkamfwoerpratcrg.supabase.co/functions/v1/process-weekly-checkin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'REDACTED_USE_VAULT_SECRETS'
    ),
    body := '{}'::jsonb
  );
  $$
);
