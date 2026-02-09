import { X, Clock, Sparkles } from 'lucide-react';
import {
  Rocket,
  MessageSquare,
  FileBarChart,
  Users,
  BarChart3,
  Brain,
  Bot,
  Compass,
  Crown,
  Zap,
  Link2
} from 'lucide-react';
import { TabConfig } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  MessageSquare,
  FileBarChart,
  Users,
  BarChart3,
  Brain,
  Bot,
  Compass,
  Crown,
  Zap,
  Link2
};

const colorMap: Record<string, string> = {
  cyan: 'from-cyan-500 to-cyan-600',
  blue: 'from-blue-500 to-blue-600',
  amber: 'from-amber-500 to-amber-600',
  emerald: 'from-emerald-500 to-emerald-600',
  purple: 'from-purple-500 to-purple-600',
  teal: 'from-teal-500 to-teal-600',
  pink: 'from-pink-500 to-pink-600',
  orange: 'from-orange-500 to-orange-600'
};

interface ComingSoonModalProps {
  feature: TabConfig;
  isOpen: boolean;
  onClose: () => void;
}

export default function ComingSoonModal({ feature, isOpen, onClose }: ComingSoonModalProps) {
  if (!isOpen) return null;

  const IconComponent = iconMap[feature.icon];
  const gradientClass = colorMap[feature.color] || 'from-slate-500 to-slate-600';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-700 overflow-hidden">
        <div className={`bg-gradient-to-r ${gradientClass} p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {IconComponent && <IconComponent className="w-7 h-7 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{feature.label}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-sm text-white/80">Coming Soon</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-300 leading-relaxed">
            {feature.description}
          </p>

          <div className="mt-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white mb-1">
                  We're building something amazing
                </h4>
                <p className="text-sm text-slate-400">
                  This feature is currently in development. We're working hard to bring you
                  the best possible experience. Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
