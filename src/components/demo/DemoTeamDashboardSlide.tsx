import React from 'react';
import { LayoutDashboard, Target, CheckCircle, AlertTriangle, Heart, Compass, TrendingUp, Sparkles, Calendar } from 'lucide-react';

interface DemoTeamDashboardSlideProps {
  onClose: () => void;
}

const demoGoals = [
  { name: 'Q1 Revenue Target', progress: 78, status: 'on_track' as const, type: 'Goal' },
  { name: 'Customer Acquisition', progress: 65, status: 'at_risk' as const, type: 'OKR' },
  { name: 'Product Launch v2.0', progress: 92, status: 'on_track' as const, type: 'Milestone' },
  { name: 'Team Expansion', progress: 40, status: 'on_track' as const, type: 'Project' },
];

const statusConfig = {
  on_track: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  at_risk: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
};

const alignmentItems = [
  { label: 'Mission Clarity', score: 92 },
  { label: 'Values Alignment', score: 88 },
  { label: 'Strategy Execution', score: 75 },
];

export const DemoTeamDashboardSlide: React.FC<DemoTeamDashboardSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-sky-500/20 text-sky-400 rounded-full mb-2 flex items-center gap-1 mx-auto w-fit">
          <Sparkles className="w-3 h-3" />
          Daily AI Insights
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Team Dashboard
        </h2>
        <p className="text-base text-gray-400 max-w-xl mx-auto">
          AI-powered daily metrics on goals, alignment, and team health
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Goals Progress</h3>
          </div>
          <div className="space-y-3 flex-1">
            {demoGoals.map((goal, i) => {
              const config = statusConfig[goal.status];
              return (
                <div key={i} className={`${config.bg} border ${config.border} rounded-lg p-2.5`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                        {goal.type}
                      </span>
                      <span className={`text-[10px] ${config.color}`}>
                        {goal.status === 'on_track' ? 'On Track' : 'At Risk'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white">{goal.progress}%</span>
                  </div>
                  <p className="text-xs text-white mb-1.5">{goal.name}</p>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${goal.status === 'on_track' ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Compass className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Mission Alignment</h3>
          </div>
          <div className="space-y-4 flex-1">
            {alignmentItems.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{item.label}</span>
                  <span className="text-sm font-bold text-white">{item.score}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-auto p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed">
                  "Team shows strong alignment with core mission values. Strategy execution improving week-over-week."
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Team Health</h3>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center border-4 border-emerald-500/30">
                <div className="text-center">
                  <span className="text-2xl font-bold text-emerald-400">85</span>
                  <span className="text-xs text-emerald-400 block">/ 100</span>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <span className="text-lg font-bold text-white">4</span>
              <span className="text-[10px] text-gray-400 block">Goals On Track</span>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <span className="text-lg font-bold text-white">12</span>
              <span className="text-[10px] text-gray-400 block">Tasks Complete</span>
            </div>
          </div>

          <div className="mt-auto pt-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Updated daily at 6:00 AM</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          Astra analyzes your team data daily and delivers fresh insights each morning
        </p>
      </div>
    </div>
  );
};
