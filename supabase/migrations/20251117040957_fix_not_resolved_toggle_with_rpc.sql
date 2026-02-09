/*
  # Fix Not Resolved Toggle with RPC Function

  ## Changes
  1. Create RPC function to toggle not_resolved status
     - Bypasses RLS with SECURITY DEFINER
     - Only callable by super admins
     - Updates user_feedback_submissions.not_resolved field

  ## Security
  - Function checks is_super_admin() before allowing update
  - SECURITY DEFINER allows bypass of RLS for authorized users
*/

-- Create function to toggle not_resolved status
CREATE OR REPLACE FUNCTION toggle_feedback_not_resolved(
  submission_id uuid,
  new_value boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Update the not_resolved field
  UPDATE user_feedback_submissions
  SET not_resolved = new_value
  WHERE id = submission_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION toggle_feedback_not_resolved(uuid, boolean) TO authenticated;
