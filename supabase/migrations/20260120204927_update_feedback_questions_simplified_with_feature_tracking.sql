/*
  # Update Feedback Questions - Simplified with Feature Tracking

  1. Changes
    - Add `requires_feature` column to link questions to user feature usage
    - Update all question text to be simpler and more direct
    - Deactivate mobile and support questions
    - Update drive question to reference both Google and Microsoft
    - Questions will only show if user has used the related feature

  2. Feature Requirements Mapping
    - usability: no feature required (core question)
    - value: ask_astra (needs to have used chat)
    - core_value: drive_sync (needs to have synced documents)
    - reports: scheduled_reports
    - team_chat: team_chat
    - visualizations: visualizations
    - drive_integration: drive_sync
    - financial_data: requires_financial_access (already exists)
    - ai_quality: ask_astra
    - nps: no feature required (core question)
    - launch_prep: no feature required (all launched users saw this)
    - fuel_points: no feature required (all users see fuel points)
*/

-- Add requires_feature column
ALTER TABLE feedback_questions 
ADD COLUMN IF NOT EXISTS requires_feature text;

-- Update questions with simplified text and feature requirements

-- 1. Usability (core question - no feature required)
UPDATE feedback_questions
SET 
  question_text = 'How easy is Astra to use?',
  requires_feature = NULL
WHERE category = 'usability';

-- 2. Value (requires ask_astra)
UPDATE feedback_questions
SET 
  question_text = 'How valuable are Astra''s insights for your work?',
  requires_feature = 'ask_astra'
WHERE category = 'value';

-- 3. Core Value (requires drive_sync)
UPDATE feedback_questions
SET 
  question_text = 'How well does Astra understand your synced documents?',
  requires_feature = 'drive_sync'
WHERE category = 'core_value';

-- 4. Reports (requires scheduled_reports)
UPDATE feedback_questions
SET 
  question_text = 'How useful are the scheduled reports?',
  requires_feature = 'scheduled_reports'
WHERE category = 'reports';

-- 5. Team Chat (requires team_chat)
UPDATE feedback_questions
SET 
  question_text = 'How helpful is AI assistance in team chat?',
  requires_feature = 'team_chat'
WHERE category = 'team_chat';

-- 6. Visualizations (requires visualizations)
UPDATE feedback_questions
SET 
  question_text = 'How useful are the AI-generated charts and graphs?',
  requires_feature = 'visualizations'
WHERE category = 'visualizations';

-- 7. Drive Integration (requires drive_sync) - Updated to mention both providers
UPDATE feedback_questions
SET 
  question_text = 'How easy was it to sync your Google or Microsoft Drive?',
  requires_feature = 'drive_sync'
WHERE category = 'drive_integration';

-- 8. Financial Data (already has requires_financial_access)
UPDATE feedback_questions
SET 
  question_text = 'How useful are insights on your financial data?',
  requires_feature = 'ask_astra'
WHERE category = 'financial_data';

-- 9. Mobile - DEACTIVATE
UPDATE feedback_questions
SET is_active = false
WHERE category = 'mobile';

-- 10. AI Quality (requires ask_astra)
UPDATE feedback_questions
SET 
  question_text = 'How accurate are Astra''s responses?',
  requires_feature = 'ask_astra'
WHERE category = 'ai_quality';

-- 11. Support - DEACTIVATE
UPDATE feedback_questions
SET is_active = false
WHERE category = 'support';

-- 12. NPS (core question - no feature required)
UPDATE feedback_questions
SET 
  question_text = 'How likely are you to recommend Astra?',
  requires_feature = NULL
WHERE category = 'nps';

-- 13. Launch Prep (no feature required - all launched users did this)
UPDATE feedback_questions
SET 
  question_text = 'How helpful was the launch preparation process?',
  requires_feature = NULL
WHERE category = 'launch_prep';

-- 14. Fuel Points (no feature required - all users see this)
UPDATE feedback_questions
SET 
  question_text = 'How motivating is the Fuel Points system?',
  requires_feature = NULL
WHERE category = 'fuel_points';

-- Add comment for documentation
COMMENT ON COLUMN feedback_questions.requires_feature IS 'Feature key from user_feature_usage table that user must have used to see this question. NULL means always show.';