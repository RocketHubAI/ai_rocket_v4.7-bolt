/*
  # Create Preview Requests Table

  ## Overview
  Creates a table to store email addresses from users requesting free preview access
  to the platform before general availability.

  ## 1. New Tables
    - `preview_requests`
      - `id` (uuid, primary key) - Unique identifier for each request
      - `email` (text, not null) - Email address of the user requesting access
      - `created_at` (timestamptz) - Timestamp when request was submitted
      - `updated_at` (timestamptz) - Timestamp of last update

  ## 2. Indexes
    - Index on `email` for faster lookups
    - Index on `created_at` for chronological sorting

  ## 3. Security
    - Enable RLS on `preview_requests` table
    - Allow anonymous users to insert their own preview requests
    - Only admins can view all preview requests

  ## 4. Important Notes
    - No unique constraint on email - allows duplicate submissions
    - This is intentional to handle cases where users accidentally submit multiple times
    - Duplicates can be filtered in queries when needed
*/

-- Create the preview_requests table
CREATE TABLE IF NOT EXISTS preview_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_preview_requests_email ON preview_requests(email);
CREATE INDEX IF NOT EXISTS idx_preview_requests_created_at ON preview_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE preview_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone (including anonymous users) to insert preview requests
CREATE POLICY "Anyone can submit preview requests"
  ON preview_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only super admins can view all preview requests
CREATE POLICY "Super admins can view all preview requests"
  ON preview_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.life',
        'hydramaxxclean@gmail.com'
      )
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_preview_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_preview_requests_updated_at
  BEFORE UPDATE ON preview_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_preview_requests_updated_at();

-- Add helpful comment
COMMENT ON TABLE preview_requests IS 'Stores email addresses from users requesting free preview access to the platform';