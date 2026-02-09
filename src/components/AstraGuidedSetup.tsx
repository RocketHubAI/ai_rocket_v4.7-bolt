import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, Loader } from 'lucide-react';
import { useSetupGuide } from '../hooks/useSetupGuide';
import { useAuth } from '../contexts/AuthContext';
import { SupportMenu } from './SupportMenu';

// Import step components (we'll create these next)
import { WelcomeStep } from './setup-steps/WelcomeStep';
import { ConnectDriveStep } from './setup-steps/ConnectDriveStep';
import { ChooseFolderStep } from './setup-steps/ChooseFolderStep';
import { PlaceFilesStep } from './setup-steps/PlaceFilesStep';
import { SyncDataStep } from './setup-steps/SyncDataStep';
import { TeamSettingsStep } from './setup-steps/TeamSettingsStep';
import { FirstPromptStep } from './setup-steps/FirstPromptStep';
import { VisualizationStep } from './setup-steps/VisualizationStep';
import { ManualReportStep } from './setup-steps/ManualReportStep';
import { ScheduledReportStep } from './setup-steps/ScheduledReportStep';
import { InviteMembersStep } from './setup-steps/InviteMembersStep';

interface AstraGuidedSetupProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEP_TITLES = [
  'Welcome to Astra',
  'Connect Your Data',
  'Choose Your Folder',
  'Place Your Files',
  'Sync Your Data',
  'Configure Team Settings',
  'Send Your First Prompt',
  'Create a Visualization',
  'Run an Astra Report',
  'Schedule a Report',
  'Invite Team Members (Optional)'
];

export const AstraGuidedSetup: React.FC<AstraGuidedSetupProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { progress, loading, dataContext, markStepComplete, updateProgress, refreshProgress } = useSetupGuide();
  const [currentStep, setCurrentStep] = useState(1);
  const [folderData, setFolderData] = useState<any>(null);

  // Sync current step with progress and load folder data
  useEffect(() => {
    if (progress) {
      setCurrentStep(progress.current_step);

      // Load folder data from progress if available
      if (progress.created_folder_id) {
        setFolderData({
          selectedFolder: {
            id: progress.created_folder_id,
            name: 'Astra Strategy' // Default name
          },
          folderType: progress.created_folder_type || 'strategy',
          isNewFolder: progress.selected_folder_path === 'created'
        });
      }
    }
  }, [progress]);

  const handleStepComplete = async (stepNumber: number, additionalData?: any) => {
    await markStepComplete(stepNumber, additionalData);

    // Mark setup as complete after Step 10 (Step 11 is optional)
    if (stepNumber === 10) {
      await updateProgress({ is_completed: true, completed_at: new Date().toISOString() });
    }

    // Move to next step
    if (stepNumber < 11) {
      setCurrentStep(stepNumber + 1);
    } else {
      // Step 11 complete - final step, close the guide
      await updateProgress({ is_completed: true, completed_at: new Date().toISOString() });
      onClose();
    }
  };

  const handleSkipStep = async (stepNumber: number) => {
    // Only step 11 (invite members) can be skipped
    if (stepNumber === 11) {
      await markStepComplete(11, { step_11_team_members_invited: true });
      await updateProgress({ is_completed: true, completed_at: new Date().toISOString() });
    }
  };

  const handleGoToStep = (stepNumber: number) => {
    // Allow navigation to current step or any previous completed step
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
      // Update current_step in database
      updateProgress({ current_step: stepNumber });
    }
  };

  const handleClose = () => {
    // Only allow closing if setup is completed
    if (progress?.is_completed) {
      onClose();
    } else {
      // Don't allow closing during setup - setup must be completed
      alert('Please complete the Guided Setup before closing. Your progress is saved automatically, and you can return to continue where you left off.');
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <h1 className="text-2xl font-bold">
                  <span className="text-blue-200">AI Rocket</span>
                  <span className="text-white font-normal mx-1">+</span>
                  <span className="text-emerald-300">Astra Intelligence</span>
                </h1>
              </div>
              <p className="text-white/80 text-sm mt-1 ml-10">
                Step {currentStep} of {STEP_TITLES.length}: {STEP_TITLES[currentStep - 1]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SupportMenu />
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-900 border-b border-gray-700">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {STEP_TITLES.map((title, index) => {
                const stepNum = index + 1;
                const isCompleted = progress ? progress[`step_${stepNum}_${getStepKey(stepNum)}` as keyof typeof progress] === true : false;
                const isCurrent = stepNum === currentStep;
                const isPast = stepNum < currentStep;
                const isClickable = stepNum <= currentStep;

                return (
                  <div key={stepNum} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => isClickable && handleGoToStep(stepNum)}
                        disabled={!isClickable}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted || isPast
                            ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                            : isCurrent
                            ? 'bg-blue-600 text-white cursor-default'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        } ${isClickable && !isCurrent ? 'hover:scale-110' : ''}`}
                        title={isClickable ? `Go to ${title}` : title}
                        aria-label={isClickable ? `Go to step ${stepNum}: ${title}` : `Step ${stepNum}: ${title}`}
                      >
                        {isCompleted || isPast ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isCurrent ? (
                          <Circle className="w-5 h-5 fill-current" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <span className={`text-xs mt-2 hidden md:block ${isCurrent ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {stepNum}
                      </span>
                    </div>
                    {stepNum < STEP_TITLES.length && (
                      <div
                        className={`w-8 h-1 mx-1 transition-colors ${
                          isPast ? 'bg-purple-600' : 'bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto bg-gray-900">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {currentStep === 1 && (
              <WelcomeStep
                onComplete={() => handleStepComplete(1)}
                progress={progress}
              />
            )}
            {currentStep === 2 && (
              <ConnectDriveStep
                onComplete={() => handleStepComplete(2)}
                progress={progress}
              />
            )}
            {currentStep === 3 && (
              <ChooseFolderStep
                onComplete={(data) => {
                  setFolderData(data);
                  // Save folder data to progress table
                  handleStepComplete(3, {
                    created_folder_id: data.selectedFolder?.id,
                    created_folder_type: data.folderType || 'strategy',
                    selected_folder_path: data.isNewFolder ? 'created' : 'existing'
                  });
                }}
                progress={progress}
              />
            )}
            {currentStep === 4 && (
              <PlaceFilesStep
                onComplete={() => handleStepComplete(4)}
                progress={progress}
                folderData={folderData}
              />
            )}
            {currentStep === 5 && (
              <SyncDataStep
                onComplete={() => handleStepComplete(5)}
                onGoBack={() => setCurrentStep(4)}
                progress={progress}
              />
            )}
            {currentStep === 6 && (
              <TeamSettingsStep
                onComplete={() => handleStepComplete(6)}
                progress={progress}
              />
            )}
            {currentStep === 7 && (
              <FirstPromptStep
                onComplete={() => handleStepComplete(7)}
                progress={progress}
                dataContext={dataContext}
              />
            )}
            {currentStep === 8 && (
              <VisualizationStep
                onComplete={() => handleStepComplete(8)}
                progress={progress}
              />
            )}
            {currentStep === 9 && (
              <ManualReportStep
                onComplete={() => handleStepComplete(9)}
                progress={progress}
                dataContext={dataContext}
              />
            )}
            {currentStep === 10 && (
              <ScheduledReportStep
                onComplete={() => handleStepComplete(10)}
                progress={progress}
                dataContext={dataContext}
              />
            )}
            {currentStep === 11 && (
              <InviteMembersStep
                onComplete={() => handleStepComplete(11)}
                onSkip={() => handleSkipStep(11)}
                progress={progress}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get step key from step number
const getStepKey = (stepNum: number): string => {
  const keys = [
    'onboarding_completed',
    'google_drive_connected',
    'folder_selected_or_created',
    'files_placed_in_folder',
    'data_synced',
    'team_settings_configured',
    'first_prompt_sent',
    'visualization_created',
    'manual_report_run',
    'scheduled_report_created',
    'team_members_invited'
  ];
  return keys[stepNum - 1] || '';
};
