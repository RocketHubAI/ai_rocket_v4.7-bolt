import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ScheduledTask {
  id: string;
  user_id: string;
  team_id: string;
  task_type: 'reminder' | 'research' | 'report' | 'check_in' | 'custom';
  title: string;
  description: string;
  frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  schedule_day: number | null;
  schedule_hour: number;
  schedule_minute: number;
  timezone: string;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  max_runs: number | null;
  status: 'active' | 'paused' | 'completed' | 'expired';
  ai_prompt: string;
  delivery_method: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  result_message: string | null;
  error: string | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatTaskSchedule(task: ScheduledTask): string {
  const hour = task.schedule_hour;
  const minute = task.schedule_minute;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;

  switch (task.frequency) {
    case 'once':
      return `Once at ${timeStr}`;
    case 'daily':
      return `Daily at ${timeStr}`;
    case 'weekly':
      return `Every ${task.schedule_day !== null ? DAY_NAMES[task.schedule_day] : 'week'} at ${timeStr}`;
    case 'biweekly':
      return `Every 2 weeks on ${task.schedule_day !== null ? DAY_NAMES[task.schedule_day] : 'the same day'} at ${timeStr}`;
    case 'monthly':
      return `Monthly on the ${task.schedule_day || 1}${getOrdinalSuffix(task.schedule_day || 1)} at ${timeStr}`;
    default:
      return timeStr;
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function useScheduledTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[ScheduledTasks] No active session, skipping fetch');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_scheduled_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ScheduledTasks] Fetch error:', error.message);
      }

      setTasks((data as ScheduledTask[]) || []);
    } catch (err) {
      console.error('[ScheduledTasks] Unexpected error:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`scheduled-tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_scheduled_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTasks]);

  const pauseTask = useCallback(async (taskId: string) => {
    await supabase
      .from('user_scheduled_tasks')
      .update({ status: 'paused' })
      .eq('id', taskId);
    fetchTasks();
  }, [fetchTasks]);

  const resumeTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setUTCHours(task.schedule_hour + 5, task.schedule_minute, 0, 0);
    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    await supabase
      .from('user_scheduled_tasks')
      .update({ status: 'active', next_run_at: nextRun.toISOString() })
      .eq('id', taskId);
    fetchTasks();
  }, [tasks, fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    await supabase
      .from('user_scheduled_tasks')
      .delete()
      .eq('id', taskId);
    fetchTasks();
  }, [fetchTasks]);

  const fetchExecutions = useCallback(async (taskId: string): Promise<TaskExecution[]> => {
    const { data } = await supabase
      .from('scheduled_task_executions')
      .select('id, task_id, started_at, completed_at, status, result_message, error')
      .eq('task_id', taskId)
      .order('started_at', { ascending: false })
      .limit(10);

    return (data as TaskExecution[]) || [];
  }, []);

  const activeTasks = tasks.filter(t => t.status === 'active');
  const pausedTasks = tasks.filter(t => t.status === 'paused');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'expired');

  return {
    tasks,
    activeTasks,
    pausedTasks,
    completedTasks,
    loading,
    pauseTask,
    resumeTask,
    deleteTask,
    fetchExecutions,
    refreshTasks: fetchTasks,
  };
}
