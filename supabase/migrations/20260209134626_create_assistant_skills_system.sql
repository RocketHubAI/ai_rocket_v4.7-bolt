/*
  # Create Assistant Skills System

  Skills are capability modules that enhance what the assistant can do.
  Users activate skills to get specialized help, task suggestions, and proactive insights.

  1. New Tables
    - `assistant_skills` - Skill definitions (registry)
      - `id` (uuid, primary key)
      - `skill_key` (text, unique) - machine-readable identifier
      - `name` (text) - display name
      - `description` (text) - what this skill does
      - `category` (text) - grouping: 'analysis', 'strategy', 'operations', 'creative', 'leadership'
      - `icon` (text) - lucide icon name
      - `color` (text) - tailwind color
      - `capability_areas` (text[]) - what the assistant gets better at
      - `prompt_enhancement` (text) - additional system prompt when skill is active
      - `related_task_templates` (text[]) - IDs of related scheduled_task_templates
      - `related_features` (text[]) - related Agent Tools feature tab IDs
      - `sort_order` (integer) - display order
      - `is_active` (boolean) - whether skill is available

    - `user_active_skills` - Which skills each user has activated
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references auth.users
      - `team_id` (uuid) - references teams
      - `skill_id` (uuid) - references assistant_skills
      - `activated_at` (timestamptz)
      - `usage_count` (integer) - times assistant used this skill
      - `last_used_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - All authenticated users can read skills
    - Users can manage their own active skills
*/

CREATE TABLE IF NOT EXISTS assistant_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'analysis',
  icon text NOT NULL DEFAULT 'Sparkles',
  color text NOT NULL DEFAULT 'blue',
  capability_areas text[] NOT NULL DEFAULT '{}',
  prompt_enhancement text NOT NULL DEFAULT '',
  related_task_templates text[] NOT NULL DEFAULT '{}',
  related_features text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assistant_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active skills"
  ON assistant_skills
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS user_active_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid,
  skill_id uuid NOT NULL REFERENCES assistant_skills(id) ON DELETE CASCADE,
  activated_at timestamptz NOT NULL DEFAULT now(),
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  UNIQUE(user_id, skill_id)
);

ALTER TABLE user_active_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own active skills"
  ON user_active_skills
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can activate skills"
  ON user_active_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill usage"
  ON user_active_skills
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can deactivate own skills"
  ON user_active_skills
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed initial skills

INSERT INTO assistant_skills (skill_key, name, description, category, icon, color, capability_areas, prompt_enhancement, related_features, sort_order) VALUES

('financial-analyst', 'Financial Analyst', 'Enhanced financial analysis, budgeting insights, revenue tracking, and fiscal health assessment based on your synced financial documents.', 'analysis', 'DollarSign', 'emerald',
  ARRAY['financial analysis', 'budget review', 'revenue tracking', 'cost optimization', 'cash flow analysis', 'financial forecasting'],
  'You have the Financial Analyst skill active. When answering questions, proactively look for financial implications, suggest cost-benefit analyses, reference financial documents, and frame insights in terms of ROI and fiscal impact. Use financial terminology appropriately. When relevant, suggest creating financial reports or tracking financial metrics.',
  ARRAY['reports', 'team-dashboard', 'visualizations'],
  1),

('marketing-strategist', 'Marketing Strategist', 'Marketing campaign analysis, audience insights, content strategy recommendations, and brand positioning guidance using your marketing data.', 'strategy', 'Megaphone', 'cyan',
  ARRAY['marketing analysis', 'campaign optimization', 'audience segmentation', 'content strategy', 'brand positioning', 'market trends'],
  'You have the Marketing Strategist skill active. Frame insights through a marketing lens. Suggest audience-centric approaches, recommend content strategies, and proactively identify marketing opportunities in team data. Reference marketing best practices and suggest A/B testing approaches when relevant.',
  ARRAY['reports', 'visualizations', 'research-projects'],
  2),

('competitive-intel', 'Competitive Intelligence', 'Monitor competitor movements, market positioning, industry trends, and strategic opportunities through structured analysis of available data.', 'strategy', 'Radar', 'amber',
  ARRAY['competitor analysis', 'market positioning', 'industry trends', 'SWOT analysis', 'strategic opportunities', 'market gaps'],
  'You have the Competitive Intelligence skill active. When analyzing team data, look for competitive implications. Suggest market positioning strategies, identify potential threats and opportunities, and recommend competitive monitoring tasks. Frame insights in terms of market advantage.',
  ARRAY['research-projects', 'scheduled-tasks', 'reports'],
  3),

('operations-optimizer', 'Operations Optimizer', 'Process improvement insights, workflow analysis, efficiency recommendations, and operational bottleneck identification from your team data.', 'operations', 'Settings', 'blue',
  ARRAY['process improvement', 'workflow optimization', 'efficiency analysis', 'bottleneck identification', 'resource allocation', 'KPI tracking'],
  'You have the Operations Optimizer skill active. Focus on operational efficiency in your responses. Identify process bottlenecks, suggest workflow improvements, and recommend automation opportunities. Frame insights in terms of time saved, efficiency gained, and operational excellence.',
  ARRAY['team-dashboard', 'scheduled-tasks', 'team-agents'],
  4),

('team-coach', 'Team Coach', 'Team dynamics analysis, leadership insights, culture assessment, and people management guidance based on meeting notes and team communications.', 'leadership', 'Heart', 'red',
  ARRAY['team dynamics', 'leadership coaching', 'culture assessment', 'conflict resolution', 'talent development', 'engagement analysis'],
  'You have the Team Coach skill active. Pay attention to team dynamics, morale indicators, and leadership opportunities in the data. Suggest team-building activities, recognition moments, and coaching approaches. Frame insights with empathy and people-first thinking.',
  ARRAY['team', 'team-guidance', 'team-pulse'],
  5),

('growth-hacker', 'Growth Strategist', 'Growth metrics analysis, scaling strategies, user acquisition insights, and expansion opportunity identification from your business data.', 'strategy', 'TrendingUp', 'emerald',
  ARRAY['growth metrics', 'scaling strategy', 'user acquisition', 'retention analysis', 'product-market fit', 'expansion planning'],
  'You have the Growth Strategist skill active. Focus on growth levers and scaling opportunities. Analyze data for growth patterns, suggest experiments, and identify the highest-impact growth initiatives. Frame everything in terms of growth velocity and sustainable scaling.',
  ARRAY['team-dashboard', 'visualizations', 'reports'],
  6),

('content-creator', 'Content Creator', 'Content ideation, writing assistance, messaging strategy, and creative brief generation leveraging your brand voice and team documents.', 'creative', 'Pen', 'pink',
  ARRAY['content ideation', 'copywriting', 'brand voice', 'creative briefs', 'messaging frameworks', 'storytelling'],
  'You have the Content Creator skill active. Help generate creative content ideas, draft copy that matches the team brand voice, and suggest content strategies. Reference existing team documents for tone and messaging consistency. Be creative and suggest compelling narratives.',
  ARRAY['visualizations', 'reports', 'research-projects'],
  7),

('project-manager', 'Project Manager', 'Project tracking, milestone monitoring, deadline management, and resource planning insights from your documents and meeting notes.', 'operations', 'ClipboardList', 'sky',
  ARRAY['project tracking', 'milestone monitoring', 'deadline management', 'resource planning', 'risk assessment', 'stakeholder updates'],
  'You have the Project Manager skill active. Track progress against goals and milestones. Identify risks, suggest contingency plans, and recommend prioritization frameworks. Keep responses structured and actionable with clear next steps and owners.',
  ARRAY['scheduled-tasks', 'team-dashboard', 'team-agents'],
  8),

('innovation-scout', 'Innovation Scout', 'Emerging technology assessment, innovation opportunities, disruption analysis, and forward-thinking strategic recommendations.', 'strategy', 'Lightbulb', 'amber',
  ARRAY['emerging tech', 'innovation opportunities', 'disruption analysis', 'trend forecasting', 'R&D insights', 'future planning'],
  'You have the Innovation Scout skill active. Look for innovation angles and emerging opportunities in the data. Suggest forward-thinking strategies, identify potential disruptions, and recommend exploration of new technologies or approaches. Think 2-5 years ahead.',
  ARRAY['research-projects', 'reports', 'scheduled-tasks'],
  9),

('customer-advocate', 'Customer Advocate', 'Customer insight analysis, satisfaction tracking, feedback interpretation, and customer-centric strategy recommendations.', 'analysis', 'UserCheck', 'teal',
  ARRAY['customer insights', 'satisfaction analysis', 'feedback interpretation', 'journey mapping', 'retention strategies', 'voice of customer'],
  'You have the Customer Advocate skill active. Champion the customer perspective in all analysis. Identify customer pain points, satisfaction drivers, and loyalty opportunities in the data. Suggest customer-centric improvements and frame strategies around customer value.',
  ARRAY['reports', 'team-dashboard', 'visualizations'],
  10);
