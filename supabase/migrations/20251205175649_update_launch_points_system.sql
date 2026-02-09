/*
  # Update Launch Points System

  1. Changes
    - Update all level achievements to new point values:
      - Level 1: 10 points
      - Level 2: 20 points
      - Level 3: 30 points
      - Level 4: 40 points
      - Level 5: 50 points
    - Total possible points across all stages: 150 points
    - Minimum for launch: 60 points (Fuel 1 + Boosters 4 + Guidance 2)

  2. Security
    - Uses existing RLS policies
*/

-- Update Fuel Stage Level Points
UPDATE launch_achievements
SET points_value = 10
WHERE achievement_key = 'fuel_level_1';

UPDATE launch_achievements
SET points_value = 20
WHERE achievement_key = 'fuel_level_2';

UPDATE launch_achievements
SET points_value = 30
WHERE achievement_key = 'fuel_level_3';

UPDATE launch_achievements
SET points_value = 40
WHERE achievement_key = 'fuel_level_4';

UPDATE launch_achievements
SET points_value = 50
WHERE achievement_key = 'fuel_level_5';

-- Update Boosters Stage Level Points
UPDATE launch_achievements
SET points_value = 10
WHERE achievement_key = 'boosters_level_1';

UPDATE launch_achievements
SET points_value = 20
WHERE achievement_key = 'boosters_level_2';

UPDATE launch_achievements
SET points_value = 30
WHERE achievement_key = 'boosters_level_3';

UPDATE launch_achievements
SET points_value = 40
WHERE achievement_key = 'boosters_level_4';

UPDATE launch_achievements
SET points_value = 50
WHERE achievement_key = 'boosters_level_5';

-- Update Guidance Stage Level Points
UPDATE launch_achievements
SET points_value = 10
WHERE achievement_key = 'guidance_level_1';

UPDATE launch_achievements
SET points_value = 20
WHERE achievement_key = 'guidance_level_2';

UPDATE launch_achievements
SET points_value = 30
WHERE achievement_key = 'guidance_level_3';

UPDATE launch_achievements
SET points_value = 40
WHERE achievement_key = 'guidance_level_4';

UPDATE launch_achievements
SET points_value = 50
WHERE achievement_key = 'guidance_level_5';
