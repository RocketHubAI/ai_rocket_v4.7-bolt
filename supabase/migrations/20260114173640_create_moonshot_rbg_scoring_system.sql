/*
  # Moonshot RBG Scoring System
  
  Creates tables and functions for the RBG Matrix scoring system used in the
  $5M AI Moonshot Challenge. Scores teams based on:
  - RUN Score (25%): Operational excellence from Team Dashboard health metrics
  - BUILD Score (25%): Capability development from goals progress
  - GROW Score (25%): Growth & alignment from alignment metrics  
  - Launch Points (25%): Platform engagement from existing team launch points

  ## 1. New Tables
  
  ### moonshot_rbg_scores
  - Daily RBG score calculations for each team
  - Stores individual dimension scores and overall Astra Score
  - Links to team_dashboard_snapshots for source data
  
  ### moonshot_challenge_standings
  - Current standings for all challenge participants
  - Tracks percentile rankings and top 25% status
  - Updated daily after score calculations

  ## 2. Security
  - Team members can view their own team's qualitative indicators
  - Only super admins can see actual numeric scores
  - RLS policies enforce data isolation

  ## 3. Functions
  - get_team_rbg_indicators: Returns qualitative indicators for a team
  - get_moonshot_standings: Returns standings list with top 25% flags
*/

-- Create moonshot_rbg_scores table for daily score snapshots
CREATE TABLE IF NOT EXISTS moonshot_rbg_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  run_score numeric(5,2) CHECK (run_score >= 0 AND run_score <= 100),
  build_score numeric(5,2) CHECK (build_score >= 0 AND build_score <= 100),
  grow_score numeric(5,2) CHECK (grow_score >= 0 AND grow_score <= 100),
  launch_points_score numeric(5,2) CHECK (launch_points_score >= 0 AND launch_points_score <= 100),
  overall_astra_score numeric(5,2) CHECK (overall_astra_score >= 0 AND overall_astra_score <= 100),
  calculation_details jsonb DEFAULT '{}'::jsonb,
  dashboard_snapshot_id uuid REFERENCES team_dashboard_snapshots(id) ON DELETE SET NULL,
  raw_launch_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, score_date)
);

-- Create moonshot_challenge_standings table for leaderboard
CREATE TABLE IF NOT EXISTS moonshot_challenge_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  team_name text NOT NULL,
  industry text,
  current_astra_score numeric(5,2) DEFAULT 0,
  run_indicator text DEFAULT 'Needs Improvement' CHECK (run_indicator IN ('Strong', 'Moderate', 'Needs Improvement')),
  build_indicator text DEFAULT 'Needs Improvement' CHECK (build_indicator IN ('Strong', 'Moderate', 'Needs Improvement')),
  grow_indicator text DEFAULT 'Needs Improvement' CHECK (grow_indicator IN ('Strong', 'Moderate', 'Needs Improvement')),
  launch_points_indicator text DEFAULT 'Needs Improvement' CHECK (launch_points_indicator IN ('Strong', 'Moderate', 'Needs Improvement')),
  overall_indicator text DEFAULT 'Needs Improvement' CHECK (overall_indicator IN ('Strong', 'Moderate', 'Needs Improvement')),
  percentile_rank numeric(5,2) DEFAULT 0,
  is_top_25_percent boolean DEFAULT false,
  scores_calculated_count integer DEFAULT 0,
  last_calculated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moonshot_rbg_scores_team_date 
  ON moonshot_rbg_scores(team_id, score_date DESC);

CREATE INDEX IF NOT EXISTS idx_moonshot_rbg_scores_date 
  ON moonshot_rbg_scores(score_date);

CREATE INDEX IF NOT EXISTS idx_moonshot_standings_percentile 
  ON moonshot_challenge_standings(percentile_rank DESC);

CREATE INDEX IF NOT EXISTS idx_moonshot_standings_top_25 
  ON moonshot_challenge_standings(is_top_25_percent) 
  WHERE is_top_25_percent = true;

CREATE INDEX IF NOT EXISTS idx_moonshot_standings_team_name 
  ON moonshot_challenge_standings(team_name);

-- Enable RLS
ALTER TABLE moonshot_rbg_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_challenge_standings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moonshot_rbg_scores

-- Super admins can see all scores (actual numbers)
CREATE POLICY "Super admins can view all RBG scores"
  ON moonshot_rbg_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN (
        'clay@rockethub.ai',
        'nick@rockethub.ai',
        'hello@rockethub.ai'
      )
    )
  );

-- Service role can insert scores
CREATE POLICY "Service role can insert RBG scores"
  ON moonshot_rbg_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role can update scores
CREATE POLICY "Service role can update RBG scores"
  ON moonshot_rbg_scores
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for moonshot_challenge_standings

-- All authenticated users can view standings (for alphabetical list with top 25% badges)
CREATE POLICY "Authenticated users can view standings"
  ON moonshot_challenge_standings
  FOR SELECT
  TO authenticated
  USING (true);

-- Super admins can manage standings
CREATE POLICY "Super admins can insert standings"
  ON moonshot_challenge_standings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN (
        'clay@rockethub.ai',
        'nick@rockethub.ai',
        'hello@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can update standings"
  ON moonshot_challenge_standings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN (
        'clay@rockethub.ai',
        'nick@rockethub.ai',
        'hello@rockethub.ai'
      )
    )
  );

-- Function to convert numeric score to qualitative indicator
CREATE OR REPLACE FUNCTION score_to_indicator(score numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF score >= 70 THEN
    RETURN 'Strong';
  ELSIF score >= 40 THEN
    RETURN 'Moderate';
  ELSE
    RETURN 'Needs Improvement';
  END IF;
END;
$$;

-- Function to get team's RBG indicators (for team members to see their own progress)
CREATE OR REPLACE FUNCTION get_team_rbg_indicators(p_team_id uuid)
RETURNS TABLE (
  run_indicator text,
  build_indicator text,
  grow_indicator text,
  launch_points_indicator text,
  overall_indicator text,
  is_top_25_percent boolean,
  last_calculated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_team_id uuid;
BEGIN
  -- Get user's team_id
  SELECT u.team_id INTO v_user_team_id
  FROM users u
  WHERE u.id = auth.uid();
  
  -- Only allow users to see their own team's indicators
  IF v_user_team_id IS NULL OR v_user_team_id != p_team_id THEN
    RETURN QUERY SELECT 
      'Needs Improvement'::text,
      'Needs Improvement'::text,
      'Needs Improvement'::text,
      'Needs Improvement'::text,
      'Needs Improvement'::text,
      false,
      NULL::timestamptz;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    s.run_indicator,
    s.build_indicator,
    s.grow_indicator,
    s.launch_points_indicator,
    s.overall_indicator,
    s.is_top_25_percent,
    s.last_calculated_at
  FROM moonshot_challenge_standings s
  WHERE s.team_id = p_team_id;
END;
$$;

-- Function to get all standings for the standings page
CREATE OR REPLACE FUNCTION get_moonshot_standings(p_top_25_only boolean DEFAULT false)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  industry text,
  is_top_25_percent boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.team_id,
    s.team_name,
    s.industry,
    s.is_top_25_percent,
    s.created_at
  FROM moonshot_challenge_standings s
  WHERE (NOT p_top_25_only OR s.is_top_25_percent = true)
  ORDER BY s.team_name ASC;
END;
$$;

-- Initialize standings for existing moonshot participants
-- Link teams to their moonshot registrations
INSERT INTO moonshot_challenge_standings (team_id, team_name, industry)
SELECT DISTINCT ON (t.id)
  t.id,
  t.name,
  mr.industry
FROM teams t
JOIN moonshot_registrations mr ON LOWER(mr.team_name) = LOWER(t.name)
JOIN moonshot_invite_codes mic ON mic.registration_id = mr.id AND mic.is_redeemed = true
WHERE t.id NOT IN (SELECT team_id FROM moonshot_challenge_standings)
ON CONFLICT (team_id) DO NOTHING;

-- Also add teams that redeemed codes but may have different names
INSERT INTO moonshot_challenge_standings (team_id, team_name, industry)
SELECT DISTINCT ON (t.id)
  t.id,
  t.name,
  mr.industry
FROM teams t
JOIN users u ON u.team_id = t.id
JOIN moonshot_invite_codes mic ON mic.redeemed_by_user_id = u.id AND mic.is_redeemed = true
JOIN moonshot_registrations mr ON mr.id = mic.registration_id
WHERE t.id NOT IN (SELECT team_id FROM moonshot_challenge_standings)
ON CONFLICT (team_id) DO NOTHING;

-- Enable realtime for standings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'moonshot_challenge_standings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE moonshot_challenge_standings;
  END IF;
END $$;
