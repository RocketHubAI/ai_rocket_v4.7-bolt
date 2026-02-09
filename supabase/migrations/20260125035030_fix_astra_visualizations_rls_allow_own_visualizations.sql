/*
  # Fix astra_visualizations RLS policy for workshop users
  
  1. Changes
    - Update SELECT policy to allow users to view their OWN visualizations
    - This fixes the blank gallery page for workshop users who may not have
      matching team_id in the users table
    
  2. Security
    - Users can now view visualizations where EITHER:
      a) They belong to the same team (existing behavior)
      b) They created the visualization themselves (user_id = auth.uid())
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their team visualizations" ON astra_visualizations;

-- Create updated SELECT policy that allows viewing own visualizations
CREATE POLICY "Users can view their team or own visualizations"
  ON astra_visualizations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

-- Also update the slides policy to match
DROP POLICY IF EXISTS "Users can view slides for their team visualizations" ON astra_visualization_slides;

CREATE POLICY "Users can view slides for their team or own visualizations"
  ON astra_visualization_slides
  FOR SELECT
  TO authenticated
  USING (
    visualization_id IN (
      SELECT id FROM astra_visualizations
      WHERE user_id = auth.uid()
      OR team_id IN (
        SELECT team_id FROM users WHERE id = auth.uid()
      )
    )
  );
