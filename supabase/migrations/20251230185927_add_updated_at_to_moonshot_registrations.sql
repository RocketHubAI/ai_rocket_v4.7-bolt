/*
  # Add updated_at to moonshot registrations

  1. Changes
    - Add `updated_at` column to moonshot_registrations
    
  2. Notes
    - Tracks when a registration was last updated (e.g., when re-submitted)
*/

ALTER TABLE moonshot_registrations
ADD COLUMN IF NOT EXISTS updated_at timestamptz;
