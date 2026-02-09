import React, { useState, useEffect } from 'react';
import { X, Compass, CheckCircle, ArrowRight, ArrowLeft, Settings, Newspaper, UserPlus, Briefcase, BookOpen, Info, Sparkles, Rocket, PartyPopper } from 'lucide-react';
import { StageProgress } from '../../hooks/useLaunchPreparation';
import { useLaunchPreparation } from '../../hooks/useLaunchPreparation';
import { GUIDANCE_LEVELS, formatPoints } from '../../lib/launch-preparation-utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { StageProgressBar } from './StageProgressBar';
import { SupportMenu } from '../SupportMenu';
import { DelegateSetupBanner } from './DelegateSetupBanner';
import { GuidanceTeamConfigModal } from './GuidanceTeamConfigModal';
import { GuidanceNewsModal } from './GuidanceNewsModal';
import { GuidanceInviteMemberModal } from './GuidanceInviteMemberModal';

interface GuidanceStageProps {
  progress: StageProgress | null;
  fuelProgress: StageProgress | null;
  boostersProgress: StageProgress | null;
  guidanceProgress: StageProgress | null;
  onBack: () => void;
  onNavigateToStage?: (stage: 'fuel' | 'boosters' | 'guidance' | 'ready') => void;
  onComplete: () => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
  onDelegateSetup?: () => void;
  teamName?: string;
  showDelegationBanner?: boolean;
  userRole?: string;
  isInMainApp?: boolean;
}

export const GuidanceStage: React.FC<GuidanceStageProps> = ({ progress, fuelProgress, boostersProgress, guidanceProgress, onBack, onNavigateToStage, onComplete, onOpenHelpCenter, onDelegateSetup, teamName, showDelegationBanner = false, userRole = 'admin', isInMainApp = false }) => {
  const { user } = useAuth();
  const isAdmin = userRole === 'admin';
  const { updateStageLevel, completeAchievement, fetchStageProgress } = useLaunchPreparation();
  const [showTeamConfigModal, setShowTeamConfigModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [showLaunchReadyModal, setShowLaunchReadyModal] = useState(false);
  const [localProgress, setLocalProgress] = useState<StageProgress | null>(progress);
  const [localFuelProgress, setLocalFuelProgress] = useState<StageProgress | null>(fuelProgress);
  const [localBoostersProgress, setLocalBoostersProgress] = useState<StageProgress | null>(boostersProgress);

  // Restore modal state from sessionStorage on mount
  useEffect(() => {
    const restoreModalState = () => {
      const savedModal = sessionStorage.getItem('guidance_active_modal');

      if (savedModal) {
        console.log('🔄 Restoring Guidance modal state:', savedModal);
        switch (savedModal) {
          case 'team_config':
            setShowTeamConfigModal(true);
            break;
          case 'news':
            setShowNewsModal(true);
            break;
          case 'invite':
            setShowInviteModal(true);
            break;
        }
      }
    };

    restoreModalState();
  }, []);

  // Update local progress when props change
  useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  useEffect(() => {
    setLocalFuelProgress(fuelProgress);
  }, [fuelProgress]);

  useEffect(() => {
    setLocalBoostersProgress(boostersProgress);
  }, [boostersProgress]);

  // Refresh all stage progress on mount to ensure we have latest data
  useEffect(() => {
    const refreshOnMount = async () => {
      console.log('🔄 [GuidanceStage] Refreshing stage progress on mount');
      await fetchStageProgress();
    };

    refreshOnMount();
  }, [fetchStageProgress]);

  // For non-admin members: sync guidance level with team admin's progress
  useEffect(() => {
    const syncMemberGuidanceLevel = async () => {
      if (!user || isAdmin) return;

      const teamId = user.user_metadata?.team_id;
      if (!teamId) return;

      console.log('🔄 [GuidanceStage] Checking if member needs guidance level sync...');

      try {
        // Use RPC function to get admin's guidance progress (bypasses RLS)
        const { data: adminProgressData, error: progressError } = await supabase
          .rpc('get_team_admin_guidance_progress');

        if (progressError) {
          console.error('Error fetching admin progress:', progressError);
          return;
        }

        if (!adminProgressData || adminProgressData.length === 0) {
          console.log('ℹ️ No admin guidance progress found');
          return;
        }

        const adminProgress = adminProgressData[0];
        console.log('📊 Admin guidance level:', adminProgress.admin_level, 'Member level:', localProgress?.level);

        // If admin has completed at least level 2 and member is below that, sync member's level
        if (adminProgress.admin_level >= 2 && (localProgress?.level || 0) < 2) {
          console.log('🔄 Syncing member guidance level to 2');

          // Get admin's achievements for levels 1 and 2
          const adminAchievements = adminProgress.admin_achievements || [];
          const inheritedAchievements = adminAchievements.filter((a: string) =>
            a === 'guidance_level_1' || a === 'guidance_level_2'
          );

          // Update member's guidance progress
          const currentAchievements = localProgress?.achievements || [];
          const newAchievements = [...new Set([...currentAchievements, ...inheritedAchievements])];

          await supabase
            .from('launch_preparation_progress')
            .update({
              level: 2,
              achievements: newAchievements,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('stage', 'guidance');

          console.log('✅ Member guidance level synced to 2 (inherited from admin)');
          await refreshLocalProgress();
        }
      } catch (err) {
        console.error('Error syncing member guidance level:', err);
      }
    };

    // Small delay to ensure localProgress is available
    const timer = setTimeout(syncMemberGuidanceLevel, 500);
    return () => clearTimeout(timer);
  }, [user, isAdmin, localProgress?.level]);

  // Refresh local progress from hook after operations
  const refreshLocalProgress = async () => {
    const allProgress = await fetchStageProgress();
    const updatedGuidance = allProgress.find(p => p.stage === 'guidance') || null;
    const updatedFuel = allProgress.find(p => p.stage === 'fuel') || null;
    const updatedBoosters = allProgress.find(p => p.stage === 'boosters') || null;
    if (updatedGuidance) {
      setLocalProgress(updatedGuidance);
    }
    if (updatedFuel) {
      setLocalFuelProgress(updatedFuel);
    }
    if (updatedBoosters) {
      setLocalBoostersProgress(updatedBoosters);
    }
  };

  const currentLevel = localProgress?.level || 0;
  const targetLevel = currentLevel + 1;
  const currentLevelInfo = GUIDANCE_LEVELS[currentLevel] || GUIDANCE_LEVELS[0];
  const targetLevelInfo = GUIDANCE_LEVELS[targetLevel - 1];

  const levelIcons = [Settings, Newspaper, UserPlus, Briefcase, BookOpen];
  const LevelIcon = levelIcons[currentLevel] || Compass;

  // Check achievements
  const hasCompletedAchievement = (key: string): boolean => {
    return localProgress?.achievements?.includes(key) || false;
  };

  // Handle modal proceeds with achievements
  const handleTeamConfigProceed = async () => {
    sessionStorage.removeItem('guidance_active_modal');
    setShowTeamConfigModal(false);
    // Award level achievement
    await completeAchievement('guidance_level_1', 'guidance');
    // Update level
    await updateStageLevel('guidance', 1);
    // Refresh local progress
    await refreshLocalProgress();
  };

  const handleNewsProceed = async () => {
    sessionStorage.removeItem('guidance_active_modal');
    setShowNewsModal(false);
    // Award level achievement
    await completeAchievement('guidance_level_2', 'guidance');
    // Update level
    await updateStageLevel('guidance', 2);
    // Refresh local progress
    await refreshLocalProgress();
    // Show Launch Ready modal - user has completed minimum requirements
    setShowLaunchReadyModal(true);
  };

  const handleInviteProceed = async () => {
    sessionStorage.removeItem('guidance_active_modal');
    setShowInviteModal(false);
    // Award level achievement
    await completeAchievement('guidance_level_3', 'guidance');
    // Update level
    await updateStageLevel('guidance', 3);
    // Refresh local progress
    await refreshLocalProgress();
  };

  const allFeatureCards = [
    {
      id: 'team_settings',
      name: 'Team Configuration',
      description: 'Set up your team name and preferences',
      icon: Settings,
      color: 'green',
      level: 1,
      action: () => {
        sessionStorage.setItem('guidance_active_modal', 'team_config');
        setShowTeamConfigModal(true);
      },
      actionText: 'Configure Team',
      completed: hasCompletedAchievement('guidance_level_1'),
      adminOnly: true
    },
    {
      id: 'news',
      name: 'News Preferences',
      description: 'Stay informed with industry news',
      icon: Newspaper,
      color: 'blue',
      level: 2,
      action: () => {
        sessionStorage.setItem('guidance_active_modal', 'news');
        setShowNewsModal(true);
      },
      actionText: 'Enable News',
      completed: hasCompletedAchievement('guidance_level_2'),
      adminOnly: true
    },
    {
      id: 'invite_member',
      name: 'Invite Team Members',
      description: 'Build your team and collaborate',
      icon: UserPlus,
      color: 'purple',
      level: 3,
      action: () => {
        sessionStorage.setItem('guidance_active_modal', 'invite');
        setShowInviteModal(true);
      },
      actionText: 'Invite Members',
      completed: hasCompletedAchievement('guidance_level_3'),
      adminOnly: true
    },
    {
      id: 'ai_job',
      name: 'AI Specialists',
      description: 'Create automated workflows (Coming Soon)',
      icon: Briefcase,
      color: 'yellow',
      level: 4,
      action: () => {
        alert('AI Specialists feature coming soon!');
      },
      actionText: 'Create Specialist (Soon)',
      completed: false,
      disabled: true,
      adminOnly: false
    },
    {
      id: 'guidance_doc',
      name: 'Guidance Documents',
      description: 'Document your processes (Coming Soon)',
      icon: BookOpen,
      color: 'cyan',
      level: 5,
      action: () => {
        alert('Guidance Documents feature coming soon!');
      },
      actionText: 'Create Document (Soon)',
      completed: false,
      disabled: true,
      adminOnly: false
    }
  ];

  const featureCards = allFeatureCards.map(card => {
    if (!isAdmin && card.adminOnly) {
      return {
        ...card,
        completed: true,
        completedByAdmin: true,
        action: () => {},
        disabled: true
      };
    }
    return { ...card, completedByAdmin: false };
  });

  const handleStageNavigation = (stage: 'fuel' | 'boosters' | 'guidance') => {
    if (stage === 'guidance') return; // Already here
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
        fuelProgress={localFuelProgress || fuelProgress}
        boostersProgress={localBoostersProgress || boostersProgress}
        guidanceProgress={localProgress || guidanceProgress}
        currentStage="guidance"
        onStageClick={handleStageNavigation}
      />

      <div className="p-4 max-w-5xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Compass className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Guidance Stage</h1>
              <p className="text-sm text-gray-400">Configure and collaborate</p>
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
              <LevelIcon className="w-5 h-5 mr-2 text-purple-400" />
              {currentLevel === 0 ? 'Get Started' : `Level ${currentLevel} → ${currentLevelInfo.name}`}
            </h2>
            <button
              onClick={() => setShowLevelInfo(true)}
              className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {currentLevel === 0 ? (
            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 mb-3">
              <p className="text-sm text-purple-300">
                <strong>👇 Start with Level 1 below:</strong> Configure your team settings to unlock more features!
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
            <div className="mt-3 bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 rounded-lg p-3 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Mission Parameters Set!</p>
                <p className="text-xs text-gray-300">Ready to launch your AI Rocket</p>
              </div>
            </div>
          )}
        </div>

        {/* Featured Next Action - Only show for admins or when next action is not admin-only */}
        {featureCards.map((feature) => {
          const FeatureIcon = feature.icon;
          const isNextLevel = feature.level === currentLevel + 1;
          const isDisabled = feature.disabled;
          const isCompletedByAdmin = feature.completedByAdmin;

          if (isNextLevel && !feature.completed && !isCompletedByAdmin) {
            return (
              <div key={feature.id} className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <span className="text-purple-400">-&gt;</span>
                  <span className="ml-2">Your Next Step</span>
                </h3>
                <button
                  onClick={feature.action}
                  disabled={isDisabled}
                  className="w-full bg-gradient-to-br from-purple-900/40 to-violet-900/40 border-2 border-purple-500 rounded-xl p-6 text-left transition-all hover:from-purple-900/60 hover:to-violet-900/60 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                      <FeatureIcon className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xl font-bold text-white">{feature.name}</h4>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full font-medium">
                          Level {feature.level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{feature.description}</p>
                      <div className="flex items-center text-purple-400 text-sm font-medium">
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

              const isCompletedByAdmin = feature.completedByAdmin;

              return (
                <button
                  key={feature.id}
                  onClick={!isLocked && !isDisabled && !isCompletedByAdmin ? feature.action : undefined}
                  disabled={isLocked || isDisabled || isCompletedByAdmin}
                  className={`
                    border rounded-lg p-3 flex items-center gap-3 text-left transition-all
                    ${feature.completed && !isCompletedByAdmin ? 'bg-green-900/10 border-green-700/50 hover:bg-green-900/20 hover:border-green-600 cursor-pointer' :
                      feature.completed && isCompletedByAdmin ? 'bg-green-900/10 border-green-700/50 cursor-default' :
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
                      {feature.completed && isCompletedByAdmin && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex-shrink-0">
                          Completed by Admin
                        </span>
                      )}
                      {feature.completed && !isCompletedByAdmin && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex-shrink-0">
                          Done - Click to Update
                        </span>
                      )}
                      {isDisabled && !isCompletedByAdmin && (
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
        <button
          onClick={onComplete}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg"
        >
          <span>To Mission Control</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Modals */}
      {showTeamConfigModal && (
        <GuidanceTeamConfigModal
          onClose={() => {
            sessionStorage.removeItem('guidance_active_modal');
            setShowTeamConfigModal(false);
          }}
          onProceed={handleTeamConfigProceed}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {showNewsModal && (
        <GuidanceNewsModal
          onClose={() => {
            sessionStorage.removeItem('guidance_active_modal');
            setShowNewsModal(false);
          }}
          onProceed={handleNewsProceed}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {showInviteModal && (
        <GuidanceInviteMemberModal
          onClose={() => {
            sessionStorage.removeItem('guidance_active_modal');
            setShowInviteModal(false);
          }}
          onProceed={handleInviteProceed}
          onOpenHelpCenter={onOpenHelpCenter}
        />
      )}

      {/* Level Info Modal */}
      {showLevelInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                    <Compass className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Guidance Stage Levels</h3>
                </div>
                <button
                  onClick={() => setShowLevelInfo(false)}
                  className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300 mb-4">
                Progress through 5 Guidance Levels by configuring your team, enabling features, and building collaboration. Each level unlocks new capabilities and earns you Launch Points.
              </p>

              {GUIDANCE_LEVELS.map((level, index) => {
                const isCurrentLevel = currentLevel === level.level;
                const isCompleted = currentLevel > level.level;
                const LevelIcon = levelIcons[index];

                return (
                  <div
                    key={level.level}
                    className={`border rounded-lg p-4 ${
                      isCurrentLevel
                        ? 'border-purple-500 bg-purple-900/10'
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
                              ? 'bg-purple-600/20'
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
                                isCurrentLevel ? 'text-purple-400' : 'text-gray-400'
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <h4
                            className={`font-semibold ${
                              isCurrentLevel
                                ? 'text-purple-400'
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
                          <p className="text-xs text-purple-400 mt-1">Current</p>
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

              <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-purple-300">
                  <span className="font-medium">💡 Tip:</span> Start with Team Configuration to set up your workspace. Then enable news preferences and invite team members for better collaboration!
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowLevelInfo(false)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Launch Ready Modal - shown when user completes Guidance Level 2 */}
      {showLaunchReadyModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-green-500/30 max-w-lg w-full shadow-2xl shadow-green-500/20 overflow-hidden">
            {/* Celebration Header */}
            <div className="bg-gradient-to-r from-green-600/30 via-emerald-600/30 to-teal-600/30 border-b border-green-500/30 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)]" />
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-green-500/30 animate-pulse">
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Ready for Launch!
                </h2>
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Minimum Requirements Met</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-300 text-center mb-6">
                Congratulations! You've completed the minimum requirements to launch your AI Rocket. You can now proceed to Mission Control to launch, or continue the Guidance process to earn more points and unlock additional features.
              </p>

              {/* Requirements Checklist */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Completed Requirements:</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-sm text-gray-300">Fuel Stage - Level 1+ (Data Connected)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-sm text-gray-300">Boosters Stage - Level 4+ (AI Features Activated)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-sm text-gray-300">Guidance Stage - Level 2 (Team Configured)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowLaunchReadyModal(false);
                    onComplete();
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-green-500/30 min-h-[56px]"
                >
                  <Rocket className="w-5 h-5" />
                  <span>Proceed to Mission Control</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowLaunchReadyModal(false)}
                  className="w-full bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Continue Guidance Process</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                You can continue to earn more Launch Points by completing additional levels in the Guidance stage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
