/*
  # Add Report Templates with Data Requirements

  1. Changes
    - Add required_data_types column to astra_report_templates
    - Update existing templates with their data requirements
    - Add new context-aware report templates

  2. New Templates
    - Weekly Strategy Review (requires strategy data)
    - Strategic Execution Review (requires meetings + strategy)
    - Strategic Financial Alignment (requires financial + strategy)
    - Comprehensive Business Review (requires all three)

  3. Notes
    - required_data_types is an array of strings
    - Empty array means no specific data requirement
    - Templates only shown if user has required data types synced
*/

-- Add required_data_types column
ALTER TABLE astra_report_templates 
ADD COLUMN IF NOT EXISTS required_data_types TEXT[] DEFAULT '{}';

-- Update existing templates with their data requirements
UPDATE astra_report_templates 
SET required_data_types = ARRAY['meetings']
WHERE name = 'Weekly Action Items';

UPDATE astra_report_templates 
SET required_data_types = ARRAY['financial']
WHERE name = 'Monthly Financial Analysis';

UPDATE astra_report_templates 
SET required_data_types = ARRAY[]::TEXT[]
WHERE name = 'Daily News Brief';

-- Insert new context-aware templates
INSERT INTO astra_report_templates (name, description, prompt_template, icon, default_schedule, default_time, required_data_types, is_active)
VALUES 
  (
    'Weekly Strategy Review',
    'Review strategic progress and priorities',
    'Provide a weekly summary of our strategic priorities, recent progress, and recommended focus areas for the coming week based on our strategy documents.',
    '🎯',
    'weekly',
    '08:00',
    ARRAY['strategy'],
    true
  ),
  (
    'Strategic Execution Review',
    'How well meetings align with strategic goals',
    'Analyze how our recent meetings and discussions align with our strategic priorities. Highlight areas of strong alignment and gaps that need attention.',
    '🎯',
    'weekly',
    '08:00',
    ARRAY['meetings', 'strategy'],
    true
  ),
  (
    'Strategic Financial Alignment',
    'Evaluate spending alignment with strategic goals',
    'Review our financial data and evaluate how our spending and resource allocation aligns with our mission, core values, and strategic goals. Identify opportunities for better alignment.',
    '💰',
    'monthly',
    '08:00',
    ARRAY['financial', 'strategy'],
    true
  ),
  (
    'Comprehensive Business Review',
    'Full business overview: strategy, execution, and finances',
    'Generate a comprehensive business review covering: 1) Strategic priorities and goals, 2) Execution progress from recent meetings, 3) Financial health and alignment. Provide recommendations for improvement.',
    '📊',
    'weekly',
    '08:00',
    ARRAY['meetings', 'strategy', 'financial'],
    true
  )
ON CONFLICT DO NOTHING;