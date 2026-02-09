/*
  # Create Workshop Insights Storage System

  This migration creates a table to store AI-generated workshop insights
  including infographic presentations for Goals, Wishes, and Plans analysis.

  1. New Tables
    - `workshop_admin_insights` - Stores generated AI insights and infographics
      - `id` (uuid, primary key)
      - `insight_type` (text) - 'goals', 'wishes', or 'plans'
      - `title` (text) - Title of the insight analysis
      - `summary` (text) - Executive summary
      - `insights_data` (jsonb) - Full structured insights
      - `slides` (jsonb) - Array of 5 slide objects with titles, content, and image URLs
      - `generated_at` (timestamptz) - When insights were generated
      - `created_by` (uuid) - Admin who generated the insights
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Super admins can manage all insights
*/

CREATE TABLE IF NOT EXISTS workshop_admin_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL CHECK (insight_type IN ('goals', 'wishes', 'plans')),
  title text NOT NULL,
  summary text,
  insights_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(insight_type)
);

ALTER TABLE workshop_admin_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage workshop insights"
  ON workshop_admin_insights
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

CREATE INDEX IF NOT EXISTS idx_workshop_admin_insights_type ON workshop_admin_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_workshop_admin_insights_generated_at ON workshop_admin_insights(generated_at DESC);