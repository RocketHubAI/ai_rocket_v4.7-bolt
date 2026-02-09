/*
  # Update User Impact Items Based on AI Rocket Key Features

  1. Changes
    - Clear existing impact items and repopulate with accurate feature list
    - Add all current features from AI_ROCKET_KEY_FEATURES.md
    - Add coming soon features for future access
    - Update descriptions to match official documentation
    - Add feature_status column to track current vs coming soon

  2. Features Added (Priority Order)
    Current Features:
    - AI Data Sync (foundational)
    - Generate AI Report
    - Schedule Automated Reports
    - Invite Team Member
    - Create Visualization
    - View Team Dashboard
    - Create Presentation (Astra Create)
    - Ask Questions (Private AI Assistant)
    - Team Chat Collaboration
    - Configure Category Access
    - View Mission Control

    Coming Soon:
    - Agent Builder
    - AI Specialists
    - Team SOPs
    - Research Projects
*/

-- Add feature_status column if not exists
ALTER TABLE user_impact_items 
ADD COLUMN IF NOT EXISTS feature_status text DEFAULT 'active';

-- Clear and repopulate with accurate features
TRUNCATE user_impact_items CASCADE;

-- Re-add the foreign key safe insert
INSERT INTO user_impact_items (feature_key, feature_name, feature_description, priority_rank, category, action_type, action_target, feature_status) VALUES
  -- FOUNDATIONAL (Priority 1-3)
  ('sync_documents', 'Sync Your Documents', 'Connect Google Drive, Microsoft OneDrive, or upload local files to power Astra with your business knowledge. This is the foundation for all AI features.', 1, 'data', 'navigate', 'fuel-stage', 'active'),
  ('run_first_report', 'Generate Your First AI Report', 'Create an AI-powered report to see insights from your synced data. Reports analyze patterns, extract takeaways, and highlight action items.', 2, 'reports', 'navigate', 'reports', 'active'),
  ('schedule_report', 'Schedule Automated Reports', 'Set up recurring reports delivered to your inbox daily, weekly, or monthly. Stay informed without manual work.', 3, 'reports', 'navigate', 'reports', 'active'),

  -- COLLABORATION (Priority 4-5)
  ('invite_team_member', 'Invite a Team Member', 'Add teammates to collaborate and share AI insights together. Work with your team and AI in shared conversations.', 4, 'team', 'open_modal', 'invite-member', 'active'),
  ('use_team_chat', 'Use Team Chat', 'Collaborate with team members in real-time group chat. @mention teammates and AI for instant insights.', 5, 'team', 'navigate', 'team', 'active'),

  -- INSIGHTS & DASHBOARDS (Priority 6-7)
  ('view_team_dashboard', 'View Team Dashboard', 'Check your AI-generated daily team health snapshot with goals tracking, mission alignment, and health metrics.', 6, 'dashboard', 'navigate', 'team-dashboard', 'active'),
  ('view_mission_control', 'Track Progress in Mission Control', 'View your Launch Points, achievements, and team progress. Track your journey through Fuel, Boosters, and Guidance stages.', 7, 'dashboard', 'navigate', 'mission-control', 'active'),

  -- CREATIVE & VISUALIZATIONS (Priority 8-9)
  ('create_visualization', 'Create a Visualization', 'Turn conversations into actionable insights with AI-generated charts, graphs, and visual reports.', 8, 'visualizations', 'navigate', 'visualizations', 'active'),
  ('create_presentation', 'Create AI Presentation', 'Generate beautiful AI-powered images and presentations from your data using Astra Create. Choose from 15+ content types and multiple styles.', 9, 'creative', 'navigate', 'astra-create', 'active'),

  -- AI INTERACTION (Priority 10-11)
  ('ask_data_question', 'Ask Questions About Your Data', 'Have confidential conversations with AI that understands your business context. Search across all synced documents with natural language.', 10, 'search', 'none', null, 'active'),
  ('customize_agent', 'Customize Agent Preferences', 'Fine-tune how your AI assistant communicates with your team. Set tone, proactivity, and response style.', 11, 'settings', 'none', null, 'active'),

  -- ADMIN FEATURES (Priority 12)
  ('configure_category_access', 'Configure Category Access', 'Control which data categories (Strategy, Meetings, Financial, Projects) team members can access for enhanced data security.', 12, 'settings', 'navigate', 'settings', 'active'),

  -- COMING SOON FEATURES (Priority 13+)
  ('create_agent', 'Build Custom AI Agent', 'Design and deploy custom AI Agents to complete tasks autonomously. Create workflow automations tailored to your business.', 13, 'agents', 'navigate', 'build-agents', 'coming_soon'),
  ('create_specialist', 'Create AI Specialist', 'Create specialized AI team members like Business Coach, Finance Director, or Marketing Manager to handle tasks 24/7.', 14, 'agents', 'navigate', 'specialists', 'coming_soon'),
  ('create_sop', 'Create Team SOPs', 'Create guidance documents and playbooks that help your team stay aligned. Standard Operating Procedures ensure consistency.', 15, 'documentation', 'navigate', 'sops', 'coming_soon'),
  ('start_research_project', 'Start Research Project', 'Launch deep AI research investigations on topics critical to your business with comprehensive multi-source analysis and detailed reports.', 16, 'research', 'navigate', 'research', 'coming_soon');

-- Reinitialize all users with the new impact items
INSERT INTO user_impact_progress (user_id, team_id, feature_key, custom_priority)
SELECT 
  u.id,
  u.team_id,
  i.feature_key,
  i.priority_rank
FROM public.users u
CROSS JOIN user_impact_items i
WHERE u.team_id IS NOT NULL
ON CONFLICT (user_id, feature_key) DO UPDATE SET
  custom_priority = EXCLUDED.custom_priority;