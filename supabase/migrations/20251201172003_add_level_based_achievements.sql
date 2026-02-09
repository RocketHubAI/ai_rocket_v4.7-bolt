/*
  # Add Level-Based Achievements for Launch Preparation

  1. Purpose
    - Add achievements for completing each level in each stage
    - These are triggered when users reach level milestones
    - Award Launch Points for progression

  2. New Achievements
    **Fuel Stage Levels (1-5)**
    - fuel_level_1: Ignition (100 points)
    - fuel_level_2: Foundation (300 points)
    - fuel_level_3: Building (500 points)
    - fuel_level_4: Mature (1000 points)
    - fuel_level_5: Advanced (2000 points)

    **Boosters Stage Levels (1-5)**
    - boosters_level_1: First Contact (200 points)
    - boosters_level_2: Visualization (400 points)
    - boosters_level_3: Reporting (600 points)
    - boosters_level_4: Automation (800 points)
    - boosters_level_5: AI Agents (1500 points)

    **Guidance Stage Levels (1-5)**
    - guidance_level_1: Configuration (150 points)
    - guidance_level_2: Information (250 points)
    - guidance_level_3: Collaboration (400 points)
    - guidance_level_4: AI Jobs (800 points)
    - guidance_level_5: Documentation (1200 points)

  3. Security
    - Uses existing RLS policies on launch_achievements table
*/

-- Fuel Stage Level Achievements
INSERT INTO launch_achievements (achievement_key, name, description, stage, level, points_value, icon, display_order, is_active)
VALUES
  ('fuel_level_1', 'Ignition', 'Completed Fuel Level 1', 'fuel', 1, 100, 'file-text', 101, true),
  ('fuel_level_2', 'Foundation', 'Completed Fuel Level 2', 'fuel', 2, 300, 'folder-tree', 201, true),
  ('fuel_level_3', 'Building', 'Completed Fuel Level 3', 'fuel', 3, 500, 'database', 301, true),
  ('fuel_level_4', 'Mature', 'Completed Fuel Level 4', 'fuel', 4, 1000, 'hard-drive', 401, true),
  ('fuel_level_5', 'Advanced', 'Completed Fuel Level 5', 'fuel', 5, 2000, 'rocket', 501, true)
ON CONFLICT (achievement_key) DO NOTHING;

-- Boosters Stage Level Achievements
INSERT INTO launch_achievements (achievement_key, name, description, stage, level, points_value, icon, display_order, is_active)
VALUES
  ('boosters_level_1', 'First Contact', 'Completed Boosters Level 1', 'boosters', 1, 200, 'message-circle', 601, true),
  ('boosters_level_2', 'Visualization', 'Completed Boosters Level 2', 'boosters', 2, 400, 'bar-chart', 701, true),
  ('boosters_level_3', 'Reporting', 'Completed Boosters Level 3', 'boosters', 3, 600, 'file-bar-chart', 801, true),
  ('boosters_level_4', 'Automation', 'Completed Boosters Level 4', 'boosters', 4, 800, 'calendar-clock', 901, true),
  ('boosters_level_5', 'AI Agents', 'Completed Boosters Level 5', 'boosters', 5, 1500, 'bot', 1001, true)
ON CONFLICT (achievement_key) DO NOTHING;

-- Guidance Stage Level Achievements
INSERT INTO launch_achievements (achievement_key, name, description, stage, level, points_value, icon, display_order, is_active)
VALUES
  ('guidance_level_1', 'Configuration', 'Completed Guidance Level 1', 'guidance', 1, 150, 'settings', 1101, true),
  ('guidance_level_2', 'Information', 'Completed Guidance Level 2', 'guidance', 2, 250, 'newspaper', 1201, true),
  ('guidance_level_3', 'Collaboration', 'Completed Guidance Level 3', 'guidance', 3, 400, 'user-plus', 1301, true),
  ('guidance_level_4', 'AI Jobs', 'Completed Guidance Level 4', 'guidance', 4, 800, 'briefcase', 1401, true),
  ('guidance_level_5', 'Documentation', 'Completed Guidance Level 5', 'guidance', 5, 1200, 'book-open', 1501, true)
ON CONFLICT (achievement_key) DO NOTHING;
