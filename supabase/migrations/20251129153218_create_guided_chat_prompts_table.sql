/*
  # Create Guided Chat Prompts Table

  1. Summary
    - Create a table to store AI-generated personalized prompts for users
    - Cache generated prompts so users see the same 3 until they request more
    - Track which prompts are used for analytics

  2. New Tables
    - `guided_chat_prompts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `prompt_set` (jsonb, array of 3 prompts)
      - `data_snapshot` (jsonb, summary of user's data when generated)
      - `generation_number` (integer, increments each time user requests new prompts)
      - `is_current` (boolean, marks the currently active set)
      - `generated_at` (timestamptz)
      - `expires_at` (timestamptz, optional expiration)

  3. Security
    - Enable RLS on `guided_chat_prompts` table
    - Users can only view/manage their own prompts
    - Super admins have full access

  4. Indexes
    - Index on (user_id, is_current) for fast lookup of current prompt set
*/

-- Create guided_chat_prompts table
CREATE TABLE IF NOT EXISTS guided_chat_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  prompt_set jsonb NOT NULL,
  data_snapshot jsonb NOT NULL,
  generation_number integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days',
  created_at timestamptz DEFAULT now()
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_guided_prompts_user_current 
  ON guided_chat_prompts(user_id, is_current) 
  WHERE is_current = true;

-- Create index for team-based queries
CREATE INDEX IF NOT EXISTS idx_guided_prompts_team 
  ON guided_chat_prompts(team_id);

-- Enable Row Level Security
ALTER TABLE guided_chat_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own prompts
CREATE POLICY "Users can view own guided prompts"
  ON guided_chat_prompts
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- Policy: Users can insert their own prompts
CREATE POLICY "Users can insert own guided prompts"
  ON guided_chat_prompts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Policy: Users can update their own prompts
CREATE POLICY "Users can update own guided prompts"
  ON guided_chat_prompts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- Policy: Users can delete their own prompts
CREATE POLICY "Users can delete own guided prompts"
  ON guided_chat_prompts
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin()
  );

-- Function to mark old prompts as not current when new one is inserted
CREATE OR REPLACE FUNCTION mark_old_prompts_not_current()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all existing prompts for this user as not current
  UPDATE guided_chat_prompts
  SET is_current = false
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_current = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically mark old prompts as not current
DROP TRIGGER IF EXISTS trigger_mark_old_prompts_not_current ON guided_chat_prompts;
CREATE TRIGGER trigger_mark_old_prompts_not_current
  AFTER INSERT ON guided_chat_prompts
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION mark_old_prompts_not_current();
