/*
  # Add Category Access to Invite Codes

  1. Changes
    - Add `category_access` JSONB column to `invite_codes` table
    - This stores the initial category access settings for invited users
    - Format: { "meetings": true, "financial": false, ... }

  2. Notes
    - When null, invited user gets access to all categories (default behavior)
    - When set, only the specified categories are accessible
    - Applied when user signs up with the invite code
*/

ALTER TABLE invite_codes
ADD COLUMN IF NOT EXISTS category_access jsonb DEFAULT NULL;

COMMENT ON COLUMN invite_codes.category_access IS 'JSON object mapping category names to boolean access values. Null means all access.';
