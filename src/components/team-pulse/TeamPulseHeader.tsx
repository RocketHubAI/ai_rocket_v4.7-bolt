import { Activity, RefreshCw, Clock, Calendar, Settings } from 'lucide-react';
import { TeamPulseSettings } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface TeamPulseHeaderProps {
  lastGeneratedAt: string | null;
  settings: TeamPulseSettings | null;
  generating: boolean;
  isAdmin: boolean;
  onGenerate: () => void;
  onCustomize: () => void;
}

export function TeamPulseHeader({
  lastGeneratedAt,
  settings,
  generating,
  isAdmin,
  onGenerate,
  onCustomize
}: TeamPulseHeaderProps) {
  const formatLastGenerated = () => {
    if (!lastGeneratedAt) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastGeneratedAt), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const formatNextGeneration = () => {
    if (!settings?.next_generation_at) return 'Not scheduled';
    try {
      const nextDate = new Date(settings.next_generation_at);
      const dateStr = nextDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return `Mon, ${dateStr} at 3AM EST`;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Team Pulse</h1>
              <p className="text-sm text-slate-400">
                A Weekly Snapshot of Team Health, Progress and Insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end text-xs text-slate-500 gap-0.5">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Updated {formatLastGenerated()}</span>
              </div>
              {settings?.next_generation_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Next: {formatNextGeneration()}</span>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onCustomize}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white rounded-lg text-sm transition-colors"
                  title="Customize Team Pulse style and settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Customize</span>
                </button>
                <button
                  onClick={() => {
                    console.log('[TeamPulseHeader] Generate button clicked');
                    onGenerate();
                  }}
                  disabled={generating}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${generating
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600'
                    }
                  `}
                >
                  <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Generating...' : 'Generate Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
