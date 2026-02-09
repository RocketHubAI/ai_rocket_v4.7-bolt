import { Lightbulb, TrendingUp } from 'lucide-react';
import { TeamPulseInsights } from '../../types';

interface TeamPulseInsightsPanelProps {
  insights: TeamPulseInsights;
}

export function TeamPulseInsightsPanel({ insights }: TeamPulseInsightsPanelProps) {
  const { highlights, recommendations } = insights;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-md font-medium text-white">Insights</h3>
        </div>

        {highlights.length > 0 ? (
          <ul className="space-y-3">
            {highlights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{insight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No insights this week</p>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-md font-medium text-white">Trends</h3>
        </div>

        {recommendations.length > 0 ? (
          <ul className="space-y-3">
            {recommendations.map((trend, index) => (
              <li key={index} className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{trend}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No trends identified at this time</p>
        )}
      </div>
    </div>
  );
}
