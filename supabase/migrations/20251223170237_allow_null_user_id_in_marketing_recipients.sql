/*
  # Allow Null User ID in Marketing Email Recipients

  ## Overview
  Allows marketing emails to be sent to preview request users who haven't created accounts yet.
  The user_id field needs to be nullable to support sending to email addresses that aren't
  in the users table.

  ## 1. Changes
    - Make `user_id` column nullable in `marketing_email_recipients` table
    - Update foreign key constraint to allow null values

  ## 2. Purpose
    - Enable sending marketing emails to preview request users who haven't signed up yet
    - Track email sends to non-users for marketing campaign analytics
    - Allow flexible recipient targeting beyond registered users

  ## 3. Important Notes
    - Existing recipient records are unaffected (they all have valid user_ids)
    - RLS policies remain unchanged
    - When user_id is null, the email field is used for sending
*/

-- Make user_id nullable in marketing_email_recipients
ALTER TABLE marketing_email_recipients
ALTER COLUMN user_id DROP NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN marketing_email_recipients.user_id IS 'User ID if recipient is a registered user, null for preview requests or external recipients';
