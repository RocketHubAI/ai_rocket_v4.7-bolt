/*
  # Astra Create - Visualization System

  1. New Tables
    - `astra_visualizations` - Stores all created visualizations
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `user_id` (uuid, references auth.users)
      - `title` (text) - User or AI-generated title
      - `type` (text) - 'single_image' or 'slide_presentation'
      - `content_types` (text[]) - Array of up to 3 selected content types
      - `style` (text) - Selected style (infographic, photorealistic, etc.)
      - `layout` (text) - 'landscape' or 'portrait'
      - `slide_count` (int) - Number of slides (1 for single image)
      - `custom_prompt` (text) - Custom instructions if provided
      - `generated_at` (timestamptz)
      - `created_at` (timestamptz)
      
    - `astra_visualization_slides` - Individual slides in presentations
      - `id` (uuid, primary key)
      - `visualization_id` (uuid, references astra_visualizations)
      - `slide_number` (int) - Order of slide
      - `title` (text) - Slide title
      - `image_url` (text) - URL to stored image
      - `image_base64` (text) - Base64 encoded image
      - `content` (text) - Slide content/description
      - `slide_data` (jsonb) - Additional slide metadata
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their team's visualizations
*/

-- Create astra_visualizations table
CREATE TABLE IF NOT EXISTS astra_visualizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Visualization',
  type text NOT NULL CHECK (type IN ('single_image', 'slide_presentation')),
  content_types text[] NOT NULL DEFAULT '{}',
  style text NOT NULL,
  layout text NOT NULL DEFAULT 'landscape' CHECK (layout IN ('landscape', 'portrait')),
  slide_count int NOT NULL DEFAULT 1,
  custom_prompt text,
  pdf_url text,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create astra_visualization_slides table
CREATE TABLE IF NOT EXISTS astra_visualization_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visualization_id uuid NOT NULL REFERENCES astra_visualizations(id) ON DELETE CASCADE,
  slide_number int NOT NULL,
  title text,
  image_url text,
  image_base64 text,
  content text,
  bullet_points text[],
  metrics jsonb,
  slide_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(visualization_id, slide_number)
);

-- Enable RLS
ALTER TABLE astra_visualizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE astra_visualization_slides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for astra_visualizations
CREATE POLICY "Users can view their team visualizations"
  ON astra_visualizations
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create visualizations for their team"
  ON astra_visualizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own visualizations"
  ON astra_visualizations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own visualizations"
  ON astra_visualizations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for astra_visualization_slides
CREATE POLICY "Users can view slides for their team visualizations"
  ON astra_visualization_slides
  FOR SELECT
  TO authenticated
  USING (
    visualization_id IN (
      SELECT id FROM astra_visualizations
      WHERE team_id IN (
        SELECT team_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create slides for their visualizations"
  ON astra_visualization_slides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    visualization_id IN (
      SELECT id FROM astra_visualizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update slides for their visualizations"
  ON astra_visualization_slides
  FOR UPDATE
  TO authenticated
  USING (
    visualization_id IN (
      SELECT id FROM astra_visualizations
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    visualization_id IN (
      SELECT id FROM astra_visualizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete slides for their visualizations"
  ON astra_visualization_slides
  FOR DELETE
  TO authenticated
  USING (
    visualization_id IN (
      SELECT id FROM astra_visualizations
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_astra_visualizations_team_id ON astra_visualizations(team_id);
CREATE INDEX IF NOT EXISTS idx_astra_visualizations_user_id ON astra_visualizations(user_id);
CREATE INDEX IF NOT EXISTS idx_astra_visualizations_created_at ON astra_visualizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_astra_visualization_slides_visualization_id ON astra_visualization_slides(visualization_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE astra_visualizations;
ALTER PUBLICATION supabase_realtime ADD TABLE astra_visualization_slides;
