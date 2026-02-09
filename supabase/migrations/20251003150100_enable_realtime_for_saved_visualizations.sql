/*
  # Enable Realtime for saved_visualizations

  1. Changes
    - Enable realtime replication for saved_visualizations table
    - This allows instant updates when visualizations are saved or deleted
*/

ALTER PUBLICATION supabase_realtime ADD TABLE saved_visualizations;
