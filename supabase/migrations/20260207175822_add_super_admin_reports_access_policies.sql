/*
  # Add super admin access to reports tables

  1. Problem
    - The astra_reports table only has a "Users manage their own reports" policy
    - The report_email_deliveries table only has "Users can view own report email deliveries"
    - Super admins cannot see all reports/deliveries in the admin dashboard

  2. Fix
    - Add super admin SELECT policy to astra_reports
    - Add super admin SELECT policy to report_email_deliveries

  3. Security
    - Uses is_super_admin() SECURITY DEFINER function for access control
*/

CREATE POLICY "Super admins can view all reports"
  ON astra_reports FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can view all report email deliveries"
  ON report_email_deliveries FOR SELECT
  TO authenticated
  USING (is_super_admin());
