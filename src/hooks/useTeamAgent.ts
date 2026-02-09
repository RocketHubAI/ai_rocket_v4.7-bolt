import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TeamAgentSettings {
  teamId: string;
  agentName: string;
  agentPersonality: Record<string, unknown>;
  onboardingCompleted: boolean;
}

interface TeamAgentContext {
  id: string;
  contextType: 'mission' | 'values' | 'goals' | 'preferences' | 'facts';
  contextValue: string;
  source: 'conversation' | 'documents' | 'manual';
  createdAt: string;
}

interface UseTeamAgentReturn {
  settings: TeamAgentSettings | null;
  context: TeamAgentContext[];
  loading: boolean;
  error: string | null;
  updateAgentName: (name: string) => Promise<void>;
  updatePersonality: (personality: Partial<Record<string, unknown>>) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  addContext: (type: TeamAgentContext['contextType'], value: string, source?: TeamAgentContext['source']) => Promise<void>;
  refreshSettings: () => Promise<void>;
  isAdmin: boolean;
}

export function useTeamAgent(): UseTeamAgentReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TeamAgentSettings | null>(null);
  const [context, setContext] = useState<TeamAgentContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const teamId = user?.user_metadata?.team_id;

  const fetchSettings = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .maybeSingle();

      setIsAdmin(userData?.role === 'admin');

      const { data: settingsData, error: settingsError } = await supabase
        .from('team_agent_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settingsData) {
        setSettings({
          teamId: settingsData.team_id,
          agentName: settingsData.agent_name,
          agentPersonality: settingsData.agent_personality || {},
          onboardingCompleted: settingsData.onboarding_completed
        });
      } else {
        setSettings({
          teamId,
          agentName: 'Astra',
          agentPersonality: {},
          onboardingCompleted: false
        });
      }

      const { data: contextData } = await supabase
        .from('team_agent_context')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (contextData) {
        setContext(contextData.map(c => ({
          id: c.id,
          contextType: c.context_type,
          contextValue: c.context_value,
          source: c.source,
          createdAt: c.created_at
        })));
      }
    } catch (err: any) {
      console.error('Error fetching team agent settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateAgentName = useCallback(async (name: string) => {
    if (!teamId || !isAdmin) return;

    try {
      const { error: updateError } = await supabase
        .from('team_agent_settings')
        .upsert({
          team_id: teamId,
          agent_name: name,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_id'
        });

      if (updateError) throw updateError;

      setSettings(prev => prev ? { ...prev, agentName: name } : null);
    } catch (err: any) {
      console.error('Error updating agent name:', err);
      throw err;
    }
  }, [teamId, isAdmin]);

  const updatePersonality = useCallback(async (personality: Partial<Record<string, unknown>>) => {
    if (!teamId || !isAdmin) return;

    try {
      const currentPersonality = settings?.agentPersonality || {};
      const newPersonality = { ...currentPersonality, ...personality };

      const { error: updateError } = await supabase
        .from('team_agent_settings')
        .upsert({
          team_id: teamId,
          agent_personality: newPersonality,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_id'
        });

      if (updateError) throw updateError;

      setSettings(prev => prev ? { ...prev, agentPersonality: newPersonality } : null);
    } catch (err: any) {
      console.error('Error updating agent personality:', err);
      throw err;
    }
  }, [teamId, isAdmin, settings?.agentPersonality]);

  const markOnboardingComplete = useCallback(async () => {
    if (!teamId) return;

    try {
      const { error: updateError } = await supabase
        .from('team_agent_settings')
        .upsert({
          team_id: teamId,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_id'
        });

      if (updateError) throw updateError;

      setSettings(prev => prev ? { ...prev, onboardingCompleted: true } : null);
    } catch (err: any) {
      console.error('Error marking onboarding complete:', err);
      throw err;
    }
  }, [teamId]);

  const addContext = useCallback(async (
    type: TeamAgentContext['contextType'],
    value: string,
    source: TeamAgentContext['source'] = 'conversation'
  ) => {
    if (!teamId) return;

    try {
      const { data, error: insertError } = await supabase
        .from('team_agent_context')
        .insert({
          team_id: teamId,
          context_type: type,
          context_value: value,
          source
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setContext(prev => [{
          id: data.id,
          contextType: data.context_type,
          contextValue: data.context_value,
          source: data.source,
          createdAt: data.created_at
        }, ...prev]);
      }
    } catch (err: any) {
      console.error('Error adding agent context:', err);
      throw err;
    }
  }, [teamId]);

  return {
    settings,
    context,
    loading,
    error,
    updateAgentName,
    updatePersonality,
    markOnboardingComplete,
    addContext,
    refreshSettings: fetchSettings,
    isAdmin
  };
}
