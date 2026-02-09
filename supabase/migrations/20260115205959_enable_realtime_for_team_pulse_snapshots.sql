/*
  # Enable Real-time for Team Pulse Snapshots

  1. Changes
    - Adds team_pulse_snapshots table to supabase_realtime publication
    - Enables real-time updates when new snapshots are created
*/

ALTER PUBLICATION supabase_realtime ADD TABLE team_pulse_snapshots;