/*
  # Add deliver_at column for off-peak report pre-processing

  1. Changes
    - Add `deliver_at` column to `astra_chats` table
    - This allows reports to be generated at off-peak times but delivered at scheduled times
    - NULL means immediate delivery (already delivered)
    - Non-NULL means pending delivery at that time

  2. How it works
    - Reports generated at off-peak hours (2-5 AM) will have deliver_at set to user's scheduled time
    - Reports page filters by: deliver_at IS NULL OR deliver_at <= now()
    - A delivery cron sends emails when deliver_at is reached
*/

ALTER TABLE astra_chats
ADD COLUMN IF NOT EXISTS deliver_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN astra_chats.deliver_at IS 'When to deliver this report (show in UI and send email). NULL = already delivered.';

CREATE INDEX IF NOT EXISTS idx_astra_chats_deliver_at 
ON astra_chats(deliver_at) 
WHERE deliver_at IS NOT NULL;
