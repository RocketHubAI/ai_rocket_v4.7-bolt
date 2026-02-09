/*
  # Add Slide Images to Workshop Admin Insights

  This migration adds a column to store generated infographic images for each slide
  in the workshop insights presentations.

  1. Changes
    - Add `slide_images` column (jsonb) to store array of generated image URLs/base64
      - Each entry contains: slideIndex, imageUrl, imageBase64, error (optional)

  2. Purpose
    - Enable storing Gemini-generated infographic images for the 5-slide presentations
    - Images are stored as public URLs after upload to storage bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workshop_admin_insights' AND column_name = 'slide_images'
  ) THEN
    ALTER TABLE workshop_admin_insights ADD COLUMN slide_images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
