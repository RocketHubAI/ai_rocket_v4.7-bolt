/*
  # Add Workshop Goal Completion Tracking
  
  1. Changes to workshop_goals
    - Add `is_completed` boolean to track if goal has been fully workshopped
    - Add `chat_count` integer to track chats for this specific goal
    - Add `creation_count` integer to track creations for this specific goal
    - Add `completed_at` timestamp for when goal was completed
  
  2. Purpose
    - Allow users to work through all 3 goals one at a time
    - Track progress for each goal separately
    - Launch code only unlocks when ALL 3 goals are completed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshop_goals' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE workshop_goals ADD COLUMN is_completed boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshop_goals' AND column_name = 'chat_count'
  ) THEN
    ALTER TABLE workshop_goals ADD COLUMN chat_count integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshop_goals' AND column_name = 'creation_count'
  ) THEN
    ALTER TABLE workshop_goals ADD COLUMN creation_count integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshop_goals' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE workshop_goals ADD COLUMN completed_at timestamptz;
  END IF;
END $$;