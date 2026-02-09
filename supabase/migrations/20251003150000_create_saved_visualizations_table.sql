/*
  # Create saved_visualizations table

  1. New Tables
    - `saved_visualizations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `chat_message_id` (uuid, references astra_chats)
      - `title` (text) - Auto-generated from visualization content
      - `visualization_data` (text) - HTML content of the visualization
      - `original_prompt` (text) - The prompt that generated this visualization
      - `saved_at` (timestamptz) - When the visualization was saved
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `saved_visualizations` table
    - Add policy for users to read their own saved visualizations
    - Add policy for users to insert their own saved visualizations
    - Add policy for users to delete their own saved visualizations
*/

CREATE TABLE IF NOT EXISTS saved_visualizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_message_id uuid REFERENCES astra_chats(id) ON DELETE SET NULL,
  title text NOT NULL,
  visualization_data text NOT NULL,
  original_prompt text,
  saved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_visualizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved visualizations"
  ON saved_visualizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved visualizations"
  ON saved_visualizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved visualizations"
  ON saved_visualizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_visualizations_user_id ON saved_visualizations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_visualizations_saved_at ON saved_visualizations(saved_at DESC);
