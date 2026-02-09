import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackFeatureUsage } from '../hooks/useFeatureTracking';

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'extracting' | 'processing' | 'verifying' | 'success' | 'classifying' | 'complete' | 'error' | 'duplicate';
  progress: number;
  error?: string;
  uploadId?: string;
  existingDocumentId?: string;
}

interface LocalFileUploadProps {
  category?: string;
  onUploadComplete?: (uploadIds: string[]) => void;
  onUploadError?: (error: string) => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/markdown',
  'text/csv',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.md', '.csv'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;

export default function LocalFileUpload({
  category = 'other',
  onUploadComplete,
  onUploadError
}: LocalFileUploadProps) {
  const { user, userProfile } = useAuth();
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50 MB limit`;
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
      }
    }

    return null;
  };

  const uploadFile = async (fileItem: FileUploadItem) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get team_id from user metadata or userProfile
    const teamId = user.user_metadata?.team_id || userProfile?.team_id;

    if (!teamId) {
      throw new Error('Team not found. Please refresh the page and try again.');
    }

    // Determine correct mime type for the file
    let mimeType = fileItem.file.type;
    const fileName = fileItem.file.name.toLowerCase();

    console.log('Uploading file:', fileName, 'original type:', fileItem.file.type, 'size:', fileItem.file.size);

    // Fix empty or incorrect mime types for markdown files
    if ((fileName.endsWith('.md') || fileName.endsWith('.markdown')) && (!mimeType || mimeType === 'application/octet-stream')) {
      mimeType = 'text/markdown';
      console.log('Fixed mime type to:', mimeType);
    }

    // Generate upload ID
    const uploadId = window.crypto.randomUUID();
    const sanitizedFilename = fileItem.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Get current session token for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication failed. Please refresh the page and try again.');
    }

    // Upload directly to Supabase Storage (no base64 encoding needed)
    console.log('Uploading to storage...');
    const storagePath = `${teamId}/${user.id}/${uploadId}/${sanitizedFilename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('local-uploads')
      .upload(storagePath, fileItem.file, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded to storage:', uploadData.path);

    // Now call edge function with just metadata
    const payload = {
      storagePath: uploadData.path,
      filename: fileItem.file.name,
      mimeType: mimeType,
      category: category,
      teamId: teamId,
      userId: user.id,
      uploadId: uploadId,
      fileSize: fileItem.file.size,
    };

    console.log('Triggering processing via edge function...');

    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-local-file`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        uploadId,
        storagePath: result.storagePath || `google-drive/${result.fileId}`,
        filename: fileItem.file.name,
        size: fileItem.file.size,
        mimeType,
      };
    } catch (error) {
      console.error('Edge function call failed:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Upload timed out. Please try again with a smaller file or check your connection.');
        }
        throw error;
      }
      throw new Error('Failed to upload file. Please try again.');
    }
  };

  const checkForDuplicate = async (filename: string, teamId: string): Promise<string | null> => {
    try {
      const sanitizedFilename = sanitizeFilename(filename);

      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_id')
        .eq('team_id', teamId)
        .eq('file_name', sanitizedFilename)
        .limit(1);

      if (error) {
        console.error('Error checking for duplicate:', error);
        return null;
      }

      return data && data.length > 0 ? data[0].document_id : null;
    } catch (error) {
      console.error('Error checking for duplicate:', error);
      return null;
    }
  };

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Check max files limit
    if (files.length + fileArray.length > MAX_FILES) {
      onUploadError?.(`Maximum ${MAX_FILES} files allowed at once`);
      return;
    }

    const teamId = user?.user_metadata?.team_id || userProfile?.team_id;
    if (!teamId) {
      onUploadError?.('Team ID not found');
      return;
    }

    const validatedFiles: FileUploadItem[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);

      if (!error) {
        // Check for duplicates
        const existingDocId = await checkForDuplicate(file.name, teamId);

        if (existingDocId) {
          validatedFiles.push({
            id: crypto.randomUUID(),
            file,
            status: 'duplicate',
            progress: 0,
            existingDocumentId: existingDocId,
          });
        } else {
          validatedFiles.push({
            id: crypto.randomUUID(),
            file,
            status: 'pending',
            progress: 0,
          });
        }
      } else {
        validatedFiles.push({
          id: crypto.randomUUID(),
          file,
          status: 'error',
          progress: 0,
          error,
        });
      }
    }

    setFiles(prev => [...prev, ...validatedFiles]);

    // Auto-start upload for valid files (not duplicates)
    validatedFiles.forEach(fileItem => {
      if (fileItem.status === 'pending') {
        startUpload(fileItem);
      }
    });
  }, [files.length, onUploadError, user, userProfile]);

  const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  };

  const verifyFileInDatabase = async (uploadId: string, teamId: string, filename: string, maxAttempts = 60): Promise<string | null> => {
    const startTime = Date.now();
    const sanitizedFilename = sanitizeFilename(filename);

    console.log(`Verifying file - Original: "${filename}", Sanitized: "${sanitizedFilename}"`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data: dataByFilename, error: errorFilename } = await supabase
        .from('document_chunks')
        .select('id, file_name, document_id, created_at')
        .eq('team_id', teamId)
        .eq('file_name', sanitizedFilename)
        .gte('created_at', new Date(startTime - 5000).toISOString())
        .limit(1);

      if (!errorFilename && dataByFilename && dataByFilename.length > 0) {
        console.log(`File verified after ${attempt + 1} attempts (${Date.now() - startTime}ms)`, dataByFilename[0]);
        return dataByFilename[0].document_id;
      }

      if (errorFilename) {
        console.error(`Database verification error (attempt ${attempt + 1}):`, errorFilename);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.error(`File verification timed out after ${maxAttempts} attempts for uploadId: ${uploadId}, original: "${filename}", sanitized: "${sanitizedFilename}"`);
    return null;
  };

  const verifyClassificationComplete = async (documentId: string, teamId: string, maxAttempts = 120): Promise<boolean> => {
    console.log(`Checking classification for document: ${documentId}`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('doc_category')
        .eq('team_id', teamId)
        .eq('document_id', documentId)
        .not('doc_category', 'is', null)
        .limit(1);

      if (!error && data && data.length > 0) {
        console.log(`Classification complete after ${attempt + 1} attempts. Category: ${data[0].doc_category}`);
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Classification check timed out after ${maxAttempts} attempts for document: ${documentId}`);
    return false;
  };

  const triggerBackgroundClassifier = async (uploadId: string, teamId: string, filename: string) => {
    try {
      const sanitizedFilename = sanitizeFilename(filename);

      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id, document_id')
        .eq('team_id', teamId)
        .eq('file_name', sanitizedFilename)
        .order('created_at', { ascending: false })
        .limit(1);

      const documentId = chunks?.[0]?.document_id;

      if (!documentId) {
        console.error('No document_id found for file, skipping background classifier');
        return;
      }

      console.log('Triggering background classifier with document_id:', documentId);

      const response = await fetch('https://healthrocket.app.n8n.cloud/webhook/background-classifier-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: teamId,
          document_id: documentId,
          file_name: sanitizedFilename,
          trigger_source: 'local_upload'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Background classifier trigger failed:', errorText);
      } else {
        console.log('Background classifier triggered successfully');
      }
    } catch (error) {
      console.error('Error triggering background classifier:', error);
    }
  };

  const startUpload = async (fileItem: FileUploadItem) => {
    const teamId = user?.user_metadata?.team_id || userProfile?.team_id;

    if (!teamId) {
      setFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'error' as const, error: 'Team ID not found' }
            : f
        )
      );
      return;
    }

    setFiles(prev =>
      prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' as const } : f)
    );

    try {
      // Step 1: Upload file
      const result = await uploadFile(fileItem);

      // Step 2: Verify file is in database
      setFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'verifying' as const, progress: 25, uploadId: result.uploadId }
            : f
        )
      );

      const documentId = await verifyFileInDatabase(result.uploadId, teamId, fileItem.file.name);

      if (!documentId) {
        throw new Error('File upload timed out. Please try again.');
      }

      // Step 3: File verified, now trigger AI classification
      setFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'classifying' as const, progress: 50 }
            : f
        )
      );

      // Trigger background classifier
      await triggerBackgroundClassifier(result.uploadId, teamId, fileItem.file.name);

      // Step 4: Wait for classification to complete
      const classified = await verifyClassificationComplete(documentId, teamId);

      if (!classified) {
        console.warn('Classification timed out, but file is uploaded successfully');
      }

      // Step 5: Mark as complete
      setFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'complete' as const, progress: 100 }
            : f
        )
      );

      if (user?.id) {
        trackFeatureUsage(user.id, 'local_uploads');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
      onUploadError?.(errorMessage);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleReSync = async (fileItem: FileUploadItem) => {
    if (!fileItem.existingDocumentId) {
      console.error('No existing document ID found for resync');
      return;
    }

    // Simply re-upload the file - the Worker webhook will handle cleanup automatically
    await startUpload(fileItem);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'extracting':
        return <Loader className="w-5 h-5 text-purple-500 animate-spin" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-indigo-500 animate-spin" />;
      case 'verifying':
        return <Loader className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'classifying':
        return <Loader className="w-5 h-5 text-cyan-500 animate-spin" />;
      case 'success':
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'duplicate':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading to storage...';
      case 'extracting':
        return 'Extracting text from PDF...';
      case 'processing':
        return 'Processing and analyzing...';
      case 'verifying':
        return 'Verifying upload...';
      case 'classifying':
        return 'Adding Smart Data with AI (10-30 sec)...';
      case 'success':
      case 'complete':
        return '✓ Complete - Smart Data added';
      case 'duplicate':
        return 'File Already Exists';
      case 'error':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const successCount = files.filter(f => f.status === 'complete').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const duplicateCount = files.filter(f => f.status === 'duplicate').length;
  const uploadingCount = files.filter(f => ['uploading', 'verifying', 'classifying'].includes(f.status)).length;

  // Don't auto-close - let the user manually close the modal when they're ready
  // The parent component provides a "Done" button for manual closing

  return (
    <div className="space-y-4">
      {/* Info Banner about AI Classification */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">AI-Powered Smart Data</h4>
            <p className="text-xs text-gray-400">Auto-categorization • Key info extraction • Smart tagging</p>
          </div>
        </div>
      </div>

      {/* Drop Zone - More compact */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-5 text-center transition-all
          ${isDragging
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex items-center justify-center gap-4">
          <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-600/20' : 'bg-gray-700/50'}`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
          </div>

          <div className="text-left">
            <p className="text-base font-medium text-white">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-gray-400">
              or{' '}
              <button
                onClick={openFilePicker}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                browse files
              </button>
              {' '}· PDF, Word, Excel, PowerPoint, TXT, MD, CSV · Max 50 MB · Up to {MAX_FILES} files
            </p>
          </div>
        </div>
      </div>

      {/* Upload Summary */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-300">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            {successCount > 0 && (
              <span className="text-green-400 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                {successCount} complete
              </span>
            )}
            {uploadingCount > 0 && (
              <span className="text-blue-400 flex items-center">
                <Loader className="w-4 h-4 mr-1 animate-spin" />
                {uploadingCount} processing
              </span>
            )}
            {duplicateCount > 0 && (
              <span className="text-orange-400 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''}
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-400 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errorCount} failed
              </span>
            )}
          </div>

          <button
            onClick={() => setFiles([])}
            className="text-sm text-gray-400 hover:text-white"
          >
            Clear all
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map(fileItem => (
            <div
              key={fileItem.id}
              className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getStatusIcon(fileItem.status)}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {fileItem.file.name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-400">{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    {fileItem.status === 'uploading' && (
                      <span className="text-blue-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'extracting' && (
                      <span className="text-purple-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'processing' && (
                      <span className="text-indigo-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'verifying' && (
                      <span className="text-yellow-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'classifying' && (
                      <span className="text-cyan-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'complete' && (
                      <span className="text-green-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'duplicate' && (
                      <span className="text-orange-400">{getStatusText(fileItem.status)}</span>
                    )}
                    {fileItem.status === 'error' && fileItem.error && (
                      <span className="text-red-400">{fileItem.error}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons - show Remove/ReSync for duplicates */}
              {fileItem.status === 'duplicate' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReSync(fileItem)}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    ReSync
                  </button>
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="p-1 hover:bg-gray-600 rounded"
                  disabled={['uploading', 'verifying', 'classifying'].includes(fileItem.status)}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
