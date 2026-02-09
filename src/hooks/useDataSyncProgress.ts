import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DataSyncSession {
  id: string;
  team_id: string;
  user_id: string;
  sync_type: 'initial' | 'incremental' | 'manual';
  status: 'in_progress' | 'completed' | 'failed';
  total_files_discovered: number;
  files_stored: number;
  files_classified: number;
  root_folder_id: string | null;
  additional_folders: string[];
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncProgress {
  isActive: boolean;
  currentSession: DataSyncSession | null;
  discoveryProgress: number;
  storageProgress: number;
  classificationProgress: number;
  overallProgress: number;
  statusMessage: string;
}

export function useDataSyncProgress() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<DataSyncSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DataSyncSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamId = user?.user_metadata?.team_id;

  const fetchActiveSessions = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('data_sync_sessions')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (fetchError) throw fetchError;
      setActiveSessions(data || []);
      setCurrentSession(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('Error fetching active sync sessions:', err);
      setError('Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const startSyncSession = useCallback(async (
    syncType: 'initial' | 'incremental' | 'manual',
    rootFolderId?: string,
    additionalFolders?: string[]
  ): Promise<DataSyncSession | null> => {
    if (!user || !teamId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('data_sync_sessions')
        .insert({
          team_id: teamId,
          user_id: user.id,
          sync_type: syncType,
          status: 'in_progress',
          root_folder_id: rootFolderId || null,
          additional_folders: additionalFolders || [],
          total_files_discovered: 0,
          files_stored: 0,
          files_classified: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setCurrentSession(data);
      return data;
    } catch (err) {
      console.error('Error starting sync session:', err);
      setError('Failed to start sync session');
      return null;
    }
  }, [user, teamId]);

  const updateSyncProgress = useCallback(async (
    sessionId: string,
    updates: Partial<Pick<DataSyncSession, 'total_files_discovered' | 'files_stored' | 'files_classified'>>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('data_sync_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Error updating sync progress:', err);
      return false;
    }
  }, []);

  const completeSyncSession = useCallback(async (
    sessionId: string,
    finalStats?: { files_stored?: number; files_classified?: number }
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('data_sync_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          ...(finalStats || {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      setCurrentSession(null);
      await fetchActiveSessions();
      return true;
    } catch (err) {
      console.error('Error completing sync session:', err);
      return false;
    }
  }, [fetchActiveSessions]);

  const failSyncSession = useCallback(async (
    sessionId: string,
    errorMessage: string
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('data_sync_sessions')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      setCurrentSession(null);
      await fetchActiveSessions();
      return true;
    } catch (err) {
      console.error('Error failing sync session:', err);
      return false;
    }
  }, [fetchActiveSessions]);

  const getSyncProgress = useCallback((): SyncProgress => {
    if (!currentSession) {
      return {
        isActive: false,
        currentSession: null,
        discoveryProgress: 0,
        storageProgress: 0,
        classificationProgress: 0,
        overallProgress: 0,
        statusMessage: 'No active sync'
      };
    }

    const { total_files_discovered, files_stored, files_classified, status } = currentSession;

    const discoveryProgress = total_files_discovered > 0 ? 100 : 0;
    const storageProgress = total_files_discovered > 0
      ? Math.min(100, Math.round((files_stored / total_files_discovered) * 100))
      : 0;
    const classificationProgress = files_stored > 0
      ? Math.min(100, Math.round((files_classified / files_stored) * 100))
      : 0;

    const overallProgress = Math.round(
      (discoveryProgress * 0.1) +
      (storageProgress * 0.4) +
      (classificationProgress * 0.5)
    );

    let statusMessage = 'Syncing...';
    if (status === 'completed') {
      statusMessage = 'Sync complete';
    } else if (status === 'failed') {
      statusMessage = 'Sync failed';
    } else if (discoveryProgress < 100) {
      statusMessage = 'Discovering files...';
    } else if (storageProgress < 100) {
      statusMessage = `Storing files (${files_stored}/${total_files_discovered})...`;
    } else if (classificationProgress < 100) {
      statusMessage = `Classifying with Smart Data (${files_classified}/${files_stored})...`;
    } else {
      statusMessage = 'Finalizing...';
    }

    return {
      isActive: status === 'in_progress',
      currentSession,
      discoveryProgress,
      storageProgress,
      classificationProgress,
      overallProgress,
      statusMessage
    };
  }, [currentSession]);

  const fetchRecentSessions = useCallback(async (limit = 5): Promise<DataSyncSession[]> => {
    if (!teamId) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('data_sync_sessions')
        .select('*')
        .eq('team_id', teamId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Error fetching recent sessions:', err);
      return [];
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      fetchActiveSessions();
    }
  }, [teamId, fetchActiveSessions]);

  useEffect(() => {
    if (!teamId) return;

    const subscription = supabase
      .channel('data_sync_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_sync_sessions',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedSession = payload.new as DataSyncSession;
            if (updatedSession.status === 'in_progress') {
              setCurrentSession(updatedSession);
            } else if (currentSession?.id === updatedSession.id) {
              setCurrentSession(null);
            }
          }
          fetchActiveSessions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teamId, currentSession, fetchActiveSessions]);

  return {
    activeSessions,
    currentSession,
    loading,
    error,
    startSyncSession,
    updateSyncProgress,
    completeSyncSession,
    failSyncSession,
    getSyncProgress,
    fetchRecentSessions,
    refresh: fetchActiveSessions
  };
}
