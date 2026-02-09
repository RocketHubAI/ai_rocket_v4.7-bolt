/*
  # Add mastermind groups to moonshot survey responses

  1. Changes
    - Add `mastermind_groups` column to moonshot_survey_responses
    - Backfill existing records with 'Gobundance'

  2. Notes
    - Column will store array of group names (e.g., ['Gobundance', 'YPO'])
    - For "Other" responses, custom text will be stored in the array
    - 'None' will be represented as ['None']
*/

-- Add the column
ALTER TABLE moonshot_survey_responses
ADD COLUMN IF NOT EXISTS mastermind_groups text[] DEFAULT '{}';

-- Backfill existing records with 'Gobundance'
UPDATE moonshot_survey_responses
SET mastermind_groups = ARRAY['Gobundance']
WHERE mastermind_groups = '{}' OR mastermind_groups IS NULL;
