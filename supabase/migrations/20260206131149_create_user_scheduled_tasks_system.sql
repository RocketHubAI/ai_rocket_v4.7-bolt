/*
  # Create User Scheduled Tasks System

  1. New Enums
    - `task_frequency_enum` - how often a task repeats (once, daily, weekly, biweekly, monthly)
    - `task_status_enum` - task lifecycle states (active, paused, completed, expired)
    - `task_type_enum` - what kind of task (reminder, research, report, check_in, custom)

  2. New Tables
    - `user_scheduled_tasks`
      - `id` (uuid, primary key) - unique task identifier
      - `user_id` (uuid, FK auth.users) - task owner
      - `team_id` (uuid, FK teams) - team context
      - `task_type` (task_type_enum) - categorization of the task
      - `title` (text) - short human-readable name
      - `description` (text) - full description / prompt for the AI
      - `frequency` (task_frequency_enum) - how often it runs
      - `schedule_day` (integer) - day of week (0=Sun) or day of month depending on frequency
      - `schedule_hour` (integer) - hour in UTC to execute (0-23)
      - `schedule_minute` (integer) - minute to execute (0-59)
      - `timezone` (text) - user's timezone for display
      - `next_run_at` (timestamptz) - when this task should next execute
      - `last_run_at` (timestamptz) - when it last executed
      - `run_count` (integer) - total times executed
      - `max_runs` (integer, nullable) - optional cap on executions
      - `status` (task_status_enum) - current lifecycle state
      - `ai_prompt` (text) - the actual prompt sent to the AI
      - `delivery_method` (text) - how results are delivered (conversation, notification, both)
      - `metadata` (jsonb) - extensible context
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `scheduled_task_executions`
      - `id` (uuid, primary key) - execution record ID
      - `task_id` (uuid, FK user_scheduled_tasks) - which task ran
      - `user_id` (uuid, FK auth.users) - task owner
      - `team_id` (uuid, FK teams) - team context
      - `started_at` (timestamptz) - when execution began
      - `completed_at` (timestamptz) - when execution finished
      - `status` (text) - success, failed, skipped
      - `result_message` (text) - the AI-generated result
      - `conversation_id` (uuid) - link to agent_conversations entry
      - `error` (text) - error details if failed
      - `metadata` (jsonb) - execution context

  3. Security
    - RLS on both tables
    - Users can manage their own tasks
    - Super admins can view all

  4. Indexes
    - next_run_at for active tasks (cron query optimization)
    - user_id + status for user dashboard queries
    - task_id for execution history lookups

  5. Realtime
    - Enabled for user_scheduled_tasks for live UI updates
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_frequency_enum') THEN
    CREATE TYPE task_frequency_enum AS ENUM ('once', 'daily', 'weekly', 'biweekly', 'monthly');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_enum') THEN
    CREATE TYPE task_status_enum AS ENUM ('active', 'paused', 'completed', 'expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN
    CREATE TYPE task_type_enum AS ENUM ('reminder', 'research', 'report', 'check_in', 'custom');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  task_type task_type_enum NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  frequency task_frequency_enum NOT NULL DEFAULT 'once',
  schedule_day integer,
  schedule_hour integer NOT NULL DEFAULT 9,
  schedule_minute integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'America/New_York',
  next_run_at timestamptz,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  max_runs integer,
  status task_status_enum NOT NULL DEFAULT 'active',
  ai_prompt text NOT NULL,
  delivery_method text NOT NULL DEFAULT 'conversation',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_schedule_hour CHECK (schedule_hour >= 0 AND schedule_hour <= 23),
  CONSTRAINT valid_schedule_minute CHECK (schedule_minute >= 0 AND schedule_minute <= 59),
  CONSTRAINT valid_schedule_day CHECK (schedule_day IS NULL OR (schedule_day >= 0 AND schedule_day <= 31))
);

CREATE TABLE IF NOT EXISTS scheduled_task_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES user_scheduled_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  result_message text,
  conversation_id uuid,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_task_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled tasks"
  ON user_scheduled_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled tasks"
  ON user_scheduled_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled tasks"
  ON user_scheduled_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled tasks"
  ON user_scheduled_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all scheduled tasks"
  ON user_scheduled_tasks FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())
    IN ('clay@rockethub.ai', 'john@rockethub.ai')
  );

CREATE POLICY "Users can view own task executions"
  ON scheduled_task_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task executions"
  ON scheduled_task_executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all task executions"
  ON scheduled_task_executions FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())
    IN ('clay@rockethub.ai', 'john@rockethub.ai')
  );

CREATE POLICY "Service role can manage all scheduled tasks"
  ON user_scheduled_tasks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all task executions"
  ON scheduled_task_executions FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
  ON user_scheduled_tasks (next_run_at)
  WHERE status = 'active' AND next_run_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_status
  ON user_scheduled_tasks (user_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_team
  ON user_scheduled_tasks (team_id);

CREATE INDEX IF NOT EXISTS idx_task_executions_task_id
  ON scheduled_task_executions (task_id);

CREATE INDEX IF NOT EXISTS idx_task_executions_user_id
  ON scheduled_task_executions (user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_scheduled_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_scheduled_tasks;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_scheduled_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_scheduled_task_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_scheduled_task_updated_at
      BEFORE UPDATE ON user_scheduled_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_scheduled_task_updated_at();
  END IF;
END $$;