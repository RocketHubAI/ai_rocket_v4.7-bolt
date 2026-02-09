/*
  # Create Proactive Notification Tracking Tables

  This migration creates tables for tracking proactive notifications sent by the assistant.

  1. New Tables
    - `assistant_proactive_events`
      - Tracks all proactive notifications sent to users
      - Records event type, channel used, delivery status
      - Stores message content and metadata
    
    - `proactive_notification_queue`
      - Queue for scheduled/pending notifications
      - Supports deduplication to prevent spam
      - Handles retries for failed sends

  2. Event Types Supported
    - daily_summary, report_ready, goal_milestone
    - meeting_reminder, action_item_due, team_mention
    - insight_discovered, sync_complete, weekly_recap

  3. Delivery Statuses
    - pending: Queued for sending
    - sending: Currently being processed
    - sent: Successfully sent to provider
    - delivered: Confirmed delivery (if webhook available)
    - failed: Send failed
    - retry_pending: Scheduled for retry

  4. Security
    - RLS enabled on all tables
    - Users can view their own events
    - System functions can insert/update via service role
*/

-- Create enum for notification status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status_enum') THEN
    CREATE TYPE notification_status_enum AS ENUM (
      'pending', 
      'sending', 
      'sent', 
      'delivered', 
      'failed', 
      'retry_pending'
    );
  END IF;
END $$;

-- Create enum for notification channels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel_enum') THEN
    CREATE TYPE notification_channel_enum AS ENUM (
      'email', 
      'sms', 
      'whatsapp', 
      'telegram',
      'in_app'
    );
  END IF;
END $$;

-- Create enum for event types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proactive_event_type_enum') THEN
    CREATE TYPE proactive_event_type_enum AS ENUM (
      'daily_summary',
      'report_ready',
      'goal_milestone',
      'meeting_reminder',
      'action_item_due',
      'team_mention',
      'insight_discovered',
      'sync_complete',
      'weekly_recap',
      'custom'
    );
  END IF;
END $$;

-- Create assistant_proactive_events table
CREATE TABLE IF NOT EXISTS assistant_proactive_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Event details
  event_type proactive_event_type_enum NOT NULL,
  channel notification_channel_enum NOT NULL,
  
  -- Message content
  message_title text,
  message_body text NOT NULL,
  message_html text,
  
  -- Delivery tracking
  status notification_status_enum NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  
  -- Timestamps
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  
  -- Provider response
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  
  -- Additional metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create proactive_notification_queue table
CREATE TABLE IF NOT EXISTS proactive_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Event details
  event_type proactive_event_type_enum NOT NULL,
  priority integer NOT NULL DEFAULT 5,
  
  -- Deduplication
  dedup_key text,
  
  -- Scheduling
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  process_after timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  
  -- Processing state
  is_processed boolean NOT NULL DEFAULT false,
  processing_started_at timestamptz,
  
  -- Content generation
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_message text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE assistant_proactive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_notification_queue ENABLE ROW LEVEL SECURITY;

-- assistant_proactive_events policies
CREATE POLICY "Users can view own proactive events"
  ON assistant_proactive_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all proactive events"
  ON assistant_proactive_events
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- proactive_notification_queue policies
CREATE POLICY "Users can view own notification queue"
  ON proactive_notification_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queued notifications"
  ON proactive_notification_queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all notification queue"
  ON proactive_notification_queue
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_proactive_events_user_id 
  ON assistant_proactive_events(user_id);

CREATE INDEX IF NOT EXISTS idx_proactive_events_status 
  ON assistant_proactive_events(status) 
  WHERE status IN ('pending', 'sending', 'retry_pending');

CREATE INDEX IF NOT EXISTS idx_proactive_events_scheduled 
  ON assistant_proactive_events(scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_proactive_events_user_event_type 
  ON assistant_proactive_events(user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_notification_queue_unprocessed 
  ON proactive_notification_queue(scheduled_for) 
  WHERE is_processed = false;

CREATE INDEX IF NOT EXISTS idx_notification_queue_dedup 
  ON proactive_notification_queue(dedup_key) 
  WHERE dedup_key IS NOT NULL AND is_processed = false;

CREATE INDEX IF NOT EXISTS idx_notification_queue_user 
  ON proactive_notification_queue(user_id);

-- Create unique constraint for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_dedup_unique
  ON proactive_notification_queue(user_id, dedup_key)
  WHERE dedup_key IS NOT NULL AND is_processed = false;

-- Enable realtime for events table (for in-app tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE assistant_proactive_events;