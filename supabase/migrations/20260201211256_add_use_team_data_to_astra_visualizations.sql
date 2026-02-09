/*
  # Add use_team_data tracking to astra_visualizations

  1. Changes
    - Add `use_team_data` boolean column to `astra_visualizations` table
    - Default to `true` to maintain backward compatibility
    - Track whether team data was used in generating the visualization
  
  2. Purpose
    - Allow users to create visualizations with only custom prompt content
    - Track user preferences for analytics and improvement
    - Provide transparency about what data sources were used
*/

-- Add use_team_data column to astra_visualizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astra_visualizations' AND column_name = 'use_team_data'
  ) THEN
    ALTER TABLE astra_visualizations 
    ADD COLUMN use_team_data boolean DEFAULT true;
  END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN astra_visualizations.use_team_data IS 'Whether team data was included in the generation. False means only custom prompt was used.';