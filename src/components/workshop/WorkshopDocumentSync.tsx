import React, { useState, useEffect } from 'react';
import { Upload, FileText, Sparkles, ArrowRight, Loader2, Check, X, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Goal } from './WorkshopMindsetJourney';

interface WorkshopDocumentSyncProps {
  userId: string;
  registrationId: string;
  selectedGoal: Goal;
  onComplete: (documentId: string) => void;
  onLogout?: () => void;
}

type SyncOption = 'upload' | 'create' | 'existing';

interface ExistingDocument {
  id: string;
  fileName: string;
  category: string;
  createdAt: string;
}

export const WorkshopDocumentSync: React.FC<WorkshopDocumentSyncProps> = ({
  userId,
  registrationId,
  selectedGoal,
  onComplete,
  onLogout
}) => {
  const { user, userProfile } = useAuth();
  const [selectedOption, setSelectedOption] = useState<SyncOption | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing' | 'verifying' | 'complete' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [missionStatement, setMissionStatement] = useState('');
  const [coreValues, setCoreValues] = useState('');
  const [teamGoals, setTeamGoals] = useState('');
  const [creatingDocument, setCreatingDocument] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const teamId = user?.user_metadata?.team_id || userProfile?.team_id;

  useEffect(() => {
    if (teamId) {
      loadExistingDocuments();
    }
  }, [teamId]);

  const loadExistingDocuments = async () => {
    if (!teamId) return;

    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_id, file_name, doc_category, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueDocs = new Map<string, ExistingDocument>();
      (data || []).forEach(doc => {
        if (!uniqueDocs.has(doc.document_id)) {
          uniqueDocs.set(doc.document_id, {
            id: doc.document_id,
            fileName: doc.file_name,
            category: doc.doc_category || 'other',
            createdAt: doc.created_at
          });
        }
      });

      setExistingDocuments(Array.from(uniqueDocs.values()).slice(0, 20));
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;

    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress('uploading');
    setUploadError(null);

    try {
      const uploadId = crypto.randomUUID();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${teamId}/${userId}/${uploadId}/${sanitizedFilename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('local-uploads')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      setUploadProgress('processing');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-local-file`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            storagePath: uploadData.path,
            filename: file.name,
            mimeType: file.type,
            category: 'strategy',
            teamId,
            userId,
            uploadId,
            fileSize: file.size
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      setUploadProgress('verifying');

      const docId = await verifyFileInDatabase(uploadId, file.name);
      if (!docId) {
        throw new Error('File verification timed out');
      }

      console.log('File verified, document ID:', docId);
      setDocumentId(docId);

      console.log('Inserting workshop document record for uploaded file...');
      const { data: insertData, error: insertError } = await supabase
        .from('workshop_documents')
        .insert({
          user_id: userId,
          team_id: teamId,
          document_id: docId,
          file_name: file.name,
          source_type: 'local_upload'
        })
        .select();

      if (insertError) {
        console.error('Failed to save workshop document reference:', insertError);
        throw new Error(`Failed to save document reference: ${insertError.message}`);
      }

      console.log('Workshop document saved successfully:', insertData);
      setUploadProgress('complete');
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed');
      setUploadProgress('error');
    } finally {
      setIsUploading(false);
    }
  };

  const verifyFileInDatabase = async (uploadId: string, filename: string): Promise<string | null> => {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const startTime = Date.now();

    for (let attempt = 0; attempt < 60; attempt++) {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_id')
        .eq('team_id', teamId)
        .eq('file_name', sanitizedFilename)
        .gte('created_at', new Date(startTime - 5000).toISOString())
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0].document_id;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
  };

  const handleCreateDocument = async () => {
    if (!missionStatement.trim() || !coreValues.trim() || !teamGoals.trim() || !teamId) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setCreatingDocument(true);
    setUploadError(null);
    setUploadProgress('processing');

    try {
      console.log('[WorkshopDocumentSync] Starting document creation...');
      const documentContent = `# Team Strategy Document

## Mission Statement
${missionStatement}

## Core Values
${coreValues}

## Team Goals
${teamGoals}

## Focus Goal - "${selectedGoal.goalTitle}"
${selectedGoal.goalDescription}

### Positive Impacts of Achieving This Goal
1. ${selectedGoal.positiveImpact1}
2. ${selectedGoal.positiveImpact2}
3. ${selectedGoal.positiveImpact3}

---
Generated via AI-preneur Workshop
Date: ${new Date().toLocaleDateString()}
`;

      console.log('[WorkshopDocumentSync] Getting auth token...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[WorkshopDocumentSync] Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      const token = sessionData?.session?.access_token;
      if (!token) {
        console.error('[WorkshopDocumentSync] No token found');
        throw new Error('Not authenticated - please refresh the page and try again');
      }

      console.log('[WorkshopDocumentSync] Calling store-workshop-document function...');
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-workshop-document`;
      console.log('[WorkshopDocumentSync] Function URL:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId,
          userId,
          fileName: 'team-strategy-document.md',
          content: documentContent,
          category: 'strategy'
        })
      });

      console.log('[WorkshopDocumentSync] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WorkshopDocumentSync] Edge function error:', errorText);
        throw new Error(`Document creation failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('[WorkshopDocumentSync] Edge function result:', result);

      const docId = result.documentId;

      if (!docId) {
        console.error('[WorkshopDocumentSync] No document ID in response:', result);
        throw new Error('Failed to get document ID from response');
      }

      console.log('[WorkshopDocumentSync] Document created with ID:', docId);
      setDocumentId(docId);

      setUploadProgress('verifying');
      console.log('[WorkshopDocumentSync] Inserting workshop document record...');
      const { data: insertData, error: insertError } = await supabase
        .from('workshop_documents')
        .insert({
          user_id: userId,
          team_id: teamId,
          document_id: docId,
          file_name: 'team-strategy-document.md',
          source_type: 'astra_created'
        })
        .select();

      if (insertError) {
        console.error('[WorkshopDocumentSync] Failed to save workshop document reference:', insertError);
        throw new Error(`Failed to save document reference: ${insertError.message}`);
      }

      console.log('[WorkshopDocumentSync] Workshop document saved successfully:', insertData);
      setUploadProgress('complete');
    } catch (err: any) {
      console.error('[WorkshopDocumentSync] Create document error:', err);
      setUploadError(err.message || 'Failed to create document. Please try again.');
      setUploadProgress('error');
    } finally {
      setCreatingDocument(false);
    }
  };

  const handleSelectExisting = async (doc: ExistingDocument) => {
    setSelectedDocumentId(doc.id);
    setDocumentId(doc.id);

    try {
      console.log('Selecting existing document:', doc.id);
      const { data: insertData, error: insertError } = await supabase
        .from('workshop_documents')
        .insert({
          user_id: userId,
          team_id: teamId,
          document_id: doc.id,
          file_name: doc.fileName,
          source_type: 'local_upload'
        })
        .select();

      if (insertError) {
        console.error('Failed to save workshop document reference:', insertError);
        setUploadError(`Failed to save document reference: ${insertError.message}`);
        setUploadProgress('error');
        return;
      }

      console.log('Workshop document saved successfully:', insertData);
      setUploadProgress('complete');
    } catch (err: any) {
      console.error('Error selecting document:', err);
      setUploadError(err.message || 'Failed to select document');
      setUploadProgress('error');
    }
  };

  const handleContinue = async () => {
    if (!documentId) return;

    try {
      await supabase
        .from('workshop_registrations')
        .update({ current_step: 'hub' })
        .eq('id', registrationId);

      onComplete(documentId);
    } catch (err) {
      console.error('Error updating step:', err);
    }
  };

  const renderUploadOption = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Upload Your Strategy Document</h3>
      <p className="text-gray-400 text-sm">
        Upload a document containing your mission statement, core values, or team goals.
        Supported formats: PDF, Word, Text, Markdown
      </p>

      {uploadProgress === 'idle' && (
        <label className="block w-full p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-cyan-500 transition-colors cursor-pointer text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Click to upload or drag and drop</p>
          <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT, MD (max 50MB)</p>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      )}

      {(uploadProgress === 'uploading' || uploadProgress === 'processing' || uploadProgress === 'verifying') && (
        <div className="p-6 bg-gray-800 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-white font-medium">{uploadedFile?.name}</span>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'uploading' ? 'text-cyan-400' : 'text-gray-500'}`}>
              {uploadProgress === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-400" />}
              Uploading file...
            </div>
            <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'processing' ? 'text-cyan-400' : uploadProgress === 'verifying' || uploadProgress === 'complete' ? 'text-gray-500' : 'text-gray-600'}`}>
              {uploadProgress === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : uploadProgress === 'verifying' || uploadProgress === 'complete' ? <Check className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4" />}
              Processing document...
            </div>
            <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'verifying' ? 'text-cyan-400' : uploadProgress === 'complete' ? 'text-gray-500' : 'text-gray-600'}`}>
              {uploadProgress === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : uploadProgress === 'complete' ? <Check className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4" />}
              Syncing with Astra...
            </div>
          </div>
        </div>
      )}

      {uploadProgress === 'complete' && (
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Document synced successfully!</p>
              <p className="text-gray-400 text-sm">{uploadedFile?.name || 'team-strategy-document.md'}</p>
            </div>
          </div>
        </div>
      )}

      {uploadProgress === 'error' && (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Upload failed</p>
              <p className="text-gray-400 text-sm">{uploadError}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setUploadProgress('idle');
              setUploadError(null);
            }}
            className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );

  const renderCreateOption = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Create Your Strategy Document with Astra</h3>
      <p className="text-gray-400 text-sm">
        Answer a few questions and we'll generate a strategy document for you.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Your Mission Statement</label>
          <textarea
            value={missionStatement}
            onChange={(e) => setMissionStatement(e.target.value)}
            placeholder="What is your team's purpose? Why do you exist?"
            rows={3}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Core Values (list 3-5)</label>
          <textarea
            value={coreValues}
            onChange={(e) => setCoreValues(e.target.value)}
            placeholder="What principles guide your team's decisions and behavior?"
            rows={3}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Team Goals</label>
          <textarea
            value={teamGoals}
            onChange={(e) => setTeamGoals(e.target.value)}
            placeholder="What are you trying to achieve in the next 12 months?"
            rows={3}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
          <p className="text-cyan-400 text-sm font-medium mb-1">Your Selected Goal Will Be Included</p>
          <p className="text-gray-300 text-sm">"{selectedGoal.goalTitle}"</p>
        </div>

        {(uploadProgress === 'processing' || uploadProgress === 'verifying') && (
          <div className="p-6 bg-gray-800 rounded-xl">
            <div className="space-y-3">
              <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'processing' ? 'text-cyan-400' : 'text-gray-500'}`}>
                {uploadProgress === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-400" />}
                Creating document with AI embeddings...
              </div>
              <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'verifying' ? 'text-cyan-400' : 'text-gray-600'}`}>
                {uploadProgress === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4" />}
                Syncing with Astra...
              </div>
            </div>
          </div>
        )}

        {uploadProgress !== 'complete' && uploadProgress !== 'processing' && uploadProgress !== 'verifying' && (
          <button
            onClick={handleCreateDocument}
            disabled={!missionStatement.trim() || !coreValues.trim() || !teamGoals.trim() || creatingDocument}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            {creatingDocument ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Document...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Strategy Document
              </>
            )}
          </button>
        )}

        {uploadProgress === 'complete' && (
          <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">Strategy document created!</p>
                <p className="text-gray-400 text-sm">Your document has been synced with Astra</p>
              </div>
            </div>
          </div>
        )}

        {uploadProgress === 'error' && uploadError && (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-1">Failed to create document</p>
                <p className="text-gray-400 text-sm">{uploadError}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadProgress('idle');
                setUploadError(null);
              }}
              className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderExistingOption = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Select an Existing Document</h3>
      <p className="text-gray-400 text-sm">
        Choose a document you've already synced with your account.
      </p>

      {loadingDocuments ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : existingDocuments.length === 0 ? (
        <div className="text-center py-8 bg-gray-800/50 rounded-xl">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No documents found</p>
          <p className="text-gray-500 text-sm">Try uploading or creating a new document</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {existingDocuments.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleSelectExisting(doc)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                selectedDocumentId === doc.id
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{doc.fileName}</p>
                <p className="text-gray-500 text-xs capitalize">{doc.category}</p>
              </div>
              {selectedDocumentId === doc.id && (
                <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {uploadProgress === 'complete' && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <p className="text-green-400 font-medium">Document selected!</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {onLogout && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      )}
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-4">
            <FileText className="w-4 h-4" />
            Sync Your Strategy
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Your Team's Foundation</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            To generate your personalized infographic, we need your mission statement, core values, and goals.
            Choose how you'd like to provide this information.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {!selectedOption && (
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => setSelectedOption('upload')}
                className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-cyan-500 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Upload Document</h3>
                <p className="text-gray-400 text-sm">
                  Upload an existing strategy, mission, or values document
                </p>
              </button>

              <button
                onClick={() => setSelectedOption('create')}
                className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-cyan-500 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Create with Astra</h3>
                <p className="text-gray-400 text-sm">
                  Answer questions and generate a strategy document
                </p>
              </button>

              {existingDocuments.length > 0 && (
                <button
                  onClick={() => setSelectedOption('existing')}
                  className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-cyan-500 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Select Existing</h3>
                  <p className="text-gray-400 text-sm">
                    Choose from {existingDocuments.length} synced document{existingDocuments.length !== 1 ? 's' : ''}
                  </p>
                </button>
              )}
            </div>
          )}

          {selectedOption && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setUploadProgress('idle');
                  setUploadError(null);
                }}
                className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Choose different option
              </button>

              {selectedOption === 'upload' && renderUploadOption()}
              {selectedOption === 'create' && renderCreateOption()}
              {selectedOption === 'existing' && renderExistingOption()}
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-end">
          <button
            onClick={handleContinue}
            disabled={uploadProgress !== 'complete' || !documentId}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
          >
            Continue to Infographic
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
