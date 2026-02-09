/*
  # Add Tool Planner Mode and Selected Tools

  1. New Columns
    - `mode` - enum for 'beginner' or 'advanced' mode selection
    - `selected_tools` - JSONB array of user-selected tools for the build guide
    - `build_guide_generated` - boolean to track if build guide has been generated
    - `build_guide_content` - JSONB to store generated build guide content
    - `customization_instructions` - text for user's customization requests

  2. Purpose
    - Supports the new Tool Planner feature with Beginner/Advanced modes
    - Allows users to select preferred tools
    - Tracks build guide generation separately from initial prototype
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'mode'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN mode TEXT DEFAULT 'beginner' CHECK (mode IN ('beginner', 'advanced'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'selected_tools'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN selected_tools JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'build_guide_generated'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN build_guide_generated BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'build_guide_content'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN build_guide_content JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'customization_instructions'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN customization_instructions TEXT;
  END IF;
END $$;
