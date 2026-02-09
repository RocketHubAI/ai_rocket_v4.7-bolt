/*
  # Create Scheduled Task Templates

  1. New Tables
    - `scheduled_task_templates`
      - `id` (uuid, primary key)
      - `category` (text) - grouping category like 'productivity', 'research', 'team', 'growth'
      - `title` (text) - display title
      - `description` (text) - what this task does
      - `task_type` (text) - maps to scheduled_tasks.task_type (reminder, research, report, check_in, custom)
      - `default_schedule_type` (text) - daily, weekly, monthly
      - `default_schedule_time` (text) - e.g. '09:00'
      - `default_schedule_day` (text) - e.g. 'monday' for weekly
      - `ai_prompt_template` (text) - the AI prompt with {placeholders}
      - `icon` (text) - lucide icon name
      - `color` (text) - tailwind color name
      - `is_popular` (boolean) - show in featured section
      - `sort_order` (integer) - display order within category
      - `is_active` (boolean) - whether template is available

  2. Security
    - Enable RLS on `scheduled_task_templates`
    - Allow all authenticated users to read templates
*/

CREATE TABLE IF NOT EXISTS scheduled_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  task_type text NOT NULL DEFAULT 'custom',
  default_schedule_type text NOT NULL DEFAULT 'weekly',
  default_schedule_time text NOT NULL DEFAULT '09:00',
  default_schedule_day text,
  ai_prompt_template text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Sparkles',
  color text NOT NULL DEFAULT 'blue',
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active templates"
  ON scheduled_task_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

INSERT INTO scheduled_task_templates (category, title, description, task_type, default_schedule_type, default_schedule_time, default_schedule_day, ai_prompt_template, icon, color, is_popular, sort_order) VALUES
('productivity', 'Morning Goal Review', 'Start your day with a review of your top priorities and goals', 'check_in', 'daily', '08:00', NULL, 'Review my current goals and priorities. Give me a brief, motivating summary of what I should focus on today based on my team data and recent activity.', 'Target', 'emerald', true, 1),
('productivity', 'Weekly Progress Summary', 'Get a weekly recap of what was accomplished and what needs attention', 'report', 'weekly', '17:00', 'friday', 'Generate a weekly progress summary for my team. Include key accomplishments, pending items, and areas that need attention heading into next week.', 'BarChart3', 'blue', true, 2),
('productivity', 'Daily Task Prioritizer', 'AI analyzes your workload and suggests the optimal task order', 'check_in', 'daily', '07:30', NULL, 'Based on my current tasks, deadlines, and team priorities, suggest the optimal order to tackle my work today. Consider urgency, importance, and energy levels.', 'ListOrdered', 'cyan', false, 3),
('productivity', 'End-of-Day Reflection', 'Guided reflection on daily wins and lessons learned', 'check_in', 'daily', '17:30', NULL, 'Help me reflect on today. Ask about my biggest win, what I learned, and what I would do differently. Keep it brief and encouraging.', 'Sunset', 'amber', false, 4),

('research', 'Industry News Digest', 'Stay current with AI-curated industry news and trends', 'research', 'daily', '07:00', NULL, 'Search for the latest news and developments relevant to my industry and business. Summarize the top 3-5 most important stories and explain why they matter to my team.', 'Newspaper', 'blue', true, 1),
('research', 'Competitive Intelligence Brief', 'Regular monitoring of competitor activities and market shifts', 'research', 'weekly', '09:00', 'monday', 'Research recent competitor activities, product launches, and market shifts in my industry. Provide a brief competitive intelligence summary with actionable insights.', 'Search', 'cyan', true, 2),
('research', 'Best Practices Update', 'Discover new best practices and strategies in your field', 'research', 'weekly', '10:00', 'wednesday', 'Research the latest best practices, frameworks, and strategies relevant to my business goals and team mission. Focus on actionable insights I can implement this week.', 'BookOpen', 'teal', false, 3),
('research', 'Technology Trends Monitor', 'Track emerging technologies that could impact your business', 'research', 'weekly', '09:00', 'thursday', 'Research emerging technology trends that could impact my business or industry. Summarize the most relevant developments and suggest how we might leverage or prepare for them.', 'Cpu', 'emerald', false, 4),

('team', 'Team Alignment Check', 'Ensure team activities align with mission and core values', 'check_in', 'weekly', '09:00', 'monday', 'Review our team activities from the past week against our stated mission and core values. Are we staying aligned? Flag any drift and suggest corrections.', 'Users', 'emerald', true, 1),
('team', 'Meeting Insights Digest', 'AI summary of key takeaways from recent meetings', 'report', 'weekly', '08:00', 'monday', 'Summarize the key takeaways, action items, and decisions from our team meetings in the past week. Highlight anything that needs follow-up.', 'MessageSquare', 'blue', false, 2),
('team', 'Strategy Document Review', 'Regular review of strategy documents for relevance', 'report', 'monthly', '10:00', NULL, 'Review our team strategy documents and assess their current relevance. Are our strategic priorities still aligned with market conditions? Suggest any updates needed.', 'FileText', 'amber', false, 3),

('growth', 'Goal Progress Tracker', 'Regular check on progress toward quarterly and annual goals', 'report', 'weekly', '09:00', 'friday', 'Check progress on our quarterly and annual goals. What percentage are we toward each target? Which goals are on track, at risk, or behind? Suggest adjustments.', 'TrendingUp', 'emerald', true, 1),
('growth', 'Learning & Development Prompt', 'Curated learning recommendations based on your goals', 'research', 'weekly', '08:00', 'tuesday', 'Based on my goals and current skill gaps, suggest 2-3 specific learning resources, articles, or exercises I should focus on this week to grow professionally.', 'GraduationCap', 'blue', false, 2),
('growth', 'Monthly Business Health Check', 'Comprehensive monthly assessment of business performance', 'report', 'monthly', '09:00', NULL, 'Conduct a comprehensive health check of our business based on available data. Cover financial indicators, team productivity, goal progress, and market positioning. Provide a letter grade and top 3 recommendations.', 'HeartPulse', 'red', true, 3),
('growth', 'Opportunity Scanner', 'AI scans for new opportunities aligned with your mission', 'research', 'weekly', '10:00', 'wednesday', 'Scan for new business opportunities, partnerships, or market gaps that align with our team mission and strengths. Provide 2-3 specific opportunities with a brief action plan for each.', 'Radar', 'cyan', false, 4);
