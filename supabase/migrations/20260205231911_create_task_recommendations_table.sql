/*
  # Create Task Recommendations Table

  1. New Tables
    - `task_recommendations`
      - `id` (uuid, primary key)
      - `title` (text) - The suggestion text shown to users
      - `description` (text) - Brief description of what the task does
      - `category` (text) - Category: daily_tasks, analysis, reporting, exploration, general
      - `prompt_text` (text) - The actual prompt text sent to the AI
      - `is_active` (boolean) - Whether this recommendation is currently active
      - `sort_order` (integer) - Display ordering
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `task_recommendations` table
    - Authenticated users can read active recommendations
    - Super admins can manage recommendations

  3. Seed Data
    - 18 task recommendations across 5 categories
*/

CREATE TABLE IF NOT EXISTS task_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  prompt_text text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active recommendations"
  ON task_recommendations
  FOR SELECT
  TO authenticated
  USING (is_active = true);

INSERT INTO task_recommendations (title, description, category, prompt_text, sort_order) VALUES
  ('List my action items from today''s calls', 'Review action items from your most recent meetings and calls', 'daily_tasks', 'List my action items from today''s calls. Look through my recent meeting notes and extract any action items, follow-ups, or commitments that were made.', 1),
  ('Summarize my recent meeting notes', 'Get a quick summary of your latest meeting discussions', 'daily_tasks', 'Summarize my recent meeting notes. Give me the key points, decisions, and outcomes from my latest meetings.', 2),
  ('What decisions were made in our last meetings?', 'Extract key decisions from your recent meeting notes', 'daily_tasks', 'What decisions were made in our last meetings? Pull out all the key decisions and conclusions from our recent meeting notes.', 3),
  ('What follow-ups do I have from this week?', 'Find pending follow-ups and commitments from this week', 'daily_tasks', 'What follow-ups do I have from this week? Search through this week''s meeting notes and documents for any pending follow-ups or commitments.', 4),
  ('Help me prepare for my next meeting', 'Gather relevant context and talking points for your upcoming meeting', 'daily_tasks', 'Help me prepare for my next meeting. Pull together relevant context, recent updates, and suggested talking points from our team data.', 5),
  ('Find action items across all meetings this month', 'Compile all action items from the past month''s meetings', 'daily_tasks', 'Find action items across all meetings this month. Compile a comprehensive list of all action items and commitments from this month''s meeting notes.', 6),
  ('How am I progressing on my goals?', 'Get a status check on your team''s goal progress', 'analysis', 'How am I progressing on my goals? Analyze our strategy documents and meeting notes to assess our progress toward stated goals.', 7),
  ('What are the key themes across my documents?', 'Discover common themes and patterns in your synced data', 'analysis', 'What are the key themes across my documents? Analyze my synced documents and identify the most common themes, topics, and patterns.', 8),
  ('Analyze our strategy documents for insights', 'Deep dive into your strategy docs for actionable insights', 'analysis', 'Analyze our strategy documents for insights. Review our strategy docs and provide actionable insights and recommendations.', 9),
  ('Compare our goals to our actual progress', 'See how your team''s results measure up against stated goals', 'analysis', 'Compare our goals to our actual progress. Cross-reference our stated goals with recent activity and meeting outcomes to assess alignment.', 10),
  ('What trends are emerging in our data?', 'Identify emerging patterns and trends across your documents', 'analysis', 'What trends are emerging in our data? Look across all our synced documents and identify emerging patterns, trends, and noteworthy changes.', 11),
  ('Analyze financial data for key insights', 'Review financial documents for important findings and trends', 'analysis', 'Analyze our financial data for key insights. Review any financial documents, reports, or meeting notes related to finances and highlight important findings.', 12),
  ('Generate a weekly team progress report', 'Create a comprehensive weekly report for your team', 'reporting', 'Generate a weekly team progress report. Create a comprehensive summary of this week''s activities, achievements, and upcoming priorities based on our team data.', 13),
  ('Summarize what happened this week', 'Get a high-level recap of the week''s activities and outcomes', 'reporting', 'Summarize what happened this week. Give me a high-level recap of all activities, meetings, decisions, and outcomes from this week.', 14),
  ('Draft a progress update for stakeholders', 'Create a polished update to share with stakeholders', 'reporting', 'Draft a progress update for stakeholders. Create a professional summary of our recent progress, key achievements, and next steps that I can share.', 15),
  ('What are our team''s top priorities right now?', 'Review and clarify your team''s current priority focus areas', 'general', 'What are our team''s top priorities right now? Based on our strategy documents, meeting notes, and goals, what should we be focusing on?', 16),
  ('Create a visual summary of our team''s data', 'Build charts and infographics from your team''s information', 'exploration', 'Create a visual summary of our team''s data. Build a visualization that highlights our key metrics, progress, and insights.', 17),
  ('Create a presentation from our recent data', 'Build a professional presentation using your team''s latest data', 'exploration', 'Create a presentation from our recent data. Build a professional presentation summarizing our latest insights, progress, and key findings.', 18);
