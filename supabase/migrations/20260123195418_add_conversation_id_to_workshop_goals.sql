/*
  # Add conversation tracking to workshop goals

  1. Changes
    - Add `conversation_id` column to workshop_goals table
    - Allows tracking which Astra chat conversation belongs to each goal
    - Users returning to a goal will see their previous chat history

  2. Purpose
    - Enable persistent chat history per goal in workshop
    - Users can continue conversations where they left off
*/

ALTER TABLE workshop_goals
ADD COLUMN IF NOT EXISTS conversation_id uuid;

COMMENT ON COLUMN workshop_goals.conversation_id IS 'Links to the astra_chats conversation for this goal';