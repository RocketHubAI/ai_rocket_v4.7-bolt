/*
  # Add Preview Request Onboarding Status Function

  1. New Function
    - `get_preview_requests_with_onboarding()` - Returns preview requests with onboarding status

  2. Purpose
    - Check if invited users have completed onboarding (created their team)
    - Show team name and creation date for onboarded users
    - Helps admins track conversion from invite to active team
*/

-- Function to get preview requests with onboarding status
CREATE OR REPLACE FUNCTION get_preview_requests_with_onboarding()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  invite_sent BOOLEAN,
  invite_sent_at TIMESTAMPTZ,
  invite_code TEXT,
  invite_send_count INTEGER,
  invite_sent_by UUID,
  user_onboarded BOOLEAN,
  team_name TEXT,
  team_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    pr.email,
    pr.created_at,
    pr.updated_at,
    pr.invite_sent,
    pr.invite_sent_at,
    pr.invite_code,
    pr.invite_send_count,
    pr.invite_sent_by,
    CASE
      WHEN pu.id IS NOT NULL AND pu.team_id IS NOT NULL THEN true
      ELSE false
    END as user_onboarded,
    t.name as team_name,
    t.created_at as team_created_at
  FROM preview_requests pr
  LEFT JOIN auth.users u ON u.email = pr.email
  LEFT JOIN public.users pu ON pu.id = u.id
  LEFT JOIN teams t ON t.id = pu.team_id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_preview_requests_with_onboarding() TO authenticated;
