/*
  # Create help_conversations table for Astra Help Assistant

  1. New Tables
    - `help_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - The user asking for help
      - `question` (text) - The user's question about using the app
      - `response` (text) - Astra Help Assistant's response
      - `created_at` (timestamptz) - When the conversation occurred

  2. Security
    - Enable RLS on `help_conversations` table
    - Add policy for users to view their own help conversations
    - Add policy for users to insert their own help conversations
*/

-- Create help_conversations table
CREATE TABLE IF NOT EXISTS help_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE help_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own help conversations
CREATE POLICY "Users can view own help conversations"
  ON help_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own help conversations
CREATE POLICY "Users can insert own help conversations"
  ON help_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_help_conversations_user_id
  ON help_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_help_conversations_created_at
  ON help_conversations(created_at DESC);