import React from 'react';
import { Activity, Heart, TrendingUp, Users, Sparkles, Calendar, Download, Palette, Lightbulb } from 'lucide-react';

interface DemoTeamPulseSlideProps {
  onClose: () => void;
}

const designStyles = [
  { name: 'Pixel Power', color: 'from-cyan-500 to-blue-500' },
  { name: 'Neon Noir', color: 'from-pink-500 to-purple-500' },
  { name: 'Botanical Garden', color: 'from-emerald-500 to-green-500' },
  { name: 'Interstellar', color: 'from-blue-500 to-indigo-500' },
];

const pulseMetrics = [
  { label: 'Team Health', value: 87, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  { label: 'Engagement', value: 92, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { label: 'Momentum', value: 78, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
];

const insights = [
  'Strong collaboration observed across all departments this week',
  'Project completion rate up 15% from last week',
  'Team sentiment trending positive with high engagement',
];

export const DemoTeamPulseSlide: React.FC<DemoTeamPulseSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full mb-2 flex items-center gap-1 mx-auto w-fit">
          <Activity className="w-3 h-3" />
          Weekly Health Report
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Team Pulse
        </h2>
        <p className="text-base text-gray-400 max-w-xl mx-auto">
          AI-generated infographic showing your team's weekly health and insights
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-5xl mx-auto w-full">
        <div className="lg:w-3/5 bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-700 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-white">Weekly Pulse</span>
              </div>
              <span className="text-xs text-gray-400">Jan 13 - Jan 19, 2026</span>
            </div>

            <div className="text-center py-6">
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center border-4 border-cyan-500/40">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-white">87</span>
                    <span className="text-xs text-cyan-400 block">Health Score</span>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {pulseMetrics.map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <div key={i} className={`${metric.bg} rounded-xl p-3 text-center`}>
                    <Icon className={`w-5 h-5 ${metric.color} mx-auto mb-1`} />
                    <span className="text-xl font-bold text-white block">{metric.value}%</span>
                    <span className="text-[10px] text-gray-400">{metric.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-white">Key Insights</span>
              </div>
              <ul className="space-y-1">
                {insights.map((insight, i) => (
                  <li key={i} className="text-[11px] text-gray-400 flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">-</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:w-2/5 space-y-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">12 Design Styles</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Each week, choose from creative AI-generated designs or let Astra surprise you
            </p>
            <div className="grid grid-cols-2 gap-2">
              {designStyles.map((style, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg border border-gray-600 bg-gray-700/30"
                >
                  <div className={`h-1.5 rounded-full bg-gradient-to-r ${style.color} mb-1.5`} />
                  <span className="text-[10px] text-gray-300">{style.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Features</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>AI-generated infographic each week</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Auto-generates every Monday at 3 AM</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Download className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Download & share with your team</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Heart className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Team health score & trends</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-center">
            <span className="text-xs text-gray-400">Powered by</span>
            <span className="text-sm font-medium text-white block">Gemini AI Image Generation</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          Beautiful, shareable infographics that showcase your team's progress
        </p>
      </div>
    </div>
  );
};
