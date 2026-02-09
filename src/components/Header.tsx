import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChatMode, TabType } from '../types';
import { NotificationBell } from './NotificationBell';
import { RefreshVersionButton } from './RefreshVersionButton';
import { UserSettingsModal } from './UserSettingsModal';
import { useUserProfile } from '../hooks/useUserProfile';
import { SupportMenu } from './SupportMenu';
import { FeaturesMenu } from './FeaturesMenu';
import { InstallAppButton } from './InstallAppButton';
import { HelpCenterTab } from './HelpCenter';
import { MissionControl } from './MissionControl';
import { useLaunchPreparation } from '../hooks/useLaunchPreparation';

interface HeaderProps {
  onToggleSidebar: () => void;
  showSidebarToggle?: boolean;
  chatMode?: ChatMode;
  onToggleTeamMenu?: () => void;
  onOpenHelpCenter?: (tab?: HelpCenterTab) => void;
  onStartTour?: () => void;
  onOpenSetupGuide?: () => void;
  onNavigateToLaunchStage?: (stage: 'fuel' | 'boosters' | 'guidance') => void;
  onOpenAdminDashboard?: () => void;
  hasNewMissionControl?: boolean;
  activeTab?: TabType;
  onToggleTeamMenuNew?: () => void;
  onOpenReports?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  showSidebarToggle = true,
  chatMode = 'private',
  onToggleTeamMenu,
  onOpenHelpCenter,
  onStartTour,
  onOpenSetupGuide,
  onNavigateToLaunchStage,
  onOpenAdminDashboard,
  hasNewMissionControl = false,
  activeTab,
  onToggleTeamMenuNew,
  onOpenReports
}) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { launchStatus } = useLaunchPreparation();
  const [showSettings, setShowSettings] = useState(false);
  const [showMissionControl, setShowMissionControl] = useState(false);
  const [hasN8NAccess, setHasN8NAccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  useEffect(() => {
    const checkN8NAccess = async () => {
      if (!user) {
        setHasN8NAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('n8n_user_access')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_enabled', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking N8N access:', error);
          setHasN8NAccess(false);
          return;
        }

        console.log('N8N Access Check:', { userId: user.id, hasAccess: !!data, data });
        setHasN8NAccess(!!data);
      } catch (err) {
        console.error('Exception checking N8N access:', err);
        setHasN8NAccess(false);
      }
    };

    // Check if user is a super admin
    const superAdminEmails = ['clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai'];
    setIsSuperAdmin(user?.email ? superAdminEmails.includes(user.email) : false);

    checkN8NAccess();

    // Set up realtime subscription for access changes
    const channel = supabase
      .channel('n8n_access_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'n8n_user_access',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('N8N access changed:', payload);
          checkN8NAccess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setShowHelpMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#1e293b] shadow-lg px-4 h-16">
      <div className="flex items-center justify-between h-full py-1">
        {/* Left side - Menu button and branding */}
        <div className="flex items-center space-x-3">
          {showSidebarToggle && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Team chat menu */}
          {(hasNewMissionControl ? activeTab === 'team' : chatMode === 'team') && (
            <button
              onClick={hasNewMissionControl ? onToggleTeamMenuNew : onToggleTeamMenu}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          )}

          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-blue-400 shadow-lg flex-shrink-0">
              <span className="text-lg md:text-2xl">🚀</span>
            </div>

            <h1 className="text-sm md:text-2xl font-bold tracking-tight flex items-center gap-1 md:gap-3">
              <span className="text-cyan-400">AI Rocket</span>
            </h1>
          </div>
        </div>

        {/* Right side - User info */}
        <div className="flex items-center space-x-2">
          <InstallAppButton />
          <RefreshVersionButton />
          <NotificationBell onOpenSettings={() => setShowSettings(true)} onOpenReports={onOpenReports} />

          {/* Mission Control - Show if user has launched (only for old UI) */}
          {!hasNewMissionControl && launchStatus?.is_launched && (
            <button
              onClick={() => setShowMissionControl(true)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation relative group"
              title="Mission Control"
              data-tour="mission-control"
            >
              <Rocket className="w-5 h-5 text-blue-400" />
            </button>
          )}

          {/* Support Menu - HelpCircle icon with Bug/Support/Feature Request */}
          <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />

          {/* Features Menu - Plus icon with resources and tools (only for old UI) */}
          {!hasNewMissionControl && (
            <div className="mr-1">
              <FeaturesMenu
                onOpenSetupGuide={onOpenSetupGuide}
                onStartTour={onStartTour}
                onOpenHelpCenter={onOpenHelpCenter}
                hasN8NAccess={hasN8NAccess}
                isSuperAdmin={isSuperAdmin}
                onOpenAdminDashboard={onOpenAdminDashboard}
              />
            </div>
          )}

          <button
            data-tour="user-menu"
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

      <UserSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onStartTour={onStartTour}
        onOpenMissionControl={() => setShowMissionControl(true)}
      />

      {showMissionControl && (
        <MissionControl
          onClose={() => setShowMissionControl(false)}
          onNavigateToStage={onNavigateToLaunchStage}
        />
      )}
    </header>
  );
};