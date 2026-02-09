/*
  # Enable Realtime for Team Pulse Settings

  1. Changes
    - Enables realtime for team_pulse_settings table
    - Required for background generation status updates to propagate to clients

  2. Purpose
    - Allows clients to subscribe to generation_in_progress changes
    - Enables automatic UI updates when background generation completes
*/

ALTER PUBLICATION supabase_realtime ADD TABLE team_pulse_settings;
