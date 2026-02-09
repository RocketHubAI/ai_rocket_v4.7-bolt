/*
  # Add Storage Policies for Local Uploads Bucket

  1. Storage Policies
    - Allow authenticated users to upload files to their team's folder
    - Allow team members to read files from their team's folder
    - Allow users to delete their own uploaded files
    - Allow super admins to access all files

  2. Security
    - All policies check team membership via public.users table
    - Path structure enforces team isolation: {team_id}/{user_id}/{upload_id}/{filename}
    - Users can only upload to paths that include their team_id
*/

-- Policy: Allow authenticated users to upload files to their team's folder
CREATE POLICY "Team members can upload to team folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-uploads'
  AND (
    -- Extract team_id from the path (first segment)
    (storage.foldername(name))[1] IN (
      SELECT team_id::text
      FROM public.users
      WHERE id = auth.uid()
      AND team_id IS NOT NULL
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
);

-- Policy: Allow team members to read files from their team's folder
CREATE POLICY "Team members can read team files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-uploads'
  AND (
    -- Extract team_id from the path (first segment)
    (storage.foldername(name))[1] IN (
      SELECT team_id::text
      FROM public.users
      WHERE id = auth.uid()
      AND team_id IS NOT NULL
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
);

-- Policy: Allow users to delete their own uploaded files
CREATE POLICY "Users can delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'local-uploads'
  AND (
    -- Extract user_id from path (second segment) and match with auth.uid()
    (storage.foldername(name))[2] = auth.uid()::text
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
);

-- Policy: Allow users to update their own uploaded files
CREATE POLICY "Users can update own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'local-uploads'
  AND (
    -- Extract user_id from path (second segment) and match with auth.uid()
    (storage.foldername(name))[2] = auth.uid()::text
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
);
