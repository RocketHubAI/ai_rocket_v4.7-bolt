/*
  # Create AI-preneur Workshop System

  1. New Tables
    - `workshop_codes` - Admin-managed registration codes for workshop access
      - `id` (uuid, primary key)
      - `code` (text, unique) - Workshop registration code
      - `name` (text) - Description/name for the code
      - `max_uses` (integer) - Maximum number of uses (default 100)
      - `current_uses` (integer) - Current number of uses
      - `created_by` (uuid) - Admin who created the code
      - `expires_at` (timestamptz) - Expiration date
      - `is_active` (boolean) - Whether code is active
      - `created_at` (timestamptz)

    - `workshop_registrations` - Track workshop signups
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `email` (text) - User email
      - `full_name` (text) - User's full name
      - `team_name` (text) - Team/company name
      - `industry` (text) - Industry
      - `registration_code` (text) - Workshop code used
      - `status` (text) - registered, in_progress, completed, expired
      - `current_step` (text) - Track progress through workshop
      - `access_expires_at` (timestamptz) - 5 days from registration
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)

    - `workshop_survey_responses` - Store survey answers (reuses moonshot structure)
      - `id` (uuid, primary key)
      - `registration_id` (uuid) - References workshop_registrations
      - `current_ai_usage` (text)
      - `ai_use_cases` (text[])
      - `monthly_ai_spend` (text)
      - `connected_data` (text)
      - `biggest_pain_points` (text)
      - `mastermind_groups` (text[])
      - `created_at` (timestamptz)

    - `workshop_conversations` - Track Gemini conversation flow
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `conversation_id` (uuid) - Group messages in a conversation
      - `message_role` (text) - 'user' or 'assistant'
      - `message_content` (text)
      - `message_number` (integer)
      - `created_at` (timestamptz)

    - `workshop_goals` - Store user's impossible goals
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `goal_number` (integer) - 1, 2, or 3
      - `goal_title` (text)
      - `goal_description` (text)
      - `positive_impact_1` (text)
      - `positive_impact_2` (text)
      - `positive_impact_3` (text)
      - `is_selected` (boolean) - The ONE chosen goal
      - `created_at` (timestamptz)

    - `workshop_documents` - Link user's synced document (reference to document_chunks)
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `team_id` (uuid) - References teams
      - `document_id` (text) - The document_id in document_chunks
      - `file_name` (text) - Original file name
      - `source_type` (text) - 'local_upload' or 'astra_created'
      - `synced_at` (timestamptz)
      - `created_at` (timestamptz)

    - `workshop_visualizations` - Store generated infographic
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `goal_id` (uuid) - References workshop_goals
      - `document_id` (uuid) - References workshop_documents
      - `visualization_data` (jsonb)
      - `image_url` (text)
      - `image_base64` (text)
      - `status` (text) - pending, generating, complete, failed
      - `created_at` (timestamptz)

    - `workshop_completion_codes` - Store generated launch codes
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `registration_id` (uuid) - References workshop_registrations
      - `code` (text, unique) - The generated launch code
      - `is_redeemed` (boolean)
      - `redeemed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own workshop data
    - Super admins can view all data for analytics
*/

-- Workshop Codes table (admin-managed)
CREATE TABLE IF NOT EXISTS workshop_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT 'Workshop Code',
  max_uses integer NOT NULL DEFAULT 100,
  current_uses integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage workshop codes"
  ON workshop_codes
  FOR ALL
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
  )
  WITH CHECK (
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

CREATE POLICY "Anyone can validate workshop codes"
  ON workshop_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Workshop Registrations table
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text NOT NULL,
  team_name text NOT NULL,
  industry text,
  registration_code text NOT NULL,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'in_progress', 'completed', 'expired')),
  current_step text DEFAULT 'onboarding' CHECK (current_step IN ('onboarding', 'journey', 'goals', 'goal_selection', 'documents', 'infographic', 'hub', 'complete')),
  access_expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workshop registration"
  ON workshop_registrations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own workshop registration"
  ON workshop_registrations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow insert for new registrations"
  ON workshop_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins can view all workshop registrations"
  ON workshop_registrations
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

-- Workshop Survey Responses table
CREATE TABLE IF NOT EXISTS workshop_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES workshop_registrations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  current_ai_usage text,
  ai_use_cases text[],
  monthly_ai_spend text,
  connected_data text,
  biggest_pain_points text,
  mastermind_groups text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own survey responses"
  ON workshop_survey_responses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all survey responses"
  ON workshop_survey_responses
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

-- Workshop Conversations table
CREATE TABLE IF NOT EXISTS workshop_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  conversation_id uuid NOT NULL,
  message_role text NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content text NOT NULL,
  message_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON workshop_conversations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all conversations"
  ON workshop_conversations
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

-- Workshop Goals table
CREATE TABLE IF NOT EXISTS workshop_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  goal_number integer NOT NULL CHECK (goal_number BETWEEN 1 AND 3),
  goal_title text NOT NULL,
  goal_description text,
  positive_impact_1 text,
  positive_impact_2 text,
  positive_impact_3 text,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, goal_number)
);

ALTER TABLE workshop_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON workshop_goals
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all goals"
  ON workshop_goals
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

-- Workshop Documents table (reference to document_chunks)
CREATE TABLE IF NOT EXISTS workshop_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  team_id uuid REFERENCES teams(id) NOT NULL,
  document_id text NOT NULL,
  file_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('local_upload', 'astra_created')),
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents"
  ON workshop_documents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all documents"
  ON workshop_documents
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

-- Workshop Visualizations table
CREATE TABLE IF NOT EXISTS workshop_visualizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  goal_id uuid REFERENCES workshop_goals(id),
  document_id uuid REFERENCES workshop_documents(id),
  visualization_data jsonb,
  image_url text,
  image_base64 text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_visualizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own visualizations"
  ON workshop_visualizations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all visualizations"
  ON workshop_visualizations
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

-- Workshop Completion Codes table
CREATE TABLE IF NOT EXISTS workshop_completion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  registration_id uuid REFERENCES workshop_registrations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  is_redeemed boolean NOT NULL DEFAULT false,
  redeemed_at timestamptz,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshop_completion_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completion codes"
  ON workshop_completion_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow insert for completion codes"
  ON workshop_completion_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all completion codes"
  ON workshop_completion_codes
  FOR ALL
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
  )
  WITH CHECK (
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

-- Create function to validate workshop code
CREATE OR REPLACE FUNCTION validate_workshop_code(p_code text)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  code_id uuid,
  code_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record workshop_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_code_record
  FROM workshop_codes
  WHERE code = UPPER(p_code)
  AND is_active = true;

  IF v_code_record.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid workshop code'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'This workshop code has expired'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN QUERY SELECT false, 'This workshop code has reached its maximum uses'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, v_code_record.id, v_code_record.name;
END;
$$;

-- Create function to increment workshop code usage
CREATE OR REPLACE FUNCTION increment_workshop_code_usage(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workshop_codes
  SET current_uses = current_uses + 1
  WHERE code = UPPER(p_code)
  AND is_active = true
  AND current_uses < max_uses;

  RETURN FOUND;
END;
$$;

-- Create function to get workshop analytics for admin dashboard
CREATE OR REPLACE FUNCTION get_workshop_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_registrations', (SELECT COUNT(*) FROM workshop_registrations),
    'active_workshops', (SELECT COUNT(*) FROM workshop_registrations WHERE status = 'in_progress' AND access_expires_at > now()),
    'completed_workshops', (SELECT COUNT(*) FROM workshop_registrations WHERE status = 'completed'),
    'expired_workshops', (SELECT COUNT(*) FROM workshop_registrations WHERE status = 'expired' OR access_expires_at < now()),
    'completion_rate', CASE 
      WHEN (SELECT COUNT(*) FROM workshop_registrations) > 0 
      THEN ROUND((SELECT COUNT(*)::numeric FROM workshop_registrations WHERE status = 'completed') / (SELECT COUNT(*)::numeric FROM workshop_registrations) * 100, 1)
      ELSE 0 
    END,
    'codes_issued', (SELECT COUNT(*) FROM workshop_completion_codes),
    'codes_redeemed', (SELECT COUNT(*) FROM workshop_completion_codes WHERE is_redeemed = true),
    'conversion_rate', CASE 
      WHEN (SELECT COUNT(*) FROM workshop_completion_codes) > 0 
      THEN ROUND((SELECT COUNT(*)::numeric FROM workshop_completion_codes WHERE is_redeemed = true) / (SELECT COUNT(*)::numeric FROM workshop_completion_codes) * 100, 1)
      ELSE 0 
    END,
    'registrations_by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (SELECT status, COUNT(*) as count FROM workshop_registrations GROUP BY status) s
    ),
    'registrations_by_step', (
      SELECT jsonb_object_agg(current_step, count)
      FROM (SELECT current_step, COUNT(*) as count FROM workshop_registrations WHERE status != 'completed' GROUP BY current_step) s
    ),
    'workshop_codes', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'code', code,
        'name', name,
        'max_uses', max_uses,
        'current_uses', current_uses,
        'is_active', is_active,
        'expires_at', expires_at,
        'created_at', created_at
      ) ORDER BY created_at DESC)
      FROM workshop_codes
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_status ON workshop_registrations(status);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_expires ON workshop_registrations(access_expires_at);
CREATE INDEX IF NOT EXISTS idx_workshop_conversations_user_id ON workshop_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_conversations_conversation_id ON workshop_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_workshop_goals_user_id ON workshop_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_completion_codes_code ON workshop_completion_codes(code);

-- Enable realtime for workshop tables
ALTER PUBLICATION supabase_realtime ADD TABLE workshop_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE workshop_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE workshop_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE workshop_visualizations;
