/*
  # Add New Mission Control Page Feature Flag

  1. Changes
    - Add feature flag for 'new_mission_control_page' for clay@rockethub.ai
    - This enables the new tab-based Mission Control page experience

  2. Notes
    - Initially only clay@rockethub.ai will see the new Mission Control page
    - Other users continue to see the existing modal-based Mission Control
    - Can be rolled out to more users by adding their emails/user_ids
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM feature_flags 
    WHERE email = 'clay@rockethub.ai' 
    AND feature_name = 'new_mission_control_page'
  ) THEN
    INSERT INTO feature_flags (email, feature_name, enabled)
    VALUES ('clay@rockethub.ai', 'new_mission_control_page', true);
  END IF;
END $$;
