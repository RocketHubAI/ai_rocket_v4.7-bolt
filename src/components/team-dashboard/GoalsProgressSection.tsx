import React, { useState } from 'react';
import { Target, CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp, FileText, User, Calendar, Lightbulb } from 'lucide-react';
import type { GoalsProgress, GoalItem } from '../../hooks/useTeamDashboard';

interface GoalsProgressSectionProps {
  data: GoalsProgress;
}

const statusConfig: Record<GoalItem['status'], { color: string; bg: string; icon: typeof CheckCircle; label: string }> = {
  on_track: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle, label: 'On Track' },
  at_risk: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle, label: 'At Risk' },
  blocked: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle, label: 'Blocked' },
  not_started: { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30', icon: Clock, label: 'Not Started' },
  completed: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: CheckCircle, label: 'Completed' }
};

const typeLabels: Record<GoalItem['type'], string> = {
  goal: 'Goal',
  okr: 'OKR',
  target: 'Target',
  milestone: 'Milestone',
  project: 'Project',
  kpi: 'KPI'
};

function normalizeStatus(status: string): GoalItem['status'] {
  const normalized = (status || 'not_started').toLowerCase().replace(/\s+/g, '_');
  if (normalized in statusConfig) {
    return normalized as GoalItem['status'];
  }
  return 'not_started';
}

function GoalCard({ goal }: { goal: GoalItem }) {
  const [expanded, setExpanded] = useState(false);
  const normalizedStatus = normalizeStatus(goal.status);
  const config = statusConfig[normalizedStatus];
  const StatusIcon = config.icon;
  const hasDetails = goal.notes || goal.owner || goal.deadline || goal.source_reference;

  return (
    <div className={`rounded-lg border p-3 ${config.bg} transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
              {typeLabels[goal.type] || 'Goal'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${config.bg}`}>
              <StatusIcon className={`w-3 h-3 ${config.color}`} />
              <span className={config.color}>{config.label}</span>
            </span>
          </div>
          <h4 className="font-medium text-white text-sm leading-tight">{goal.name}</h4>
        </div>
        {goal.progress_percentage !== null && (
          <div className="flex-shrink-0 text-right">
            <span className="text-xl font-bold text-white">{goal.progress_percentage}%</span>
          </div>
        )}
      </div>

      {goal.progress_percentage !== null && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                goal.status === 'completed' ? 'bg-blue-500' :
                goal.status === 'on_track' ? 'bg-green-500' :
                goal.status === 'at_risk' ? 'bg-yellow-500' :
                goal.status === 'blocked' ? 'bg-red-500' : 'bg-gray-500'
              }`}
              style={{ width: `${goal.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-2 text-sm">
          {goal.notes ? (
            <p className="text-gray-300 text-xs">{goal.notes}</p>
          ) : (
            <p className="text-gray-500 text-xs italic">No additional notes available</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {goal.owner && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {goal.owner}
              </span>
            )}
            {goal.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {goal.deadline}
              </span>
            )}
            {goal.source_reference && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {goal.source_reference}
              </span>
            )}
            {!hasDetails && (
              <span className="text-gray-500 italic">No owner or deadline specified</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-500/10 flex items-center justify-center">
        <Target className="w-8 h-8 text-sky-400" />
      </div>
      <h4 className="text-lg font-medium text-white mb-2">
        No Goals Detected Yet
      </h4>
      <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
        Astra hasn't identified specific goals or targets in your team's data yet. Here's how to help:
      </p>
      <div className="bg-gray-800/50 rounded-lg p-4 text-left max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">Suggestions</span>
        </div>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-sky-400 mt-1">-</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const GoalsProgressSection: React.FC<GoalsProgressSectionProps> = ({ data }) => {
  if (!data.has_data || data.items.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-sky-400" />
          <h3 className="text-lg font-semibold text-white">Goals & Targets</h3>
        </div>
        <EmptyState suggestions={data.suggestions || [
          'Add strategy documents with your quarterly goals or OKRs',
          'Include meeting notes where project milestones are discussed',
          'Upload documents mentioning specific targets or deadlines'
        ]} />
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-semibold text-white">Goals & Targets</h3>
      </div>

      <div className="space-y-3 flex-1 overflow-auto">
        {data.items.map((goal, index) => (
          <GoalCard key={`${goal.name}-${index}`} goal={goal} />
        ))}
      </div>
    </div>
  );
};
