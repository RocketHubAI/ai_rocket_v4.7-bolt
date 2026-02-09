/*
  # Enable Realtime for Data Sync Sessions

  1. Changes
    - Add data_sync_sessions table to realtime publication
    - Enables live updates for sync progress tracking

  2. Purpose
    - Users can see real-time progress of their data sync
    - UI updates automatically as files are discovered, stored, and classified
*/

ALTER PUBLICATION supabase_realtime ADD TABLE data_sync_sessions;