/*
  # Update Default Category Access to Include All Categories

  1. Problem
    - Old signup function only created 4 categories (meetings, strategy, projects, financial)
    - System now has 15 categories
    - Team creators should have access to all categories by default

  2. Solution
    - Update create_default_category_access function to include all 15 categories
    - Categories: customer, financial, industry, legal, marketing, meetings,
      operations, other, people, product, projects, reference, sales, strategy, support
*/

CREATE OR REPLACE FUNCTION create_default_category_access(
  p_user_id uuid,
  p_team_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_team_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO user_category_access (user_id, team_id, category, has_access)
  VALUES 
    (p_user_id, p_team_id, 'customer', true),
    (p_user_id, p_team_id, 'financial', true),
    (p_user_id, p_team_id, 'industry', true),
    (p_user_id, p_team_id, 'legal', true),
    (p_user_id, p_team_id, 'marketing', true),
    (p_user_id, p_team_id, 'meetings', true),
    (p_user_id, p_team_id, 'operations', true),
    (p_user_id, p_team_id, 'other', true),
    (p_user_id, p_team_id, 'people', true),
    (p_user_id, p_team_id, 'product', true),
    (p_user_id, p_team_id, 'projects', true),
    (p_user_id, p_team_id, 'reference', true),
    (p_user_id, p_team_id, 'sales', true),
    (p_user_id, p_team_id, 'strategy', true),
    (p_user_id, p_team_id, 'support', true)
  ON CONFLICT (user_id, team_id, category) DO NOTHING;
END;
$$;
