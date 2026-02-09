/*
  # Simplify News Preferences - Always Enabled with Defaults

  1. Changes
    - Remove `enabled` field from news_preferences (news is always available)
    - Set intelligent defaults: AI and Technology industries
    - All teams get news capability by default
    - Users can customize industries and topics if desired
  
  2. Security
    - No RLS changes needed
    - Maintains existing team_settings access controls
*/

-- Update all existing team_settings to have default news preferences
UPDATE team_settings
SET news_preferences = jsonb_build_object(
  'industries', COALESCE(
    CASE 
      WHEN (news_preferences->>'enabled')::boolean = true 
      THEN news_preferences->'industries'
      ELSE '["AI", "Technology"]'::jsonb
    END,
    '["AI", "Technology"]'::jsonb
  ),
  'custom_topics', COALESCE(
    news_preferences->>'custom_topics',
    'AI news, technology trends, business updates'
  ),
  'max_results', COALESCE(
    (news_preferences->>'max_results')::int,
    10
  )
)
WHERE news_preferences IS NOT NULL;

-- For any teams without news_preferences at all, set defaults
UPDATE team_settings
SET news_preferences = jsonb_build_object(
  'industries', '["AI", "Technology"]'::jsonb,
  'custom_topics', 'AI news, technology trends, business updates',
  'max_results', 10
)
WHERE news_preferences IS NULL;

-- Add comment explaining the new structure
COMMENT ON COLUMN team_settings.news_preferences IS 
'News preferences for the team. Always enabled with defaults: AI and Technology industries. Users can customize industries and custom_topics. Structure: {"industries": ["AI", "Technology"], "custom_topics": "string", "max_results": 10}';
