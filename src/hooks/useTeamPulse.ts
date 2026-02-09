import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TeamPulseSnapshot, TeamPulseSettings } from '../types';

export interface TeamPulseCustomizationSettings {
  custom_instructions: string | null;
  design_style: string | null;
  design_description: string | null;
  rotate_random: boolean;
  apply_to_future: boolean;
}

interface GenerateOptions {
  custom_instructions?: string | null;
  design_style?: string | null;
  design_description?: string | null;
  focus_mode?: 'big3' | 'highlights' | 'full_canvas' | null;
}

interface UseTeamPulseReturn {
  currentSnapshot: TeamPulseSnapshot | null;
  settings: TeamPulseSettings | null;
  customizationSettings: TeamPulseCustomizationSettings;
  history: TeamPulseSnapshot[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  generatePulse: (options?: GenerateOptions) => Promise<boolean>;
  refreshSnapshot: () => Promise<void>;
  loadHistory: () => Promise<void>;
  updateCustomizationSettings: (settings: TeamPulseCustomizationSettings) => Promise<void>;
}

const DEFAULT_CUSTOMIZATION: TeamPulseCustomizationSettings = {
  custom_instructions: null,
  design_style: 'infographic',
  design_description: null,
  rotate_random: false,
  apply_to_future: true
};

export function useTeamPulse(): UseTeamPulseReturn {
  const { user } = useAuth();
  const [currentSnapshot, setCurrentSnapshot] = useState<TeamPulseSnapshot | null>(null);
  const [settings, setSettings] = useState<TeamPulseSettings | null>(null);
  const [customizationSettings, setCustomizationSettings] = useState<TeamPulseCustomizationSettings>(DEFAULT_CUSTOMIZATION);
  const [history, setHistory] = useState<TeamPulseSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamId = user?.user_metadata?.team_id;

  const fetchCurrentSnapshot = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('team_pulse_snapshots')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_current', true)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching current snapshot:', fetchError);
        return;
      }

      setCurrentSnapshot(data);
    } catch (err) {
      console.error('Error in fetchCurrentSnapshot:', err);
    }
  }, [teamId]);

  const fetchSettings = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('team_pulse_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching settings:', fetchError);
        return;
      }

      setSettings(data);

      if (data) {
        const isRotateRandom = data.rotate_random || false;
        setCustomizationSettings({
          custom_instructions: data.custom_instructions || null,
          design_style: data.design_style || (isRotateRandom ? null : 'infographic'),
          design_description: data.design_description || null,
          rotate_random: isRotateRandom,
          apply_to_future: data.apply_to_future !== false
        });

        if (data.generation_in_progress) {
          setGenerating(true);
        } else {
          setGenerating(false);
          if (data.generation_error) {
            setError(data.generation_error);
          }
        }
      }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
    }
  }, [teamId]);

  const updateCustomizationSettings = useCallback(async (newSettings: TeamPulseCustomizationSettings) => {
    if (!teamId) return;

    try {
      const { error: updateError } = await supabase
        .from('team_pulse_settings')
        .upsert({
          team_id: teamId,
          custom_instructions: newSettings.custom_instructions,
          design_style: newSettings.design_style,
          design_description: newSettings.design_description,
          rotate_random: newSettings.rotate_random,
          apply_to_future: newSettings.apply_to_future,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_id'
        });

      if (updateError) {
        console.error('Error updating customization settings:', updateError);
        throw updateError;
      }

      setCustomizationSettings(newSettings);
    } catch (err) {
      console.error('Error in updateCustomizationSettings:', err);
      throw err;
    }
  }, [teamId]);

  const loadHistory = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('team_pulse_snapshots')
        .select('*')
        .eq('team_id', teamId)
        .order('generated_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('Error fetching history:', fetchError);
        return;
      }

      setHistory(data || []);
    } catch (err) {
      console.error('Error in loadHistory:', err);
    }
  }, [teamId]);

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    await Promise.all([
      fetchCurrentSnapshot(),
      fetchSettings()
    ]);

    setLoading(false);
  }, [fetchCurrentSnapshot, fetchSettings]);

  const generatePulse = useCallback(async (options?: GenerateOptions): Promise<boolean> => {
    console.log('[useTeamPulse] generatePulse called', { teamId, userId: user?.id, options });

    if (!teamId || !user) {
      console.log('[useTeamPulse] Missing teamId or user', { teamId, user: !!user });
      setError('User not authenticated');
      return false;
    }

    setGenerating(true);
    setError(null);

    const pollForCompletion = async () => {
      const maxAttempts = 30;
      const pollInterval = 5000;

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const { data: settingsData } = await supabase
          .from('team_pulse_settings')
          .select('generation_in_progress, generation_error')
          .eq('team_id', teamId)
          .maybeSingle();

        console.log(`[useTeamPulse] Poll ${i + 1}/${maxAttempts}:`, settingsData);

        if (settingsData && !settingsData.generation_in_progress) {
          setGenerating(false);
          if (settingsData.generation_error) {
            setError(settingsData.generation_error);
          } else {
            await fetchCurrentSnapshot();
          }
          return;
        }
      }

      console.log('[useTeamPulse] Generation timed out after polling');
      setGenerating(false);
      setError('Generation timed out. Please try again.');
    };

    try {
      console.log('[useTeamPulse] Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[useTeamPulse] Session obtained:', { hasSession: !!session, hasToken: !!session?.access_token });

      if (!session?.access_token) {
        console.log('[useTeamPulse] No active session token');
        setError('No active session');
        setGenerating(false);
        return false;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-team-pulse`;
      console.log('[useTeamPulse] Calling edge function:', url);

      const requestBody: Record<string, unknown> = {
        team_id: teamId,
        generation_type: 'manual'
      };

      if (options?.custom_instructions) {
        requestBody.custom_instructions = options.custom_instructions;
      }
      if (options?.design_style) {
        requestBody.design_style = options.design_style;
      }
      if (options?.design_description) {
        requestBody.design_description = options.design_description;
      }
      if (options?.focus_mode) {
        requestBody.focus_mode = options.focus_mode;
      }

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(requestBody)
      }).then(async (response) => {
        console.log('[useTeamPulse] Generation response:', response.status);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[useTeamPulse] Generation error:', errorData);
          setGenerating(false);
          setError(errorData.error || 'Generation failed');
        }
      }).catch((err) => {
        console.error('[useTeamPulse] Generation fetch error:', err);
        setGenerating(false);
        setError('Network error during generation');
      });

      pollForCompletion();

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start Team Pulse generation';
      console.error('[useTeamPulse] Error starting pulse generation:', err);
      setError(errorMsg);
      setGenerating(false);
      return false;
    }
  }, [teamId, user, fetchCurrentSnapshot]);

  useEffect(() => {
    if (teamId) {
      refreshSnapshot();
    } else {
      setLoading(false);
    }
  }, [teamId, refreshSnapshot]);

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel('team_pulse_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_pulse_snapshots',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          console.log('[useTeamPulse] Snapshot change detected, refreshing...');
          fetchCurrentSnapshot();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_pulse_settings',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('[useTeamPulse] Settings change detected:', payload.new);
          const newSettings = payload.new as Record<string, unknown>;

          if (newSettings.generation_in_progress === false) {
            console.log('[useTeamPulse] Generation completed, refreshing...');
            setGenerating(false);

            if (newSettings.generation_error) {
              setError(newSettings.generation_error as string);
            } else {
              setError(null);
              fetchCurrentSnapshot();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, fetchCurrentSnapshot]);

  return {
    currentSnapshot,
    settings,
    customizationSettings,
    history,
    loading,
    generating,
    error,
    generatePulse,
    refreshSnapshot,
    loadHistory,
    updateCustomizationSettings
  };
}
