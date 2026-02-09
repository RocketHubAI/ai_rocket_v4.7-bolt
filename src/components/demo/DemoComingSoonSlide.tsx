import React from 'react';
import { Brain, Bot, Compass, Search, Target, Sparkles, Clock } from 'lucide-react';
import { DEMO_COMING_SOON } from '../../data/demoData';

interface DemoComingSoonSlideProps {
  onClose: () => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Brain,
  Bot,
  Compass,
  Search,
  Target,
};

const colorVariants = [
  { bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: 'text-teal-400' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/20', icon: 'text-pink-400' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'text-orange-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: 'text-sky-400' },
];

export const DemoComingSoonSlide: React.FC<DemoComingSoonSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 flex flex-col h-full">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-pink-500/20 text-pink-400 rounded-full mb-2 flex items-center gap-1 mx-auto w-fit">
          <Sparkles className="w-3 h-3" />
          Roadmap
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Coming Soon
        </h2>
        <p className="text-sm text-gray-400">
          Exciting features on our roadmap
        </p>
      </div>

      <div className="max-w-5xl mx-auto flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {DEMO_COMING_SOON.map((feature, index) => {
            const Icon = iconMap[feature.icon];
            const colors = colorVariants[index % colorVariants.length];

            return (
              <div
                key={feature.title}
                className={`${colors.bg} border ${colors.border} rounded-xl p-4 relative overflow-hidden`}
              >
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-900/50 rounded-full text-[10px] text-gray-400">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Soon</span>
                  </div>
                </div>

                <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mb-3`}>
                  {Icon && <Icon className={`w-5 h-5 ${colors.icon}`} />}
                </div>

                <h3 className="text-sm font-semibold text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          Have a feature request? Let us know after you sign up!
        </p>
      </div>
    </div>
  );
};
