/*
  # Fix Launch Points Ledger Stage Constraint

  1. Changes
    - Update check constraint to allow 'activity' and 'milestone' stages
    - These are required by the new activity and milestone tracking system

  2. Notes
    - The trigger functions use 'activity' for daily active, streak bonuses
    - The trigger functions use 'milestone' for achievement milestones
*/

-- Drop the old constraint
ALTER TABLE launch_points_ledger DROP CONSTRAINT IF EXISTS launch_points_ledger_stage_check;

-- Add new constraint with additional stage values
ALTER TABLE launch_points_ledger ADD CONSTRAINT launch_points_ledger_stage_check 
  CHECK (stage = ANY (ARRAY['fuel'::text, 'boosters'::text, 'guidance'::text, 'ongoing'::text, 'activity'::text, 'milestone'::text]));
