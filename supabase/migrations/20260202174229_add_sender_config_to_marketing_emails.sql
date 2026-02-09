/*
  # Add Sender Configuration to Marketing Emails

  1. Changes
    - Add `from_address` column to store sender email address
    - Add `from_name` column to store sender display name
    - Add `reply_to` column to store reply-to email address
    - Default values use the existing AI Rocket sender

  2. Purpose
    - Allow admins to select from authorized sender addresses
    - Support personalized emails from team members (e.g., Clay Speakman)
    - Store sender configuration with each email campaign
*/

ALTER TABLE marketing_emails
ADD COLUMN IF NOT EXISTS from_address text DEFAULT 'astra@airocket.app',
ADD COLUMN IF NOT EXISTS from_name text DEFAULT 'AI Rocket',
ADD COLUMN IF NOT EXISTS reply_to text;

COMMENT ON COLUMN marketing_emails.from_address IS 'Email address to send from (must be authorized in Resend)';
COMMENT ON COLUMN marketing_emails.from_name IS 'Display name for the sender';
COMMENT ON COLUMN marketing_emails.reply_to IS 'Optional reply-to email address';
