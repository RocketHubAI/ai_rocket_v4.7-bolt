/*
  # Standardize All Achievement Point Values

  1. Changes
    - Update all legacy "task" achievement point values to reasonable values
    - Remove inflated point values that were causing inconsistencies
    - Standardize the system so level achievements are the primary point source
    
  2. New Point Structure
    - Level achievements: 10, 20, 30, 40, 50 (unchanged)
    - Task achievements: Small bonus points (5-25) for specific actions
    - Remove legacy high values (1000, 2000, etc.)

  3. Security
    - Uses existing RLS policies
*/

-- Fuel Stage Task Achievements (bonus points for specific actions)
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'fuel_first_document';
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'fuel_document_uploaded';
UPDATE launch_achievements SET points_value = 15 WHERE achievement_key = 'fuel_folder_connected';
UPDATE launch_achievements SET points_value = 20 WHERE achievement_key = 'fuel_strategy_doc_created';
UPDATE launch_achievements SET points_value = 20 WHERE achievement_key = 'fuel_one_per_category';
UPDATE launch_achievements SET points_value = 25 WHERE achievement_key = 'fuel_basic_collection';
UPDATE launch_achievements SET points_value = 30 WHERE achievement_key = 'fuel_mature_foundation';
UPDATE launch_achievements SET points_value = 40 WHERE achievement_key = 'fuel_advanced_preparation';

-- Boosters Stage Task Achievements
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'boosters_first_prompt';
UPDATE launch_achievements SET points_value = 5 WHERE achievement_key = 'boosters_prompt_sent';
UPDATE launch_achievements SET points_value = 15 WHERE achievement_key = 'boosters_first_visualization';
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'boosters_visualization_saved';
UPDATE launch_achievements SET points_value = 5 WHERE achievement_key = 'boosters_visualization_exported';
UPDATE launch_achievements SET points_value = 20 WHERE achievement_key = 'boosters_manual_report';
UPDATE launch_achievements SET points_value = 25 WHERE achievement_key = 'boosters_scheduled_report';
UPDATE launch_achievements SET points_value = 15 WHERE achievement_key = 'boosters_guided_chat_used';
UPDATE launch_achievements SET points_value = 50 WHERE achievement_key = 'boosters_ai_agent';

-- Guidance Stage Task Achievements
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'guidance_team_settings';
UPDATE launch_achievements SET points_value = 5 WHERE achievement_key = 'guidance_team_name_set';
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'guidance_news_enabled';
UPDATE launch_achievements SET points_value = 15 WHERE achievement_key = 'guidance_member_invited';
UPDATE launch_achievements SET points_value = 10 WHERE achievement_key = 'guidance_first_team_chat';
UPDATE launch_achievements SET points_value = 40 WHERE achievement_key = 'guidance_ai_job';
UPDATE launch_achievements SET points_value = 50 WHERE achievement_key = 'guidance_document';
