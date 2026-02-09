/*
  # Create Integration Audit Log System

  1. New Tables
    - `integration_audit_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, optional)
      - `integration_id` (uuid, references integration_registry)
      - `action` (text) - connect, disconnect, token_refresh, token_expired, 
        api_call, error, status_change, agent_use
      - `details` (jsonb) - Action-specific details
      - `ip_address` (text, optional)
      - `created_at` (timestamptz)

  2. Changes
    - Creates automatic audit triggers on user_integrations for 
      INSERT (connect), UPDATE (status_change), DELETE (disconnect)

  3. Security
    - Enable RLS on integration_audit_log
    - Users can read their own audit entries
    - Super admins can read all entries
*/

CREATE TABLE IF NOT EXISTS integration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid,
  integration_id uuid REFERENCES integration_registry(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE integration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
  ON integration_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all audit logs"
  ON integration_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'email') IN (
      'clay@rockethub.ai', 'john@rockethub.ai'
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON integration_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_integration_id ON integration_audit_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON integration_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON integration_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION log_integration_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action text;
  v_details jsonb;
  v_provider_slug text;
BEGIN
  SELECT provider_slug INTO v_provider_slug
  FROM integration_registry
  WHERE id = COALESCE(NEW.integration_id, OLD.integration_id)
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'connect';
    v_details := jsonb_build_object(
      'provider_slug', v_provider_slug,
      'status', NEW.status,
      'account_email', NEW.connected_account_email
    );
    INSERT INTO integration_audit_log (user_id, team_id, integration_id, action, details)
    VALUES (NEW.user_id, NEW.team_id, NEW.integration_id, v_action, v_details);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'disconnected' THEN
        v_action := 'disconnect';
      ELSIF NEW.status = 'expired' THEN
        v_action := 'token_expired';
      ELSIF NEW.status = 'active' AND OLD.status = 'expired' THEN
        v_action := 'token_refresh';
      ELSE
        v_action := 'status_change';
      END IF;
      v_details := jsonb_build_object(
        'provider_slug', v_provider_slug,
        'old_status', OLD.status,
        'new_status', NEW.status
      );
      INSERT INTO integration_audit_log (user_id, team_id, integration_id, action, details)
      VALUES (NEW.user_id, NEW.team_id, NEW.integration_id, v_action, v_details);
    END IF;

    IF OLD.times_used_by_agent IS DISTINCT FROM NEW.times_used_by_agent 
       AND NEW.times_used_by_agent > OLD.times_used_by_agent THEN
      INSERT INTO integration_audit_log (user_id, team_id, integration_id, action, details)
      VALUES (
        NEW.user_id, NEW.team_id, NEW.integration_id, 'agent_use',
        jsonb_build_object(
          'provider_slug', v_provider_slug,
          'total_uses', NEW.times_used_by_agent
        )
      );
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'disconnect';
    v_details := jsonb_build_object(
      'provider_slug', v_provider_slug,
      'last_status', OLD.status,
      'account_email', OLD.connected_account_email
    );
    INSERT INTO integration_audit_log (user_id, team_id, integration_id, action, details)
    VALUES (OLD.user_id, OLD.team_id, OLD.integration_id, v_action, v_details);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_log_integration_changes'
  ) THEN
    CREATE TRIGGER trg_log_integration_changes
    AFTER INSERT OR UPDATE OR DELETE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION log_integration_change();
  END IF;
END $$;
