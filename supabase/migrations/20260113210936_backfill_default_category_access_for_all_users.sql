/*
  # Backfill Default Category Access for All Users

  1. Problem
    - Users in teams without document_chunks have no category access records
    - The n8n workflow queries user_category_access expecting results
    - Empty results cause workflow failures

  2. Solution
    - Backfill all users with default access to 4 standard categories
    - meetings, strategy, projects, financial
    - Uses ON CONFLICT to preserve any existing access restrictions

  3. Affected Users
    - All users with a team_id who don't have category access records
    - This ensures n8n workflows can always find category access data
*/

-- Backfill all existing users who have a team but missing category access records
INSERT INTO user_category_access (user_id, team_id, category, has_access)
SELECT 
  u.id as user_id,
  u.team_id,
  c.category,
  true as has_access
FROM public.users u
CROSS JOIN (
  VALUES ('meetings'), ('strategy'), ('projects'), ('financial')
) AS c(category)
WHERE u.team_id IS NOT NULL
ON CONFLICT (user_id, team_id, category) DO NOTHING;
