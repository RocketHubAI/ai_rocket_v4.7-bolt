import React, { useState, useEffect, useCallback } from 'react';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import AgentChatPanel from './AgentChatPanel';
import AgentModeMainContent from './AgentModeMainContent';
import AgentModeMobileLayout from './AgentModeMobileLayout';
import { AgentAppContextProvider, useAgentAppContext } from '../../contexts/AgentAppContext';
import { AgentAction } from '../../hooks/useAgentConversation';
import { TabType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const PANEL_WIDTH_KEY = 'agent_panel_width';
const PANEL_COLLAPSED_KEY = 'agent_panel_collapsed';
const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 500;

interface AgentModeLayoutProps {
  onOpenAdminDashboard?: () => void;
  onSwitchToClassicMode?: () => void;
}

function AgentModeLayoutInner({ onOpenAdminDashboard, onSwitchToClassicMode }: AgentModeLayoutProps) {
  const { user } = useAuth();
  const appContext = useAgentAppContext();
  const [panelWidth, setPanelWidth] = useState(() => {
    const stored = localStorage.getItem(PANEL_WIDTH_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_PANEL_WIDTH;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(PANEL_COLLAPSED_KEY) === 'true';
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('mission-control');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
  }, [panelWidth]);

  useEffect(() => {
    localStorage.setItem(PANEL_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, e.clientX));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleNavigate = useCallback((tab: TabType) => {
    setActiveTab(tab);
    appContext.setActiveTab(tab);
  }, [appContext]);

  const handleAction = useCallback((action: AgentAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.target) {
          handleNavigate(action.target as TabType);
          appContext.addRecentAction(`Navigated to ${action.target}`);
        }
        break;
      case 'open_modal':
        if (action.target) {
          appContext.openModal(action.target);
          appContext.addRecentAction(`Opened ${action.target}`);
        }
        break;
      case 'trigger_sync':
        handleNavigate('mission-control');
        appContext.setSelectedStage?.('fuel');
        appContext.addRecentAction('Opened data sync');
        break;
      case 'run_report':
        handleNavigate('reports');
        appContext.addRecentAction('Opened reports');
        break;
      case 'send_to_agent':
        handleNavigate('private');
        appContext.setShouldStartNewAgentChat(true);
        if (action.prompt) {
          appContext.setPendingAgentPrompt(action.prompt);
        }
        appContext.addRecentAction('Sent prompt to Agent Chat');
        break;
      case 'overnight_detail':
        if (action.params?.detailedContent) {
          appContext.setOvernightContent({
            detailedContent: action.params.detailedContent as string,
            batchId: (action.params.batchId as string) || '',
            insightTitles: (action.params.insightTitles as string[]) || [],
          });
          appContext.openModal('overnight-detail');
          appContext.addRecentAction('Viewed overnight analysis detail');
        }
        break;
      case 'overnight_visualization':
        if (action.params?.detailedContent) {
          const vizContent = action.params.detailedContent as string;
          handleNavigate('private');
          appContext.setShouldStartNewAgentChat(true);
          appContext.setPendingAgentPrompt(`Create a visualization from this overnight analysis:\n\n${vizContent}`);
          appContext.addRecentAction('Creating visualization from overnight analysis');
        }
        break;
      case 'overnight_create':
        if (action.params?.detailedContent) {
          appContext.setOvernightContent({
            detailedContent: action.params.detailedContent as string,
            batchId: (action.params.batchId as string) || '',
            insightTitles: (action.params.insightTitles as string[]) || [],
          });
          handleNavigate('team-pulse');
          appContext.addRecentAction('Creating presentation from overnight analysis');
        }
        break;
      case 'highlight':
        break;
      default:
        break;
    }
  }, [handleNavigate, appContext]);

  const handleDataQuery = useCallback(async (query: string): Promise<string> => {
    const teamId = user?.user_metadata?.team_id;
    if (!teamId) {
      return "I couldn't access your team data. Please make sure you're connected to a team.";
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        return "I'm having trouble authenticating. Please try refreshing the page.";
      }

      const n8nWebhookUrl = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL;
      if (!n8nWebhookUrl) {
        return "Data query service is not configured. Please contact support.";
      }

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: query,
          team_id: teamId,
          user_id: user?.id,
          source: 'agent_mode'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to query data');
      }

      const result = await response.json();
      return result.output || result.response || result.message || "I found some information but couldn't format it properly.";
    } catch (error) {
      console.error('Error querying data:', error);
      return "I encountered an error searching your data. Please try again or rephrase your question.";
    }
  }, [user]);

  if (isMobile) {
    return (
      <AgentModeMobileLayout
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onAction={handleAction}
        onDataQuery={handleDataQuery}
        onOpenAdminDashboard={onOpenAdminDashboard}
        onSwitchToClassicMode={onSwitchToClassicMode}
      />
    );
  }

  return (
    <div className="h-screen flex bg-gray-900 overflow-hidden">
      <div
        style={{ width: isCollapsed ? 48 : panelWidth }}
        className="flex-shrink-0 transition-all duration-200"
      >
        <AgentChatPanel
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onAction={handleAction}
          onDataQuery={handleDataQuery}
        />
      </div>

      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`w-1 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${
            isResizing ? 'bg-cyan-500' : 'bg-transparent'
          }`}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <AgentModeMainContent
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onOpenAdminDashboard={onOpenAdminDashboard}
          onSwitchToClassicMode={onSwitchToClassicMode}
        />
      </div>
    </div>
  );
}

export default function AgentModeLayout(props: AgentModeLayoutProps) {
  return (
    <AgentAppContextProvider>
      <AgentModeLayoutInner {...props} />
    </AgentAppContextProvider>
  );
}
