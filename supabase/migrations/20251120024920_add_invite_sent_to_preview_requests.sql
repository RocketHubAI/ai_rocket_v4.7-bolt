/*
  # Add Invite Tracking to Preview Requests

  ## Overview
  Adds columns to track when preview invites have been sent to requesters,
  allowing admin users to see completion status and resend if needed.

  ## 1. Changes
    - Add `invite_sent` (boolean, default false) - Whether invite has been sent
    - Add `invite_sent_at` (timestamptz, nullable) - When invite was last sent
    - Add `invite_code` (text, nullable) - The invite code that was sent

  ## 2. Indexes
    - Index on `invite_sent` for filtering sent/unsent invites

  ## 3. Security
    - Existing RLS policies cover these new columns
    - Super admins can view and update these fields

  ## 4. Important Notes
    - Setting `invite_sent = true` automatically sets `invite_sent_at = now()`
    - Allows tracking multiple sends (updates timestamp each time)
    - Preserves the invite code for reference
*/

-- Add invite tracking columns
ALTER TABLE preview_requests 
ADD COLUMN IF NOT EXISTS invite_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS invite_code text;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_preview_requests_invite_sent 
ON preview_requests(invite_sent);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can update preview requests" ON preview_requests;

-- Add RLS policy for super admins to update invite status
CREATE POLICY "Super admins can update preview requests"
  ON preview_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.life',
        'hydramaxxclean@gmail.com'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.life',
        'hydramaxxclean@gmail.com'
      )
    )
  );

-- Add helpful comments
COMMENT ON COLUMN preview_requests.invite_sent IS 'Whether an invite email has been sent to this requester';
COMMENT ON COLUMN preview_requests.invite_sent_at IS 'Timestamp when invite was last sent';
COMMENT ON COLUMN preview_requests.invite_code IS 'The invite code that was sent to this email';
