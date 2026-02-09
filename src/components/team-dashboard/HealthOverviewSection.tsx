import React from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, HelpCircle, Lightbulb } from 'lucide-react';
import type { HealthOverview, HealthFactor } from '../../hooks/useTeamDashboard';

interface HealthOverviewSectionProps {
  data: HealthOverview;
}

function OverallHealthGauge({ score }: { score: number }) {
  const getConfig = (score: number) => {
    if (score >= 80) return { color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-400', label: 'Excellent' };
    if (score >= 60) return { color: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Good' };
    if (score >= 40) return { color: '#f59e0b', bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Fair' };
    return { color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-400', label: 'Needs Attention' };
  };

  const config = getConfig(score);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${config.text}`}>{score}</span>
          <span className="text-xs text-gray-400">Health Score</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-medium ${config.text}`}>{config.label}</span>
    </div>
  );
}

const defaultExplanations: Record<string, string> = {
  'Data Richness': 'Measures how comprehensive your connected data is across all document categories.',
  'Goal Progress': 'Overall progress toward your documented goals, OKRs, and key targets.',
  'Team Engagement': 'Level of team collaboration and communication activity based on meetings and documents.',
  'Meeting Cadence': 'Consistency and regularity of team meetings and check-ins.',
  'Financial Health': 'Financial trajectory, revenue metrics, and resource management indicators.',
  'Risk Indicators': 'Presence of blockers, risks, or concerns that may impact team progress.'
};

function FactorBar({ factor }: { factor: HealthFactor }) {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const TrendIcon = factor.trend === 'up' ? TrendingUp : factor.trend === 'down' ? TrendingDown : Minus;
  const trendColor = factor.trend === 'up' ? 'text-green-400' : factor.trend === 'down' ? 'text-red-400' : 'text-gray-400';
  const explanation = factor.explanation || defaultExplanations[factor.name] || `${factor.name} score based on team data analysis.`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{factor.name}</span>
          <div className="group relative">
            <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-xs text-gray-300 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 w-52 border border-gray-700 whitespace-normal">
              {explanation}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{factor.score}</span>
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
        </div>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getBarColor(factor.score)}`}
          style={{ width: `${factor.score}%` }}
        />
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: HealthOverview['trend_vs_previous'] }) {
  const config = {
    improving: { icon: TrendingUp, color: 'text-green-400 bg-green-500/10 border-green-500/30', label: 'Improving' },
    declining: { icon: TrendingDown, color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'Declining' },
    stable: { icon: Minus, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Stable' },
    first_snapshot: { icon: Activity, color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', label: 'First Snapshot' }
  };

  const { icon: Icon, color, label } = config[trend];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export const HealthOverviewSection: React.FC<HealthOverviewSectionProps> = ({ data }) => {
  const validFactors = data.factors.filter(f => f.score !== null && f.score !== undefined);

  const calculatedScore = validFactors.length > 0
    ? Math.round(validFactors.reduce((sum, f) => sum + f.score, 0) / validFactors.length)
    : data.overall_score;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Team Health</h3>
        </div>
        <TrendBadge trend={data.trend_vs_previous} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {calculatedScore !== null && (
          <div className="flex-shrink-0 flex justify-center">
            <OverallHealthGauge score={calculatedScore} />
          </div>
        )}

        <div className="flex-1 space-y-4">
          {validFactors.map((factor, index) => (
            <FactorBar key={factor.name || index} factor={factor} />
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-700 space-y-4">
        {data.explanation && (
          <p className="text-sm text-gray-300">{data.explanation}</p>
        )}

        {data.recommendations && data.recommendations.length > 0 && (
          <div className="bg-gray-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">Recommendations</span>
            </div>
            <ul className="space-y-1.5">
              {data.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-gray-300">
                  <span className="text-amber-400 mt-0.5">-</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
