/*
  # Add Support Message Status Tracking

  1. Changes to user_feedback_submissions table
    - Add `status` column (enum: new, in_progress, responded, resolved)
    - Add `admin_response` column for storing admin's response
    - Add `responded_at` timestamp for tracking response time
    - Add `responded_by` uuid to track which admin responded
    - Add `internal_notes` text for private admin notes

  2. Create support_message_history table
    - Track conversation threads for back-and-forth communication
    - Stores message, sender type (admin/user), timestamps
    - Links to original submission

  3. Security
    - Enable RLS on support_message_history
    - Super admins can view and manage all messages
    - Users can view their own message history
    - Only super admins can add admin responses

  4. Indexes
    - Add index on status for filtering
    - Add index on responded_at for analytics
*/

-- Create enum type for support message status
DO $$ BEGIN
  CREATE TYPE support_status AS ENUM ('new', 'in_progress', 'responded', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to user_feedback_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_feedback_submissions
    ADD COLUMN status support_status DEFAULT 'new' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'admin_response'
  ) THEN
    ALTER TABLE user_feedback_submissions
    ADD COLUMN admin_response text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'responded_at'
  ) THEN
    ALTER TABLE user_feedback_submissions
    ADD COLUMN responded_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'responded_by'
  ) THEN
    ALTER TABLE user_feedback_submissions
    ADD COLUMN responded_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE user_feedback_submissions
    ADD COLUMN internal_notes text;
  END IF;
END $$;

-- Create support_message_history table for conversation threads
CREATE TABLE IF NOT EXISTS support_message_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES user_feedback_submissions(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE support_message_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all message history
CREATE POLICY "Super admins can view all message history"
  ON support_message_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'clay@rockethub.ai'
    )
  );

-- Users can view their own message history
CREATE POLICY "Users can view own message history"
  ON support_message_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_feedback_submissions
      WHERE user_feedback_submissions.id = support_message_history.submission_id
      AND user_feedback_submissions.user_id = auth.uid()
    )
  );

-- Only super admins can insert message history
CREATE POLICY "Super admins can insert message history"
  ON support_message_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'clay@rockethub.ai'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status
  ON user_feedback_submissions(status);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_responded_at
  ON user_feedback_submissions(responded_at);

CREATE INDEX IF NOT EXISTS idx_support_history_submission
  ON support_message_history(submission_id, created_at DESC);

-- Update existing support messages to 'new' status if null
UPDATE user_feedback_submissions
SET status = 'new'
WHERE status IS NULL
AND support_type IS NOT NULL;
