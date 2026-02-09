/*
  # Fix Report Notification URLs

  1. Changes
    - Update all existing report notifications that use `/reports` action_url
    - Change to `/?openReports=true` which the app now handles properly
    - This fixes the issue where clicking "Your Report is Ready" notifications
      would navigate to a non-existent route

  2. Impact
    - All 840+ existing report notifications will now work correctly
    - Users clicking report notifications will be taken to the Reports tab
*/

-- Update all report notifications with the old /reports URL to use the new format
UPDATE astra_notifications
SET action_url = '/?openReports=true'
WHERE action_url = '/reports';

-- Also handle any variations that might exist
UPDATE astra_notifications
SET action_url = '/?openReports=true'
WHERE type = 'report' AND action_url IS NOT NULL AND action_url NOT LIKE '%openReports%';
