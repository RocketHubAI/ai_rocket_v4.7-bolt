/*
  # Add Dynamic Subject Mode to Marketing Emails

  1. Changes
    - Add `subject_mode` column to marketing_emails table
    - Values: 'static' (admin enters subject) or 'dynamic' (Gemini generates subject)
    - Defaults to 'static' for backwards compatibility

  2. Notes
    - For recurring emails, dynamic mode will generate a fresh subject each time
    - Static mode uses the subject field as-is
*/

ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS subject_mode text DEFAULT 'static' 
CHECK (subject_mode IN ('static', 'dynamic'));

COMMENT ON COLUMN marketing_emails.subject_mode IS 'Subject generation mode: static (user-entered) or dynamic (AI-generated)';
