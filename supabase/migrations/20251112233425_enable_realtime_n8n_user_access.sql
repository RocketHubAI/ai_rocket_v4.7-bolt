/*
  # Enable Realtime for N8N User Access

  1. Changes
    - Enable realtime updates for n8n_user_access table
    - This allows the UI to react immediately when user access is granted/revoked
*/

-- Enable realtime for n8n_user_access
ALTER PUBLICATION supabase_realtime ADD TABLE n8n_user_access;
