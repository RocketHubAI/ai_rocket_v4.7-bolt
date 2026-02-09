/*
  # Add is_active column to gmail_auth table

  1. Changes
    - Add `is_active` column to gmail_auth table if it doesn't exist
    - Set default value to true for new records
    - Update existing records to have is_active = true

  2. Notes
    - Uses DO block to safely add column only if it doesn't exist
    - No data loss - preserves all existing data
*/

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_auth' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE gmail_auth ADD COLUMN is_active boolean DEFAULT true;

    -- Update any existing records to be active
    UPDATE gmail_auth SET is_active = true WHERE is_active IS NULL;

    -- Add comment
    COMMENT ON COLUMN gmail_auth.is_active IS 'Whether the Gmail connection is currently active';
  END IF;
END $$;
