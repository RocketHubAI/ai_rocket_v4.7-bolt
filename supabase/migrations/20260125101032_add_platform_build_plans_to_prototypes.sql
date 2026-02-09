/*
  # Add Platform Build Plans to Prototypes

  1. New Columns
    - `claude_build_plan` (jsonb) - Stores the Claude Projects build plan
    - `chatgpt_build_plan` (jsonb) - Stores the Custom GPT build plan

  2. Purpose
    - Enable storing platform-specific build guides
    - Support the new tabbed interface with Claude/ChatGPT options
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'claude_build_plan'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN claude_build_plan jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_lab_prototypes' AND column_name = 'chatgpt_build_plan'
  ) THEN
    ALTER TABLE build_lab_prototypes ADD COLUMN chatgpt_build_plan jsonb;
  END IF;
END $$;
