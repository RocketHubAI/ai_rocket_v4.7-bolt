import React, { useState, useEffect, useCallback } from 'react';
import { X, Zap, CheckCircle, ArrowRight, ArrowLeft, MessageCircle, BarChart, FileBarChart, CalendarClock, Bot, Sparkles, Info } from 'lucide-react';
import { StageProgress } from '../../hooks/useLaunchPreparation';
import { useLaunchPreparation } from '../../hooks/useLaunchPreparation';
import { BOOSTERS_LEVELS, formatPoints, isReadyToLaunch } from '../../lib/launch-preparation-utils';
import { AstraGuidedChatModal } from '../AstraGuidedChatModal';
import { AstraGuidedResponseModal } from './AstraGuidedResponseModal';
import { VisualizationBoosterModal } from './VisualizationBoosterModal';
import { ManualReportBoosterModal } from './ManualReportBoosterModal';
import { ScheduledReportBoosterModal } from './ScheduledReportBoosterModal';
import { StageProgressBar } from './StageProgressBar';
import { SupportMenu } from '../SupportMenu';
import { DelegateSetupBanner } from './DelegateSetupBanner';
import { useAuth } from '../../contexts/AuthContext';

interface BoostersStageProps {
  progress: StageProgress | null;
  fuelProgress: StageProgress | null;
  boostersProgress: StageProgress | null;
  guidanceProgress: StageProgress | null;
  onBack: () => void;
  onNavigateToStage?: (stage: 'fuel' | 'boosters' | 'guidance' | 'ready') => void;
  onComplete: () => void;
  showLevelUp?: (stage: string, level: number, points: number) => void;
  onExitToChat?: (prompt: string) => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
  onDelegateSetup?: () => void;
  teamName?: string;
  showDelegationBanner?: boolean;
  isInMainApp?: boolean;
}

export const BoostersStage: React.FC<BoostersStageProps> = ({ progress, fuelProgress, boostersProgress, guidanceProgress, onBack, onNavigateToStage, onComplete, showLevelUp, onExitToChat, onOpenHelpCenter, onDelegateSetup, teamName, showDelegationBanner = false, isInMainApp = false }) => {
  const { user } = useAuth();
  const { updateStageLevel, completeAchievement, fetchStageProgress, getStageProgress } = useLaunchPreparation();
  const [showGuidedChat, setShowGuidedChat] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [lastAstraResponse, setLastAstraResponse] = useState<string>('');
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);
  const [showManualReportModal, setShowManualReportModal] = useState(false);
  const [showScheduledReportModal, setShowScheduledReportModal] = useState(false);
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);
  const [checkingLevel, setCheckingLevel] = useState(false);
  const [localProgress, setLocalProgress] = useState<StageProgress | null>(progress);

  const teamId = user?.user_metadata?.team_id;

  // Restore modal state from sessionStorage on mount
  useEffect(() => {
    const restoreModalState = () => {
      const savedModal = sessionStorage.getItem('boosters_active_modal');
      const savedPrompt = sessionStorage.getItem('boosters_selected_prompt');
      const savedResponse = sessionStorage.getItem('boosters_last_response');

      if (savedModal) {
        console.log('🔄 Restoring Boosters modal state:', savedModal);
        switch (savedModal) {
          case 'guided_chat':
            setShowGuidedChat(true);
            break;
          case 'response':
            if (savedPrompt) {
              setSelectedPrompt(savedPrompt);
              setShowResponseModal(true);
            }
            break;
          case 'visualization':
            if (savedResponse) {
              setLastAstraResponse(savedResponse);
            }
            setShowVisualizationModal(true);
            break;
          case 'manual_report':
            setShowManualReportModal(true);
            break;
          case 'scheduled_report':
            setShowScheduledReportModal(true);
            break;
        }
      }
    };

    restoreModalState();
  }, []);

  // Update local progress when prop changes
  useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  // Refresh local progress from hook after operations
  const refreshLocalProgress = useCallback(async () => {
    const allProgress = await fetchStageProgress();
    // Directly get the boosters progress from the fresh data
    const updatedProgress = allProgress.find(p => p.stage === 'boosters') || null;
    if (updatedProgress) {
      setLocalProgress(updatedProgress);
      console.log('✅ Local progress updated:', updatedProgress);
    }
  }, [fetchStageProgress]);

  const currentLevel = localProgress?.level || 0;
  const targetLevel = currentLevel + 1;
  const currentLevelInfo = BOOSTERS_LEVELS[currentLevel] || BOOSTERS_LEVELS[0];
  const targetLevelInfo = BOOSTERS_LEVELS[targetLevel - 1];

  const levelIcons = [MessageCircle, BarChart, FileBarChart, CalendarClock, Bot];
  const LevelIcon = levelIcons[currentLevel] || Zap;

  // Check achievements in progress
  const hasCompletedAchievement = (key: string): boolean => {
    return localProgress?.achievements?.includes(key) || false;
  };

  const handlePromptSelected = (prompt: string) => {
    // Store the selected prompt and close the guided chat modal
    setSelectedPrompt(prompt);
    sessionStorage.setItem('boosters_selected_prompt', prompt);
    setShowGuidedChat(false);
    // Open the response modal
    sessionStorage.setItem('boosters_active_modal', 'response');
    setShowResponseModal(true);
  };

  const handleResponseComplete = async (response: string) => {
    // Store the response for use in visualization step
    setLastAstraResponse(response);
    sessionStorage.setItem('boosters_last_response', response);

    // Mark achievement as complete when user clicks Proceed after viewing the response
    if (!hasCompletedAchievement('boosters_level_1')) {
      console.log('🎯 Completing Boosters Level 1 achievement...');
      const achievementSuccess = await completeAchievement('boosters_level_1', 'boosters');
      console.log('🎯 Achievement result:', achievementSuccess);

      const levelSuccess = await updateStageLevel('boosters', 1);
      console.log('🎯 Level update result:', levelSuccess);

      // Show toast notification only if successful
      if (achievementSuccess && levelSuccess && showLevelUp) {
        const levelInfo = BOOSTERS_LEVELS[0]; // Level 1 info
        showLevelUp('boosters', 1, levelInfo?.points || 10);
      }
    }

    // Close the response modal and return to Boosters Stage
    sessionStorage.removeItem('boosters_active_modal');
    sessionStorage.removeItem('boosters_selected_prompt');
    sessionStorage.removeItem('boosters_astra_response');
    sessionStorage.removeItem('boosters_astra_loading');
    sessionStorage.removeItem('boosters_astra_error');
    setShowResponseModal(false);
    setSelectedPrompt('');

    // Refresh local progress after modal closes
    await refreshLocalProgress();
  };

  const handleVisualizationComplete = async () => {
    if (!hasCompletedAchievement('boosters_level_2')) {
      await completeAchievement('boosters_level_2', 'boosters');
      await updateStageLevel('boosters', 2);

      // Show toast notification
      if (showLevelUp) {
        const levelInfo = BOOSTERS_LEVELS[1]; // Level 2 info
        showLevelUp('boosters', 2, levelInfo?.points || 20);
      }
    }

    sessionStorage.removeItem('boosters_active_modal');
    sessionStorage.removeItem('boosters_last_response');
    setShowVisualizationModal(false);

    // Refresh local progress after modal closes
    await refreshLocalProgress();
  };

  const handleManualReportComplete = async () => {
    if (!hasCompletedAchievement('boosters_level_3')) {
      await completeAchievement('boosters_level_3', 'boosters');
      await updateStageLevel('boosters', 3);

      // Show toast notification
      if (showLevelUp) {
        const levelInfo = BOOSTERS_LEVELS[2]; // Level 3 info
        showLevelUp('boosters', 3, levelInfo?.points || 30);
      }
    }

    sessionStorage.removeItem('boosters_active_modal');
    setShowManualReportModal(false);

    // Refresh local progress after modal closes
    await refreshLocalProgress();
  };

  const handleScheduledReportComplete = async () => {
    if (!hasCompletedAchievement('boosters_level_4')) {
      await completeAchievement('boosters_level_4', 'boosters');
      await updateStageLevel('boosters', 4);

      // Show toast notification
      if (showLevelUp) {
        const levelInfo = BOOSTERS_LEVELS[3]; // Level 4 info
        showLevelUp('boosters', 4, levelInfo?.points || 40);
      }
    }

    sessionStorage.removeItem('boosters_active_modal');
    setShowScheduledReportModal(false);

    // Refresh local progress after modal closes
    await refreshLocalProgress();

    // Check if user is now ready to launch (especially for member users with synced guidance)
    const allProgress = await fetchStageProgress();
    const updatedFuel = allProgress.find(p => p.stage === 'fuel') || null;
    const updatedBoosters = allProgress.find(p => p.stage === 'boosters') || null;
    const updatedGuidance = allProgress.find(p => p.stage === 'guidance') || null;

    if (isReadyToLaunch(updatedFuel, updatedBoosters, updatedGuidance)) {
      // Small delay to show the level up toast first
      setTimeout(() => {
        if (onNavigateToStage) {
          onNavigateToStage('ready');
        }
      }, 1500);
    }
  };

  const featureCards = [
    {
      id: 'guided_chat',
      name: 'Agent Guided Chat',
      description: 'Get personalized prompt suggestions based on your data',
      icon: Sparkles,
      color: 'purple',
      level: 1,
      action: () => {
        sessionStorage.setItem('boosters_active_modal', 'guided_chat');
        setShowGuidedChat(true);
      },
      actionText: 'Try Guided Chat',
      completed: hasCompletedAchievement('boosters_level_1')
    },
    {
      id: 'visualization',
      name: 'Data Visualizations',
      description: 'Turn your data into visual insights',
      icon: BarChart,
      color: 'blue',
      level: 2,
      action: () => {
        sessionStorage.setItem('boosters_active_modal', 'visualization');
        setShowVisualizationModal(true);
      },
      actionText: 'Create Visualization',
      completed: hasCompletedAchievement('boosters_level_2')
    },
    {
      id: 'manual_report',
      name: 'AI Reports',
      description: 'Generate on-demand insights',
      icon: FileBarChart,
      color: 'green',
      level: 3,
      action: () => {
        sessionStorage.setItem('boosters_active_modal', 'manual_report');
        setShowManualReportModal(true);
      },
      actionText: 'Generate Report',
      completed: hasCompletedAchievement('boosters_level_3')
    },
    {
      id: 'scheduled_report',
      name: 'Scheduled Reports',
      description: 'Automate recurring insights',
      icon: CalendarClock,
      color: 'yellow',
      level: 4,
      action: () => {
        sessionStorage.setItem('boosters_active_modal', 'scheduled_report');
        setShowScheduledReportModal(true);
      },
      actionText: 'Schedule Report',
      completed: hasCompletedAchievement('boosters_level_4')
    },
    {
      id: 'ai_specialists',
      name: 'AI Specialists',
      description: 'Create specialized AI team members (Coming Soon)',
      icon: Bot,
      color: 'cyan',
      level: 5,
      action: () => {
        alert('AI Specialists coming soon!');
      },
      actionText: 'Create Specialist (Soon)',
      completed: false,
      disabled: true
    }
  ];

  const handleStageNavigation = (stage: 'fuel' | 'boosters' | 'guidance') => {
    if (stage === 'boosters') return; // Already here
    if (onNavigateToStage) {
      onNavigateToStage(stage);
    } else {
      onBack(); // Fallback to stage selector
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Compact Progress Bar at Top */}
      <StageProgressBar
        fuelProgress={fuelProgress}
        boostersProgress={localProgress || boostersProgress}
        guidanceProgress={guidanceProgress}
        currentStage="boosters"
        onStageClick={handleStageNavigation}
      />

      <div className="p-4 max-w-5xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Boosters Stage</h1>
              <p className="text-sm text-gray-400">Power up with AI features</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            {isInMainApp ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm text-slate-300 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Mission Control</span>
                <span className="sm:hidden">Back</span>
              </button>
            ) : (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Back to Mission Control"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Delegate Setup Banner */}
        {showDelegationBanner && onDelegateSetup && (
          <DelegateSetupBanner
            teamName={teamName}
            onDelegateSuccess={onDelegateSetup}
          />
        )}

        {/* Compact Level Progress */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white flex items-center">
              <LevelIcon className="w-5 h-5 mr-2 text-cyan-400" />
              {currentLevel === 0 ? 'Get Started' : `Level ${currentLevel} → ${currentLevelInfo.name}`}
            </h2>
            <button
              onClick={() => setShowLevelInfoModal(true)}
              className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {currentLevel === 0 ? (
            <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-3 mb-3">
              <p className="text-sm text-cyan-300">
                <strong>👇 Start with Level 1 below:</strong> Try Agent Guided Chat or send 5 prompts to unlock more features!
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-300 mb-3">
              {currentLevelInfo.description}
            </p>
          )}

          {/* Next Level */}
          {currentLevel < 5 && targetLevelInfo && (
            <div className="border-t border-gray-700 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">
                  Next: Level {targetLevel}
                </h3>
                <span className="text-xs text-yellow-400 font-medium">
                  +{formatPoints(targetLevelInfo.points)}
                </span>
              </div>

              <ul className="space-y-1.5">
                {targetLevelInfo.requirements.map((req, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-600 rounded-full flex-shrink-0" />
                    <span className="text-gray-400">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentLevel === 5 && (
            <div className="mt-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-3 flex items-center gap-3">
              <Bot className="w-6 h-6 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Maximum Power!</p>
                <p className="text-xs text-gray-300">Ready for Guidance stage</p>
              </div>
            </div>
          )}
        </div>

        {/* Featured Next Action */}
        {featureCards.map((feature) => {
          const FeatureIcon = feature.icon;
          const isNextLevel = feature.level === currentLevel + 1;
          const isLocked = feature.level > currentLevel + 1;
          const isDisabled = feature.disabled;

          if (isNextLevel && !feature.completed) {
            return (
              <div key={feature.id} className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <span className="text-cyan-400">→</span>
                  <span className="ml-2">Your Next Booster</span>
                </h3>
                <button
                  onClick={feature.action}
                  disabled={isDisabled}
                  className="w-full bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-2 border-cyan-500 rounded-xl p-6 text-left transition-all hover:from-cyan-900/60 hover:to-blue-900/60 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/30 transition-colors">
                      <FeatureIcon className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xl font-bold text-white">{feature.name}</h4>
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full font-medium">
                          Level {feature.level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{feature.description}</p>
                      <div className="flex items-center text-cyan-400 text-sm font-medium">
                        <span>Click to get started</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          }
          return null;
        })}

        {/* Other Features */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            {currentLevel === 0 ? 'Coming Up Next' : 'All Features'}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {featureCards.map((feature) => {
              const FeatureIcon = feature.icon;
              const isLocked = feature.level > currentLevel + 1;
              const isDisabled = feature.disabled;
              const isNextLevel = feature.level === currentLevel + 1;

              // Skip the featured next level card
              if (isNextLevel && !feature.completed) {
                return null;
              }

              return (
                <button
                  key={feature.id}
                  onClick={!isLocked && !isDisabled ? feature.action : undefined}
                  disabled={isLocked || isDisabled}
                  className={`
                    border rounded-lg p-3 flex items-center gap-3 text-left transition-all
                    ${feature.completed ? 'bg-green-900/10 border-green-700/50 hover:bg-green-900/20 hover:border-green-600 cursor-pointer' :
                      isLocked || isDisabled ? 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed' :
                      'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600 cursor-pointer'}
                  `}
                >
                  <div className="flex-shrink-0">
                    {feature.completed ? (
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isLocked || isDisabled ? 'bg-gray-700/50' : 'bg-gray-700'
                      }`}>
                        <FeatureIcon className={`w-5 h-5 ${
                          isLocked || isDisabled ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-semibold truncate ${
                        feature.completed ? 'text-green-400' : 'text-white'
                      }`}>
                        {feature.name}
                      </h4>
                      {feature.completed && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex-shrink-0">
                          ✓ Done - Click to Repeat
                        </span>
                      )}
                      {isDisabled && (
                        <span className="text-xs bg-gray-600 text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>

                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-500 font-medium">Lvl {feature.level}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        {currentLevel >= 4 && (
          <button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>Continue to Guidance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {currentLevel < 4 && (
          <p className="text-center text-gray-400 text-xs">
            Complete Level 4 to unlock Guidance
          </p>
        )}
      </div>

      {/* Guided Chat Modal */}
      {showGuidedChat && teamId && (
        <AstraGuidedChatModal
          isOpen={showGuidedChat}
          onClose={() => {
            sessionStorage.removeItem('boosters_active_modal');
            setShowGuidedChat(false);
          }}
          onSelectPrompt={handlePromptSelected}
          teamId={teamId}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {/* Astra Response Modal */}
      {showResponseModal && selectedPrompt && (
        <AstraGuidedResponseModal
          isOpen={showResponseModal}
          onClose={() => {
            sessionStorage.removeItem('boosters_active_modal');
            sessionStorage.removeItem('boosters_selected_prompt');
            sessionStorage.removeItem('boosters_astra_response');
            sessionStorage.removeItem('boosters_astra_loading');
            sessionStorage.removeItem('boosters_astra_error');
            setShowResponseModal(false);
            setSelectedPrompt('');
          }}
          onComplete={handleResponseComplete}
          selectedPrompt={selectedPrompt}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {/* Visualization Modal */}
      {showVisualizationModal && (
        <VisualizationBoosterModal
          onClose={() => {
            sessionStorage.removeItem('boosters_active_modal');
            sessionStorage.removeItem('boosters_last_response');
            setShowVisualizationModal(false);
          }}
          onComplete={handleVisualizationComplete}
          astraResponse={lastAstraResponse}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {/* Astra Report Modal */}
      {showManualReportModal && (
        <ManualReportBoosterModal
          onClose={() => {
            sessionStorage.removeItem('boosters_active_modal');
            setShowManualReportModal(false);
          }}
          onComplete={handleManualReportComplete}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {/* Scheduled Report Modal */}
      {showScheduledReportModal && (
        <ScheduledReportBoosterModal
          onClose={() => {
            sessionStorage.removeItem('boosters_active_modal');
            setShowScheduledReportModal(false);
          }}
          onComplete={handleScheduledReportComplete}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {/* Level Info Modal */}
      {showLevelInfoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-600/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Boosters Stage Levels</h3>
                </div>
                <button
                  onClick={() => setShowLevelInfoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300 mb-4">
                Progress through 5 Booster Levels by trying out powerful AI features. Each level unlocks new capabilities and earns you Launch Points.
              </p>

              {BOOSTERS_LEVELS.map((level, index) => {
                const isCurrentLevel = currentLevel === level.level;
                const isCompleted = currentLevel > level.level;
                const LevelIcon = levelIcons[index];

                return (
                  <div
                    key={level.level}
                    className={`border rounded-lg p-4 ${
                      isCurrentLevel
                        ? 'border-cyan-500 bg-cyan-900/10'
                        : isCompleted
                        ? 'border-green-700 bg-green-900/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isCurrentLevel
                              ? 'bg-cyan-600/20'
                              : isCompleted
                              ? 'bg-green-600/20'
                              : 'bg-gray-700/50'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          ) : (
                            <LevelIcon
                              className={`w-6 h-6 ${
                                isCurrentLevel ? 'text-cyan-400' : 'text-gray-400'
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <h4
                            className={`font-semibold ${
                              isCurrentLevel
                                ? 'text-cyan-400'
                                : isCompleted
                                ? 'text-green-400'
                                : 'text-white'
                            }`}
                          >
                            Level {level.level}
                          </h4>
                          <p className="text-xs text-gray-400">{level.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-medium ${
                            isCompleted ? 'text-green-400' : 'text-yellow-400'
                          }`}
                        >
                          +{formatPoints(level.points)}
                        </span>
                        {isCurrentLevel && (
                          <p className="text-xs text-cyan-400 mt-1">Current</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-400 font-medium mb-1">Requirements:</p>
                      {level.requirements.map((req, reqIndex) => (
                        <div key={reqIndex} className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted ? 'bg-green-400' : 'bg-gray-600'
                            }`}
                          />
                          <p
                            className={`text-xs ${
                              isCompleted ? 'text-green-300' : 'text-gray-400'
                            }`}
                          >
                            {req}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-300">
                  <span className="font-medium">💡 Tip:</span> Try each feature to unlock the next level. Start with Agent Guided Chat to get personalized prompt suggestions based on your data!
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowLevelInfoModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
