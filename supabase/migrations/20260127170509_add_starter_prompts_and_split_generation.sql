/*
  # Split Build Lab generation into stages

  1. Changes to `build_lab_prototypes` table
    - Add `starter_prompts` field for 3 recommended initial prompts
    - Platform build plans are now generated on-demand instead of upfront
  
  2. Performance Improvement
    - Quick initial generation (summary + use cases only)
    - Platform-specific plans generated when user selects Claude or GPT
    - Improves UX by reducing wait time significantly
*/

-- Add starter prompts field to build_lab_prototypes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'starter_prompts'
  ) THEN
    ALTER TABLE build_lab_prototypes 
    ADD COLUMN starter_prompts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;