/*
  # Update Feedback Questions for AI Data Sync and Launch Features

  1. Updated Questions
    - Question 3: Updated to reference "synced data" instead of "connected data"
    - Question 7: Updated to focus on "AI Data Sync process" instead of just Google Drive integration

  2. New Questions
    - Question 13: "How helpful was the Mission Control launch preparation flow in getting your team set up?" (launch_prep category)
    - Question 14: "How motivating is the Fuel Points system in encouraging you to explore Astra's features?" (fuel_points category)

  3. Question Filtering
    - Added 'requires_financial_access' column to filter financial questions for users without access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_questions' AND column_name = 'requires_financial_access'
  ) THEN
    ALTER TABLE feedback_questions ADD COLUMN requires_financial_access boolean DEFAULT false;
  END IF;
END $$;

UPDATE feedback_questions
SET question_text = 'How effectively does Astra leverage your synced data to provide comprehensive intelligence across your documents?'
WHERE category = 'core_value' AND question_text LIKE '%connected data%';

UPDATE feedback_questions
SET question_text = 'How seamless was the AI Data Sync process for connecting your Google Drive folders?'
WHERE category = 'drive_integration';

UPDATE feedback_questions
SET requires_financial_access = true
WHERE category = 'financial_data';

INSERT INTO feedback_questions (question_text, category, sort_order, is_active, requires_financial_access)
SELECT 'How helpful was the Mission Control launch preparation flow in getting your team set up?', 'launch_prep', 13, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM feedback_questions WHERE category = 'launch_prep'
);

INSERT INTO feedback_questions (question_text, category, sort_order, is_active, requires_financial_access)
SELECT 'How motivating is the Fuel Points system in encouraging you to explore Astra features?', 'fuel_points', 14, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM feedback_questions WHERE category = 'fuel_points'
);
