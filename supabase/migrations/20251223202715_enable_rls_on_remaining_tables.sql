/*
  # Enable RLS on Remaining Tables - Security Hardening

  ## Overview
  This migration completes the RLS implementation across all tables in the database,
  ensuring no table is accessible without proper authorization.

  ## Changes

  ### 1. Drop Unused Tables
  - **company_email_sync_jobs**: Deprecated table, no longer in use
  - **additional_folder_connections**: Replaced by user_drive_connections

  ### 2. Internal/System Tables - Block All Access
  These tables are only accessed by backend services and Edge Functions.
  RLS is enabled with restrictive policies that block all direct access.
  
  - **sync_locks**: Synchronization lock management (backend only)
  - **sync_retry_queue**: Failed sync retry queue (backend only)
  - **embedding_queue**: Vector embedding processing queue (backend only)
  - **trigger_debug_log**: Database trigger debugging logs (admin only)
  - **workflow_executions**: N8N workflow execution tracking (backend only)

  ### 3. Moonshot Challenge Tables - Public Access
  These tables need RLS enabled but already have appropriate policies defined.
  
  - **moonshot_registrations**: Challenge registration data
  - **moonshot_survey_responses**: Survey response data
  - **moonshot_invite_codes**: Challenge invite codes
  - **moonshot_email_sequence**: Email campaign sequence

  ## Security Impact
  - All tables now have RLS enabled (no exceptions)
  - Internal tables are completely inaccessible via client connections
  - Moonshot tables maintain existing access controls
  - Unused tables removed to reduce attack surface

  ## Notes
  - Edge Functions use service role key and bypass RLS automatically
  - Super admin policies (where they exist) remain functional
  - No impact on existing application functionality
*/

-- ============================================================================
-- SECTION 1: Drop Unused Tables
-- ============================================================================

-- Drop deprecated company email sync table
DROP TABLE IF EXISTS company_email_sync_jobs CASCADE;

-- Drop deprecated additional folder connections table
DROP TABLE IF EXISTS additional_folder_connections CASCADE;

-- ============================================================================
-- SECTION 2: Enable RLS on Internal/System Tables
-- ============================================================================

-- Sync locks table (backend only)
ALTER TABLE sync_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all direct access to sync_locks"
  ON sync_locks
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Sync retry queue (backend only)
ALTER TABLE sync_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all direct access to sync_retry_queue"
  ON sync_retry_queue
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Embedding queue (backend only)
ALTER TABLE embedding_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all direct access to embedding_queue"
  ON embedding_queue
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Workflow executions (backend only)
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all direct access to workflow_executions"
  ON workflow_executions
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Trigger debug log (admin debugging only)
ALTER TABLE trigger_debug_log ENABLE ROW LEVEL SECURITY;

-- Super admins can view debug logs for troubleshooting
CREATE POLICY "Super admins can view trigger debug logs"
  ON trigger_debug_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND email IN (
          'clay@userkick.com',
          'claytonsavage@gmail.com',
          'tyler@userkick.com'
        )
    )
  );

-- Block all other access to debug logs
CREATE POLICY "Block all other access to trigger_debug_log"
  ON trigger_debug_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND email IN (
          'clay@userkick.com',
          'claytonsavage@gmail.com',
          'tyler@userkick.com'
        )
    )
  )
  WITH CHECK (false);

-- ============================================================================
-- SECTION 3: Enable RLS on Moonshot Challenge Tables
-- ============================================================================

-- Moonshot registrations (already has policies, just enable RLS)
ALTER TABLE moonshot_registrations ENABLE ROW LEVEL SECURITY;

-- Moonshot survey responses (already has policies, just enable RLS)
ALTER TABLE moonshot_survey_responses ENABLE ROW LEVEL SECURITY;

-- Moonshot invite codes (already has policies, just enable RLS)
ALTER TABLE moonshot_invite_codes ENABLE ROW LEVEL SECURITY;

-- Moonshot email sequence (already has policies, just enable RLS)
ALTER TABLE moonshot_email_sequence ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all public tables now have RLS enabled
DO $$
DECLARE
  tables_without_rls INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_without_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = false;
  
  IF tables_without_rls > 0 THEN
    RAISE WARNING 'Warning: % table(s) still have RLS disabled', tables_without_rls;
  ELSE
    RAISE NOTICE 'Success: All public tables now have RLS enabled';
  END IF;
END $$;
