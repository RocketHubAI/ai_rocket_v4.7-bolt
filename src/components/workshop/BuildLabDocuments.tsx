import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  ChevronLeft,
  Loader2,
  Check,
  AlertCircle,
  File,
  FileImage,
  FileSpreadsheet,
  Sparkles,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface BuildLabDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  source: 'workshop' | 'build_lab';
}

interface DocumentRecommendation {
  type: string;
  reason: string;
  examples: string[];
}

interface BuildLabDocumentsProps {
  userId: string;
  registrationId: string;
  teamId: string;
  wishes: {
    wish1: string;
    wish2: string;
    wish3: string;
  };
  onBack: () => void;
}

const MAX_DOCUMENTS = 10;

export const BuildLabDocuments: React.FC<BuildLabDocumentsProps> = ({
  userId,
  registrationId,
  teamId,
  wishes: wishesProp,
  onBack
}) => {
  const [documents, setDocuments] = useState<BuildLabDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<DocumentRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [actualWishes, setActualWishes] = useState(wishesProp);

  const loadDocuments = useCallback(async () => {
    try {
      const [workshopResult, buildLabResult] = await Promise.all([
        supabase
          .from('workshop_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('build_lab_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      if (workshopResult.error) throw workshopResult.error;
      if (buildLabResult.error) throw buildLabResult.error;

      const workshopDocs: BuildLabDocument[] = (workshopResult.data || []).map(d => ({
        id: d.id,
        fileName: d.file_name,
        fileType: d.file_type || 'application/octet-stream',
        fileSize: d.file_size || 0,
        createdAt: d.created_at,
        source: 'workshop' as const
      }));

      const buildLabDocs: BuildLabDocument[] = (buildLabResult.data || []).map(d => ({
        id: d.id,
        fileName: d.file_name,
        fileType: d.file_type,
        fileSize: d.file_size,
        createdAt: d.created_at,
        source: 'build_lab' as const
      }));

      setDocuments([...workshopDocs, ...buildLabDocs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    try {
      let wishes = actualWishes;

      if (!wishes.wish1 && !wishes.wish2 && !wishes.wish3) {
        const { data: wishesData } = await supabase
          .from('workshop_wishes')
          .select('wish_1, wish_2, wish_3')
          .eq('user_id', userId)
          .maybeSingle();

        if (wishesData) {
          wishes = {
            wish1: wishesData.wish_1 || '',
            wish2: wishesData.wish_2 || '',
            wish3: wishesData.wish_3 || ''
          };
          setActualWishes(wishes);
        }
      }

      if (!wishes.wish1 && !wishes.wish2 && !wishes.wish3) {
        setRecommendations([
          {
            type: 'Business Information',
            reason: 'Helps Astra understand your company context for better prototypes.',
            examples: ['company_overview.pdf', 'about_us.docx']
          },
          {
            type: 'Product/Service Data',
            reason: 'Enables accurate product references in your AI tools.',
            examples: ['products.csv', 'services_list.xlsx']
          },
          {
            type: 'Sample Content',
            reason: 'Shows the AI your preferred style and format.',
            examples: ['example_report.pdf', 'template.docx']
          }
        ]);
        setLoadingRecommendations(false);
        return;
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Based on these 3 AI business wishes, recommend document types the user should upload to help build better prototypes.

Wish 1: ${wishes.wish1}
Wish 2: ${wishes.wish2}
Wish 3: ${wishes.wish3}

Return ONLY a valid JSON array with 3-4 document recommendations. Each should have:
- type: The type of document (e.g., "Business Plan", "Product Catalog", "Customer Feedback")
- reason: Why this document would help (1 sentence)
- examples: Array of 2-3 specific file examples they might have

Example format:
[
  {"type": "Product Catalog", "reason": "Helps the AI understand your offerings for the sales tool.", "examples": ["product_list.xlsx", "services_menu.pdf", "pricing_sheet.csv"]},
  {"type": "Customer Data Sample", "reason": "Enables personalized recommendations in your AI assistant.", "examples": ["customer_segments.csv", "feedback_survey.xlsx"]}
]`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as DocumentRecommendation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecommendations(parsed.slice(0, 4));
        } else {
          throw new Error('No recommendations parsed');
        }
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setRecommendations([
        {
          type: 'Business Information',
          reason: 'Helps Astra understand your company context for better prototypes.',
          examples: ['company_overview.pdf', 'about_us.docx']
        },
        {
          type: 'Product/Service Data',
          reason: 'Enables accurate product references in your AI tools.',
          examples: ['products.csv', 'services_list.xlsx']
        },
        {
          type: 'Sample Content',
          reason: 'Shows the AI your preferred style and format.',
          examples: ['example_report.pdf', 'template.docx']
        }
      ]);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [actualWishes, userId]);

  useEffect(() => {
    loadDocuments();
    loadRecommendations();
  }, [loadDocuments, loadRecommendations]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (documents.length >= MAX_DOCUMENTS) {
      setUploadError(`Maximum ${MAX_DOCUMENTS} documents allowed. Delete one to upload more.`);
      return;
    }

    setUploading(true);
    setUploadProgress('uploading');
    setUploadError(null);

    try {
      const uploadId = crypto.randomUUID();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `build-lab/${userId}/${uploadId}/${sanitizedFilename}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('local-uploads')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

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
            category: 'build_lab',
            teamId,
            userId,
            uploadId,
            fileSize: file.size
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Processing failed: ${errorText}`);
      }

      const result = await response.json();

      await supabase.from('build_lab_documents').insert({
        user_id: userId,
        registration_id: registrationId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        extracted_content: result.extractedText || null
      });

      setUploadProgress('complete');
      await loadDocuments();

      setTimeout(() => {
        setUploadProgress('idle');
        setUploading(false);
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed');
      setUploadProgress('error');
      setUploading(false);
    }

    e.target.value = '';
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;

      await supabase.from('build_lab_documents').delete().eq('id', docId);
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return FileImage;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const workshopDocs = documents.filter(d => d.source === 'workshop');
  const buildLabDocs = documents.filter(d => d.source === 'build_lab');
  const totalDocsCount = documents.length;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-white">Document Library</h1>
            <p className="text-xs text-gray-400">
              {totalDocsCount} document{totalDocsCount !== 1 ? 's' : ''} synced
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Recommended Documents for Better Prototypes</h3>
              <p className="text-gray-400 text-sm">
                Adding these documents will help Astra create more personalized and accurate AI tool prototypes.
              </p>
            </div>
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              <span className="ml-2 text-gray-400 text-sm">Analyzing your wishes...</span>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium">{rec.type}</h4>
                      <p className="text-gray-400 text-sm mt-1">{rec.reason}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        Examples: {rec.examples.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Business Documents</h4>
                    <p className="text-gray-400 text-sm mt-1">Company info, processes, or procedures</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Data Files</h4>
                    <p className="text-gray-400 text-sm mt-1">Spreadsheets, reports, or templates</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          {buildLabDocs.length < MAX_DOCUMENTS && (
            <label className={`block w-full p-8 border-2 border-dashed rounded-xl transition-colors cursor-pointer text-center ${
              uploading ? 'border-cyan-500 bg-cyan-500/5' : 'border-gray-600 hover:border-cyan-500'
            }`}>
              {uploadProgress === 'idle' && (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT, MD, CSV, XLSX (max 50MB)</p>
                </>
              )}

              {uploadProgress === 'uploading' && (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-cyan-400">Uploading...</span>
                </div>
              )}

              {uploadProgress === 'processing' && (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-cyan-400">Processing document...</span>
                </div>
              )}

              {uploadProgress === 'complete' && (
                <div className="flex items-center justify-center gap-3">
                  <Check className="w-6 h-6 text-green-400" />
                  <span className="text-green-400">Document added!</span>
                </div>
              )}

              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}

          {buildLabDocs.length >= MAX_DOCUMENTS && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-amber-400 text-sm">
                Maximum {MAX_DOCUMENTS} additional documents reached.
              </p>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400">{uploadError}</p>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-sm text-gray-400 hover:text-white mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {workshopDocs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              From Your Workshop Journey ({workshopDocs.length})
            </h3>
            <div className="space-y-3">
              {workshopDocs.map(doc => {
                const IconComponent = getFileIcon(doc.fileType);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{doc.fileName}</p>
                        <p className="text-gray-500 text-sm">
                          {formatFileSize(doc.fileSize)} - Workshop document
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                      Synced
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {buildLabDocs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Additional Documents ({buildLabDocs.length})
            </h3>
            <div className="space-y-3">
              {buildLabDocs.map(doc => {
                const IconComponent = getFileIcon(doc.fileType);
                const isDeleting = deletingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{doc.fileName}</p>
                        <p className="text-gray-500 text-sm">
                          {formatFileSize(doc.fileSize)} - {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeleting}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No documents yet</h3>
            <p className="text-gray-500 text-sm">
              Upload documents to provide context for your AI tool prototypes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
