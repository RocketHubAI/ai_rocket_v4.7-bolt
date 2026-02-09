/*
  # Add Export Tracking to Build Lab Prototypes

  1. Changes
    - Add `claude_exported_at` column to track when Claude guide was exported
    - Add `chatgpt_exported_at` column to track when ChatGPT guide was exported
    - Add `tool_icon` column to store generated icon for each tool

  2. Purpose
    - Allow showing green checkmark on dashboard when user has exported a guide
    - Store theme-appropriate icons generated for each tool
*/

ALTER TABLE build_lab_prototypes 
ADD COLUMN IF NOT EXISTS claude_exported_at timestamptz,
ADD COLUMN IF NOT EXISTS chatgpt_exported_at timestamptz,
ADD COLUMN IF NOT EXISTS tool_icon text;
