import { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Timer,
  MessageSquare,
  Bell,
  Search,
  FileText,
  UserCheck,
  Sparkles,
  X,
  RefreshCw,
  FlaskConical,
  Plus,
  Database,
  BarChart3,
  Zap,
} from 'lucide-react';
import {
  useScheduledTasks,
  formatTaskSchedule,
  type ScheduledTask,
  type TaskExecution,
} from '../hooks/useScheduledTasks';
import TaskTemplateBuilder from './scheduled-tasks/TaskTemplateBuilder';

const TASK_TYPE_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  reminder: { icon: Bell, label: 'Reminder', color: 'text-amber-400' },
  research: { icon: Search, label: 'Research', color: 'text-cyan-400' },
  report: { icon: FileText, label: 'Report', color: 'text-blue-400' },
  check_in: { icon: UserCheck, label: 'Check-in', color: 'text-emerald-400' },
  custom: { icon: Sparkles, label: 'Custom', color: 'text-teal-400' },
};

const FEATURE_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  'Team Data Search': { icon: Database, label: 'Team Data Search', color: 'text-cyan-400' },
  'Reports View': { icon: BarChart3, label: 'Reports View', color: 'text-blue-400' },
  'Agent Chat': { icon: MessageSquare, label: 'Agent Chat', color: 'text-emerald-400' },
  'Notifications': { icon: Bell, label: 'Notifications', color: 'text-amber-400' },
};

function getTaskFeatures(task: ScheduledTask): string[] {
  const meta = task.metadata as Record<string, unknown>;
  if (Array.isArray(meta?.features_used) && meta.features_used.length > 0) {
    return meta.features_used as string[];
  }
  const features: string[] = ['Team Data Search'];
  if (task.task_type === 'report') {
    features.push('Reports View');
  } else {
    features.push('Agent Chat');
  }
  if (task.delivery_method === 'notification' || task.delivery_method === 'both') {
    features.push('Notifications');
  }
  return features;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  paused: { label: 'Paused', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  completed: { label: 'Completed', bg: 'bg-gray-500/20', text: 'text-gray-400' },
  expired: { label: 'Expired', bg: 'bg-red-500/20', text: 'text-red-400' },
};

function TaskCard({
  task,
  onPause,
  onResume,
  onDelete,
  onViewHistory,
}: {
  task: ScheduledTask;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onViewHistory: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.custom;
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.active;
  const TypeIcon = typeConfig.icon;

  const nextRunDate = task.next_run_at ? new Date(task.next_run_at) : null;
  const isOverdue = nextRunDate && nextRunDate.getTime() < Date.now() && task.status === 'active';

  return (
    <div className="bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden transition-all hover:border-gray-500">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg bg-gray-600/50 ${typeConfig.color}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-medium truncate">{task.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {formatTaskSchedule(task)}
                </span>
                {task.run_count > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {task.run_count} run{task.run_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {nextRunDate && task.status === 'active' && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? 'text-amber-400' : 'text-gray-500'}`}>
                  <Timer className="w-3 h-3" />
                  Next: {nextRunDate.toLocaleDateString()} at{' '}
                  {nextRunDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {task.status === 'active' && (
              <button
                onClick={() => onPause(task.id)}
                className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-600 rounded-lg transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {task.status === 'paused' && (
              <button
                onClick={() => onResume(task.id)}
                className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-600 rounded-lg transition-colors"
                title="Resume"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-600/50 pt-3 space-y-3">
          {task.description && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-gray-300">{task.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Prompt</p>
            <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-2 line-clamp-3">
              {task.ai_prompt}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Features Used</p>
            <div className="flex flex-wrap gap-2">
              {getTaskFeatures(task).map((feature) => {
                const config = FEATURE_CONFIG[feature];
                if (!config) return null;
                const FeatureIcon = config.icon;
                return (
                  <span
                    key={feature}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-800/70 border border-gray-600/50"
                  >
                    <FeatureIcon className={`w-3 h-3 ${config.color}`} />
                    <span className="text-gray-300">{config.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Delivers to: {task.task_type === 'report' ? 'Reports' : task.delivery_method}
            </span>
            {task.max_runs && (
              <span>
                Max runs: {task.run_count}/{task.max_runs}
              </span>
            )}
            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
          </div>
          <button
            onClick={() => onViewHistory(task.id)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View execution history
          </button>
        </div>
      )}
    </div>
  );
}

function ExecutionHistoryModal({
  executions,
  taskTitle,
  onClose,
}: {
  executions: TaskExecution[];
  taskTitle: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">History: {taskTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {executions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No executions yet</p>
            </div>
          ) : (
            executions.map((exec) => (
              <div
                key={exec.id}
                className="bg-gray-700/50 border border-gray-600 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">
                    {new Date(exec.started_at).toLocaleString()}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      exec.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : exec.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {exec.status}
                  </span>
                </div>
                {exec.result_message && (
                  <p className="text-sm text-gray-300 line-clamp-4 mt-1">
                    {exec.result_message.substring(0, 200)}
                    {exec.result_message.length > 200 ? '...' : ''}
                  </p>
                )}
                {exec.error && (
                  <p className="text-sm text-red-400 mt-1 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {exec.error.substring(0, 150)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScheduledTasksPanel() {
  const {
    activeTasks,
    pausedTasks,
    completedTasks,
    loading,
    pauseTask,
    resumeTask,
    deleteTask,
    fetchExecutions,
    refreshTasks,
  } = useScheduledTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [historyModal, setHistoryModal] = useState<{
    taskTitle: string;
    executions: TaskExecution[];
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleViewHistory = async (taskId: string) => {
    const task = [...activeTasks, ...pausedTasks, ...completedTasks].find(t => t.id === taskId);
    const executions = await fetchExecutions(taskId);
    setHistoryModal({ taskTitle: task?.title || 'Task', executions });
  };

  const handleDelete = (taskId: string) => {
    if (confirmDelete === taskId) {
      deleteTask(taskId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(taskId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const filteredTasks = (() => {
    switch (filter) {
      case 'active':
        return activeTasks;
      case 'paused':
        return pausedTasks;
      case 'completed':
        return completedTasks;
      default:
        return [...activeTasks, ...pausedTasks, ...completedTasks];
    }
  })();

  const totalTasks = activeTasks.length + pausedTasks.length + completedTasks.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mx-4 mt-4 mb-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <FlaskConical className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">Preview Feature</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Scheduled Tasks is currently in preview testing and not yet available for all users. Functionality may change before general release.
          </p>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Scheduled Tasks</h2>
              <p className="text-gray-400 text-sm">
                {activeTasks.length} active{pausedTasks.length > 0 ? `, ${pausedTasks.length} paused` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBuilder(!showBuilder)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showBuilder
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </button>
            <button
              onClick={async () => {
                setRefreshing(true);
                await refreshTasks();
                setRefreshing(false);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh tasks"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {(['all', 'active', 'paused', 'completed'] as const).map((f) => {
            const count =
              f === 'all'
                ? totalTasks
                : f === 'active'
                ? activeTasks.length
                : f === 'paused'
                ? pausedTasks.length
                : completedTasks.length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {showBuilder && (
          <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 mb-2">
            <TaskTemplateBuilder onClose={() => setShowBuilder(false)} />
          </div>
        )}

        {totalTasks === 0 && !showBuilder ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="p-4 rounded-2xl bg-gray-800/50 border border-gray-700 mb-4">
              <Calendar className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-white font-medium mb-2">No scheduled tasks yet</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-4">
              Ask your assistant to schedule tasks for you, or browse our template library to get started.
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Browse Task Templates
            </button>
          </div>
        ) : filteredTasks.length === 0 && !showBuilder ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No {filter} tasks</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPause={pauseTask}
              onResume={resumeTask}
              onDelete={handleDelete}
              onViewHistory={handleViewHistory}
            />
          ))
        )}
      </div>

      {historyModal && (
        <ExecutionHistoryModal
          executions={historyModal.executions}
          taskTitle={historyModal.taskTitle}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          Click delete again to confirm
        </div>
      )}
    </div>
  );
}
