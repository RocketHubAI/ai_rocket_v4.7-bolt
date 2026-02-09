import React, { useState } from 'react';
import { Fuel, Zap, Compass, ArrowRight, Lock, CheckCircle, Info, X, FileText, Folder, Database, HardDrive, Rocket, MessageCircle, BarChart, FileBarChart, CalendarClock, Bot, Settings, Newspaper, UserPlus, Briefcase, BookOpen } from 'lucide-react';
import { StageProgress } from '../../hooks/useLaunchPreparation';
import { calculateStageProgress, formatPoints, getStageDisplayName, FUEL_LEVELS, BOOSTERS_LEVELS, GUIDANCE_LEVELS } from '../../lib/launch-preparation-utils';
import { LaunchPreparationHeader } from './LaunchPreparationHeader';

interface StageSelectorProps {
  currentStage: 'fuel' | 'boosters' | 'guidance' | 'ready' | 'launched';
  fuelProgress: StageProgress | null;
  boostersProgress: StageProgress | null;
  guidanceProgress: StageProgress | null;
  totalPoints: number;
  onNavigateToStage: (stage: 'fuel' | 'boosters' | 'guidance') => void;
  onExit?: () => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
  onLaunch?: () => void;
  showFuelPulse?: boolean;
}

export const StageSelector: React.FC<StageSelectorProps> = ({
  currentStage,
  fuelProgress,
  boostersProgress,
  guidanceProgress,
  totalPoints,
  onNavigateToStage,
  onExit,
  onOpenHelpCenter,
  onLaunch,
  showFuelPulse = false
}) => {
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null);
  const [showStageInfoModal, setShowStageInfoModal] = useState<'fuel' | 'boosters' | 'guidance' | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleExit = () => {
    if (onExit) {
      onExit();
    }
  };

  const handleLaunch = () => {
    if (isLaunching) return;
    if (!onLaunch) return;

    setIsLaunching(true);
    onLaunch();
  };

  // Icon mapping for level details
  const iconMap: Record<string, any> = {
    'file-text': FileText,
    'folder-tree': Folder,
    'database': Database,
    'hard-drive': HardDrive,
    'rocket': Rocket,
    'message-circle': MessageCircle,
    'bar-chart': BarChart,
    'file-bar-chart': FileBarChart,
    'calendar-clock': CalendarClock,
    'bot': Bot,
    'settings': Settings,
    'newspaper': Newspaper,
    'user-plus': UserPlus,
    'briefcase': Briefcase,
    'book-open': BookOpen
  };

  const fuelLevel = fuelProgress?.level || 0;
  const boostersLevel = boostersProgress?.level || 0;
  const guidanceLevel = guidanceProgress?.level || 0;

  const fuelPercent = calculateStageProgress(fuelProgress);
  const boostersPercent = calculateStageProgress(boostersProgress);
  const guidancePercent = calculateStageProgress(guidanceProgress);

  // Check if stages are unlocked
  const fuelUnlocked = true; // Always unlocked
  const boostersUnlocked = fuelLevel >= 1;
  const guidanceUnlocked = fuelLevel >= 1 && boostersLevel >= 4;

  // Check if stages should show NEW indicator
  const boostersIsNew = boostersUnlocked && boostersLevel === 0;
  const guidanceIsNew = guidanceUnlocked && guidanceLevel === 0;

  const stages = [
    {
      id: 'fuel' as const,
      name: 'Fuel',
      description: 'Fuel your rocket with data',
      helpText: 'Connect your cloud storage (Google Drive, Microsoft OneDrive/SharePoint) to power your AI with relevant context.',
      icon: Fuel,
      color: 'blue',
      progress: fuelPercent,
      level: fuelLevel,
      unlocked: fuelUnlocked,
      completed: fuelLevel >= 5,
      isNew: false,
      shouldPulse: showFuelPulse && fuelLevel === 0
    },
    {
      id: 'boosters' as const,
      name: 'Boosters',
      description: 'Power up with features',
      helpText: 'Activate AI features and integrations to enhance your capabilities.',
      icon: Zap,
      color: 'cyan',
      progress: boostersPercent,
      level: boostersLevel,
      unlocked: boostersUnlocked,
      completed: boostersLevel >= 5,
      isNew: boostersIsNew,
      shouldPulse: false
    },
    {
      id: 'guidance' as const,
      name: 'Guidance',
      description: 'Set your mission parameters',
      helpText: 'Configure your AI preferences and establish regular engagement patterns.',
      icon: Compass,
      color: 'purple',
      progress: guidancePercent,
      level: guidanceLevel,
      unlocked: guidanceUnlocked,
      completed: guidanceLevel >= 5,
      isNew: guidanceIsNew,
      shouldPulse: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <LaunchPreparationHeader
        onClose={handleExit}
        fuelProgress={fuelProgress}
        boostersProgress={boostersProgress}
        guidanceProgress={guidanceProgress}
        onOpenHelpCenter={onOpenHelpCenter}
      />

      <div className="pt-16 px-4 pb-4 h-screen overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-4">
          {/* Page Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
              Mission Control
            </h2>
            <p className="text-gray-400 text-base md:text-lg">
              Launch Preparation
            </p>
          </div>

          {/* Launch Status Bar */}
          <div className="mb-6 flex flex-col md:flex-row items-stretch justify-center gap-4 w-full">
            {/* Launch Points Box */}
            <button
              onClick={() => setShowPointsModal(true)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-5 py-3.5 min-w-[160px] h-[72px] hover:bg-gray-800/70 hover:border-gray-600 transition-all group flex flex-col items-center justify-center"
            >
              <p className="text-gray-400 text-xs mb-1 text-center group-hover:text-gray-300 transition-colors">Launch Points</p>
              <p className="text-2xl font-bold text-yellow-400 text-center">{formatPoints(totalPoints)}</p>
            </button>

            {/* Requirements Checklist Box */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-5 py-3.5 h-[72px] flex items-center justify-center space-x-5">
              {/* Fuel Requirement */}
              <div className="flex items-center space-x-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  fuelLevel >= 1 ? 'bg-orange-500/20' : 'bg-gray-700/50'
                }`}>
                  <Fuel className={`w-4 h-4 transition-colors ${fuelLevel >= 1 ? 'text-orange-400' : 'text-gray-500'}`} />
                </div>
                <CheckCircle className={`w-5 h-5 transition-colors ${
                  fuelLevel >= 1 ? 'text-green-400' : 'text-gray-600'
                }`} />
              </div>

              {/* Boosters Requirement */}
              <div className="flex items-center space-x-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  boostersLevel >= 4 ? 'bg-cyan-500/20' : 'bg-gray-700/50'
                }`}>
                  <Zap className={`w-4 h-4 transition-colors ${boostersLevel >= 4 ? 'text-cyan-400' : 'text-gray-500'}`} />
                </div>
                <CheckCircle className={`w-5 h-5 transition-colors ${
                  boostersLevel >= 4 ? 'text-green-400' : 'text-gray-600'
                }`} />
              </div>

              {/* Guidance Requirement */}
              <div className="flex items-center space-x-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  guidanceLevel >= 2 ? 'bg-green-500/20' : 'bg-gray-700/50'
                }`}>
                  <Compass className={`w-4 h-4 transition-colors ${guidanceLevel >= 2 ? 'text-green-400' : 'text-gray-500'}`} />
                </div>
                <CheckCircle className={`w-5 h-5 transition-colors ${
                  guidanceLevel >= 2 ? 'text-green-400' : 'text-gray-600'
                }`} />
              </div>
            </div>

            {/* Launch Button */}
            <button
              disabled={!(fuelLevel >= 1 && boostersLevel >= 4 && guidanceLevel >= 2) || isLaunching}
              onClick={handleLaunch}
              className={`
                px-6 py-3.5 rounded-lg font-bold text-base h-[72px]
                transition-all transform relative overflow-hidden
                flex items-center justify-center space-x-2
                ${!(fuelLevel >= 1 && boostersLevel >= 4 && guidanceLevel >= 2) || isLaunching
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 text-white hover:scale-105 hover:shadow-[0_0_40px_rgba(147,51,234,0.6)] shadow-[0_0_20px_rgba(147,51,234,0.4)] animate-pulse'
                }
                ${(fuelLevel >= 1 && boostersLevel >= 4 && guidanceLevel >= 2) && !isLaunching ? 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000' : ''}
              `}
            >
              <span className="relative z-10 flex items-center space-x-2">
                <Rocket className="w-5 h-5" />
                <span>{isLaunching ? 'Launching...' : 'Launch AI Rocket'}</span>
              </span>
            </button>
          </div>

          {/* Stage Cards with Circular Progress */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isLocked = !stage.unlocked;
              const radius = 45;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (stage.progress / 100) * circumference;

              return (
                <div key={stage.id} className="relative">
                  {/* Info Icon Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStageInfoModal(stage.id);
                    }}
                    className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="View level details"
                  >
                    <Info className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>

                  <button
                    onClick={() => !isLocked && onNavigateToStage(stage.id)}
                    disabled={isLocked}
                    className={`
                      w-full relative bg-gray-800/50 border-2 rounded-2xl p-6 text-center transition-all
                      ${isLocked
                        ? 'border-gray-700 opacity-50 cursor-not-allowed'
                        : stage.color === 'blue'
                          ? 'border-orange-500/30 hover:border-orange-500 hover:bg-gray-800/70 cursor-pointer hover:scale-105'
                          : stage.color === 'cyan'
                            ? 'border-cyan-500/30 hover:border-cyan-500 hover:bg-gray-800/70 cursor-pointer hover:scale-105'
                            : 'border-green-500/30 hover:border-green-500 hover:bg-gray-800/70 cursor-pointer hover:scale-105'
                      }
                      ${stage.shouldPulse ? 'animate-pulse ring-2 ring-orange-500 ring-offset-2 ring-offset-gray-900' : ''}
                    `}
                  >
                  {/* Circular Progress */}
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-700"
                      />
                      {/* Progress circle */}
                      {!isLocked && (
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className={
                            stage.color === 'blue'
                              ? 'text-orange-500'
                              : stage.color === 'cyan'
                                ? 'text-cyan-500'
                                : 'text-green-500'
                          }
                          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                      )}
                    </svg>

                    {/* Icon in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isLocked ? (
                        <Lock className="w-12 h-12 text-gray-500" />
                      ) : stage.completed ? (
                        <CheckCircle className={
                          stage.color === 'blue'
                            ? 'w-12 h-12 text-orange-400'
                            : stage.color === 'cyan'
                              ? 'w-12 h-12 text-cyan-400'
                              : 'w-12 h-12 text-green-400'
                        } />
                      ) : (
                        <Icon className={
                          stage.color === 'blue'
                            ? 'w-12 h-12 text-orange-400'
                            : stage.color === 'cyan'
                              ? 'w-12 h-12 text-cyan-400'
                              : 'w-12 h-12 text-green-400'
                        } />
                      )}
                    </div>
                  </div>

                  {/* Stage Info */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-white">
                      {stage.name}
                    </h3>
                    {stage.isNew && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded uppercase">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{stage.description}</p>

                  {/* Level Badge */}
                  <div className={`
                    inline-flex items-center space-x-1 text-sm font-medium px-3 py-1.5 rounded-full
                    ${isLocked
                      ? 'bg-gray-700 text-gray-400'
                      : stage.color === 'blue'
                        ? 'bg-orange-500/20 text-orange-400'
                        : stage.color === 'cyan'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-green-500/20 text-green-400'
                    }
                  `}>
                    <span>Level {stage.level}/5</span>
                    {!isLocked && (
                      <span className="text-xs opacity-75">• {Math.round(stage.progress)}%</span>
                    )}
                  </div>

                  {isLocked && (
                    <p className="text-gray-500 text-xs mt-3">
                      {stage.id === 'boosters' && 'Complete Fuel Level 1 to unlock'}
                      {stage.id === 'guidance' && 'Complete Boosters Level 4 to unlock'}
                    </p>
                  )}

                  {!isLocked && (
                    <div className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-1">
                      {stage.shouldPulse ? (
                        <span className="text-orange-400 font-semibold flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Start Here
                        </span>
                      ) : (
                        <>
                          <span>Tap to enter</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </div>
                  )}
                </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stage Level Details Modal */}
      {showStageInfoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {(() => {
              const stageData = showStageInfoModal === 'fuel' ? FUEL_LEVELS : showStageInfoModal === 'boosters' ? BOOSTERS_LEVELS : GUIDANCE_LEVELS;
              const stageIcon = showStageInfoModal === 'fuel' ? Fuel : showStageInfoModal === 'boosters' ? Zap : Compass;
              const stageColor = showStageInfoModal === 'fuel' ? 'orange' : showStageInfoModal === 'boosters' ? 'cyan' : 'green';
              const stageLevel = showStageInfoModal === 'fuel' ? fuelLevel : showStageInfoModal === 'boosters' ? boostersLevel : guidanceLevel;
              const StageIcon = stageIcon;

              return (
                <>
                  <div className={`bg-gradient-to-r ${stageColor === 'orange' ? 'from-orange-900/30 to-blue-900/30' : stageColor === 'cyan' ? 'from-cyan-900/30 to-blue-900/30' : 'from-green-900/30 to-blue-900/30'} border-b border-gray-700 p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${stageColor === 'orange' ? 'bg-orange-600/20' : stageColor === 'cyan' ? 'bg-cyan-600/20' : 'bg-green-600/20'} flex items-center justify-center`}>
                          <StageIcon className={`w-6 h-6 ${stageColor === 'orange' ? 'text-orange-400' : stageColor === 'cyan' ? 'text-cyan-400' : 'text-green-400'}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                          {showStageInfoModal.charAt(0).toUpperCase() + showStageInfoModal.slice(1)} Stage Levels
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowStageInfoModal(null)}
                        className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-300 mb-4">
                      Progress through 5 levels by completing requirements. Each level unlocks more Launch Points and enhances your capabilities.
                    </p>

                    {stageData.map((level, index) => {
                      const isCurrentLevel = stageLevel === level.level;
                      const isCompleted = stageLevel > level.level;
                      const LevelIcon = iconMap[level.icon] || FileText;

                      return (
                        <div
                          key={level.level}
                          className={`border rounded-lg p-4 ${
                            isCurrentLevel
                              ? `${stageColor === 'orange' ? 'border-orange-500 bg-orange-900/10' : stageColor === 'cyan' ? 'border-cyan-500 bg-cyan-900/10' : 'border-green-500 bg-green-900/10'}`
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
                                    ? `${stageColor === 'orange' ? 'bg-orange-600/20' : stageColor === 'cyan' ? 'bg-cyan-600/20' : 'bg-green-600/20'}`
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
                                      isCurrentLevel ? `${stageColor === 'orange' ? 'text-orange-400' : stageColor === 'cyan' ? 'text-cyan-400' : 'text-green-400'}` : 'text-gray-400'
                                    }`}
                                  />
                                )}
                              </div>
                              <div>
                                <h4
                                  className={`font-semibold ${
                                    isCurrentLevel
                                      ? `${stageColor === 'orange' ? 'text-orange-400' : stageColor === 'cyan' ? 'text-cyan-400' : 'text-green-400'}`
                                      : isCompleted
                                      ? 'text-green-400'
                                      : 'text-white'
                                  }`}
                                >
                                  {level.name}
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
                                <p className={`text-xs mt-1 ${stageColor === 'orange' ? 'text-orange-400' : stageColor === 'cyan' ? 'text-cyan-400' : 'text-green-400'}`}>Current</p>
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

                    <div className={`${stageColor === 'orange' ? 'bg-orange-900/20 border-orange-700' : stageColor === 'cyan' ? 'bg-cyan-900/20 border-cyan-700' : 'bg-green-900/20 border-green-700'} border rounded-lg p-4 mt-4`}>
                      <p className={`text-sm ${stageColor === 'orange' ? 'text-orange-300' : stageColor === 'cyan' ? 'text-cyan-300' : 'text-green-300'}`}>
                        <span className="font-medium">💡 Tip:</span> Complete more levels to unlock additional Launch Points and enhanced capabilities!
                      </p>
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setShowStageInfoModal(null)}
                        className={`px-6 py-3 bg-gradient-to-r ${stageColor === 'orange' ? 'from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700' : stageColor === 'cyan' ? 'from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700' : 'from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'} text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]`}
                      >
                        Got It
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Launch Points Details Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Launch Points Overview</h3>
                </div>
                <button
                  onClick={() => setShowPointsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center mb-4">
                <p className="text-gray-300 text-sm mb-2">Your Total Points</p>
                <p className="text-4xl font-bold text-yellow-400">{formatPoints(totalPoints)}</p>
              </div>

              <p className="text-sm text-gray-300 text-center">
                Earn Launch Points by completing levels across all three stages. Each level unlocks new capabilities and brings you closer to launch readiness!
              </p>

              {/* Fuel Stage Points */}
              <div className="border border-orange-700/50 bg-orange-900/10 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                    <Fuel className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Fuel Stage</h4>
                    <p className="text-xs text-gray-400">Data Collection & Connection</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {FUEL_LEVELS.map((level) => (
                    <div key={level.level} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {fuelLevel >= level.level ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />
                        )}
                        <span className={fuelLevel >= level.level ? 'text-green-400' : 'text-gray-400'}>
                          {level.name}
                        </span>
                      </div>
                      <span className={fuelLevel >= level.level ? 'text-green-400 font-medium' : 'text-gray-500'}>
                        +{formatPoints(level.points)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boosters Stage Points */}
              <div className="border border-cyan-700/50 bg-cyan-900/10 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Boosters Stage</h4>
                    <p className="text-xs text-gray-400">AI Features & Capabilities</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {BOOSTERS_LEVELS.map((level) => (
                    <div key={level.level} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {boostersLevel >= level.level ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />
                        )}
                        <span className={boostersLevel >= level.level ? 'text-green-400' : 'text-gray-400'}>
                          {level.name}
                        </span>
                      </div>
                      <span className={boostersLevel >= level.level ? 'text-green-400 font-medium' : 'text-gray-500'}>
                        +{formatPoints(level.points)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guidance Stage Points */}
              <div className="border border-green-700/50 bg-green-900/10 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                    <Compass className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Guidance Stage</h4>
                    <p className="text-xs text-gray-400">Team Setup & Configuration</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {GUIDANCE_LEVELS.map((level) => (
                    <div key={level.level} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {guidanceLevel >= level.level ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />
                        )}
                        <span className={guidanceLevel >= level.level ? 'text-green-400' : 'text-gray-400'}>
                          {level.name}
                        </span>
                      </div>
                      <span className={guidanceLevel >= level.level ? 'text-green-400 font-medium' : 'text-gray-500'}>
                        +{formatPoints(level.points)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-300 text-center">
                  <span className="font-medium">Launch Requirements:</span> Fuel Level 1, Boosters Level 4, and Guidance Level 2
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowPointsModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
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
