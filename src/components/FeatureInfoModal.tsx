import { X, Lightbulb, ArrowRight } from 'lucide-react';
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

const colorMap: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', gradient: 'from-cyan-500 to-cyan-600' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', gradient: 'from-blue-500 to-blue-600' },
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', gradient: 'from-amber-500 to-amber-600' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', gradient: 'from-purple-500 to-purple-600' },
  teal: { bg: 'bg-teal-500/20', border: 'border-teal-500/30', text: 'text-teal-400', gradient: 'from-teal-500 to-teal-600' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400', gradient: 'from-pink-500 to-pink-600' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', gradient: 'from-orange-500 to-orange-600' }
};

const featureTips: Record<string, string[]> = {
  'mission-control': [
    'Track your team\'s progress through the Fuel, Boosters, and Guidance stages',
    'Earn Launch Points by completing activities and achievements',
    'Monitor your document sync status and team statistics'
  ],
  'private': [
    'Ask questions about your synced business documents',
    'Get personalized insights based on your company data',
    'Conversations are private and not shared with team members'
  ],
  'reports': [
    'Create one-time manual reports or schedule recurring ones',
    'Reports use your synced data for accurate insights',
    'Receive report summaries via email on your schedule'
  ],
  'team': [
    'Collaborate with team members in real-time',
    '@mention Astra to get AI-powered responses visible to all',
    'Share insights and discuss findings together'
  ],
  'visualizations': [
    'Generate charts and graphs from your conversations',
    'Save visualizations for quick access later',
    'Export visualizations to PDF for presentations'
  ],
  'ai-specialists': [
    'Create AI personas for different business functions',
    'Get specialized advice from your virtual team',
    'Each specialist understands your business context'
  ],
  'team-agents': [
    'Build custom workflows that run automatically',
    'Agents can monitor, analyze, and report on your behalf',
    'Set up triggers and actions without coding'
  ],
  'team-guidance': [
    'Create living documents that guide your team',
    'AI helps keep guidance up-to-date with your business',
    'New team members get up to speed faster'
  ]
};

interface FeatureInfoModalProps {
  feature: TabConfig;
  isOpen: boolean;
  onClose: () => void;
  onOpenFeature?: () => void;
}

export default function FeatureInfoModal({
  feature,
  isOpen,
  onClose,
  onOpenFeature
}: FeatureInfoModalProps) {
  if (!isOpen) return null;

  const IconComponent = iconMap[feature.icon];
  const colors = colorMap[feature.color] || colorMap.cyan;
  const tips = featureTips[feature.id] || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-700 overflow-hidden">
        <div className={`bg-gradient-to-r ${colors.gradient} p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {IconComponent && <IconComponent className="w-7 h-7 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{feature.label}</h2>
                {feature.isComingSoon && (
                  <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                    Coming Soon
                  </span>
                )}
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

          {tips.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-medium text-white">Tips & Use Cases</h4>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('/20', '')} mt-1.5 flex-shrink-0`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            {onOpenFeature && !feature.isComingSoon && (
              <button
                onClick={() => {
                  onOpenFeature();
                  onClose();
                }}
                className={`flex-1 py-2.5 bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white rounded-lg font-medium transition-opacity flex items-center justify-center gap-2`}
              >
                Open
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
