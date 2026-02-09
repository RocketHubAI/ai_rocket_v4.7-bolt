import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, FileText, Image, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Header } from '../Header';
import { ReportsView } from '../ReportsView';
import { GroupChat } from '../GroupChat';
import { ChatContainer } from '../ChatContainer';
import { ChatSidebar } from '../ChatSidebar';
import MissionControlPage from '../MissionControlPage';
import { MyLibraryPage } from '../MyLibraryPage';
import AstraCreateView from '../AstraCreateView';
import TeamDashboardView from '../TeamDashboardView';
import { MoonshotChallengeView } from '../MoonshotChallengeView';
import { MoonshotChallengePage } from '../MoonshotChallengePage';
import ScheduledTasksPanel from '../ScheduledTasksPanel';
import ConnectPage from '../ConnectPage';
import AssistantSkillsPanel from '../AssistantSkillsPanel';
import { ErrorBoundary } from '../ErrorBoundary';
import { UserSettingsModal } from '../UserSettingsModal';
import { TeamSettingsModal } from '../TeamSettingsModal';
import { HelpCenter, HelpCenterTab } from '../HelpCenter';
import { FuelStage } from '../launch-stages/FuelStage';
import { BoostersStage } from '../launch-stages/BoostersStage';
import { GuidanceStage } from '../launch-stages/GuidanceStage';
import { MissionControl } from '../MissionControl';
import { TabType, TabConfig } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useAgentAppContext } from '../../contexts/AgentAppContext';
import { useLaunchPreparation } from '../../hooks/useLaunchPreparation';
import { TAB_CONFIGS, getTabConfig } from '../../hooks/useOpenTabs';
import { supabase } from '../../lib/supabase';
import type { UnifiedLibraryItem } from '../../hooks/useUnifiedLibrary';

interface FeatureWrapperProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

function FeatureWrapper({ title, onBack, children }: FeatureWrapperProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-700 bg-gray-800/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Mission Control</span>
        </button>
        <div className="w-px h-4 bg-gray-600" />
        <h2 className="text-white font-medium">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

interface AgentModeMainContentProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  onOpenAdminDashboard?: () => void;
  onSwitchToClassicMode?: () => void;
  hideTabs?: boolean;
}

export default function AgentModeMainContent({
  activeTab,
  onNavigate,
  onOpenAdminDashboard,
  onSwitchToClassicMode,
  hideTabs = false
}: AgentModeMainContentProps) {
  const { user } = useAuth();
  const { launchStatus, stageProgress, refresh } = useLaunchPreparation();
  const appContext = useAgentAppContext();
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [helpCenterTab, setHelpCenterTab] = useState<HelpCenterTab>('quick-start');
  const [teamName, setTeamName] = useState('');
  const [showLaunchPrepStage, setShowLaunchPrepStage] = useState<'fuel' | 'boosters' | 'guidance' | null>(null);
  const [showMissionControl, setShowMissionControl] = useState(false);
  const [viewingLibraryItem, setViewingLibraryItem] = useState<UnifiedLibraryItem | null>(null);

  const isAdmin = user?.user_metadata?.role === 'admin';
  const teamId = user?.user_metadata?.team_id;
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const pendingPromptProcessedRef = useRef<string | null>(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [conversationToLoad, setConversationToLoad] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showOvernightDetail, setShowOvernightDetail] = useState(false);
  const [createViewKey, setCreateViewKey] = useState(0);

  useEffect(() => {
    if (appContext.pendingAgentPrompt && appContext.pendingAgentPrompt !== pendingPromptProcessedRef.current) {
      setPendingPrompt(appContext.pendingAgentPrompt);
      pendingPromptProcessedRef.current = appContext.pendingAgentPrompt;
      appContext.setPendingAgentPrompt(null);
    }
  }, [appContext.pendingAgentPrompt, appContext]);

  useEffect(() => {
    const fetchTeamName = async () => {
      if (!teamId) return;
      const { data } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .maybeSingle();
      if (data?.name) setTeamName(data.name);
    };
    fetchTeamName();
  }, [teamId]);

  useEffect(() => {
    if (appContext.selectedStage) {
      setShowLaunchPrepStage(appContext.selectedStage);
      appContext.setSelectedStage(null);
    }
  }, [appContext.selectedStage]);

  useEffect(() => {
    if (appContext.openModals.includes('overnight-detail')) {
      setShowOvernightDetail(true);
      appContext.closeModal('overnight-detail');
    }
  }, [appContext.openModals]);

  const handleOpenTab = (tab: TabType) => {
    onNavigate(tab);
  };

  const handleViewLibraryItem = (item: UnifiedLibraryItem) => {
    setViewingLibraryItem(item);
  };

  const handleOpenMissionControl = () => {
    setShowMissionControl(true);
  };

  const renderContent = () => {
    if (showMissionControl) {
      return (
        <MissionControl
          onClose={() => setShowMissionControl(false)}
          onViewStage={(stage) => {
            setShowMissionControl(false);
            setShowLaunchPrepStage(stage);
          }}
        />
      );
    }

    if (showLaunchPrepStage) {
      const fuelProgress = stageProgress.find(p => p.stage === 'fuel') || null;
      const boostersProgress = stageProgress.find(p => p.stage === 'boosters') || null;
      const guidanceProgress = stageProgress.find(p => p.stage === 'guidance') || null;

      const handleNavigateToStage = (stage: 'fuel' | 'boosters' | 'guidance' | 'ready') => {
        if (stage === 'ready') {
          setShowLaunchPrepStage(null);
        } else {
          setShowLaunchPrepStage(stage);
        }
      };

      switch (showLaunchPrepStage) {
        case 'fuel':
          return (
            <FuelStage
              progress={fuelProgress}
              fuelProgress={fuelProgress}
              boostersProgress={boostersProgress}
              guidanceProgress={guidanceProgress}
              onBack={() => setShowLaunchPrepStage(null)}
              onNavigateToStage={handleNavigateToStage}
              onComplete={() => setShowLaunchPrepStage('boosters')}
              onRefresh={refresh}
              onOpenHelpCenter={(tab) => {
                setHelpCenterTab(tab || 'quick-start');
                setShowHelpCenter(true);
              }}
              teamName={teamName}
              userRole={isAdmin ? 'admin' : 'member'}
              isInMainApp={true}
            />
          );
        case 'boosters':
          return (
            <BoostersStage
              progress={boostersProgress}
              fuelProgress={fuelProgress}
              boostersProgress={boostersProgress}
              guidanceProgress={guidanceProgress}
              onBack={() => setShowLaunchPrepStage(null)}
              onNavigateToStage={handleNavigateToStage}
              onComplete={() => setShowLaunchPrepStage('guidance')}
              onOpenHelpCenter={(tab) => {
                setHelpCenterTab(tab || 'quick-start');
                setShowHelpCenter(true);
              }}
              teamName={teamName}
              isInMainApp={true}
            />
          );
        case 'guidance':
          return (
            <GuidanceStage
              progress={guidanceProgress}
              fuelProgress={fuelProgress}
              boostersProgress={boostersProgress}
              guidanceProgress={guidanceProgress}
              onBack={() => setShowLaunchPrepStage(null)}
              onNavigateToStage={handleNavigateToStage}
              onComplete={() => setShowLaunchPrepStage(null)}
              onOpenHelpCenter={(tab) => {
                setHelpCenterTab(tab || 'quick-start');
                setShowHelpCenter(true);
              }}
              teamName={teamName}
              isInMainApp={true}
            />
          );
      }
    }

    switch (activeTab) {
      case 'mission-control':
        return (
          <ErrorBoundary fallbackMessage="Unable to load Mission Control. Please try again.">
            <MissionControlPage
              onOpenTab={handleOpenTab}
              onNavigateToStage={(stage) => setShowLaunchPrepStage(stage)}
              onOpenAdminSettings={() => setShowTeamSettings(true)}
              onOpenFolderManager={() => setShowLaunchPrepStage('fuel')}
              onOpenHelpCenter={(tab) => {
                setHelpCenterTab(tab || 'quick-start');
                setShowHelpCenter(true);
              }}
            />
          </ErrorBoundary>
        );

      case 'private':
        return (
          <FeatureWrapper title="Agent Chat" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Agent Chat. Please try again.">
              <div className="h-full flex relative">
                <ChatSidebar
                  isOpen={chatSidebarOpen}
                  onClose={() => setChatSidebarOpen(false)}
                  onSelectConversation={(id) => {
                    setConversationToLoad(id);
                    setChatSidebarOpen(false);
                  }}
                  activeConversationId={activeConversationId}
                  onNewChat={() => {
                    setConversationToLoad(null);
                    setActiveConversationId(null);
                    setChatSidebarOpen(false);
                  }}
                />
                <div className="flex-1">
                  <ChatContainer
                    sidebarOpen={chatSidebarOpen}
                    onCloseSidebar={() => setChatSidebarOpen(false)}
                    onOpenSidebar={() => setChatSidebarOpen(true)}
                    conversationToLoad={conversationToLoad}
                    shouldStartNewChat={appContext.shouldStartNewAgentChat}
                    onConversationLoaded={(id) => {
                      setConversationToLoad(null);
                      setActiveConversationId(id);
                    }}
                    onNewChatStarted={() => {
                      appContext.setShouldStartNewAgentChat(false);
                      setActiveConversationId(null);
                    }}
                    onConversationChange={(id) => setActiveConversationId(id)}
                    guidedPromptToSubmit={pendingPrompt}
                    onGuidedPromptSubmitted={() => setPendingPrompt(null)}
                  />
                </div>
              </div>
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'reports':
        return (
          <FeatureWrapper title="AI Reports" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Reports. Please try again.">
              <ReportsView />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'team':
        return (
          <FeatureWrapper title="Team Chat" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Team Chat. Please try again.">
              <GroupChat teamName={teamName} />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'visualizations':
        return (
          <FeatureWrapper title="Visualizations" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Visualizations. Please try again.">
              <MyLibraryPage
                viewingItem={viewingLibraryItem}
                onViewItem={setViewingLibraryItem}
                onBackToLibrary={() => setViewingLibraryItem(null)}
              />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'team-pulse':
        return (
          <FeatureWrapper title="Creative Suite" onBack={() => { onNavigate('mission-control'); appContext.setOvernightContent(null); }}>
            <ErrorBoundary fallbackMessage="Unable to load Creative Suite. Please try again.">
              <AstraCreateView
                key={createViewKey}
                onNavigateToLibrary={() => onNavigate('visualizations')}
                initialCustomContent={appContext.overnightContent?.detailedContent || null}
              />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'team-dashboard':
        return (
          <FeatureWrapper title="Team Dashboard" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Team Dashboard. Please try again.">
              <TeamDashboardView />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'challenge':
        return (
          <FeatureWrapper title="Moonshot Challenge" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Challenge. Please try again.">
              <MoonshotChallengeView
                onViewDetails={() => handleOpenTab('moonshot-details')}
                onStartChallenge={() => {}}
              />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'moonshot-details':
        return (
          <FeatureWrapper title="Challenge Details" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Challenge Details. Please try again.">
              <MoonshotChallengePage onClose={() => onNavigate('mission-control')} />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'scheduled-tasks':
        return (
          <FeatureWrapper title="Scheduled Tasks" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Scheduled Tasks. Please try again.">
              <ScheduledTasksPanel />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'assistant-skills':
        return (
          <FeatureWrapper title="Assistant Skills" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Skills. Please try again.">
              <AssistantSkillsPanel />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      case 'connect':
      case 'connected-apps':
      case 'mcp-tools':
        return (
          <FeatureWrapper title="Connect" onBack={() => onNavigate('mission-control')}>
            <ErrorBoundary fallbackMessage="Unable to load Connect page. Please try again.">
              <ConnectPage />
            </ErrorBoundary>
          </FeatureWrapper>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a feature to get started</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {!hideTabs && (
        <Header
          onToggleSidebar={() => {}}
          showSidebarToggle={false}
          onOpenHelpCenter={(tab) => {
            setHelpCenterTab(tab || 'quick-start');
            setShowHelpCenter(true);
          }}
          onOpenAdminDashboard={onOpenAdminDashboard}
          hasNewMissionControl={true}
          activeTab={activeTab}
        />
      )}

      <div className={`flex-1 overflow-hidden ${!hideTabs ? 'pt-16' : ''}`}>
        {renderContent()}
      </div>

      {showUserSettings && (
        <UserSettingsModal
          isOpen={showUserSettings}
          onClose={() => setShowUserSettings(false)}
        />
      )}

      {showTeamSettings && teamId && (
        <TeamSettingsModal
          isOpen={showTeamSettings}
          onClose={() => setShowTeamSettings(false)}
          teamId={teamId}
        />
      )}

      {showHelpCenter && (
        <HelpCenter
          isOpen={showHelpCenter}
          onClose={() => setShowHelpCenter(false)}
          onStartTour={() => {}}
          isAdmin={isAdmin}
          initialTab={helpCenterTab}
        />
      )}

      {showOvernightDetail && appContext.overnightContent && (
        <OvernightDetailModal
          content={appContext.overnightContent.detailedContent}
          insightTitles={appContext.overnightContent.insightTitles || []}
          onClose={() => {
            setShowOvernightDetail(false);
            appContext.setOvernightContent(null);
          }}
          onCreatePresentation={(insightContent: string, insightTitle: string) => {
            setShowOvernightDetail(false);
            setCreateViewKey(k => k + 1);
            appContext.setOvernightContent({
              ...appContext.overnightContent!,
              detailedContent: insightContent,
            });
            onNavigate('team-pulse');
            if (user?.id && teamId) {
              supabase.from('agent_conversations').insert({
                user_id: user.id,
                team_id: teamId,
                role: 'agent',
                message: `I've sent the insight "**${insightTitle}**" to the Creative Suite for you. The custom prompt is loaded and ready — just review it and click Continue to create your images or presentation.`,
                metadata: { source: 'overnight_assistant', action: { type: 'none' } },
              });
            }
          }}
        />
      )}
    </div>
  );
}

function renderMarkdownLine(line: string, key: number): React.ReactNode {
  const renderInlineFormatting = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
  };

  if (line.startsWith('### ')) {
    return <h3 key={key} className="text-base font-semibold text-cyan-300 mt-5 mb-2">{renderInlineFormatting(line.slice(4))}</h3>;
  }
  if (line.startsWith('## ')) {
    return (
      <div key={key} className="mt-8 mb-3 pb-2 border-b border-cyan-500/30">
        <h2 className="text-lg font-bold text-cyan-400">{renderInlineFormatting(line.slice(3))}</h2>
      </div>
    );
  }
  if (line.startsWith('# ')) {
    return <h1 key={key} className="text-xl font-bold text-white mt-4 mb-3">{renderInlineFormatting(line.slice(2))}</h1>;
  }
  if (line === '---') {
    return <hr key={key} className="border-gray-700/50 my-6" />;
  }
  if (line.startsWith('| ') && line.endsWith(' |')) {
    if (line.match(/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/)) {
      return null;
    }
    const cells = line.split('|').filter(c => c.trim() !== '');
    const isHeader = cells.every(c => c.trim().startsWith('**') && c.trim().endsWith('**'));
    return (
      <div key={key} className={`grid gap-px ${isHeader ? 'bg-gray-700/50 rounded-t-lg font-semibold text-white' : 'bg-gray-800/30'}`}
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
        {cells.map((cell, ci) => (
          <div key={ci} className="px-3 py-2 text-sm">
            {renderInlineFormatting(cell.trim())}
          </div>
        ))}
      </div>
    );
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <div key={key} className="flex gap-2 mt-1.5 ml-2">
        <span className="text-cyan-500 mt-0.5 flex-shrink-0">&#8226;</span>
        <span className="text-gray-300 text-sm leading-relaxed">{renderInlineFormatting(line.slice(2))}</span>
      </div>
    );
  }
  if (/^\d+\.\s/.test(line)) {
    const match = line.match(/^(\d+)\.\s(.*)$/);
    if (match) {
      return (
        <div key={key} className="flex gap-2.5 mt-2 ml-1">
          <span className="text-cyan-400 font-semibold flex-shrink-0 w-5 text-right">{match[1]}.</span>
          <span className="text-gray-300 text-sm leading-relaxed">{renderInlineFormatting(match[2])}</span>
        </div>
      );
    }
  }
  if (line.trim() === '') return <div key={key} className="h-3" />;
  return <p key={key} className="text-gray-300 text-sm leading-relaxed mt-1">{renderInlineFormatting(line)}</p>;
}

function extractInsightContent(detailedContent: string, insightIndex: number): string {
  const sections = detailedContent.split(/(?=^## \d+\.)/m);
  const targetPrefix = `## ${insightIndex + 1}.`;
  const section = sections.find(s => s.trimStart().startsWith(targetPrefix));
  if (section) {
    return section.replace(/^---\s*$/m, '').trim();
  }
  return detailedContent;
}

function OvernightDetailModal({
  content,
  insightTitles,
  onClose,
  onCreatePresentation,
}: {
  content: string;
  insightTitles: string[];
  onClose: () => void;
  onCreatePresentation: (insightContent: string, insightTitle: string) => void;
}) {
  const [showInsightPicker, setShowInsightPicker] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSelectInsight = (index: number) => {
    setSelectedInsight(index);
    const insightContent = extractInsightContent(content, index);
    const title = insightTitles[index] || `Insight ${index + 1}`;
    setShowConfirmation(true);
    setTimeout(() => {
      onCreatePresentation(insightContent, title);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Overnight Analysis</h2>
              <p className="text-sm text-gray-400">Detailed insights prepared while you were sleeping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {showInsightPicker ? (
            <div className="space-y-4">
              {showConfirmation && selectedInsight !== null ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-teal-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white text-center">Presentation Prompt Ready</h3>
                  <p className="text-gray-400 text-center max-w-md">
                    Opening Creative Suite with your selected insight. Proceed to create your presentation.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-1">Select an Insight</h3>
                    <p className="text-sm text-gray-400">Choose which insight to use for your presentation</p>
                  </div>
                  <div className="space-y-3">
                    {insightTitles.map((title, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectInsight(i)}
                        className="w-full text-left p-4 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-cyan-500/40 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-cyan-400">{i + 1}</span>
                          </div>
                          <span className="text-white font-medium flex-1">{title}</span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowInsightPicker(false)}
                    className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Back to analysis
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-none space-y-0">
              {content.split('\n').map((line, i) => renderMarkdownLine(line, i))}
            </div>
          )}
        </div>

        {!showInsightPicker && (
          <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800/30">
            <button
              onClick={() => setShowInsightPicker(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Create Images & Presentations
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
