import { Activity, Sparkles, RefreshCw, Info } from 'lucide-react';

interface TeamPulseEmptyStateProps {
  generating: boolean;
  isAdmin: boolean;
  onGenerate: () => void;
}

export function TeamPulseEmptyState({
  generating,
  isAdmin,
  onGenerate
}: TeamPulseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
          <Activity className="w-10 h-10 text-cyan-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2 text-center">
        Generate Your First Team Pulse
      </h2>
      <p className="text-slate-400 text-center max-w-md mb-6">
        Team Pulse provides a weekly snapshot of your team's health, progress, and insights.
        Generate your first pulse to see an AI-powered infographic of your team's status.
      </p>

      <div className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center max-w-lg mb-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-1">100</div>
            <div className="text-xs text-slate-400">Health Score</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-1">6</div>
            <div className="text-xs text-slate-400">Health Factors</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl mb-1">AI</div>
            <div className="text-xs text-slate-400">Infographic</div>
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={onGenerate}
            disabled={generating}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
              ${generating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 shadow-lg hover:shadow-cyan-500/20'
              }
            `}
          >
            <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Team Pulse'}
          </button>
        ) : (
          <p className="text-sm text-slate-500">
            Ask your team admin to generate the first Team Pulse
          </p>
        )}

        <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-800/30 border border-slate-700/50 rounded-lg max-w-md">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            Team Pulse automatically generates every Monday at 3:00 AM EST
          </p>
        </div>
      </div>
    </div>
  );
}
