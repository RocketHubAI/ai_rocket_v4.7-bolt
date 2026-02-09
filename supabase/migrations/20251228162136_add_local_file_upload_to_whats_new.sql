/*
  # Add Local File Upload Feature to What's New

  1. New Content
    - Adds "Local File Upload" feature to the whats_new table
    - This feature allows users to drag-and-drop local files directly into Astra
    - Supports PDF, Word, Excel, PowerPoint, and text files

  2. Details
    - display_order: 1100 (highest, so it appears first as newest feature)
    - feature_type: new_feature
    - date_added: 2025-12-26 (when the feature was released)
*/

INSERT INTO whats_new (title, description, version, feature_type, date_added, is_published, display_order) VALUES
(
  'Local File Upload',
  'Upload files directly from your computer without needing Google Drive! Drag and drop or browse to upload documents that Astra can analyze.

• Drag-and-drop or browse to select files
• Supports PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), text files, and CSV
• Up to 50 MB per file, 10 files per batch
• AI automatically categorizes your documents
• Files are securely stored and accessible to your team
• View uploaded documents alongside Google Drive files in the Fuel Stage

Perfect for quickly adding documents that aren''t in Google Drive, such as downloaded reports, email attachments, or files from other sources.',
  '1.1.0',
  'new_feature',
  '2025-12-26',
  true,
  1100
);