import { useState, useEffect } from 'react';
import { X, Sparkles, Check, ChevronLeft, ChevronRight, FolderOpen, FileText, FolderClosed, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FolderItem {
  id: string;
  name: string;
}

interface SetupProgress {
  id?: string;
  current_step: number;
  completed_steps: number[];
  strategy_folders_selected: string[];
  meetings_folders_selected: string[];
  financial_folders_selected: string[];
  projects_folders_selected: string[];
  is_completed: boolean;
}

interface AstraGuidedSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  onSaveAndSync: (strategyIds: string[], meetingsIds: string[], financialIds: string[], projectsIds: string[]) => Promise<void>;
  existingStrategyIds?: string[];
  existingMeetingsIds?: string[];
  existingFinancialIds?: string[];
  existingProjectsIds?: string[];
  existingStrategyName?: string;
  existingMeetingsName?: string;
  existingFinancialName?: string;
  existingProjectsName?: string;
}

interface StepContent {
  title: string;
  astraMessage: string;
  examples: string[];
  samplePrompts: string[];
  bestPractices: string[];
  folderType: 'strategy' | 'meetings' | 'financial' | 'projects';
}

const STEPS: StepContent[] = [
  {
    title: 'Welcome to Guided Setup',
    astraMessage: "Hi there! I'm Astra, and I'm excited to help you connect your team's data. By syncing your Google Drive folders, you'll unlock powerful AI insights across your business. Let me walk you through selecting the right folders for Strategy, Projects, Meetings, and Financial data. We'll go step-by-step, and you can save your progress and come back anytime!",
    examples: [],
    samplePrompts: [],
    bestPractices: [
      "This setup takes about 5-7 minutes",
      "You can pause and resume anytime",
      "Each folder type unlocks specific AI capabilities",
      "You can always adjust your selections later"
    ],
    folderType: 'strategy'
  },
  {
    title: 'Important Sync Guidelines',
    astraMessage: "Before we begin selecting folders, there are a few important things to know about what data can currently be synced. Understanding these limitations will help you organize your folders for the best results.",
    examples: [],
    samplePrompts: [],
    bestPractices: [
      "Currently, only Google Drive folders can be synced. We plan to add more data sources in future updates.",
      "We support Google Docs, Google Sheets, PDF, Word (DOC/DOCX), Excel (XLS/XLSX), CSV, TXT/Markdown, and PowerPoint (PPT/PPTX) files. Files will be processed automatically when synced.",
      "Currently, the file sync does NOT support sub-folders in your folders. Meaning only files in your folders will be synced, not folders or other files in those folders. We plan to add sub-folder sync capabilities in the future."
    ],
    folderType: 'strategy'
  },
  {
    title: 'Strategy Documents',
    astraMessage: "Let's start with your Strategy documents. These are the core documents that define your company's direction and goals. By connecting these, I can help you analyze alignment across your organization and ensure your team is working toward the same vision.",
    examples: [
      "Mission & Vision Statements",
      "Quarterly OKRs or Goals",
      "Strategic Plans & Roadmaps",
      "Company Values Documents",
      "Annual Planning Materials",
      "Product Strategy Documents"
    ],
    samplePrompts: [
      "Analyze alignment between our mission and recent team meetings",
      "What are our top 3 strategic priorities this quarter?",
      "How do our OKRs align with our core values?"
    ],
    bestPractices: [
      "Include high-level planning documents",
      "Add folders with mission-critical content",
      "Avoid folders with sensitive personal data"
    ],
    folderType: 'strategy'
  },
  {
    title: 'Projects & Campaigns',
    astraMessage: "Next, let's connect your Projects folder. This is where you keep documents for active campaigns, client projects, and time-bound initiatives. With projects synced, I can help you track progress, identify blockers, and ensure projects align with your strategic goals.",
    examples: [
      "Marketing Campaigns",
      "Client Project Folders",
      "Product Launches",
      "Sales Programs",
      "Initiative Documentation",
      "Campaign Materials"
    ],
    samplePrompts: [
      "Summarize status of all active projects",
      "Which projects align best with our Q1 goals?",
      "Show me common blockers across our campaigns"
    ],
    bestPractices: [
      "Include active project documentation",
      "Keep campaign materials organized",
      "Separate from evergreen strategy docs"
    ],
    folderType: 'projects'
  },
  {
    title: 'Meeting Documents',
    astraMessage: "Now let's connect your Meeting Documents. These documents capture decisions, action items, and team discussions. With meeting documents synced, I can help you track decisions, summarize key takeaways, and identify patterns across your team conversations.",
    examples: [
      "Summaries or Transcripts (not video or audio recordings) from: Leadership Meetings, Department Meetings, Client Meetings, Sales Calls, Board Meetings, etc."
    ],
    samplePrompts: [
      "Summarize key decisions from this week's meetings",
      "What action items were assigned in our last sprint retro?",
      "Show me recurring themes in our team meetings"
    ],
    bestPractices: [
      "Include regular team meeting folders",
      "Add folders with recurring meetings",
      "Ensure proper team access permissions"
    ],
    folderType: 'meetings'
  },
  {
    title: 'Financial Documents',
    astraMessage: "Finally, let's connect your Financial data. These documents help me understand your company's financial health and spending patterns. With financial data synced, I can help you analyze expenses, track budget alignment, and connect financial performance to your strategic goals.",
    examples: [
      "Profit & Loss Statements",
      "Balance Sheets",
      "Budget Forecasts",
      "Expense Reports",
      "Financial Dashboards",
      "Revenue Tracking Sheets"
    ],
    samplePrompts: [
      "Summarize our financials and the alignment to our core values and mission.",
      "What are our biggest expense categories this quarter?",
      "How is our actual spending comparing to budget?"
    ],
    bestPractices: [
      "Include financial summary documents",
      "Add folders with regular financial reports",
      "Ensure proper team access permissions",
      "Historical data provides better trends"
    ],
    folderType: 'financial'
  },
  {
    title: 'Summary & Confirmation',
    astraMessage: "Great work! Let's review what you've selected. Once you confirm, I'll start syncing your data and you'll be able to ask me questions about your business, strategy, projects, meetings, and financials. Remember, you can always come back to adjust these selections in User Settings.",
    examples: [],
    samplePrompts: [],
    bestPractices: [
      "Syncing typically takes 5-15 minutes",
      "You'll receive a notification when sync completes",
      "You can start chatting immediately",
      "You can adjust selections later in User Settings"
    ],
    folderType: 'strategy'
  }
];

export function AstraGuidedSetupModal({
  isOpen,
  onClose,
  folders,
  onSaveAndSync,
  existingStrategyIds = [],
  existingMeetingsIds = [],
  existingFinancialIds = [],
  existingProjectsIds = [],
  existingStrategyName,
  existingMeetingsName,
  existingFinancialName,
  existingProjectsName
}: AstraGuidedSetupModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<SetupProgress>({
    current_step: 0,
    completed_steps: [],
    strategy_folders_selected: existingStrategyIds,
    meetings_folders_selected: existingMeetingsIds,
    financial_folders_selected: existingFinancialIds,
    projects_folders_selected: existingProjectsIds,
    is_completed: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentStepContent = STEPS[currentStep];
  const totalSteps = STEPS.length;

  // Debug: Log what IDs are being passed in
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 Astra Guided Setup Modal Opened');
      console.log('Existing Strategy IDs:', existingStrategyIds);
      console.log('Existing Meetings IDs:', existingMeetingsIds);
      console.log('Existing Financial IDs:', existingFinancialIds);
      console.log('Existing Projects IDs:', existingProjectsIds);
      console.log('Total folders available:', folders.length);
    }
  }, [isOpen, existingStrategyIds, existingMeetingsIds, existingFinancialIds, existingProjectsIds, folders]);

  // Load existing progress on mount
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadProgress = async () => {
      const { data, error } = await supabase
        .from('google_drive_setup_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .maybeSingle();

      if (data && !error) {
        console.log('✅ Found saved progress in database:', data);
        setProgress({
          id: data.id,
          current_step: data.current_step,
          completed_steps: data.completed_steps || [],
          strategy_folders_selected: data.strategy_folders_selected?.length > 0 ? data.strategy_folders_selected : existingStrategyIds,
          meetings_folders_selected: data.meetings_folders_selected?.length > 0 ? data.meetings_folders_selected : existingMeetingsIds,
          financial_folders_selected: data.financial_folders_selected?.length > 0 ? data.financial_folders_selected : existingFinancialIds,
          projects_folders_selected: data.projects_folders_selected?.length > 0 ? data.projects_folders_selected : existingProjectsIds,
          is_completed: data.is_completed
        });
        setCurrentStep(data.current_step);
      } else {
        // No saved progress found, initialize with existing selections
        console.log('📝 No saved progress, initializing with existing folder IDs');
        const initialProgress = {
          current_step: 0,
          completed_steps: [],
          strategy_folders_selected: existingStrategyIds,
          meetings_folders_selected: existingMeetingsIds,
          financial_folders_selected: existingFinancialIds,
          projects_folders_selected: existingProjectsIds,
          is_completed: false
        };
        console.log('Initial progress state:', initialProgress);
        setProgress(initialProgress);
        setCurrentStep(0);
      }
    };

    loadProgress();
  }, [isOpen, user, existingStrategyIds, existingMeetingsIds, existingFinancialIds, existingProjectsIds]);

  const saveProgress = async (step: number, completedSteps: number[]) => {
    if (!user) return;

    const progressData = {
      user_id: user.id,
      team_id: user.user_metadata?.team_id,
      current_step: step,
      completed_steps: completedSteps,
      strategy_folders_selected: progress.strategy_folders_selected,
      meetings_folders_selected: progress.meetings_folders_selected,
      financial_folders_selected: progress.financial_folders_selected,
      projects_folders_selected: progress.projects_folders_selected,
      is_completed: false,
      last_updated_at: new Date().toISOString()
    };

    if (progress.id) {
      await supabase
        .from('google_drive_setup_progress')
        .update(progressData)
        .eq('id', progress.id);
    } else {
      const { data } = await supabase
        .from('google_drive_setup_progress')
        .insert(progressData)
        .select()
        .single();

      if (data) {
        setProgress(prev => ({ ...prev, id: data.id }));
      }
    }
  };

  const handleFolderToggle = (folderId: string) => {
    const folderType = currentStepContent.folderType;
    const key = `${folderType}_folders_selected` as keyof SetupProgress;
    const currentSelection = progress[key] as string[];

    // Only allow selecting ONE folder (radio button behavior)
    const newSelection = currentSelection.includes(folderId)
      ? [] // Deselect if clicking the same folder
      : [folderId]; // Select only this folder

    setProgress(prev => ({
      ...prev,
      [key]: newSelection
    }));
  };

  const getCurrentFolderSelection = (): string[] => {
    const folderType = currentStepContent.folderType;
    const key = `${folderType}_folders_selected` as keyof SetupProgress;
    return progress[key] as string[];
  };

  const getExistingFolderName = (folderType: string): string | undefined => {
    switch (folderType) {
      case 'strategy': return existingStrategyName;
      case 'meetings': return existingMeetingsName;
      case 'financial': return existingFinancialName;
      case 'projects': return existingProjectsName;
      default: return undefined;
    }
  };

  const getCurrentFolderName = (): string | null => {
    const currentSelection = getCurrentFolderSelection();
    if (currentSelection.length === 0) return null;

    const folderId = currentSelection[0];
    const folderFromList = folders.find(f => f.id === folderId);
    if (folderFromList) return folderFromList.name;

    const existingName = getExistingFolderName(currentStepContent.folderType);
    return existingName || null;
  };

  const getFolderNameById = (folderId: string, folderType: string): string | null => {
    const folderFromList = folders.find(f => f.id === folderId);
    if (folderFromList) return folderFromList.name;

    const existingName = getExistingFolderName(folderType);
    return existingName || null;
  };

  const handleNext = async () => {
    const newCompletedSteps = [...new Set([...progress.completed_steps, currentStep])];
    setProgress(prev => ({ ...prev, completed_steps: newCompletedSteps }));

    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await saveProgress(nextStep, newCompletedSteps);
      setSearchTerm(''); // Clear search when moving to next step
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSearchTerm(''); // Clear search when going back
    }
  };

  const handleSaveAndContinueLater = async () => {
    setIsSaving(true);
    await saveProgress(currentStep, progress.completed_steps);
    setIsSaving(false);
    onClose();
  };

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      await onSaveAndSync(
        progress.strategy_folders_selected,
        progress.meetings_folders_selected,
        progress.financial_folders_selected,
        progress.projects_folders_selected
      );

      if (progress.id) {
        await supabase
          .from('google_drive_setup_progress')
          .update({ is_completed: true })
          .eq('id', progress.id);
      }

      onClose();
    } catch (error) {
      console.error('Failed to complete setup:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!isOpen) return null;

  const isWelcomeStep = currentStep === 0;
  const isGuidelinesStep = currentStep === 1;
  const isSummaryStep = currentStep === totalSteps - 1;
  const showFolderSelection = !isWelcomeStep && !isGuidelinesStep && !isSummaryStep;

  // Filter folders based on search term
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Astra Guided Setup
              </h2>
              <p className="text-sm text-gray-400">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index <= currentStep
                    ? 'bg-gradient-to-r from-orange-500 to-blue-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Astra's Guidance Panel */}
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {currentStepContent.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {currentStepContent.astraMessage}
                  </p>
                </div>
              </div>

              {currentStepContent.examples.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">
                    📁 Document Examples:
                  </h4>
                  <ul className="space-y-1">
                    {currentStepContent.examples.map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentStepContent.samplePrompts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">
                    💡 What You Can Ask Me:
                  </h4>
                  <ul className="space-y-2">
                    {currentStepContent.samplePrompts.map((prompt, idx) => (
                      <li key={idx} className="text-sm text-blue-300 bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                        "{prompt}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentStepContent.bestPractices.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">
                    ✨ Best Practices:
                  </h4>
                  <ul className="space-y-1">
                    {currentStepContent.bestPractices.map((practice, idx) => (
                      <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Folder Selection Panel or Summary or Guidelines Graphic */}
            <div>
              {isGuidelinesStep ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 h-full flex items-center justify-center">
                  <div className="space-y-6 w-full">
                    {/* Google Drive Only */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                        <FolderClosed className="w-10 h-10 text-blue-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">Google Drive Only</h4>
                      <p className="text-gray-400 text-sm">More sources coming soon</p>
                    </div>

                    {/* File Types */}
                    <div className="text-center">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-3 text-sm">Supported File Formats</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">Docs</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">Sheets</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">PDF</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">Word</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">Excel</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">CSV</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">TXT</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500 flex items-center justify-center mb-1">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-green-400 text-[10px] font-medium">PPT</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* No Sub-folders */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center relative">
                        <FolderOpen className="w-10 h-10 text-orange-400" />
                        <AlertCircle className="w-6 h-6 text-red-400 absolute -top-1 -right-1" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">Top-Level Files Only</h4>
                      <p className="text-gray-400 text-sm">Sub-folders not synced yet</p>
                    </div>
                  </div>
                </div>
              ) : showFolderSelection ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="w-5 h-5 text-orange-500" />
                    <h4 className="text-lg font-semibold text-white">
                      Select Your {currentStepContent.title}
                    </h4>
                  </div>

                  {/* Current Selection Banner */}
                  {(() => {
                    const folderName = getCurrentFolderName();

                    return folderName ? (
                      <div className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border-2 border-green-500/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500/30 border border-green-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
                              Currently Connected Folder
                            </p>
                            <p className="text-white font-semibold text-sm">
                              {folderName}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              This folder is actively syncing. You can change your selection below or keep this folder.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300">
                          Select a folder below to sync your {currentStepContent.title.toLowerCase()}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Search Bar */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search folders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {folders.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">
                        No folders available. Please ensure you've connected Google Drive.
                      </p>
                    ) : filteredFolders.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">
                        No folders match "{searchTerm}"
                      </p>
                    ) : (
                      filteredFolders.map((folder) => {
                        const isSelected = getCurrentFolderSelection().includes(folder.id);
                        return (
                          <button
                            key={folder.id}
                            onClick={() => handleFolderToggle(folder.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500'
                                  : 'border-gray-600'
                              }`}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                              <span className="text-white text-sm font-medium">
                                {folder.name}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 p-4 bg-blue-500/10 border-2 border-blue-500/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-200 font-medium mb-1">
                          Supported File Formats
                        </p>
                        <p className="text-xs text-blue-300">
                          Google Docs, Google Sheets, PDF, Word (DOC/DOCX), Excel (XLS/XLSX), CSV, TXT/Markdown, and PowerPoint (PPT/PPTX)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isSummaryStep ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Your Selected Folders
                  </h4>

                  <div>
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">
                      Strategy Documents ({progress.strategy_folders_selected.length})
                    </h5>
                    {progress.strategy_folders_selected.length > 0 ? (
                      <div className="space-y-1">
                        {progress.strategy_folders_selected.map(id => {
                          const folderName = getFolderNameById(id, 'strategy');
                          return folderName ? (
                            <div key={id} className="text-sm text-gray-400 flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              {folderName}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No folders selected</p>
                    )}
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">
                      Meeting Notes ({progress.meetings_folders_selected.length})
                    </h5>
                    {progress.meetings_folders_selected.length > 0 ? (
                      <div className="space-y-1">
                        {progress.meetings_folders_selected.map(id => {
                          const folderName = getFolderNameById(id, 'meetings');
                          return folderName ? (
                            <div key={id} className="text-sm text-gray-400 flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              {folderName}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No folders selected</p>
                    )}
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">
                      Projects & Campaigns ({progress.projects_folders_selected.length})
                    </h5>
                    {progress.projects_folders_selected.length > 0 ? (
                      <div className="space-y-1">
                        {progress.projects_folders_selected.map(id => {
                          const folderName = getFolderNameById(id, 'projects');
                          return folderName ? (
                            <div key={id} className="text-sm text-gray-400 flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              {folderName}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No folders selected</p>
                    )}
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">
                      Financial Documents ({progress.financial_folders_selected.length})
                    </h5>
                    {progress.financial_folders_selected.length > 0 ? (
                      <div className="space-y-1">
                        {progress.financial_folders_selected.map(id => {
                          const folderName = getFolderNameById(id, 'financial');
                          return folderName ? (
                            <div key={id} className="text-sm text-gray-400 flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              {folderName}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No folders selected</p>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-300 font-medium">
                      Ready to sync! Click "Complete Setup" to start syncing your data.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex items-center justify-center h-full">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                    <p className="text-gray-300">
                      Let's get started connecting your team's data!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSaveAndContinueLater}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save & Continue Later'}
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              {isSummaryStep ? (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {isCompleting ? 'Completing...' : 'Complete Setup'}
                  <Sparkles className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isWelcomeStep ? "Let's Begin" : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
