import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Palette, Layers, Check } from 'lucide-react';

interface StepConfig {
  id: string;
  label: string;
  icon: typeof Layers;
  activeColor: string;
  bgColor: string;
  duration: number;
}

interface GeneratingStateProps {
  isPresentation?: boolean;
  slideCount?: number;
}

const getSteps = (isPresentation: boolean): StepConfig[] => {
  const multiplier = isPresentation ? 2 : 1;

  return [
    {
      id: 'gathering',
      label: 'Gathering Data',
      icon: Layers,
      activeColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500',
      duration: 15000 * multiplier
    },
    {
      id: 'generating',
      label: 'Generating Content',
      icon: Sparkles,
      activeColor: 'text-teal-400',
      bgColor: 'bg-teal-500',
      duration: 25000 * multiplier
    },
    {
      id: 'applying',
      label: 'Applying Style',
      icon: Palette,
      activeColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500',
      duration: 20000 * multiplier
    }
  ];
};

export function GeneratingState({ isPresentation = false, slideCount = 1 }: GeneratingStateProps) {
  const STEPS = getSteps(isPresentation);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let totalDuration = 0;
    let newStepIndex = 0;

    for (let i = 0; i < STEPS.length; i++) {
      if (elapsedTime < totalDuration + STEPS[i].duration) {
        newStepIndex = i;
        const stepElapsed = elapsedTime - totalDuration;
        const progress = Math.min((stepElapsed / STEPS[i].duration) * 100, 100);
        setStepProgress(progress);
        break;
      }
      totalDuration += STEPS[i].duration;
      newStepIndex = i;

      if (i === STEPS.length - 1) {
        setStepProgress(100);
      }
    }

    setCurrentStepIndex(newStepIndex);
  }, [elapsedTime]);

  const getStepStatus = (index: number): 'completed' | 'active' | 'pending' => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="py-12">
      <div className="flex flex-col items-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-teal-500/30 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">Creating Your Visualization</h3>
        <p className="text-gray-400 text-center max-w-md mb-8">
          {currentStepIndex === 0 && "Analyzing your team's data and finding relevant insights..."}
          {currentStepIndex === 1 && "Crafting your personalized content with AI..."}
          {currentStepIndex === 2 && "Adding finishing touches and styling..."}
        </p>

        <div className="w-full max-w-lg mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => {
              const status = getStepStatus(index);
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        status === 'completed'
                          ? `${step.bgColor} shadow-lg shadow-${step.bgColor}/30`
                          : status === 'active'
                          ? `${step.bgColor}/20 ring-2 ring-${step.bgColor}/50`
                          : 'bg-gray-800'
                      }`}
                    >
                      {status === 'completed' ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : status === 'active' ? (
                        <div className="relative">
                          <Icon className={`w-6 h-6 ${step.activeColor}`} />
                          <Loader2 className={`w-3 h-3 ${step.activeColor} animate-spin absolute -bottom-1 -right-1`} />
                        </div>
                      ) : (
                        <Icon className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                  </div>

                  <span className={`text-xs mt-2 font-medium transition-colors ${
                    status === 'completed'
                      ? step.activeColor
                      : status === 'active'
                      ? 'text-white'
                      : 'text-gray-600'
                  }`}>
                    {step.label}
                  </span>

                  {status === 'active' && (
                    <div className="w-16 h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full ${step.bgColor} transition-all duration-100 ease-linear rounded-full`}
                        style={{ width: `${stepProgress}%` }}
                      />
                    </div>
                  )}
                  {status === 'completed' && (
                    <div className="w-16 h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${step.bgColor} w-full rounded-full`} />
                    </div>
                  )}
                  {status === 'pending' && (
                    <div className="w-16 h-1 bg-gray-800 rounded-full mt-2" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between px-4 mt-4">
            {STEPS.map((step, index) => {
              const status = getStepStatus(index);
              return (
                <div key={`connector-${step.id}`} className="flex-1 flex items-center">
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded transition-colors duration-300 ${
                      status === 'completed' ? 'bg-gradient-to-r from-cyan-500 to-teal-500' : 'bg-gray-800'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
          <span className="text-gray-700">|</span>
          <span>
            {isPresentation
              ? slideCount >= 5 ? '5 & 7 slide presentations may take up to 5 minutes or more' : 'Usually takes 2-3 minutes'
              : 'Usually takes 60-90 seconds total'}
          </span>
        </div>
      </div>
    </div>
  );
}
