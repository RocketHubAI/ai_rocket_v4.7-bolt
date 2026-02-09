/*
  # Create Marketing Images Storage Bucket

  1. New Storage Bucket
    - `marketing-images` - Public bucket for storing marketing email images
    - Allowed MIME types: PNG, JPEG, GIF, WebP
    - Max file size: 5MB

  2. Security
    - Super admins can upload/delete images
    - Images are publicly accessible (needed for email clients)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-images',
  'marketing-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Super admins can upload marketing images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-images'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
  )
);

CREATE POLICY "Super admins can update marketing images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketing-images'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
  )
);

CREATE POLICY "Super admins can delete marketing images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketing-images'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
  )
);

CREATE POLICY "Anyone can view marketing images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'marketing-images');