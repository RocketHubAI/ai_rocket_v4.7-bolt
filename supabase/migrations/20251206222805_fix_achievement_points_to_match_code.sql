/*
  # Fix Achievement Points to Match Code

  1. Purpose
    - Update all level achievement points to match the code expectations
    - Points should be: Level 1 = 10, Level 2 = 20, Level 3 = 30, Level 4 = 40, Level 5 = 50
    - This applies to all stages: Fuel, Boosters, and Guidance

  2. Changes
    - Update fuel_level_* achievements from (100, 300, 500, 1000, 2000) to (10, 20, 30, 40, 50)
    - Update boosters_level_* achievements from (200, 400, 600, 800, 1500) to (10, 20, 30, 40, 50)
    - Update guidance_level_* achievements from (150, 250, 400, 800, 1200) to (10, 20, 30, 40, 50)

  3. Security
    - Uses existing RLS policies on launch_achievements table
*/

-- Update Fuel Stage Level Achievement Points
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

-- Update Boosters Stage Level Achievement Points
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

-- Update Guidance Stage Level Achievement Points
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
