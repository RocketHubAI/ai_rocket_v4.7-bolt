# Local File Upload Implementation Plan

## Overview

This document outlines the plan for adding local file upload functionality to RocketHub, allowing users to upload documents directly from their devices as an alternative to Google Drive synchronization.

**Status**: Planning Phase
**Last Updated**: 2025-12-26

---

## Objectives

- Provide users with the ability to upload documents directly from their local device
- Integrate local uploads with the existing document processing pipeline
- Maintain consistency with Google Drive sync architecture
- Support multiple file types (PDF, DOCX, TXT, etc.)
- Enable drag-and-drop and traditional file picker interfaces

---

## Architecture Overview

### Storage Strategy
- **Primary Storage**: Supabase Storage bucket (`local-uploads`)
- **Database Tables**:
  - `documents` - Main document registry
  - `document_chunks` - Vectorized content chunks for search

### Processing Pipeline
1. File upload to Supabase Storage
2. Extract text content from uploaded file
3. Generate embeddings via existing n8n webhook
4. Store chunks in `document_chunks` table
5. Update fuel level and sync progress

---

## Implementation Phases

### Phase 1: Backend Infrastructure
- [ ] Create Supabase Storage bucket for local uploads
- [ ] Configure bucket policies and RLS
- [ ] Create edge function for file upload handling
- [ ] Add file type validation and size limits
- [ ] Implement text extraction for supported formats

### Phase 2: Database Schema Updates
- [ ] Add `upload_source` column to documents table (values: 'google_drive', 'local_upload')
- [ ] Update RLS policies to support local uploads
- [ ] Add indexes for efficient querying
- [ ] Create database functions for upload tracking

### Phase 3: n8n Webhook Integration
- [ ] Update n8n workflow to handle local uploads
- [ ] Add file content extraction step
- [ ] Integrate with existing vectorization pipeline
- [ ] Test end-to-end processing flow

### Phase 4: Frontend Components
- [ ] Create `LocalFileUpload.tsx` component
- [ ] Add drag-and-drop zone UI
- [ ] Implement file picker with validation
- [ ] Build upload progress indicator
- [ ] Create uploaded files list view

### Phase 5: UI Integration
- [ ] Add "Upload Files" tab/section to data sync area
- [ ] Integrate with Mission Control/Launch Prep flow
- [ ] Update setup guide to include local upload option
- [ ] Add tooltips and help text

### Phase 6: Progress & Analytics
- [ ] Update fuel level calculation for local uploads
- [ ] Track upload metrics (files, size, success rate)
- [ ] Add to data sync progress dashboard
- [ ] Create admin analytics for upload usage

### Phase 7: Testing & Refinement
- [ ] Test file upload with various formats
- [ ] Verify vectorization and search functionality
- [ ] Test error handling and edge cases
- [ ] Performance testing with large files
- [ ] Mobile responsiveness testing

### Phase 8: Documentation & Launch
- [ ] Update user documentation
- [ ] Create admin setup guide
- [ ] Add feature announcement to What's New
- [ ] Deploy to production

---

## Technical Specifications

### Supported File Types
- PDF (`.pdf`)
- Microsoft Word (`.docx`, `.doc`)
- Plain Text (`.txt`)
- Markdown (`.md`)
- CSV (`.csv`)
- Future: Excel, PowerPoint, Images with OCR

### File Size Limits
- Maximum file size: 50 MB per file
- Maximum batch upload: 10 files at once
- Storage quota per team: TBD (suggest 1 GB initial)

### Storage Bucket Configuration
```sql
-- Bucket name: local-uploads
-- Structure: {team_id}/{user_id}/{upload_id}/{filename}
-- Public: false
-- File size limit: 52428800 (50 MB)
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown, text/csv
```

### Database Schema Changes

#### documents table
```sql
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'google_drive' CHECK (upload_source IN ('google_drive', 'local_upload'));

ADD COLUMN IF NOT EXISTS storage_path TEXT; -- Path in Supabase Storage
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
```

#### Edge Function: upload-local-file
- Purpose: Handle file upload and initiate processing
- Input: File binary data, metadata (filename, team_id, category)
- Output: Upload ID, processing status
- Processing: Store file, create document record, trigger n8n webhook

---

## Security Considerations

### Access Control
- Users can only upload files to their own team
- RLS policies enforce team-based isolation
- Uploaded files are private by default
- Storage bucket requires authentication

### File Validation
- Verify file type matches extension
- Scan for malicious content (future enhancement)
- Sanitize filenames to prevent path traversal
- Validate file size before upload

### Data Privacy
- Files stored encrypted at rest (Supabase default)
- No public access to uploaded files
- Audit logging for upload actions
- GDPR-compliant deletion on user/team removal

---

## Integration Points

### Existing Systems to Update

1. **Data Sync Progress** (`useDataSyncProgress.ts`)
   - Include local upload counts
   - Track processing status

2. **Fuel Level Calculation** (`useFuelLevel.ts`)
   - Count chunks from local uploads
   - Update fuel metrics

3. **Setup Guide** (`src/components/setup-steps/`)
   - Add local upload as alternative to Drive
   - Update progress tracking

4. **Mission Control** (`MissionControl.tsx`)
   - Display local upload statistics
   - Show recent uploads

5. **Admin Dashboard** (`AdminDashboard.tsx`)
   - Track upload usage across teams
   - Monitor storage consumption

---

## User Experience Flow

### Upload Process
1. User navigates to "Data Sync" or setup step
2. Clicks "Upload Files" button or drags files to drop zone
3. Files are validated (type, size)
4. Upload progress shown with visual indicator
5. Files process through vectorization pipeline
6. Success notification with fuel level update
7. Files appear in document list

### Error Handling
- Clear error messages for:
  - Unsupported file types
  - Files too large
  - Network errors
  - Processing failures
- Allow retry for failed uploads
- Show which files succeeded/failed in batch

---

## Testing Checklist

### Unit Tests
- [ ] File validation logic
- [ ] Storage path generation
- [ ] RLS policy enforcement
- [ ] Upload metadata creation

### Integration Tests
- [ ] End-to-end upload flow
- [ ] n8n webhook processing
- [ ] Vector search with uploaded content
- [ ] Fuel level updates

### User Acceptance Tests
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Drag and drop functionality
- [ ] Progress indication accuracy
- [ ] Error message clarity
- [ ] Mobile device uploads

---

## Performance Considerations

### Optimization Strategies
- Chunked file uploads for large files
- Client-side file validation before upload
- Batch processing for multiple files
- Lazy loading of uploaded files list
- Background processing for vectorization

### Monitoring
- Track upload success rate
- Monitor processing time
- Alert on storage quota nearing limit
- Track n8n webhook performance

---

## Future Enhancements

### Phase 2 Features (Post-MVP)
- [ ] Bulk file import (ZIP upload)
- [ ] OCR for scanned documents and images
- [ ] Version control for updated files
- [ ] Automatic file organization by content
- [ ] Duplicate detection
- [ ] File preview before upload
- [ ] Advanced metadata tagging
- [ ] Export functionality
- [ ] Integration with email attachments
- [ ] Scheduled uploads via API

### Advanced Features
- [ ] AI-powered file categorization
- [ ] Automatic summarization of uploaded docs
- [ ] Cross-reference detection between files
- [ ] Collaboration features (shared uploads)
- [ ] Mobile app integration

---

## Success Metrics

### Key Performance Indicators
- Upload success rate > 98%
- Processing time < 30 seconds per file
- User adoption rate (% of teams using feature)
- Storage efficiency (compression ratio)
- Search accuracy with uploaded content

### User Feedback
- Net Promoter Score for feature
- Support ticket volume related to uploads
- Feature request frequency
- User satisfaction surveys

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Storage costs exceed projections | High | Implement quotas, compression, archival |
| Vectorization pipeline overload | Medium | Queue management, rate limiting |
| Malicious file uploads | High | Strict validation, sandboxing, scanning |
| User confusion with two sync methods | Medium | Clear UI, onboarding guidance |
| Mobile upload performance | Medium | Progressive enhancement, size warnings |

---

## Dependencies

### External Services
- Supabase Storage (already in use)
- n8n webhook endpoint (existing)
- Google Generative AI (existing)

### Required Packages (Frontend)
- No new packages required (using native File API)
- Potential: `react-dropzone` (optional, for enhanced DnD)

### Required Packages (Backend)
- Edge function: `npm:pdf-parse` (for PDF text extraction)
- Edge function: `npm:mammoth` (for DOCX extraction)

---

## Timeline Estimate

- **Phase 1-2**: Backend & Database (3-4 days)
- **Phase 3**: n8n Integration (2 days)
- **Phase 4-5**: Frontend Development (4-5 days)
- **Phase 6**: Analytics Integration (2 days)
- **Phase 7**: Testing (3-4 days)
- **Phase 8**: Documentation & Launch (1-2 days)

**Total Estimate**: 15-20 days for MVP

---

## Notes

- This feature complements Google Drive sync, not replaces it
- Users should be able to use both methods simultaneously
- Consider data lifecycle (how long to keep uploaded files)
- Plan for future API access for programmatic uploads
- Document category assignment for uploaded files

---

## Questions to Resolve

1. Should we enforce file organization (categories) on upload?
2. What is the appropriate storage quota per team tier?
3. Should we allow public sharing of uploaded files?
4. How to handle file updates/replacements?
5. Should we implement virus scanning?
6. What is the retention policy for uploaded files?

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-26 | Initial plan created | System |
|  |  |  |
