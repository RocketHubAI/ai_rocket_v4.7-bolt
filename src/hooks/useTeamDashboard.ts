import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface GoalItem {
  name: string;
  type: 'goal' | 'okr' | 'target' | 'milestone' | 'project' | 'kpi';
  status: 'on_track' | 'at_risk' | 'blocked' | 'not_started' | 'completed';
  progress_percentage: number | null;
  notes: string;
  source_reference: string;
  deadline?: string;
  owner?: string;
}

export interface GoalsProgress {
  has_data: boolean;
  items: GoalItem[];
  suggestions: string[];
}

export interface AlignmentExample {
  type: 'aligned' | 'misaligned';
  description: string;
}

export interface AlignmentMetrics {
  has_data: boolean;
  mission_statement: string | null;
  core_values: string[];
  alignment_score: number | null;
  alignment_examples: AlignmentExample[];
  recommendations: string[];
  suggestions: string[];
}

export interface HealthFactor {
  name: string;
  score: number;
  explanation: string;
  trend: 'up' | 'down' | 'stable';
}

export interface HealthOverview {
  overall_score: number | null;
  factors: HealthFactor[];
  trend_vs_previous: 'improving' | 'declining' | 'stable' | 'first_snapshot';
  explanation: string;
  recommendations?: string[];
}

export interface DataSufficiency {
  goals: boolean;
  alignment: boolean;
  health: boolean;
}

export interface DashboardSnapshot {
  id: string;
  team_id: string;
  target_user_id: string | null;
  generated_at: string;
  goals_progress: GoalsProgress;
  alignment_metrics: AlignmentMetrics;
  health_overview: HealthOverview;
  data_sufficiency: DataSufficiency;
  source_data_summary: {
    category_summary?: Array<{ category: string; document_count: number; has_access?: boolean }>;
    member_info?: { total_members: number };
    documents_analyzed?: number;
    generated_by?: string;
    accessible_categories?: string[];
  };
  generation_type: 'scheduled' | 'manual';
  is_current: boolean;
  visualization_html?: string;
  generation_version?: 'v1' | 'v2';
}

export interface DashboardSettings {
  team_id: string;
  is_enabled: boolean;
  last_generated_at: string | null;
  next_generation_at: string | null;
  custom_instructions: string | null;
  generation_in_progress?: boolean;
  generation_error?: string | null;
}

interface UseTeamDashboardReturn {
  currentSnapshot: DashboardSnapshot | null;
  settings: DashboardSettings | null;
  loading: boolean;
  error: string | null;
  regenerate: (customInstructions?: string, applyToFuture?: boolean) => Promise<void>;
  isRegenerating: boolean;
  canRegenerate: boolean;
  lastRegeneratedAt: Date | null;
  isAdmin: boolean;
  updateCustomInstructions: (instructions: string | null) => Promise<void>;
  teamName: string | null;
}

export function useTeamDashboard(): UseTeamDashboardReturn {
  const { user } = useAuth();
  const [currentSnapshot, setCurrentSnapshot] = useState<DashboardSnapshot | null>(null);
  const [settings, setSettings] = useState<DashboardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lastRegeneratedAt, setLastRegeneratedAt] = useState<Date | null>(null);

  const teamId = user?.user_metadata?.team_id;
  const userId = user?.id;
  const teamName = user?.user_metadata?.team_name || null;
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'owner';

  const canRegenerate = isAdmin && !isRegenerating;

  const fetchDashboard = useCallback(async () => {
    if (!teamId || !userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [snapshotResult, settingsResult] = await Promise.all([
        supabase
          .from('team_dashboard_snapshots')
          .select('*')
          .eq('team_id', teamId)
          .eq('target_user_id', userId)
          .eq('is_current', true)
          .maybeSingle(),
        supabase
          .from('team_dashboard_settings')
          .select('*')
          .eq('team_id', teamId)
          .maybeSingle()
      ]);

      if (snapshotResult.error && snapshotResult.error.code !== 'PGRST116') {
        throw snapshotResult.error;
      }
      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }

      setCurrentSnapshot(snapshotResult.data as DashboardSnapshot | null);
      const settingsData = settingsResult.data as DashboardSettings | null;
      setSettings(settingsData);

      if (settingsData?.last_generated_at) {
        setLastRegeneratedAt(new Date(settingsData.last_generated_at));
      }

      if (settingsData?.generation_in_progress) {
        setIsRegenerating(true);
      } else {
        setIsRegenerating(false);
        if (settingsData?.generation_error) {
          setError(settingsData.generation_error);
        }
      }
    } catch (err) {
      console.error('Error fetching team dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [teamId, userId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!teamId || !userId) return;

    const channel = supabase
      .channel(`team-dashboard-${teamId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_dashboard_snapshots',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          const snapshot = payload.new as DashboardSnapshot;
          if (snapshot.target_user_id !== userId) return;

          console.log('[useTeamDashboard] User snapshot change detected');
          if (payload.eventType === 'INSERT' && snapshot.is_current) {
            setCurrentSnapshot(snapshot);
          } else if (payload.eventType === 'UPDATE' && snapshot.is_current) {
            setCurrentSnapshot(snapshot);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_dashboard_settings',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('[useTeamDashboard] Settings change detected:', payload.new);
          const newSettings = payload.new as DashboardSettings;

          if (newSettings.generation_in_progress === false) {
            console.log('[useTeamDashboard] Generation completed');
            setIsRegenerating(false);
            setSettings(newSettings);

            if (newSettings.generation_error) {
              setError(newSettings.generation_error);
            } else {
              setError(null);
              if (newSettings.last_generated_at) {
                setLastRegeneratedAt(new Date(newSettings.last_generated_at));
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, userId]);

  const regenerate = useCallback(async (customInstructions?: string, applyToFuture?: boolean) => {
    if (!teamId || !userId || !canRegenerate) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      if (applyToFuture && customInstructions !== undefined) {
        await supabase
          .from('team_dashboard_settings')
          .upsert({
            team_id: teamId,
            custom_instructions: customInstructions || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'team_id' });
      }

      console.log('[useTeamDashboard] Starting background generation for user (fire and forget)');

      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-team-dashboard-v2`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            team_id: teamId,
            target_user_id: userId,
            generation_type: 'manual',
            custom_instructions: customInstructions || settings?.custom_instructions || undefined
          })
        }
      ).then(async (response) => {
        console.log('[useTeamDashboard] Background generation response:', response.status);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[useTeamDashboard] Background generation error:', errorData);
        }
      }).catch((err) => {
        console.error('[useTeamDashboard] Background generation fetch error:', err);
      });

    } catch (err) {
      console.error('Error starting dashboard regeneration:', err);
      setError(err instanceof Error ? err.message : 'Failed to start regeneration');
      setIsRegenerating(false);
    }
  }, [teamId, userId, canRegenerate, settings?.custom_instructions]);

  const updateCustomInstructions = useCallback(async (instructions: string | null) => {
    if (!teamId || !isAdmin) return;

    try {
      await supabase
        .from('team_dashboard_settings')
        .upsert({
          team_id: teamId,
          custom_instructions: instructions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'team_id' });

      setSettings(prev => prev ? { ...prev, custom_instructions: instructions } : null);
    } catch (err) {
      console.error('Error updating custom instructions:', err);
    }
  }, [teamId, isAdmin]);

  return {
    currentSnapshot,
    settings,
    loading,
    error,
    regenerate,
    isRegenerating,
    canRegenerate,
    lastRegeneratedAt,
    isAdmin,
    updateCustomInstructions,
    teamName
  };
}
