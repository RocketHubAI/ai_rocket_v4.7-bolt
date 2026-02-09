/*
  # Fix Launch Preparation Progress to Allow Level 0

  1. Problem
    - Database constraint requires level >= 1
    - Application code initializes with level = 0
    - Causes "violates check constraint" errors on initialization

  2. Solution
    - Change constraint to allow level >= 0
    - Level 0 means "not started yet"
    - Levels 1-5 are actual progress levels

  3. Changes
    - Drop existing constraint
    - Add new constraint allowing 0-5

  4. Security
    - No RLS changes needed
    - Maintains data integrity with updated range
*/

-- Drop the old constraint
ALTER TABLE launch_preparation_progress 
DROP CONSTRAINT IF EXISTS launch_preparation_progress_level_check;

-- Add new constraint allowing 0-5
ALTER TABLE launch_preparation_progress
ADD CONSTRAINT launch_preparation_progress_level_check 
CHECK (level >= 0 AND level <= 5);

-- Update default to 0 to match application logic
ALTER TABLE launch_preparation_progress
ALTER COLUMN level SET DEFAULT 0;
