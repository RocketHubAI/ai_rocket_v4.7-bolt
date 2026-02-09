import React from 'react';
import { Fuel, Zap, Compass, Lock, CheckCircle } from 'lucide-react';
import { StageProgress } from '../../hooks/useLaunchPreparation';

interface StageProgressBarProps {
  fuelProgress: StageProgress | null;
  boostersProgress: StageProgress | null;
  guidanceProgress: StageProgress | null;
  currentStage: 'fuel' | 'boosters' | 'guidance';
  onStageClick: (stage: 'fuel' | 'boosters' | 'guidance') => void;
}

export const StageProgressBar: React.FC<StageProgressBarProps> = ({
  fuelProgress,
  boostersProgress,
  guidanceProgress,
  currentStage,
  onStageClick
}) => {
  const boostersIsNew = (fuelProgress?.level ?? 0) >= 1 && (boostersProgress?.level ?? 0) === 0;
  const guidanceIsNew = (fuelProgress?.level ?? 0) >= 1 && (boostersProgress?.level ?? 0) >= 4 && (guidanceProgress?.level ?? 0) === 0;

  const stages = [
    {
      id: 'fuel' as const,
      name: 'Fuel',
      icon: Fuel,
      progress: fuelProgress,
      color: 'orange',
      unlocked: true,
      isNew: false,
      minRequirement: 1
    },
    {
      id: 'boosters' as const,
      name: 'Boosters',
      icon: Zap,
      progress: boostersProgress,
      color: 'blue',
      unlocked: (fuelProgress?.level ?? 0) >= 1,
      isNew: boostersIsNew,
      minRequirement: 4
    },
    {
      id: 'guidance' as const,
      name: 'Guidance',
      icon: Compass,
      progress: guidanceProgress,
      color: 'purple',
      unlocked: (fuelProgress?.level ?? 0) >= 1 && (boostersProgress?.level ?? 0) >= 4,
      isNew: guidanceIsNew,
      minRequirement: 2
    }
  ];

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isActive = currentStage === stage.id;
            const level = stage.progress?.level ?? 0;
            const maxLevel = 5;
            const progressPercent = (level / maxLevel) * 100;

            return (
              <button
                key={stage.id}
                onClick={() => stage.unlocked && onStageClick(stage.id)}
                disabled={!stage.unlocked}
                className={`
                  flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all touch-manipulation
                  ${isActive
                    ? stage.color === 'orange'
                      ? 'bg-orange-500/20 border-2 border-orange-500'
                      : stage.color === 'blue'
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : 'bg-purple-500/20 border-2 border-purple-500'
                    : stage.unlocked
                      ? 'bg-gray-700/50 border-2 border-gray-600 hover:border-gray-500'
                      : 'bg-gray-800/30 border-2 border-gray-700/50 opacity-50'
                  }
                  ${stage.unlocked ? 'cursor-pointer' : 'cursor-not-allowed'}
                `}
              >
                <div className="relative flex-shrink-0">
                  <svg className="w-9 h-9 sm:w-11 sm:h-11 transform -rotate-90" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-gray-600"
                    />
                    {stage.unlocked && (
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 20}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - progressPercent / 100)}
                        className={
                          stage.color === 'orange'
                            ? 'text-orange-500'
                            : stage.color === 'blue'
                              ? 'text-blue-500'
                              : 'text-purple-500'
                        }
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {!stage.unlocked ? (
                      <Lock className="w-4 h-4 text-gray-500" />
                    ) : level === maxLevel ? (
                      <CheckCircle className={`w-4 h-4 ${
                        stage.color === 'orange' ? 'text-orange-400' :
                        stage.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                      }`} />
                    ) : (
                      <Icon className={`w-4 h-4 ${
                        stage.color === 'orange' ? 'text-orange-400' :
                        stage.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                      }`} />
                    )}
                  </div>
                </div>

                <div className="flex-1 text-left min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-white text-xs sm:text-sm truncate">{stage.name}</span>
                    {stage.isNew && (
                      <span className="px-1 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[8px] sm:text-[10px] font-bold rounded uppercase flex-shrink-0">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] sm:text-xs ${stage.unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stage.unlocked ? `Level ${level}/${maxLevel}` : 'Locked'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
