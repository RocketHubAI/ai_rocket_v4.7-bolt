/*
  # Create Company Emails Table for Gmail Vectorization

  1. New Tables
    - `company_emails`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `subject` (text, email subject line)
      - `sender_email` (text, sender's email address)
      - `sender_name` (text, sender's display name)
      - `email_date` (timestamptz, when email was sent/received)
      - `email_category` (text, AI-categorized email type)
      - `gmail_labels` (text[], Gmail labels/folders)
      - `content` (text, email body content)
      - `thread_id` (text, Gmail thread identifier)
      - `message_id` (text, unique Gmail message ID)
      - `has_attachments` (boolean, whether email has attachments)
      - `attachment_names` (text[], list of attachment filenames)
      - `embedding` (vector(1536), OpenAI embedding for semantic search)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `company_emails` table
    - Users can only read/write their own emails
    - Data is private and secured per user

  3. Indexes
    - Index on user_id for fast lookups
    - Index on email_date for chronological queries
    - Index on message_id for deduplication
    - Vector index for similarity search
*/

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the company_emails table
CREATE TABLE IF NOT EXISTS company_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  sender_email text NOT NULL,
  sender_name text,
  email_date timestamptz NOT NULL,
  email_category text,
  gmail_labels text[] DEFAULT '{}',
  content text,
  thread_id text,
  message_id text NOT NULL,
  has_attachments boolean DEFAULT false,
  attachment_names text[] DEFAULT '{}',
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on message_id per user (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS company_emails_user_message_idx
  ON company_emails(user_id, message_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS company_emails_user_id_idx
  ON company_emails(user_id);

CREATE INDEX IF NOT EXISTS company_emails_email_date_idx
  ON company_emails(email_date DESC);

CREATE INDEX IF NOT EXISTS company_emails_thread_id_idx
  ON company_emails(thread_id);

CREATE INDEX IF NOT EXISTS company_emails_category_idx
  ON company_emails(email_category);

-- Vector similarity search index (HNSW for better performance)
CREATE INDEX IF NOT EXISTS company_emails_embedding_idx
  ON company_emails
  USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE company_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own emails
CREATE POLICY "Users can view own emails"
  ON company_emails
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own emails
CREATE POLICY "Users can insert own emails"
  ON company_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own emails
CREATE POLICY "Users can update own emails"
  ON company_emails
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own emails
CREATE POLICY "Users can delete own emails"
  ON company_emails
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_company_emails_updated_at
  BEFORE UPDATE ON company_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_company_emails_updated_at();

-- Function for semantic email search
CREATE OR REPLACE FUNCTION search_company_emails(
  query_embedding vector(1536),
  p_user_id uuid,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  subject text,
  sender_email text,
  sender_name text,
  email_date timestamptz,
  email_category text,
  gmail_labels text[],
  content text,
  thread_id text,
  has_attachments boolean,
  attachment_names text[],
  similarity_score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    subject,
    sender_email,
    sender_name,
    email_date,
    email_category,
    gmail_labels,
    content,
    thread_id,
    has_attachments,
    attachment_names,
    1 - (embedding <=> query_embedding) as similarity_score
  FROM company_emails
  WHERE user_id = p_user_id
  AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT p_limit;
$$;

-- Add helpful comments
COMMENT ON TABLE company_emails IS 'Stores vectorized Gmail emails for AI-powered search';
COMMENT ON COLUMN company_emails.embedding IS 'OpenAI embedding vector for semantic similarity search';
COMMENT ON COLUMN company_emails.message_id IS 'Unique Gmail message ID for deduplication';
COMMENT ON FUNCTION search_company_emails IS 'Performs semantic search on user emails using vector similarity';
