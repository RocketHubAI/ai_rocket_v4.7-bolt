/*
  # Add Team Pulse Customization Settings

  ## Summary
  Adds customization columns to team_pulse_settings to support design style selection
  and custom instructions for AI-generated infographics.

  ## Changes
  1. New columns on `team_pulse_settings`:
     - `custom_instructions` (text) - Free-form instructions for AI
     - `design_style` (text) - Selected preset design style
     - `design_description` (text) - Custom design description (overrides style)
     - `rotate_random` (boolean) - Whether to rotate through styles randomly
     - `last_used_style` (text) - Track last style used for rotation
     - `apply_to_future` (boolean) - Whether settings apply to future generations

  ## Design Styles Available
  - pixel_power (8-Bit Arcade)
  - blueprint (Technical Sketch)
  - botanical_garden (Organic Growth)
  - interstellar_voyage (Space & Sci-Fi)
  - papercraft_popup (3D Collage)
  - neon_noir (Cyberpunk City)
  - retro_cartoon (Rubber Hose Style)
  - modern_superhero (Comic Book Bold)
  - animal_kingdom (Ecosystem Logic)
  - vintage_board_game (Path to Success)
  - pop_art (The Warhol Report)
  - expedition_map (Antique Cartography)

  ## Security
  - No RLS changes needed - existing policies cover the table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_pulse_settings' AND column_name = 'custom_instructions'
  ) THEN
    ALTER TABLE team_pulse_settings ADD COLUMN custom_instructions text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_pulse_settings' AND column_name = 'design_style'
  ) THEN
    ALTER TABLE team_pulse_settings ADD COLUMN design_style text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_pulse_settings' AND column_name = 'design_description'
  ) THEN
    ALTER TABLE team_pulse_settings ADD COLUMN design_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_pulse_settings' AND column_name = 'rotate_random'
  ) THEN
    ALTER TABLE team_pulse_settings ADD COLUMN rotate_random boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_pulse_settings' AND column_name = 'last_used_style'
  ) THEN
    ALTER TABLE team_pulse_settings ADD COLUMN last_used_style text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_pulse_settings' AND column_name = 'apply_to_future'
  ) THEN
    ALTER TABLE team_pulse_settings ADD COLUMN apply_to_future boolean DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN team_pulse_settings.custom_instructions IS 'Free-form instructions for AI generation';
COMMENT ON COLUMN team_pulse_settings.design_style IS 'Selected preset design style key';
COMMENT ON COLUMN team_pulse_settings.design_description IS 'Custom design description (overrides design_style)';
COMMENT ON COLUMN team_pulse_settings.rotate_random IS 'Whether to randomly rotate through design styles';
COMMENT ON COLUMN team_pulse_settings.last_used_style IS 'Last style used for rotation tracking';
COMMENT ON COLUMN team_pulse_settings.apply_to_future IS 'Whether settings apply to future scheduled generations';
