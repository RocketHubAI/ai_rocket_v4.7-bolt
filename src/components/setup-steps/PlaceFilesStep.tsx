import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, Upload, Sparkles, CheckCircle2, X, Info, ArrowLeft, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { StrategyDocumentModal } from '../StrategyDocumentModal';
import { supabase } from '../../lib/supabase';

interface PlaceFilesStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
  folderData: any;
  folderType?: 'strategy' | 'meetings' | 'financial' | 'projects' | 'root';
  onGoBack?: () => void;
  forceChooseOption?: boolean;
  isAddFilesMode?: boolean;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  category?: string;
}

type ViewMode = 'choose-option' | 'waiting-for-files' | 'document-created' | 'files-found';

const FOLDER_DOCUMENT_EXAMPLES: Record<string, Array<{ icon: string; name: string; desc: string }>> = {
  root: [
    { icon: '📜', name: 'Strategy Documents', desc: 'Mission, Vision, and Core Values' },
    { icon: '👥', name: 'Meeting Notes', desc: 'Team and Client Meeting Summaries' },
    { icon: '📊', name: 'Financial Reports', desc: 'P&L, Budgets, and Forecasts' },
    { icon: '📋', name: 'Project Plans', desc: 'Timelines and Milestones' },
    { icon: '📚', name: 'SOPs', desc: 'Standard Operating Procedures' },
    { icon: '⚙️', name: 'Process Docs', desc: 'Workflow Documentation' },
  ],
  strategy: [
    { icon: '📜', name: 'Mission Statement', desc: 'Your Purpose and Core Mission' },
    { icon: '⭐', name: 'Core Values', desc: 'Guiding Principles for Your Team' },
    { icon: '🎯', name: 'Goals & OKRs', desc: 'Quarterly and Annual Objectives' },
    { icon: '🗺️', name: 'Strategic Plans', desc: 'Long-Term Vision and Roadmaps' },
    { icon: '📊', name: 'SWOT Analysis', desc: 'Strengths, Weaknesses, Opportunities' },
    { icon: '📋', name: 'V/TO Document', desc: 'Vision/Traction Organizer (EOS)' },
  ],
  meetings: [
    { icon: '👥', name: 'Leadership Meetings', desc: 'Summaries and Transcripts' },
    { icon: '🏢', name: 'Department Meetings', desc: 'Team Syncs and Updates' },
    { icon: '🤝', name: 'Client Meetings', desc: 'Notes and Action Items' },
    { icon: '📞', name: 'Sales Calls', desc: 'Call Summaries and Follow-Ups' },
    { icon: '🏛️', name: 'Board Meetings', desc: 'Minutes and Decisions' },
    { icon: '📋', name: 'L10 Meetings', desc: 'Level 10 Documentation (EOS)' },
  ],
  financial: [
    { icon: '📈', name: 'P&L Statements', desc: 'Profit and Loss Reports' },
    { icon: '💰', name: 'Budgets', desc: 'Annual and Quarterly Budgets' },
    { icon: '📊', name: 'Forecasts', desc: 'Financial Projections' },
    { icon: '🧾', name: 'Invoices', desc: 'Client and Vendor Invoices' },
    { icon: '💵', name: 'Cash Flow', desc: 'Cash Flow Statements' },
    { icon: '📑', name: 'Expense Reports', desc: 'Expense Tracking Documents' },
  ],
  projects: [
    { icon: '📋', name: 'Project Plans', desc: 'Timelines and Milestones' },
    { icon: '📚', name: 'SOPs', desc: 'Standard Operating Procedures' },
    { icon: '📖', name: 'Training Manuals', desc: 'Onboarding and Training Docs' },
    { icon: '📝', name: 'Proposals', desc: 'Client Proposals and Briefs' },
    { icon: '📢', name: 'Marketing Plans', desc: 'Campaign Strategies' },
    { icon: '⚙️', name: 'Process Docs', desc: 'Workflow Documentation' },
  ],
};

export const PlaceFilesStep: React.FC<PlaceFilesStepProps> = ({
  onComplete,
  folderData,
  progress,
  folderType = 'strategy',
  onGoBack,
  forceChooseOption = false,
  isAddFilesMode = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('choose-option');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [createdDocumentId, setCreatedDocumentId] = useState('');
  const [actualFolderId, setActualFolderId] = useState<string>('');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [folderFiles, setFolderFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Fetch folder ID from multiple sources as fallback
  useEffect(() => {
    const fetchFolderId = async () => {
      // Try folderData first (from props)
      if (folderData?.selectedFolder?.id) {
        setActualFolderId(folderData.selectedFolder.id);
        return;
      }

      // Try progress data (from database)
      if (progress?.created_folder_id) {
        setActualFolderId(progress.created_folder_id);
        return;
      }

      // Fallback: fetch from user_drive_connections
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const teamId = user.user_metadata?.team_id;
        if (!teamId) return;

        const { data: connection } = await supabase
          .from('user_drive_connections')
          .select('strategy_folder_id')
          .eq('team_id', teamId)
          .eq('is_active', true)
          .maybeSingle();

        if (connection?.strategy_folder_id) {
          setActualFolderId(connection.strategy_folder_id);
        }
      } catch (error) {
        console.error('Error fetching folder ID:', error);
      }
    };

    fetchFolderId();
  }, [folderData, progress]);

  // Check if step 4 is already completed and set view accordingly
  useEffect(() => {
    if (forceChooseOption) {
      console.log('forceChooseOption is true, showing choose-option view');
      setViewMode('choose-option');
    } else if (progress?.step_4_files_placed_in_folder) {
      console.log('Step 4 already completed, showing document-created view');
      setViewMode('document-created');
    } else {
      console.log('Step 4 not completed, showing choose-option view');
      setViewMode('choose-option');
    }
  }, [progress?.step_4_files_placed_in_folder, forceChooseOption]);

  const handleHasFiles = () => {
    setViewMode('waiting-for-files');
  };

  const handleBackToOptions = () => {
    setViewMode('choose-option');
  };

  const handleCreateStrategyDocument = () => {
    setShowDocumentModal(true);
  };

  const isStrategyFolder = folderType === 'strategy';
  const showCreateFileOption = isStrategyFolder;
  const folderTypeLabels: Record<string, string> = {
    root: 'Team',
    strategy: 'Strategy',
    meetings: 'Meetings',
    financial: 'Financial',
    projects: 'Projects'
  };
  const folderName = folderData?.selectedFolder?.name || folderTypeLabels[folderType];
  const displayTitle = isAddFilesMode ? 'Add Files' : `Place Your ${folderTypeLabels[folderType]} Files`;
  const displaySubtitle = isAddFilesMode
    ? 'Add documents to your folder, then sync to make them available'
    : 'Add at least one document to your folder, then return here to proceed';

  const handleDocumentCreated = async (documentId: string) => {
    setCreatedDocumentId(documentId);
    setShowDocumentModal(false);
    setViewMode('document-created');
  };

  const handleProceedToSync = () => {
    onComplete();
  };

  const openGoogleDrive = () => {
    if (actualFolderId) {
      window.open(`https://drive.google.com/drive/folders/${actualFolderId}`, '_blank');
    } else {
      window.open('https://drive.google.com', '_blank');
    }
  };

  const loadFolderFiles = async () => {
    if (!actualFolderId) return;

    setLoadingFiles(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-google-drive-files?folderId=${encodeURIComponent(actualFolderId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const responseData = await response.json();

      if (response.ok) {
        setFolderFiles(responseData.files || []);
        if (responseData.files && responseData.files.length > 0) {
          setViewMode('files-found');
        }
      }
    } catch (err) {
      console.error('Error loading folder files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document') || mimeType.includes('word')) return '📄';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.includes('text') || mimeType === 'text/markdown') return '📝';
    return '📄';
  };

  const documentExamples = FOLDER_DOCUMENT_EXAMPLES[folderType] || FOLDER_DOCUMENT_EXAMPLES.strategy;

  // Initial view - Choose between two options
  if (viewMode === 'choose-option') {
    return (
      <div className="space-y-4">
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-600/20 mb-3">
            <Upload className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {displayTitle}
          </h2>
          <p className="text-sm text-gray-300">
            {displaySubtitle}
          </p>
        </div>

        <div className={`grid gap-3 ${showCreateFileOption ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          <button
            onClick={handleHasFiles}
            className={`bg-green-900/20 hover:bg-green-800/30 border-2 border-green-700 hover:border-green-500 rounded-lg p-4 transition-all group min-h-[140px] flex flex-col items-center justify-center ${!showCreateFileOption ? 'max-w-md mx-auto w-full' : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1 text-center">
              {isAddFilesMode ? 'Upload files from my computer' : 'I have files to put in my folder'}
            </h3>
            <p className="text-xs text-gray-400 text-center">
              {isAddFilesMode ? 'Open Google Drive to upload or move files into your folder' : `I'll place my existing ${folderTypeLabels[folderType].toLowerCase()} documents in the folder`}
            </p>
          </button>

          {showCreateFileOption && (
            <button
              onClick={handleCreateStrategyDocument}
              className="bg-blue-900/20 hover:bg-blue-800/30 border-2 border-blue-700 hover:border-blue-500 rounded-lg p-4 transition-all group min-h-[140px] flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1 text-center">
                Create a strategy document
              </h3>
              <p className="text-xs text-gray-400 text-center">
                Let Astra help you create a document about your team
              </p>
            </button>
          )}
        </div>

        {isStrategyFolder && !isAddFilesMode && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎯</span>
              <h4 className="text-white text-sm font-semibold">Strategy Documents Include:</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-950/50 rounded-lg p-2 flex items-center gap-2">
                <span className="text-lg">📜</span>
                <span className="text-xs text-blue-200">Mission</span>
              </div>
              <div className="bg-blue-950/50 rounded-lg p-2 flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <span className="text-xs text-blue-200">Values</span>
              </div>
              <div className="bg-blue-950/50 rounded-lg p-2 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="text-xs text-blue-200">Goals</span>
              </div>
              <div className="bg-blue-950/50 rounded-lg p-2 flex items-center gap-2">
                <span className="text-lg">🗺️</span>
                <span className="text-xs text-blue-200">Plans</span>
              </div>
            </div>

            {actualFolderId && (
              <button
                onClick={openGoogleDrive}
                className="text-xs text-green-400 hover:text-green-300 underline flex items-center gap-1 mx-auto"
              >
                <ExternalLink className="w-3 h-3" />
                Open your Google Drive folder
              </button>
            )}
          </div>
        )}

        {actualFolderId && (isAddFilesMode || !isStrategyFolder) && (
          <div className="flex justify-center">
            <button
              onClick={openGoogleDrive}
              className="text-sm text-green-400 hover:text-green-300 underline flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Open your Google Drive folder
            </button>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4">
          <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Supported File Types
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {/* Supported - Google Native */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📄</span>
              <span className="text-xs text-white font-medium">Google Docs</span>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📊</span>
              <span className="text-xs text-white font-medium">Google Sheets</span>
            </div>

            {/* Supported - Microsoft Office */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📝</span>
              <span className="text-xs text-white font-medium">Word (DOC/DOCX)</span>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📗</span>
              <span className="text-xs text-white font-medium">Excel (XLS/XLSX)</span>
            </div>

            {/* Supported - Other Formats */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📕</span>
              <span className="text-xs text-white font-medium">PDF Files</span>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📊</span>
              <span className="text-xs text-white font-medium">CSV Files</span>
            </div>

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📄</span>
              <span className="text-xs text-white font-medium">TXT/Markdown</span>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-lg">📽️</span>
              <span className="text-xs text-white font-medium">PowerPoint (PPT/PPTX)</span>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-2 mt-3">
            <p className="text-xs text-blue-200">
              <span className="font-medium">✨ New:</span> We now support PDF, Word, Excel, PowerPoint, CSV, and TXT files directly!
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-2 mt-2">
            <p className="text-xs text-gray-400 text-center">
              ℹ️ All major document formats are now supported
            </p>
          </div>
        </div>

        {showDocumentModal && (
          <StrategyDocumentModal
            isOpen={showDocumentModal}
            onClose={() => setShowDocumentModal(false)}
            folderId={actualFolderId}
            onSuccess={handleDocumentCreated}
          />
        )}

        {showConversionModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Convert Files to Google Docs/Sheets</h3>
                </div>
                <button
                  onClick={() => setShowConversionModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-blue-200">
                    <span className="font-medium">✨ Great news!</span> We now support a wide range of file formats directly, so no conversion is needed.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-white font-semibold text-sm">Supported File Formats:</h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📄 Google Docs</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📊 Google Sheets</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📝 Word (DOC/DOCX)</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📗 Excel (XLS/XLSX)</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📕 PDF Files</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📊 CSV Files</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📄 TXT/Markdown</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                      <p className="text-xs text-white font-medium">📽️ PowerPoint</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                  <p className="text-xs text-green-300">
                    <span className="font-medium">✓ Tip:</span> Simply upload your files in any of these formats and we'll process them automatically!
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowConversionModal(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // View for waiting for user to place files
  if (viewMode === 'waiting-for-files') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBackToOptions}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Options
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-600/20 mb-3">
            <Upload className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isAddFilesMode ? 'Upload Your Files' : `Place Your ${folderTypeLabels[folderType]} Files`}
          </h2>
          <p className="text-sm text-gray-300">
            Add documents to your folder, then check if they're ready to sync
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-yellow-400" />
            Instructions:
          </h3>
          <ol className="space-y-2 text-xs text-gray-300">
            <li className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-600/20 flex items-center justify-center text-xs text-yellow-400 font-medium">
                1
              </span>
              <span>Click "Open Google Drive" to open your folder</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-600/20 flex items-center justify-center text-xs text-yellow-400 font-medium">
                2
              </span>
              <span>{isAddFilesMode ? 'Upload or move your documents into the folder' : `Upload or move your ${folderTypeLabels[folderType].toLowerCase()} documents into the folder`}</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-600/20 flex items-center justify-center text-xs text-yellow-400 font-medium">
                3
              </span>
              <span>Click "Check Files" to verify your files are ready</span>
            </li>
          </ol>
        </div>

        {!isAddFilesMode && (
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="text-sm text-gray-300 font-medium">What should I put here?</span>
            {showExamples ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}

        {showExamples && !isAddFilesMode && (
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-3">{folderTypeLabels[folderType]} documents include:</p>
            <div className="grid grid-cols-2 gap-2">
              {documentExamples.map((example, idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-lg p-2 flex items-start gap-2">
                  <span className="text-lg">{example.icon}</span>
                  <div>
                    <p className="text-xs text-white font-medium">{example.name}</p>
                    <p className="text-xs text-gray-500">{example.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4">
          <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Supported File Types
          </h4>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Supported Files - Google Native */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📄</span>
                <span className="text-xs text-white font-medium">Google Docs</span>
              </div>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📊</span>
                <span className="text-xs text-white font-medium">Google Sheets</span>
              </div>
            </div>

            {/* Supported Files - Microsoft Office */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📝</span>
                <span className="text-xs text-white font-medium">Word (DOC/DOCX)</span>
              </div>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📗</span>
                <span className="text-xs text-white font-medium">Excel (XLS/XLSX)</span>
              </div>
            </div>

            {/* Supported Files - Other Formats */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📕</span>
                <span className="text-xs text-white font-medium">PDF Files</span>
              </div>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📊</span>
                <span className="text-xs text-white font-medium">CSV Files</span>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📄</span>
                <span className="text-xs text-white font-medium">TXT/Markdown</span>
              </div>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">📽️</span>
                <span className="text-xs text-white font-medium">PowerPoint (PPT/PPTX)</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-2">
            <p className="text-xs text-blue-200">
              <span className="font-medium">✨ New:</span> We now support PDF, Word, Excel, PowerPoint, CSV, and TXT files directly!
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-2 mt-2">
            <p className="text-xs text-gray-400 text-center">
              ℹ️ All major document formats are now supported
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={openGoogleDrive}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
          >
            <span>Open Google Drive</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={loadFolderFiles}
            disabled={loadingFiles || !actualFolderId}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 min-h-[44px] disabled:opacity-50"
          >
            {loadingFiles ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Check Files</span>
              </>
            )}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleProceedToSync}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Skip check, proceed to sync
          </button>
        </div>
      </div>
    );
  }

  // View when files are found in the folder
  if (viewMode === 'files-found') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setViewMode('waiting-for-files')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-600/20 mb-3">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Files Ready to Sync!</h2>
          <p className="text-sm text-gray-300">
            Found {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''} in your folder
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 max-h-[200px] overflow-y-auto">
          <div className="space-y-2">
            {folderFiles.slice(0, 10).map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-2 bg-gray-900/50 rounded-lg"
              >
                <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  {file.modifiedTime && (
                    <p className="text-xs text-gray-500">
                      Modified {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {folderFiles.length > 10 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                +{folderFiles.length - 10} more files
              </p>
            )}
          </div>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <p className="text-sm text-green-300">
            These files will be synced with Astra so you can ask questions about them.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={openGoogleDrive}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
          >
            <span>Add More Files</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleProceedToSync}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg text-sm font-medium transition-all min-h-[44px]"
          >
            Proceed to Sync
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={loadFolderFiles}
            disabled={loadingFiles}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
            Refresh file list
          </button>
        </div>
      </div>
    );
  }

  // View after strategy document has been created
  if (viewMode === 'document-created') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-600/20 mb-3">
            <FileText className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Strategy Document Created!</h2>
          <p className="text-sm text-gray-300">
            Your Strategy Document has been successfully created and saved to your folder
          </p>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400" />
            What's Next?
          </h3>
          <p className="text-xs text-green-300 mb-2">
            Your Strategy Document is ready to be synced with Astra. Once synced, Astra will be able to:
          </p>
          <ul className="space-y-1 text-xs text-green-300">
            <li className="flex items-start space-x-2">
              <span className="text-green-400">✓</span>
              <span>Answer questions about your team's mission and goals</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-400">✓</span>
              <span>Provide insights aligned with your strategic direction</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-400">✓</span>
              <span>Help your team stay focused on core objectives</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={openGoogleDrive}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 min-h-[44px]"
          >
            <span>View Document</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleProceedToSync}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center space-x-2 min-h-[44px]"
          >
            <span>Proceed to Sync →</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
