/*
  # Add Summary and Use Cases to Build Lab Prototypes

  1. Changes
    - Add `summary` JSONB column to store tool overview (whatItDoes, howItWorks, keyBenefits)
    - Add `use_cases` JSONB column to store array of use cases with title, description, outcome, icon
    - Remove deprecated `component_code` and `mock_data` columns (optional - keeping for backward compatibility)

  2. Notes
    - Summary contains: whatItDoes, howItWorks, keyBenefits array
    - Use cases contain: title, description, outcome, icon
    - Tools required now stores objects with: name, reason, bestAt, alternative, alternativeReason, icon
    - Build steps now include: title, description, details, tips array, icon
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'summary'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN summary JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'use_cases'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN use_cases JSONB;
  END IF;
END $$;
