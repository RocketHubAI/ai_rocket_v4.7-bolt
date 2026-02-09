/*
  # Fix Clay User Email

  This migration reverts the email for user clay1@rockethub.ai back to clay@rockethub.ai
  since the email change confirmation link expired and the user cannot log in.
  
  Changes:
  - Updates email from clay1@rockethub.ai to clay@rockethub.ai
  - Ensures email is confirmed
*/

-- Update the user's email directly in auth.users
UPDATE auth.users 
SET 
  email = 'clay@rockethub.ai',
  email_confirmed_at = NOW(),
  email_change = '',
  email_change_sent_at = NULL,
  updated_at = NOW()
WHERE id = 'c489ac6c-2e84-41a1-937d-a49bc2c3fecb';
