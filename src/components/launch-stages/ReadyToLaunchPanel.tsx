import React, { useState } from 'react';
import { Rocket, Fuel, Zap, Compass, CheckCircle, Lock } from 'lucide-react';
import { StageProgress } from '../../hooks/useLaunchPreparation';
import { calculateStageProgress, formatPoints } from '../../lib/launch-preparation-utils';
import { LaunchPreparationHeader } from './LaunchPreparationHeader';

interface ReadyToLaunchPanelProps {
  fuelProgress: StageProgress | null;
  boostersProgress: StageProgress | null;
  guidanceProgress: StageProgress | null;
  totalPoints: number;
  onNavigateToStage: (stage: 'fuel' | 'boosters' | 'guidance') => void;
  onLaunch: () => void;
  onExit?: () => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

export const ReadyToLaunchPanel: React.FC<ReadyToLaunchPanelProps> = ({
  fuelProgress,
  boostersProgress,
  guidanceProgress,
  totalPoints,
  onNavigateToStage,
  onLaunch,
  onExit,
  onOpenHelpCenter
}) => {
  const [launching, setLaunching] = useState(false);

  const handleExit = () => {
    if (onExit) {
      onExit();
    }
  };

  const fuelLevel = fuelProgress?.level || 0;
  const boostersLevel = boostersProgress?.level || 0;
  const guidanceLevel = guidanceProgress?.level || 0;

  const fuelPercent = calculateStageProgress(fuelProgress);
  const boostersPercent = calculateStageProgress(boostersProgress);
  const guidancePercent = calculateStageProgress(guidanceProgress);

  // Launch requirements: Fuel 1, Boosters 4, Guidance 2
  const fuelRequirementMet = fuelLevel >= 1;
  const boostersRequirementMet = boostersLevel >= 4;
  const guidanceRequirementMet = guidanceLevel >= 2;
  const canLaunch = fuelRequirementMet && boostersRequirementMet && guidanceRequirementMet;

  const handleLaunch = () => {
    if (!canLaunch) {
      alert('Complete the minimum requirements before launching:\n• Fuel: Level 1\n• Boosters: Level 4\n• Guidance: Level 2');
      return;
    }

    if (confirm('🚀 Are you ready to launch your AI Rocket?\n\nYou\'ll enter the main application and can continue leveling up through Mission Control.')) {
      setLaunching(true);
      setTimeout(() => {
        onLaunch();
      }, 2000);
    }
  };

  const stages = [
    {
      id: 'fuel' as const,
      name: 'Fuel',
      description: 'Connect your data sources',
      icon: Fuel,
      color: 'orange',
      level: fuelLevel,
      progress: fuelPercent,
      points: fuelProgress?.points_earned || 0,
      requiredLevel: 1,
      requirementMet: fuelRequirementMet,
      bgGradient: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      buttonBg: 'bg-orange-500/20 hover:bg-orange-500/30',
      buttonText: 'text-orange-400',
      progressBar: 'from-orange-500 to-orange-400'
    },
    {
      id: 'boosters' as const,
      name: 'Boosters',
      description: 'Accelerate with automation',
      icon: Zap,
      color: 'cyan',
      level: boostersLevel,
      progress: boostersPercent,
      points: boostersProgress?.points_earned || 0,
      requiredLevel: 4,
      requirementMet: boostersRequirementMet,
      bgGradient: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      buttonBg: 'bg-cyan-500/20 hover:bg-cyan-500/30',
      buttonText: 'text-cyan-400',
      progressBar: 'from-cyan-500 to-cyan-400'
    },
    {
      id: 'guidance' as const,
      name: 'Guidance',
      description: 'Navigate with intelligence',
      icon: Compass,
      color: 'green',
      level: guidanceLevel,
      progress: guidancePercent,
      points: guidanceProgress?.points_earned || 0,
      requiredLevel: 2,
      requirementMet: guidanceRequirementMet,
      bgGradient: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      buttonBg: 'bg-green-500/20 hover:bg-green-500/30',
      buttonText: 'text-green-400',
      progressBar: 'from-green-500 to-green-400'
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

      <div className="pt-16 px-4 pb-8 h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto py-8">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Mission Control
            </h2>
            <p className="text-gray-400 text-base md:text-lg">
              {canLaunch ? 'Ready for Launch' : 'Launch Preparation'}
            </p>
          </div>

          {/* Launch Status Bar */}
          <div className="mb-8 flex flex-col md:flex-row items-center justify-center gap-4 max-w-4xl mx-auto">
            {/* Launch Points Box */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-6 py-4 min-w-[180px]">
              <p className="text-gray-400 text-sm mb-1 text-center">Launch Points</p>
              <p className="text-3xl font-bold text-yellow-400 text-center">{formatPoints(totalPoints)}</p>
            </div>

            {/* Requirements Checklist Box */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-6 py-4 flex items-center space-x-6">
              {/* Fuel Requirement */}
              <div className="flex items-center space-x-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  fuelRequirementMet ? 'bg-orange-500/20' : 'bg-gray-700/50'
                }`}>
                  <Fuel className={`w-5 h-5 ${fuelRequirementMet ? 'text-orange-400' : 'text-gray-500'}`} />
                </div>
                <CheckCircle className={`w-5 h-5 transition-colors ${
                  fuelRequirementMet ? 'text-green-400' : 'text-gray-600'
                }`} />
              </div>

              {/* Boosters Requirement */}
              <div className="flex items-center space-x-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  boostersRequirementMet ? 'bg-cyan-500/20' : 'bg-gray-700/50'
                }`}>
                  <Zap className={`w-5 h-5 ${boostersRequirementMet ? 'text-cyan-400' : 'text-gray-500'}`} />
                </div>
                <CheckCircle className={`w-5 h-5 transition-colors ${
                  boostersRequirementMet ? 'text-green-400' : 'text-gray-600'
                }`} />
              </div>

              {/* Guidance Requirement */}
              <div className="flex items-center space-x-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  guidanceRequirementMet ? 'bg-green-500/20' : 'bg-gray-700/50'
                }`}>
                  <Compass className={`w-5 h-5 ${guidanceRequirementMet ? 'text-green-400' : 'text-gray-500'}`} />
                </div>
                <CheckCircle className={`w-5 h-5 transition-colors ${
                  guidanceRequirementMet ? 'text-green-400' : 'text-gray-600'
                }`} />
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleLaunch}
              disabled={!canLaunch || launching}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg
                transition-all transform relative overflow-hidden
                flex items-center space-x-3
                ${!canLaunch
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                  : launching
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white cursor-wait scale-95'
                  : 'bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 text-white hover:scale-105 hover:shadow-[0_0_40px_rgba(147,51,234,0.6)] shadow-[0_0_20px_rgba(147,51,234,0.4)] animate-pulse'
                }
                ${canLaunch && !launching ? 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000' : ''}
              `}
            >
              <span className="relative z-10 flex items-center space-x-2">
                <Rocket className="w-6 h-6" />
                <span>{launching ? 'Launching...' : 'Launch AI Rocket'}</span>
              </span>
            </button>
          </div>

          {/* Stage Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stages.map((stage) => {
              const Icon = stage.icon;

              return (
                <button
                  key={stage.id}
                  onClick={() => onNavigateToStage(stage.id)}
                  className={`
                    relative group
                    bg-gradient-to-br ${stage.bgGradient}
                    border-2 ${stage.borderColor}
                    rounded-2xl p-6
                    transition-all hover:scale-105 hover:shadow-xl
                    cursor-pointer
                  `}
                >
                  {/* Requirement Badge */}
                  <div className="absolute top-4 right-4">
                    {stage.requirementMet ? (
                      <div className="flex items-center space-x-1 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 bg-gray-700/50 border border-gray-600 rounded-full px-3 py-1">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-400">Level {stage.requiredLevel} Required</span>
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`w-20 h-20 mx-auto mb-4 ${stage.iconBg} rounded-2xl flex items-center justify-center`}>
                    <Icon className={`w-10 h-10 ${stage.iconColor}`} />
                  </div>

                  {/* Stage Info */}
                  <h3 className="text-xl font-bold text-white mb-1">{stage.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{stage.description}</p>

                  {/* Level Badge */}
                  <div className="inline-block mb-3 px-3 py-1 bg-gray-800/50 rounded-full">
                    <span className="text-sm font-semibold text-white">
                      Level {stage.level}/5
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
                    <div
                      className={`h-full bg-gradient-to-r ${stage.progressBar} transition-all duration-500`}
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>

                  {/* Points */}
                  <p className="text-xs text-gray-400">
                    {formatPoints(stage.points)} points
                  </p>

                  {/* Hover hint */}
                  <div className={`mt-4 pt-3 border-t ${stage.borderColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <p className={`text-sm font-medium ${stage.buttonText}`}>
                      {stage.level >= 5 ? '✓ Maxed Out' : 'Click to Level Up →'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
