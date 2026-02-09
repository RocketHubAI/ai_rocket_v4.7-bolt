/*
  # Create Build Lab System

  This migration creates the database tables for the Workshop Build Lab feature,
  where users transform their 3 workshop wishes into interactive prototypes
  and exportable blueprints.

  1. New Tables
    - `build_lab_documents` - User-uploaded documents (up to 10) for context
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `registration_id` (uuid, references workshop_registrations)
      - `file_name` (text) - Original file name
      - `file_type` (text) - MIME type
      - `file_size` (integer) - Size in bytes
      - `storage_path` (text) - Path in Supabase storage
      - `extracted_content` (text) - Extracted text content for AI context
      - `created_at` (timestamptz)

    - `build_lab_prototypes` - Generated React prototype code for each wish
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `wish_number` (integer) - 1, 2, or 3
      - `wish_text` (text) - The original wish text
      - `prototype_title` (text) - Generated title for the prototype
      - `component_code` (text) - Generated React component code
      - `mock_data` (jsonb) - Mock data extracted from user documents
      - `tools_required` (text[]) - Array of tools needed (Claude, N8N, etc.)
      - `build_steps` (jsonb) - Array of steps to build for real
      - `status` (text) - pending, generating, ready, error
      - `error_message` (text) - Error details if generation failed
      - `generation_started_at` (timestamptz)
      - `generation_completed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `build_lab_conversations` - Astra chat history for refining prototypes
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `prototype_id` (uuid, references build_lab_prototypes)
      - `wish_number` (integer) - 1, 2, or 3
      - `message_role` (text) - user, assistant, system
      - `message_content` (text)
      - `message_number` (integer)
      - `created_at` (timestamptz)

    - `build_lab_infographics` - Generated educational infographics
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `prototype_id` (uuid, references build_lab_prototypes)
      - `image_url` (text) - URL in Supabase storage
      - `image_base64` (text) - Base64 encoded image for display
      - `status` (text) - pending, generating, ready, error
      - `error_message` (text)
      - `created_at` (timestamptz)

    - `build_lab_blueprints` - Exportable markdown build instructions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `prototype_id` (uuid, references build_lab_prototypes)
      - `blueprint_title` (text)
      - `markdown_content` (text) - Full markdown blueprint
      - `claude_optimized` (text) - Claude-specific version
      - `chatgpt_optimized` (text) - ChatGPT-specific version
      - `quick_start_prompt` (text) - Just the AI prompt section
      - `data_sources` (text[]) - List of required data sources
      - `status` (text) - pending, generating, ready, error
      - `error_message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own Build Lab data
    - Super admins can view all data for analytics
*/

-- Build Lab Documents table
CREATE TABLE IF NOT EXISTS build_lab_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES workshop_registrations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  storage_path text,
  extracted_content text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE build_lab_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own build lab documents"
  ON build_lab_documents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all build lab documents"
  ON build_lab_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email IN (
        'clay@rockethub.ai',
        'tj@rockethub.ai',
        'mike@rockethub.ai',
        'clay.rumbaugh@gmail.com'
      )
    )
  );

-- Build Lab Prototypes table
CREATE TABLE IF NOT EXISTS build_lab_prototypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES workshop_registrations(id) ON DELETE CASCADE,
  wish_number integer NOT NULL CHECK (wish_number BETWEEN 1 AND 3),
  wish_text text NOT NULL,
  prototype_title text,
  component_code text,
  mock_data jsonb,
  tools_required text[],
  build_steps jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  error_message text,
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, wish_number)
);

ALTER TABLE build_lab_prototypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prototypes"
  ON build_lab_prototypes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all prototypes"
  ON build_lab_prototypes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email IN (
        'clay@rockethub.ai',
        'tj@rockethub.ai',
        'mike@rockethub.ai',
        'clay.rumbaugh@gmail.com'
      )
    )
  );

-- Build Lab Conversations table
CREATE TABLE IF NOT EXISTS build_lab_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prototype_id uuid REFERENCES build_lab_prototypes(id) ON DELETE CASCADE,
  wish_number integer NOT NULL CHECK (wish_number BETWEEN 1 AND 3),
  message_role text NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content text NOT NULL,
  message_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE build_lab_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own build lab conversations"
  ON build_lab_conversations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all build lab conversations"
  ON build_lab_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email IN (
        'clay@rockethub.ai',
        'tj@rockethub.ai',
        'mike@rockethub.ai',
        'clay.rumbaugh@gmail.com'
      )
    )
  );

-- Build Lab Infographics table
CREATE TABLE IF NOT EXISTS build_lab_infographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prototype_id uuid REFERENCES build_lab_prototypes(id) ON DELETE CASCADE,
  image_url text,
  image_base64 text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE build_lab_infographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own infographics"
  ON build_lab_infographics
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all infographics"
  ON build_lab_infographics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email IN (
        'clay@rockethub.ai',
        'tj@rockethub.ai',
        'mike@rockethub.ai',
        'clay.rumbaugh@gmail.com'
      )
    )
  );

-- Build Lab Blueprints table
CREATE TABLE IF NOT EXISTS build_lab_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prototype_id uuid REFERENCES build_lab_prototypes(id) ON DELETE CASCADE,
  blueprint_title text NOT NULL,
  markdown_content text NOT NULL,
  claude_optimized text,
  chatgpt_optimized text,
  quick_start_prompt text,
  data_sources text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE build_lab_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blueprints"
  ON build_lab_blueprints
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all blueprints"
  ON build_lab_blueprints
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email IN (
        'clay@rockethub.ai',
        'tj@rockethub.ai',
        'mike@rockethub.ai',
        'clay.rumbaugh@gmail.com'
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_build_lab_documents_user_id ON build_lab_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_build_lab_prototypes_user_id ON build_lab_prototypes(user_id);
CREATE INDEX IF NOT EXISTS idx_build_lab_prototypes_wish_number ON build_lab_prototypes(wish_number);
CREATE INDEX IF NOT EXISTS idx_build_lab_conversations_user_id ON build_lab_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_build_lab_conversations_prototype_id ON build_lab_conversations(prototype_id);
CREATE INDEX IF NOT EXISTS idx_build_lab_infographics_prototype_id ON build_lab_infographics(prototype_id);
CREATE INDEX IF NOT EXISTS idx_build_lab_blueprints_prototype_id ON build_lab_blueprints(prototype_id);

-- Enable realtime for Build Lab tables
ALTER PUBLICATION supabase_realtime ADD TABLE build_lab_prototypes;
ALTER PUBLICATION supabase_realtime ADD TABLE build_lab_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE build_lab_blueprints;

-- Add 'build_lab' as a valid step in workshop_registrations
ALTER TABLE workshop_registrations 
DROP CONSTRAINT IF EXISTS workshop_registrations_current_step_check;

ALTER TABLE workshop_registrations 
ADD CONSTRAINT workshop_registrations_current_step_check 
CHECK (current_step IN ('onboarding', 'journey', 'goals', 'goal_selection', 'documents', 'infographic', 'hub', 'build_lab', 'complete'));

-- Function to get Build Lab progress for a user
CREATE OR REPLACE FUNCTION get_build_lab_progress(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'documents_count', (
      SELECT COUNT(*) FROM build_lab_documents WHERE user_id = p_user_id
    ),
    'prototypes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'wish_number', p.wish_number,
        'wish_text', p.wish_text,
        'prototype_title', p.prototype_title,
        'status', p.status,
        'has_infographic', EXISTS (
          SELECT 1 FROM build_lab_infographics i 
          WHERE i.prototype_id = p.id AND i.status = 'ready'
        ),
        'has_blueprint', EXISTS (
          SELECT 1 FROM build_lab_blueprints b 
          WHERE b.prototype_id = p.id AND b.status = 'ready'
        ),
        'created_at', p.created_at
      ) ORDER BY p.wish_number), '[]'::jsonb)
      FROM build_lab_prototypes p
      WHERE p.user_id = p_user_id
    ),
    'total_prototypes_ready', (
      SELECT COUNT(*) FROM build_lab_prototypes 
      WHERE user_id = p_user_id AND status = 'ready'
    ),
    'total_blueprints_ready', (
      SELECT COUNT(*) FROM build_lab_blueprints b
      JOIN build_lab_prototypes p ON b.prototype_id = p.id
      WHERE p.user_id = p_user_id AND b.status = 'ready'
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;