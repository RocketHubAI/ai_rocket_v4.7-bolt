/*
  # Create Platform Knowledge Table

  1. New Tables
    - `platform_knowledge`
      - `id` (text, primary key) - knowledge category identifier
      - `content` (text) - the actual knowledge content
      - `updated_at` (timestamptz) - when last updated
      - `updated_by` (text) - who/what updated it (e.g., 'build-sync', 'admin')

  2. Purpose
    - Store platform feature documentation that the AI assistant can query
    - Keeps assistant knowledge in sync with AI_ROCKET_KEY_FEATURES.md
    - Updated automatically during build process

  3. Security
    - RLS enabled
    - Anyone can read (needed for edge functions)
    - Only service role can write (via build script)
*/

CREATE TABLE IF NOT EXISTS platform_knowledge (
  id text PRIMARY KEY,
  content text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text DEFAULT 'system'
);

ALTER TABLE platform_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform knowledge"
  ON platform_knowledge
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can manage platform knowledge"
  ON platform_knowledge
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO platform_knowledge (id, content, updated_by) VALUES
  ('features', 'Initial placeholder - will be synced from AI_ROCKET_KEY_FEATURES.md', 'migration'),
  ('navigation_targets', '{}', 'migration')
ON CONFLICT (id) DO NOTHING;
