/*
  # Create User Assistant Preferences System

  This migration sets up the infrastructure for proactive AI assistant notifications
  with multi-channel support (Email, SMS, WhatsApp, Telegram).

  1. New Tables
    - `user_assistant_preferences`
      - `user_id` (uuid, primary key) - References auth.users
      - `proactive_enabled` (boolean) - Master toggle for proactive notifications
      - `proactive_level` (text) - 'low', 'medium', 'high' - frequency setting
      - `email_enabled` (boolean) - Email notifications enabled
      - `email_address` (text) - Override email for notifications
      - `sms_enabled` (boolean) - SMS notifications enabled
      - `sms_phone_number` (text) - Phone number for SMS
      - `whatsapp_enabled` (boolean) - WhatsApp notifications enabled
      - `whatsapp_number` (text) - WhatsApp phone number
      - `telegram_enabled` (boolean) - Telegram notifications enabled
      - `telegram_chat_id` (text) - Telegram chat ID for the user
      - `quiet_hours_enabled` (boolean) - Respect quiet hours
      - `quiet_hours_start` (time) - Start of quiet period
      - `quiet_hours_end` (time) - End of quiet period
      - `quiet_hours_timezone` (text) - User's timezone
      - `notification_types` (jsonb) - Granular control per event type
      - `created_at`, `updated_at` (timestamptz)

  2. Default Notification Types Configuration
    - daily_summary: Morning briefing
    - report_ready: Scheduled report completed
    - goal_milestone: Progress toward goals
    - meeting_reminder: Upcoming meetings
    - action_item_due: Deadlines approaching
    - team_mention: Mentioned in team chat
    - insight_discovered: AI found interesting patterns
    - sync_complete: Document sync finished
    - weekly_recap: End of week summary

  3. Security
    - RLS enabled
    - Users can only manage their own preferences
    - Super admins have full access for support
*/

-- Create enum for proactive levels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proactive_level_enum') THEN
    CREATE TYPE proactive_level_enum AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

-- Create user_assistant_preferences table
CREATE TABLE IF NOT EXISTS user_assistant_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Master toggle
  proactive_enabled boolean NOT NULL DEFAULT false,
  proactive_level proactive_level_enum NOT NULL DEFAULT 'medium',
  
  -- Email channel
  email_enabled boolean NOT NULL DEFAULT true,
  email_address text DEFAULT NULL,
  
  -- SMS channel (via Twilio)
  sms_enabled boolean NOT NULL DEFAULT false,
  sms_phone_number text DEFAULT NULL,
  
  -- WhatsApp channel (via Twilio)
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  whatsapp_number text DEFAULT NULL,
  
  -- Telegram channel
  telegram_enabled boolean NOT NULL DEFAULT false,
  telegram_chat_id text DEFAULT NULL,
  
  -- Quiet hours
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time DEFAULT '22:00',
  quiet_hours_end time DEFAULT '08:00',
  quiet_hours_timezone text DEFAULT 'America/New_York',
  
  -- Granular notification type preferences
  -- Each key is an event type, value is boolean enabled/disabled
  notification_types jsonb NOT NULL DEFAULT '{
    "daily_summary": true,
    "report_ready": true,
    "goal_milestone": true,
    "meeting_reminder": true,
    "action_item_due": true,
    "team_mention": true,
    "insight_discovered": true,
    "sync_complete": false,
    "weekly_recap": true
  }'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_assistant_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own assistant preferences"
  ON user_assistant_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own assistant preferences"
  ON user_assistant_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own assistant preferences"
  ON user_assistant_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own assistant preferences"
  ON user_assistant_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admins can manage all preferences for support
CREATE POLICY "Super admins can manage all assistant preferences"
  ON user_assistant_preferences
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_assistant_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_assistant_preferences_timestamp ON user_assistant_preferences;
CREATE TRIGGER update_user_assistant_preferences_timestamp
  BEFORE UPDATE ON user_assistant_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_assistant_preferences_updated_at();

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_assistant_preferences_proactive 
  ON user_assistant_preferences(proactive_enabled) 
  WHERE proactive_enabled = true;

-- Enable realtime for preferences updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_assistant_preferences;