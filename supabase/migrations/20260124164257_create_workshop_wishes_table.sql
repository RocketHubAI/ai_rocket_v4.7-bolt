/*
  # Create Workshop Wishes Table

  1. New Tables
    - `workshop_wishes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `registration_id` (uuid, references workshop_registrations)
      - `wish_1` (text) - First AI wish/request
      - `wish_2` (text) - Second AI wish/request
      - `wish_3` (text) - Third AI wish/request
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can read/write their own data
*/

CREATE TABLE IF NOT EXISTS workshop_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES workshop_registrations(id) ON DELETE CASCADE,
  wish_1 text,
  wish_2 text,
  wish_3 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE workshop_wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wishes"
  ON workshop_wishes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishes"
  ON workshop_wishes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishes"
  ON workshop_wishes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_workshop_wishes_user_id ON workshop_wishes(user_id);
CREATE INDEX idx_workshop_wishes_registration_id ON workshop_wishes(registration_id);