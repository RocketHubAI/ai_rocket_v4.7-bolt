/*
  # Create What's New Table

  1. New Tables
    - `whats_new`
      - `id` (uuid, primary key)
      - `title` (text) - Short title of the feature/improvement
      - `description` (text) - Detailed description of the feature
      - `version` (text) - Version when the feature was added (e.g., "1.0.0")
      - `feature_type` (text) - Type: "new_feature" or "improvement"
      - `date_added` (date) - Date the feature was released
      - `is_published` (boolean) - Whether to show this in the What's New section
      - `display_order` (integer) - Order for display (higher = newer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `whats_new` table
    - All authenticated users can view published features
    - Only super admins can manage features

  3. Indexes
    - Index on display_order for efficient sorting
    - Index on is_published for filtering

  4. Initial Data
    - Populate with historical features from the application
*/

CREATE TABLE IF NOT EXISTS whats_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  version text NOT NULL,
  feature_type text NOT NULL CHECK (feature_type IN ('new_feature', 'improvement')),
  date_added date NOT NULL,
  is_published boolean DEFAULT true NOT NULL,
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE whats_new ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view published features
CREATE POLICY "Users can view published whats new"
  ON whats_new
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Super admins can do everything
CREATE POLICY "Super admins can manage whats new"
  ON whats_new
  FOR ALL
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    )
  )
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whats_new_display_order 
  ON whats_new(display_order DESC);

CREATE INDEX IF NOT EXISTS idx_whats_new_published 
  ON whats_new(is_published);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_whats_new_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER update_whats_new_timestamp
  BEFORE UPDATE ON whats_new
  FOR EACH ROW
  EXECUTE FUNCTION update_whats_new_updated_at();

-- Insert historical features (newest first, higher display_order)
INSERT INTO whats_new (title, description, version, feature_type, date_added, is_published, display_order) VALUES
(
  'Astra Guided Setup for Google Drive',
  'Introducing Astra Guided Setup! When connecting Google Drive folders, Astra now walks you through each folder type (Strategy, Meetings, Financial) with helpful examples and sample prompts. The setup includes:

• Step-by-step guidance with examples for each folder type
• Sample prompts showing what you can ask after syncing
• Best practices and tips for optimal data organization
• Save & Continue Later - pause and resume anytime
• Progress tracking so you never lose your place
• Visual folder selection with real-time preview

This guided experience helps teams understand the value of each data type and ensures proper folder configuration for maximum AI insights.',
  '1.0.0',
  'new_feature',
  '2025-11-15',
  true,
  1000
),
(
  'Automated Scheduled Reports',
  'Set up reports that run automatically on a daily, weekly, or monthly schedule. Admins can configure:

• Report frequency (daily, weekly, monthly)
• Specific time of day for report generation
• Custom report prompts and parameters
• Automatic delivery to team members

Reports run in the background and appear in your Reports view when ready. Perfect for tracking KPIs, weekly summaries, and monthly reviews without manual effort.',
  '1.0.0',
  'new_feature',
  '2025-09-30',
  true,
  900
),
(
  'Google Drive Document Sync',
  'Connect your team''s Google Drive to unlock powerful AI insights across your documents. Features include:

• Sync Strategy, Meeting Notes, and Financial documents
• Automatic document analysis and indexing
• Ask Astra questions about your synced data
• Real-time updates when documents change
• Team-wide access with proper permissions
• Document search and filtering by category

Astra analyzes your documents to provide contextual answers about your business, strategy, meetings, and financials.',
  '1.0.0',
  'new_feature',
  '2025-10-17',
  true,
  800
),
(
  'Saved Visualizations & PDF Export',
  'Save your favorite data visualizations for quick access and export them as professional PDFs:

• One-click save from any visualization
• Organized library of all saved charts
• PDF export with high-quality rendering
• Share insights with stakeholders
• Access from the sidebar dropdown

Perfect for presentations, reports, and sharing insights with team members or external stakeholders.',
  '1.0.0',
  'new_feature',
  '2025-10-03',
  true,
  700
),
(
  'Team Collaboration & @Mentions',
  'Enhanced team collaboration with real-time features:

• Switch between Private and Team chat modes
• @mention team members to get their attention
• Real-time message synchronization
• Notification system for mentions
• See all team members in the sidebar
• Collaborative AI insights in Team mode

Work together with your team while keeping private thoughts separate in Private mode.',
  '1.0.0',
  'new_feature',
  '2025-09-17',
  true,
  600
),
(
  'AI-Powered Data Visualizations',
  'Transform your data into beautiful, interactive visualizations with one click:

• Click "Create Visualizations" in any conversation
• Astra automatically generates relevant charts and graphs
• Retry to get different visualization styles
• Visualizations are private to the requester
• Interactive HTML charts that update dynamically
• Export as PDF for sharing

Let AI choose the best way to visualize your data based on context and conversation.',
  '1.0.0',
  'new_feature',
  '2025-09-14',
  true,
  500
),
(
  'Interactive Product Tour',
  'New users get a guided tour of Astra Intelligence:

• Step-by-step walkthrough of key features
• Highlights important UI elements
• Different tours for admins and team members
• Can be restarted anytime from User Settings
• Mobile-friendly tour experience

Get up and running quickly with Astra''s comprehensive onboarding experience.',
  '1.0.0',
  'new_feature',
  '2025-09-17',
  true,
  400
),
(
  'Admin Dashboard & User Management',
  'Comprehensive admin controls for team management:

• View all team members and their activity
• Invite new users via email with custom messages
• Assign admin or member roles
• Remove team members when needed
• Track user metrics and engagement
• Configure team-wide settings

Powerful tools for team administrators to manage their organization effectively.',
  '1.0.0',
  'new_feature',
  '2025-10-24',
  true,
  300
),
(
  'Real-Time Notifications',
  'Stay informed with intelligent notifications:

• Notification bell with badge counter
• @mention alerts in Team mode
• System notifications for important updates
• Mark as read/unread functionality
• Notification history and management

Never miss important team communications or AI insights.',
  '1.0.0',
  'new_feature',
  '2025-09-17',
  true,
  200
),
(
  'Help Center & AI Assistant',
  'Get help when you need it with our comprehensive support system:

• FAQ section with common questions
• AI-powered help chat with Astra
• Context-aware answers about app features
• Conversation history saved for reference
• Quick access from any page

Astra''s help assistant understands the app and can guide you through any feature.',
  '1.0.0',
  'new_feature',
  '2025-11-07',
  true,
  100
);