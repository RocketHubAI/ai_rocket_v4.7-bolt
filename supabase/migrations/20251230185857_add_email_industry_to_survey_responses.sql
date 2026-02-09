/*
  # Add email and industry to moonshot survey responses

  1. Changes
    - Add `email` column to moonshot_survey_responses
    - Add `industry` column to moonshot_survey_responses
    
  2. Notes
    - These columns allow survey data to be self-contained for analytics
*/

ALTER TABLE moonshot_survey_responses
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS industry text;
