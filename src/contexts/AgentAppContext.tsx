import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TabType } from '../types';
import { getTabConfig } from '../hooks/useOpenTabs';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { AppContext } from '../lib/agent-gemini-service';

type LaunchStage = 'fuel' | 'boosters' | 'guidance' | 'launch';

interface OvernightInsightContent {
  detailedContent: string;
  batchId: string;
  insightTitles: string[];
}

interface AgentAppContextState {
  activeTab: TabType;
  activeTabLabel: string;
  openModals: string[];
  recentActions: string[];
  dataSyncStatus: 'idle' | 'syncing' | 'complete' | 'error';
  connectedSources: string[];
  documentCount: number;
  teamName: string;
  selectedStage: LaunchStage | null;
  pendingAgentPrompt: string | null;
  shouldStartNewAgentChat: boolean;
  overnightContent: OvernightInsightContent | null;
}

interface AgentAppContextValue extends AgentAppContextState {
  setActiveTab: (tab: TabType) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  addRecentAction: (action: string) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'complete' | 'error') => void;
  setSelectedStage: (stage: LaunchStage | null) => void;
  setPendingAgentPrompt: (prompt: string | null) => void;
  setShouldStartNewAgentChat: (shouldStart: boolean) => void;
  setOvernightContent: (content: OvernightInsightContent | null) => void;
  getContextSummary: () => AppContext;
  refreshDataStatus: () => Promise<void>;
}

const AgentAppContextContext = createContext<AgentAppContextValue | undefined>(undefined);

const MAX_RECENT_ACTIONS = 10;

export function AgentAppContextProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AgentAppContextState>({
    activeTab: 'mission-control',
    activeTabLabel: 'Mission Control',
    openModals: [],
    recentActions: [],
    dataSyncStatus: 'idle',
    connectedSources: [],
    documentCount: 0,
    teamName: '',
    selectedStage: null,
    pendingAgentPrompt: null,
    shouldStartNewAgentChat: false,
    overnightContent: null
  });

  const teamId = user?.user_metadata?.team_id;

  const fetchDataStatus = useCallback(async () => {
    if (!teamId) return;

    try {
      const [teamResult, connectionResult, syncStatsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .maybeSingle(),
        supabase
          .from('user_drive_connections')
          .select('provider, is_active')
          .eq('team_id', teamId)
          .eq('is_active', true),
        supabase.rpc('get_document_sync_stats', { p_team_id: teamId })
      ]);

      const sources: string[] = [];
      if (connectionResult.data) {
        connectionResult.data.forEach(c => {
          if (c.is_active) {
            sources.push(c.provider === 'microsoft' ? 'OneDrive' : 'Google Drive');
          }
        });
      }

      setState(prev => ({
        ...prev,
        teamName: teamResult.data?.name || '',
        connectedSources: [...new Set(sources)],
        documentCount: syncStatsResult.data?.[0]?.unique_documents || 0
      }));
    } catch (err) {
      console.error('Error fetching data status:', err);
    }
  }, [teamId]);

  useEffect(() => {
    fetchDataStatus();
  }, [fetchDataStatus]);

  const setActiveTab = useCallback((tab: TabType) => {
    const config = getTabConfig(tab);
    setState(prev => ({
      ...prev,
      activeTab: tab,
      activeTabLabel: config?.label || tab,
      recentActions: [`Navigated to ${config?.label || tab}`, ...prev.recentActions].slice(0, MAX_RECENT_ACTIONS)
    }));
  }, []);

  const openModal = useCallback((modalId: string) => {
    setState(prev => ({
      ...prev,
      openModals: [...prev.openModals, modalId],
      recentActions: [`Opened ${modalId}`, ...prev.recentActions].slice(0, MAX_RECENT_ACTIONS)
    }));
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setState(prev => ({
      ...prev,
      openModals: prev.openModals.filter(id => id !== modalId)
    }));
  }, []);

  const addRecentAction = useCallback((action: string) => {
    setState(prev => ({
      ...prev,
      recentActions: [action, ...prev.recentActions].slice(0, MAX_RECENT_ACTIONS)
    }));
  }, []);

  const setSyncStatus = useCallback((status: 'idle' | 'syncing' | 'complete' | 'error') => {
    setState(prev => ({ ...prev, dataSyncStatus: status }));
  }, []);

  const setSelectedStage = useCallback((stage: LaunchStage | null) => {
    setState(prev => ({ ...prev, selectedStage: stage }));
  }, []);

  const setPendingAgentPrompt = useCallback((prompt: string | null) => {
    setState(prev => ({ ...prev, pendingAgentPrompt: prompt }));
  }, []);

  const setShouldStartNewAgentChat = useCallback((shouldStart: boolean) => {
    setState(prev => ({ ...prev, shouldStartNewAgentChat: shouldStart }));
  }, []);

  const setOvernightContent = useCallback((content: OvernightInsightContent | null) => {
    setState(prev => ({ ...prev, overnightContent: content }));
  }, []);

  const getContextSummary = useCallback((): AppContext => {
    return {
      activeTab: state.activeTab,
      activeTabLabel: state.activeTabLabel,
      openModals: state.openModals,
      recentActions: state.recentActions,
      dataSyncStatus: state.dataSyncStatus,
      connectedSources: state.connectedSources,
      documentCount: state.documentCount,
      teamName: state.teamName
    };
  }, [state]);

  const value: AgentAppContextValue = {
    ...state,
    setActiveTab,
    openModal,
    closeModal,
    addRecentAction,
    setSyncStatus,
    setSelectedStage,
    setPendingAgentPrompt,
    setShouldStartNewAgentChat,
    setOvernightContent,
    getContextSummary,
    refreshDataStatus: fetchDataStatus
  };

  return (
    <AgentAppContextContext.Provider value={value}>
      {children}
    </AgentAppContextContext.Provider>
  );
}

export function useAgentAppContext(): AgentAppContextValue {
  const context = useContext(AgentAppContextContext);
  if (!context) {
    throw new Error('useAgentAppContext must be used within AgentAppContextProvider');
  }
  return context;
}
