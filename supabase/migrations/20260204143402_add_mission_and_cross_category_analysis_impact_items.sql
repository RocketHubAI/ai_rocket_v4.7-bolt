/*
  # Add Mission Analysis and Cross-Category Analysis Impact Items

  1. New Impact Items
    - `analyze_mission_values` (priority 2): Analyze team's mission, core values, and goals
    - `cross_category_analysis` (priority 3): Cross-analyze data from multiple categories
  
  2. Changes
    - Shift existing items down by 2 priority ranks to make room
    - Both new items direct users to Agent Chat for powerful data analysis
*/

-- Shift existing priorities down by 2 to make room for new items at positions 2 and 3
UPDATE user_impact_items 
SET priority_rank = priority_rank + 2 
WHERE priority_rank >= 2;

-- Insert new mission analysis item at priority 2
INSERT INTO user_impact_items (feature_key, feature_name, feature_description, priority_rank, category, action_type, action_target, feature_status)
VALUES (
  'analyze_mission_values',
  'Analyze Mission, Values & Goals',
  'Have the Team Agent analyze your team''s mission statement, core values, and goals from your synced strategy documents. Get AI-powered insights on alignment and recommendations.',
  2,
  'analysis',
  'send_to_agent',
  'agent-chat',
  'active'
);

-- Insert new cross-category analysis item at priority 3
INSERT INTO user_impact_items (feature_key, feature_name, feature_description, priority_rank, category, action_type, action_target, feature_status)
VALUES (
  'cross_category_analysis',
  'Cross-Analyze Your Data',
  'Have the Team Agent cross-analyze data from multiple categories (Strategy + Meetings, Financial + Projects, etc.) to uncover insights across your business data.',
  3,
  'analysis',
  'send_to_agent',
  'agent-chat',
  'active'
);

-- Update existing users' impact progress with new items
INSERT INTO user_impact_progress (user_id, team_id, feature_key, custom_priority)
SELECT 
  u.id,
  u.team_id,
  i.feature_key,
  i.priority_rank
FROM public.users u
CROSS JOIN user_impact_items i
WHERE u.team_id IS NOT NULL
  AND i.feature_key IN ('analyze_mission_values', 'cross_category_analysis')
ON CONFLICT (user_id, feature_key) DO NOTHING;