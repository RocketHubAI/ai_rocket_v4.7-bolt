/*
  # Create Workshop Infographics Storage Bucket

  1. New Storage Bucket
    - `workshop-infographics` - stores generated infographic images for workshop users

  2. Security
    - Public read access for viewing infographics
    - Authenticated users can upload their own infographics
    - Service role can manage all files
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workshop-infographics',
  'workshop-infographics',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view workshop infographics"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'workshop-infographics');

CREATE POLICY "Authenticated users can upload workshop infographics"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'workshop-infographics');

CREATE POLICY "Users can update their own workshop infographics"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'workshop-infographics' AND
    (storage.foldername(name))[1] = 'workshop' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own workshop infographics"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workshop-infographics' AND
    (storage.foldername(name))[1] = 'workshop' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );
