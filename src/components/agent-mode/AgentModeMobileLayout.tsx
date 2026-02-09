import React, { useState } from 'react';
import { Rocket, MessageSquare, User } from 'lucide-react';
import AgentChatPanel from './AgentChatPanel';
import AgentModeMainContent from './AgentModeMainContent';
import { AgentAction } from '../../hooks/useAgentConversation';
import { TabType } from '../../types';
import { NotificationBell } from '../NotificationBell';
import { RefreshVersionButton } from '../RefreshVersionButton';
import { SupportMenu } from '../SupportMenu';
import { InstallAppButton } from '../InstallAppButton';
import { UserSettingsModal } from '../UserSettingsModal';
import { useUserProfile } from '../../hooks/useUserProfile';

type MobileView = 'agent' | 'app';

interface AgentModeMobileLayoutProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  onAction: (action: AgentAction) => void;
  onDataQuery: (query: string) => Promise<string>;
  onOpenAdminDashboard?: () => void;
  onSwitchToClassicMode?: () => void;
}

export default function AgentModeMobileLayout({
  activeTab,
  onNavigate,
  onAction,
  onDataQuery,
  onOpenAdminDashboard,
  onSwitchToClassicMode
}: AgentModeMobileLayoutProps) {
  const [currentView, setCurrentView] = useState<MobileView>('agent');
  const [showSettings, setShowSettings] = useState(false);
  const { profile } = useUserProfile();

  const handleActionWithNavigation = (action: AgentAction) => {
    onAction(action);
    if (action.type === 'navigate' || action.type === 'run_report') {
      setCurrentView('app');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex-shrink-0 bg-[#1e293b] border-b border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-400 shadow-lg flex-shrink-0">
              <span className="text-lg">🚀</span>
            </div>
            <h1 className="text-sm font-bold tracking-tight">
              <span className="text-cyan-400">AI Rocket</span>
            </h1>
          </div>

          <div className="flex items-center space-x-1">
            <InstallAppButton />
            <RefreshVersionButton />
            <NotificationBell onOpenSettings={() => setShowSettings(true)} />
            <SupportMenu />
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:ring-2 hover:ring-white/30 transition-all cursor-pointer overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-800 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center bg-gray-800 border-t border-gray-700/50">
          <button
            onClick={() => setCurrentView('agent')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              currentView === 'agent'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800'
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Assistant Mode</span>
          </button>
          <button
            onClick={() => {
              setCurrentView('app');
              onNavigate('mission-control');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              currentView === 'app'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800'
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Mission Control</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            currentView === 'agent' ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AgentChatPanel
            onAction={handleActionWithNavigation}
            onDataQuery={onDataQuery}
            hideHeader={true}
          />
        </div>

        <div
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            currentView === 'app' ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <AgentModeMainContent
            activeTab={activeTab}
            onNavigate={onNavigate}
            onOpenAdminDashboard={onOpenAdminDashboard}
            onSwitchToClassicMode={onSwitchToClassicMode}
            hideTabs={true}
          />
        </div>
      </div>

      {showSettings && (
        <UserSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
