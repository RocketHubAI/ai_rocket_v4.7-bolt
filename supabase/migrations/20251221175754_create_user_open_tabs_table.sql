/*
  # Create User Open Tabs Table

  1. New Tables
    - `user_open_tabs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `tab_id` (text, the tab identifier)
      - `display_order` (integer, for ordering tabs)
      - `opened_at` (timestamptz, when tab was opened)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_open_tabs` table
    - Add policy for users to manage their own tabs

  3. Notes
    - Users can persist their open tabs across sessions
    - Core tabs (mission-control, private, reports) don't need to be stored as they're always open
    - Only feature tabs (team, visualizations, etc.) are stored
*/

CREATE TABLE IF NOT EXISTS user_open_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  opened_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tab_id)
);

CREATE INDEX IF NOT EXISTS idx_user_open_tabs_user_id ON user_open_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_open_tabs_order ON user_open_tabs(user_id, display_order);

ALTER TABLE user_open_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tabs"
  ON user_open_tabs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tabs"
  ON user_open_tabs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tabs"
  ON user_open_tabs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tabs"
  ON user_open_tabs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
