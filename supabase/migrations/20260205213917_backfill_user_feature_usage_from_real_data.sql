/*
  # Backfill User Feature Usage Counters from Real Data

  1. Problem
    - Feature usage counters were 0 for many users despite having real activity
    - scheduled_reports_count was 0 even for users with scheduled reports
    - ask_astra_count, visualizations_count etc. were stale or incomplete

  2. Changes
    - Backfills scheduled_reports_count from astra_reports table
    - Backfills ask_astra_count from astra_chats table
    - Backfills visualizations_count from saved_visualizations + astra_visualizations
    - Backfills saved_prompts_count from astra_saved_prompts
    - Backfills astra_create_count from astra_visualizations
    - Only updates counts that are currently lower than real data

  3. Notes
    - Uses GREATEST to never decrease existing counts
    - Sets first_used timestamps from earliest records
*/

-- Ensure all active users have a feature_usage row
INSERT INTO user_feature_usage (user_id, created_at, updated_at)
SELECT id, now(), now() FROM users
WHERE id NOT IN (SELECT user_id FROM user_feature_usage)
ON CONFLICT (user_id) DO NOTHING;

-- Backfill scheduled_reports_count from astra_reports
UPDATE user_feature_usage ufu
SET 
  scheduled_reports_count = GREATEST(ufu.scheduled_reports_count, sub.cnt),
  scheduled_reports_first_used = COALESCE(ufu.scheduled_reports_first_used, sub.first_used),
  scheduled_reports_last_used = GREATEST(ufu.scheduled_reports_last_used, sub.last_used),
  updated_at = now()
FROM (
  SELECT user_id, count(*) as cnt, min(created_at) as first_used, max(created_at) as last_used
  FROM astra_reports
  WHERE schedule_type = 'scheduled'
  GROUP BY user_id
) sub
WHERE ufu.user_id = sub.user_id
  AND ufu.scheduled_reports_count < sub.cnt;

-- Backfill ask_astra_count from astra_chats (count user messages)
UPDATE user_feature_usage ufu
SET 
  ask_astra_count = GREATEST(ufu.ask_astra_count, sub.cnt),
  ask_astra_first_used = COALESCE(ufu.ask_astra_first_used, sub.first_used),
  ask_astra_last_used = GREATEST(ufu.ask_astra_last_used, sub.last_used),
  updated_at = now()
FROM (
  SELECT user_id, count(*) as cnt, min(created_at) as first_used, max(created_at) as last_used
  FROM astra_chats
  WHERE message_type = 'user'
  GROUP BY user_id
) sub
WHERE ufu.user_id = sub.user_id
  AND ufu.ask_astra_count < sub.cnt;

-- Backfill visualizations_count from saved_visualizations
UPDATE user_feature_usage ufu
SET 
  visualizations_count = GREATEST(ufu.visualizations_count, sub.cnt),
  visualizations_first_used = COALESCE(ufu.visualizations_first_used, sub.first_used),
  visualizations_last_used = GREATEST(ufu.visualizations_last_used, sub.last_used),
  updated_at = now()
FROM (
  SELECT user_id, count(*) as cnt, min(created_at) as first_used, max(created_at) as last_used
  FROM saved_visualizations
  GROUP BY user_id
) sub
WHERE ufu.user_id = sub.user_id
  AND ufu.visualizations_count < sub.cnt;

-- Backfill astra_create_count from astra_visualizations
UPDATE user_feature_usage ufu
SET 
  astra_create_count = GREATEST(COALESCE(ufu.astra_create_count, 0), sub.cnt),
  astra_create_first_used = COALESCE(ufu.astra_create_first_used, sub.first_used),
  astra_create_last_used = GREATEST(ufu.astra_create_last_used, sub.last_used),
  updated_at = now()
FROM (
  SELECT user_id, count(*) as cnt, min(created_at) as first_used, max(created_at) as last_used
  FROM astra_visualizations
  GROUP BY user_id
) sub
WHERE ufu.user_id = sub.user_id
  AND COALESCE(ufu.astra_create_count, 0) < sub.cnt;

-- Backfill saved_prompts_count from astra_saved_prompts
UPDATE user_feature_usage ufu
SET 
  saved_prompts_count = GREATEST(ufu.saved_prompts_count, sub.cnt),
  saved_prompts_first_used = COALESCE(ufu.saved_prompts_first_used, sub.first_used),
  saved_prompts_last_used = GREATEST(ufu.saved_prompts_last_used, sub.last_used),
  updated_at = now()
FROM (
  SELECT user_id, count(*) as cnt, min(created_at) as first_used, max(created_at) as last_used
  FROM astra_saved_prompts
  GROUP BY user_id
) sub
WHERE ufu.user_id = sub.user_id
  AND ufu.saved_prompts_count < sub.cnt;

-- Backfill team_chat_count from group_messages if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_messages' AND table_schema = 'public') THEN
    EXECUTE '
      UPDATE user_feature_usage ufu
      SET 
        team_chat_count = GREATEST(ufu.team_chat_count, sub.cnt),
        team_chat_first_used = COALESCE(ufu.team_chat_first_used, sub.first_used),
        team_chat_last_used = GREATEST(ufu.team_chat_last_used, sub.last_used),
        updated_at = now()
      FROM (
        SELECT user_id, count(*) as cnt, min(created_at) as first_used, max(created_at) as last_used
        FROM group_messages
        GROUP BY user_id
      ) sub
      WHERE ufu.user_id = sub.user_id
        AND ufu.team_chat_count < sub.cnt';
  END IF;
END $$;