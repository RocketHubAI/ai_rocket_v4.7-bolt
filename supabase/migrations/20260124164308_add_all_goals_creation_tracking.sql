/*
  # Add All Goals Creation Tracking

  1. Changes
    - Add `all_goals_creation_completed` boolean to workshop_registrations
    - This tracks if user has done the combined Create with Astra for all 3 goals
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_registrations' AND column_name = 'all_goals_creation_completed'
  ) THEN
    ALTER TABLE workshop_registrations ADD COLUMN all_goals_creation_completed boolean DEFAULT false;
  END IF;
END $$;