import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Fuel,
  Zap,
  Compass,
  Trophy,
  Users,
  FileText,
  BarChart3,
  MessageSquare,
  ChevronRight,
  Settings,
  Info,
  Brain,
  Bot,
  Clock,
  FileBarChart,
  RefreshCw,
  Plus,
  LayoutDashboard,
  X,
  Star,
  Database,
  Folder,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Activity,
  Eye,
  Search,
  Target,
  CalendarClock,
  Plug,
  Wrench,
  Crown,
  Link2
} from 'lucide-react';
import { useLaunchPreparation } from '../hooks/useLaunchPreparation';
import { useFuelLevel } from '../hooks/useFuelLevel';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TAB_CONFIGS } from '../hooks/useOpenTabs';
import { TabType, TabConfig } from '../types';
import ComingSoonModal from './ComingSoonModal';
import FeatureInfoModal from './FeatureInfoModal';
import { DocumentsListModal } from './launch-stages/DocumentsListModal';
import { CategoriesDetailModal } from './launch-stages/CategoriesDetailModal';
import { calculateStageProgress } from '../lib/launch-preparation-utils';
import { triggerSyncNow } from '../lib/manual-folder-sync';

interface MissionControlPageProps {
  onOpenTab: (tab: TabType) => void;
  onNavigateToStage?: (stage: 'fuel' | 'boosters' | 'guidance') => void;
  onOpenAdminSettings?: () => void;
  onOpenFolderManager?: () => void;
  onOpenHelpCenter?: (tab?: 'quick-start' | 'whats-new' | 'faq' | 'ask-astra') => void;
}

const stageConfig = {
  fuel: { icon: Fuel, color: 'orange', label: 'Fuel', gradient: 'from-orange-500 to-amber-500' },
  boosters: { icon: Zap, color: 'cyan', label: 'Boosters', gradient: 'from-cyan-500 to-blue-500' },
  guidance: { icon: Compass, color: 'purple', label: 'Guidance', gradient: 'from-purple-500 to-pink-500' }
};

const featureIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  MessageSquare,
  FileBarChart,
  Users,
  BarChart3,
  Brain,
  Bot,
  Compass,
  LayoutDashboard,
  Activity,
  Search,
  Target,
  Sparkles,
  CalendarClock,
  Plug,
  Wrench,
  Crown,
  Zap,
  Link2
};

const iconSizeOverrides: Record<string, string> = {
  'Wrench': 'w-9 h-9'
};

const featureDescriptions: Record<string, string> = {
  'private': 'AI Assistant',
  'reports': 'Scheduled Insights',
  'team': 'Collaborate Together',
  'visualizations': 'Charts & Graphs',
  'team-dashboard': 'Daily Metrics',
  'team-pulse': 'AI Presentations',
  'ai-specialists': 'Role-Based AI',
  'team-agents': 'Task Automation',
  'team-guidance': 'Team Playbooks',
  'research-projects': 'Deep Analysis',
  'business-coach': 'Metrics & OKRs',
  'scheduled-tasks': 'AI on Autopilot',
  'connect': 'Integrations Hub',
  'ai-advisors': 'Advisory Board',
  'assistant-skills': 'AI Skill Modules'
};

const colorClasses: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', gradient: 'from-purple-500 to-purple-600' },
  teal: { bg: 'bg-teal-500/20', border: 'border-teal-500/30', text: 'text-teal-400', gradient: 'from-teal-500 to-teal-600' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400', gradient: 'from-pink-500 to-pink-600' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', gradient: 'from-orange-500 to-orange-600' },
  sky: { bg: 'bg-sky-500/20', border: 'border-sky-500/30', text: 'text-sky-400', gradient: 'from-sky-500 to-sky-600' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', gradient: 'from-cyan-500 to-cyan-600' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', gradient: 'from-blue-500 to-blue-600' },
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', gradient: 'from-amber-500 to-amber-600' }
};

interface PointsLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  points_earned: number;
  achievement_type: string;
  created_at: string;
}

interface TeamMemberLeaderboard {
  user_id: string;
  email: string;
  name: string | null;
  total_points: number;
}

export default function MissionControlPage({ onOpenTab, onNavigateToStage, onOpenAdminSettings, onOpenFolderManager, onOpenHelpCenter }: MissionControlPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stageProgress, loading: launchLoading } = useLaunchPreparation();
  const { fuelData, loading: fuelLoading, refresh: refreshFuelLevel } = useFuelLevel();

  const [teamPoints, setTeamPoints] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const [comingSoonFeature, setComingSoonFeature] = useState<TabConfig | null>(null);
  const [infoFeature, setInfoFeature] = useState<TabConfig | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [documentsFilterCategory, setDocumentsFilterCategory] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsModalTab, setPointsModalTab] = useState<'activity' | 'how-to-earn'>('activity');
  const [showPointsInfoModal, setShowPointsInfoModal] = useState(false);
  const [pointsLog, setPointsLog] = useState<PointsLogEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<TeamMemberLeaderboard[]>([]);
  const [loadingPointsLog, setLoadingPointsLog] = useState(false);
  const [showSyncInfoModal, setShowSyncInfoModal] = useState(false);
  const [showBusinessCoachModal, setShowBusinessCoachModal] = useState(false);
  const [showDeepResearchModal, setShowDeepResearchModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const teamId = user.user_metadata?.team_id;
        if (!teamId) return;

        const role = user.user_metadata?.role || 'member';
        setIsAdmin(role === 'admin');

        const { data: teamData } = await supabase
          .from('teams')
          .select('total_launch_points')
          .eq('id', teamId)
          .maybeSingle();
        setTeamPoints(teamData?.total_launch_points || 0);

        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId);
        setMemberCount(count || 0);
      } catch (err) {
        console.error('Error fetching team data:', err);
      }
    };

    fetchData();
  }, [user]);

  const getStageProgress = (stage: 'fuel' | 'boosters' | 'guidance') => {
    return stageProgress.find(p => p.stage === stage);
  };

  const handleFeatureClick = (feature: TabConfig) => {
    if (feature.id === 'business-coach') {
      setShowBusinessCoachModal(true);
    } else if (feature.id === 'research-projects') {
      setShowDeepResearchModal(true);
    } else if (feature.isComingSoon) {
      setComingSoonFeature(feature);
    } else {
      onOpenTab(feature.id);
    }
  };

  const handleSync = async () => {
    if (!user || syncing) return;

    setSyncing(true);
    setSyncMessage(null);

    try {
      const teamId = user?.user_metadata?.team_id;
      if (!teamId) {
        setSyncMessage({ type: 'error', text: 'Team ID not found' });
        setSyncing(false);
        return;
      }

      const result = await triggerSyncNow({
        team_id: teamId,
        user_id: user.id,
        source: 'manual_sync_now'
      });

      if (result.success) {
        setSyncMessage({ type: 'success', text: 'Syncing new documents...' });
        setTimeout(() => {
          refreshFuelLevel();
          setSyncMessage(null);
        }, 3000);
      } else {
        setSyncMessage({ type: 'error', text: result.message || 'Sync failed' });
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncMessage({ type: 'error', text: 'Failed to sync documents' });
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenPointsModal = async () => {
    setShowPointsModal(true);
    setLoadingPointsLog(true);
    try {
      const teamId = user?.user_metadata?.team_id;
      if (!teamId) {
        setLoadingPointsLog(false);
        return;
      }

      const { data: teamUsers } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('team_id', teamId);

      if (!teamUsers || teamUsers.length === 0) {
        setPointsLog([]);
        setLeaderboard([]);
        setLoadingPointsLog(false);
        return;
      }

      const userIds = teamUsers.map(u => u.id);
      const userEmails: Record<string, string> = teamUsers.reduce((acc, u) => {
        acc[u.id] = u.email;
        return acc;
      }, {} as Record<string, string>);
      const userNames: Record<string, string | null> = teamUsers.reduce((acc, u) => {
        acc[u.id] = u.name;
        return acc;
      }, {} as Record<string, string | null>);

      const [progressResult, ledgerResult] = await Promise.all([
        supabase
          .from('launch_preparation_progress')
          .select('user_id, points_earned')
          .in('user_id', userIds),
        supabase
          .from('launch_points_ledger')
          .select('id, user_id, points, reason, reason_display, stage, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (progressResult.error) throw progressResult.error;
      if (ledgerResult.error) throw ledgerResult.error;

      const userTotalPoints: Record<string, number> = {};
      (progressResult.data || []).forEach(entry => {
        if (!userTotalPoints[entry.user_id]) {
          userTotalPoints[entry.user_id] = 0;
        }
        userTotalPoints[entry.user_id] += entry.points_earned;
      });

      (ledgerResult.data || []).forEach(entry => {
        if (!userTotalPoints[entry.user_id]) {
          userTotalPoints[entry.user_id] = 0;
        }
        userTotalPoints[entry.user_id] += entry.points;
      });

      const activityLog: PointsLogEntry[] = (ledgerResult.data || []).map(entry => ({
        id: entry.id,
        user_id: entry.user_id,
        user_email: userEmails[entry.user_id] || 'Unknown',
        points_earned: entry.points,
        achievement_type: entry.reason_display || entry.reason,
        created_at: entry.created_at
      }));

      const leaderboardData: TeamMemberLeaderboard[] = teamUsers.map(u => ({
        user_id: u.id,
        email: u.email,
        name: u.name,
        total_points: userTotalPoints[u.id] || 0
      })).sort((a, b) => b.total_points - a.total_points);

      setLeaderboard(leaderboardData);
      setPointsLog(activityLog.slice(0, 50));
    } catch (err) {
      console.error('Error fetching points log:', err);
    } finally {
      setLoadingPointsLog(false);
    }
  };

  const formatAchievementType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const coreFeatureTabs: TabConfig[] = [
    {
      id: 'private',
      label: 'Agent Chat',
      shortLabel: 'Agent',
      icon: 'MessageSquare',
      isCore: true,
      isComingSoon: false,
      order: -2,
      description: 'Powerful AI-driven conversations with your Team Agent. Search documents, analyze data across categories, and get deep insights.',
      color: 'emerald'
    },
    {
      id: 'reports',
      label: 'AI Reports',
      shortLabel: 'Reports',
      icon: 'FileBarChart',
      isCore: true,
      isComingSoon: false,
      order: -1,
      description: 'Schedule automated reports delivered to your inbox. Stay informed with daily, weekly, or monthly insights.',
      color: 'purple'
    }
  ];

  const moonshotFeature: TabConfig = {
    id: 'moonshot-challenge',
    label: 'Moonshot',
    shortLabel: 'Moonshot',
    icon: 'Rocket',
    isCore: false,
    isComingSoon: false,
    order: 4.5,
    description: '$5M prize pool - All AI Rocket users are automatically entered!',
    color: 'orange'
  };

  const nonCoreFeatures = TAB_CONFIGS.filter(t => !t.isCore && t.id !== 'team-pulse' && t.id !== 'team-dashboard' && t.id !== 'challenge' && t.id !== 'moonshot-details');
  const teamDashboardFeature = TAB_CONFIGS.find(t => t.id === 'team-dashboard');
  const teamPulseFeature = TAB_CONFIGS.find(t => t.id === 'team-pulse');
  const visualizationsIndex = nonCoreFeatures.findIndex(t => t.id === 'visualizations');
  const featureTabs = [
    ...coreFeatureTabs,
    ...nonCoreFeatures.slice(0, visualizationsIndex + 1),
    ...(teamDashboardFeature ? [teamDashboardFeature] : []),
    ...(teamPulseFeature ? [teamPulseFeature] : []),
    moonshotFeature,
    ...nonCoreFeatures.slice(visualizationsIndex + 1)
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900" data-tour="mission-control-page">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Agent Tools</h2>
                      <p className="text-xs text-slate-400">Click to open or learn more</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenHelpCenter?.('whats-new')}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-xl text-sm text-amber-400 font-medium transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">What's New</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {featureTabs.map(feature => {
                    const IconComponent = featureIconMap[feature.icon];
                    const colors = colorClasses[feature.color] || colorClasses.emerald;
                    const isMoonshot = feature.id === 'moonshot-challenge';
                    if (isMoonshot) {
                      return (
                        <button
                          key={feature.id}
                          onClick={() => onOpenTab('challenge')}
                          className="group relative p-4 py-4 rounded-xl border transition-all text-left bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/40 hover:border-orange-400 hover:scale-[1.02]"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoFeature(feature);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                setInfoFeature(feature);
                              }
                            }}
                            className="absolute top-2 right-2 p-1 opacity-50 hover:opacity-100 hover:bg-slate-700/50 rounded-lg transition-all cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                          </div>

                          <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-2 bg-orange-500/20">
                              <Rocket className="w-7 h-7 text-orange-400" />
                            </div>
                            <span className="text-sm font-medium leading-tight text-orange-400">
                              <span className="hidden md:inline">{feature.label}</span>
                              <span className="md:hidden">{feature.shortLabel}</span>
                            </span>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={feature.id}
                        onClick={() => handleFeatureClick(feature)}
                        className={`
                          group relative p-4 py-4 rounded-xl border transition-all text-left
                          ${feature.isComingSoon
                            ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            : `${colors.bg} ${colors.border} hover:scale-[1.02]`
                          }
                        `}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (feature.id === 'business-coach') {
                              setShowBusinessCoachModal(true);
                            } else if (feature.id === 'research-projects') {
                              setShowDeepResearchModal(true);
                            } else {
                              setInfoFeature(feature);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              if (feature.id === 'business-coach') {
                                setShowBusinessCoachModal(true);
                              } else if (feature.id === 'research-projects') {
                                setShowDeepResearchModal(true);
                              } else {
                                setInfoFeature(feature);
                              }
                            }
                          }}
                          className="absolute top-2 right-2 p-1 opacity-50 hover:opacity-100 hover:bg-slate-700/50 rounded-lg transition-all cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 ${feature.isComingSoon ? 'bg-slate-700' : colors.bg}`}>
                            {IconComponent && <IconComponent className={`${iconSizeOverrides[feature.icon] || 'w-7 h-7'} ${feature.isComingSoon ? 'text-slate-400' : colors.text}`} />}
                          </div>
                          <span className={`text-sm font-medium leading-tight ${feature.isComingSoon ? 'text-slate-400' : 'text-white'}`}>
                            <span className="hidden md:inline">{feature.label}</span>
                            <span className="md:hidden">{feature.shortLabel}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="lg:w-[280px] lg:flex-shrink-0 space-y-4">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4" data-tour="data-sync">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">AI Data Sync</h3>
                    <button
                      onClick={() => setShowSyncInfoModal(true)}
                      className="p-0.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        onClick={() => onOpenFolderManager?.()}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
                      >
                        <Folder className="w-3 h-3" />
                        Manage
                      </button>
                    )}
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>
                </div>

                {syncMessage && (
                  <p className={`text-xs mb-2 ${syncMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {syncMessage.text}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDocumentsModal(true)}
                    className="bg-slate-700/50 hover:bg-slate-700 rounded-xl p-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-slate-400">Documents</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {fuelLoading ? '...' : fuelData?.fully_synced_documents || 0}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCategoriesModal(true)}
                    className="bg-slate-700/50 hover:bg-slate-700 rounded-xl p-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-slate-400">Categories</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {fuelLoading ? '...' : fuelData?.category_count || 0}
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4" data-tour="team-panel">
                <button
                  type="button"
                  onClick={() => onOpenAdminSettings?.()}
                  className="w-full flex items-center justify-between hover:bg-slate-700/50 rounded-xl p-2 -m-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Team Settings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </button>
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4" data-tour="launch-points">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h2 className="text-sm font-bold text-white">Launch Points</h2>
                    <button
                      onClick={() => setShowPointsInfoModal(true)}
                      className="p-0.5 hover:bg-slate-700 rounded-full transition-colors"
                      title="Learn about Launch Points"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                    </button>
                  </div>
                  <button
                    onClick={handleOpenPointsModal}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-lg px-2.5 py-1 transition-all"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-base font-bold text-white">{teamPoints.toLocaleString()}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>

                <div className="space-y-2">
                  {(['fuel', 'boosters', 'guidance'] as const).map(stage => {
                    const config = stageConfig[stage];
                    const progress = getStageProgress(stage);
                    const StageIcon = config.icon;
                    const level = progress?.level || 0;
                    const progressPercent = calculateStageProgress(stage, level);

                    return (
                      <button
                        key={stage}
                        onClick={() => onNavigateToStage?.(stage)}
                        className="group w-full flex items-center gap-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-xl p-2.5 border border-slate-600/50 hover:border-slate-500 transition-all text-left"
                      >
                        <div className={`w-7 h-7 flex-shrink-0 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center`}>
                          <StageIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white">{config.label}</span>
                            <span className="text-[10px] text-slate-400">Lv {level}/5</span>
                          </div>
                          <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {comingSoonFeature && (
        <ComingSoonModal
          feature={comingSoonFeature}
          isOpen={true}
          onClose={() => setComingSoonFeature(null)}
        />
      )}

      {infoFeature && (
        <FeatureInfoModal
          feature={infoFeature}
          isOpen={true}
          onClose={() => setInfoFeature(null)}
          onOpenFeature={() => handleFeatureClick(infoFeature)}
        />
      )}

      {showDocumentsModal && (
        <DocumentsListModal
          isOpen={showDocumentsModal}
          onClose={() => {
            setShowDocumentsModal(false);
            setDocumentsFilterCategory(null);
          }}
          onDocumentDeleted={() => {}}
          initialCategory={documentsFilterCategory}
        />
      )}

      {showCategoriesModal && (
        <CategoriesDetailModal
          isOpen={showCategoriesModal}
          onClose={() => setShowCategoriesModal(false)}
          onCategoryClick={(category) => {
            setDocumentsFilterCategory(category);
            setShowCategoriesModal(false);
            setShowDocumentsModal(true);
          }}
        />
      )}

      {showPointsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Team Launch Points</h2>
                  <p className="text-sm text-slate-400">Total: {teamPoints.toLocaleString()} points</p>
                </div>
              </div>
              <button
                onClick={() => setShowPointsModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Points Leaderboard
                </h3>
                {loadingPointsLog ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No team members found</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((member, index) => (
                      <div
                        key={member.user_id}
                        className={`flex items-center justify-between rounded-lg p-3 ${
                          index === 0 ? 'bg-amber-500/10 border border-amber-500/30' :
                          index === 1 ? 'bg-slate-400/10 border border-slate-400/30' :
                          index === 2 ? 'bg-orange-700/10 border border-orange-700/30' :
                          'bg-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-amber-500 text-white' :
                            index === 1 ? 'bg-slate-400 text-white' :
                            index === 2 ? 'bg-orange-700 text-white' :
                            'bg-slate-600 text-slate-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {member.name || member.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-slate-400">{member.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-amber-400">{member.total_points}</span>
                          <span className="text-xs text-slate-500 ml-1">pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-slate-700">
                <div className="flex">
                  <button
                    onClick={() => setPointsModalTab('activity')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      pointsModalTab === 'activity'
                        ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Points Activity
                  </button>
                  <button
                    onClick={() => setPointsModalTab('how-to-earn')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      pointsModalTab === 'how-to-earn'
                        ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    How to Earn Points
                  </button>
                </div>
              </div>

              {pointsModalTab === 'activity' ? (
                <div className="p-4">
                  {loadingPointsLog ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                  ) : pointsLog.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No points earned yet</p>
                      <p className="text-xs text-slate-500 mt-1">Complete tasks to earn Launch Points</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {pointsLog.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {formatAchievementType(entry.achievement_type)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">{entry.user_email}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className="text-sm font-bold text-amber-400">+{entry.points_earned}</span>
                            <span className="text-xs text-slate-500">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Trophy className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-300">$5M AI Moonshot Challenge</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Launch Points are part of the scoring criteria that measure how your team uses AI to <span className="text-white font-medium">Run</span>, <span className="text-white font-medium">Build</span>, and <span className="text-white font-medium">Grow</span> your business.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Rocket className="w-5 h-5 text-orange-400" />
                        <span className="text-base font-semibold text-white">Launch Prep</span>
                        <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">Complete setup stages to earn points and prepare your team for AI-powered success.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Fuel className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium text-white">Fuel</span>
                          </div>
                          <p className="text-xs text-slate-400">Add data to power AI</p>
                          <p className="text-sm font-bold text-orange-400 mt-2">Up to 50 pts</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-white">Boosters</span>
                          </div>
                          <p className="text-xs text-slate-400">Use AI features</p>
                          <p className="text-sm font-bold text-cyan-400 mt-2">Up to 50 pts</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Compass className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-white">Guidance</span>
                          </div>
                          <p className="text-xs text-slate-400">Configure team</p>
                          <p className="text-sm font-bold text-green-400 mt-2">Up to 50 pts</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 text-center">5 levels per stage = up to 150 pts each</p>
                    </div>

                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-amber-400" />
                        <span className="text-base font-semibold text-white">Milestones</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">Unlock bonus points for reaching usage milestones.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-white">Chatty Day</p>
                          <p className="text-xs text-slate-400 mt-1">Send 10 messages in a day</p>
                          <p className="text-sm font-bold text-amber-400 mt-2">+25 pts</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-white">Message Milestones</p>
                          <p className="text-xs text-slate-400 mt-1">100 / 500 / 1000 total messages</p>
                          <p className="text-sm font-bold text-amber-400 mt-2">+100 / +250 / +500 pts</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-white">Team Chat Milestones</p>
                          <p className="text-xs text-slate-400 mt-1">50 / 200 team chat messages</p>
                          <p className="text-sm font-bold text-amber-400 mt-2">+100 / +200 pts</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-white">Visualization Milestones</p>
                          <p className="text-xs text-slate-400 mt-1">5 / 25 / 100 saved visualizations</p>
                          <p className="text-sm font-bold text-amber-400 mt-2">+150 / +300 / +500 pts</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-white">Report Milestones</p>
                          <p className="text-xs text-slate-400 mt-1">3 / 10 / 25 scheduled reports</p>
                          <p className="text-sm font-bold text-amber-400 mt-2">+100 / +250 / +500 pts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSyncInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">AI Data Sync</h2>
              </div>
              <button
                onClick={() => setShowSyncInfoModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-300">
                AI Data Sync connects your cloud storage to power Astra's intelligence. Here's how it works:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Connect Your Cloud Drive</p>
                    <p className="text-xs text-slate-400">Link Google Drive, Microsoft OneDrive/SharePoint, or upload files directly</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-400">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Select Folders</p>
                    <p className="text-xs text-slate-400">Choose which folders to sync (strategy, meetings, financials, projects)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-400">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Automatic Processing</p>
                    <p className="text-xs text-slate-400">Documents are securely processed and categorized for AI analysis</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-400">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AI Help</p>
                    <p className="text-xs text-slate-400">Get insights from your synced documents in chat</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3 mt-4">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-300">Tip:</strong> Use "Sync Now" to manually trigger a sync after adding new files. Documents are also synced automatically every few hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {showPointsInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">About Launch Points</h2>
              </div>
              <button
                onClick={() => setShowPointsInfoModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="w-6 h-6 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-amber-300">$5M AI Moonshot Challenge</p>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      Launch Points are an important part of the scoring criteria that measure how your team uses AI to:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">Run</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium">Build</span>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm font-medium">Grow</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-3">
                      Your team's Launch Points demonstrate your commitment to leveraging AI for business success.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Three Ways to Earn Points</h3>
                <div className="space-y-3">
                  <div className="bg-slate-700/30 rounded-lg p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Launch Prep</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Complete Fuel, Boosters, and Guidance stages. Earn 50 points per level (up to 750 total).</p>
                    </div>
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Activity</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Earn points daily for AI conversations, reports, visualizations, and team collaboration.</p>
                    </div>
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Milestones</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Unlock bonus points for team achievements like consecutive days active, team growth, and data milestones.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-xs text-slate-400 text-center">
                  Click on your team's Launch Points total to see the leaderboard and detailed earning opportunities.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBusinessCoachModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">AI Business Coach</h2>
                  <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">Coming Soon</span>
                </div>
              </div>
              <button
                onClick={() => setShowBusinessCoachModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-lg p-4">
                <p className="text-base font-semibold text-sky-300">
                  Master your metrics, OKRs, and business frameworks.
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Elevate your leadership with the AI Business Coach, the first intelligent assistant designed to help teams execute with excellence. Whether you are running on EOS, implementing OKRs, or following the Scaling Up framework, our AI provides real-time, custom guidance to keep your team aligned.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-sky-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Compass className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Framework Agnostic</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Seamlessly switch between or combine methodologies like the Entrepreneurial Operating System, Scaling Up, and Rockefeller Habits.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Metric Tracking</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Stay on top of your KPIs and "Rocks" with automated insights.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Smart Guidance</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Get AI-driven advice for your Level 10 meetings, quarterly planning, and goal setting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3 mt-4">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  <strong className="text-slate-400">Disclaimer:</strong> AI Business Coach is an independent software tool. It is not affiliated with, endorsed by, or a product of EOS Worldwide (EOS), Gazelles Inc. (Scaling Up), or any other trademarked business framework mentioned. All trademarks and registered trademarks are the property of their respective owners and are used here for descriptive purposes only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeepResearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Deep Research</h2>
                  <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">Coming Soon</span>
                </div>
              </div>
              <button
                onClick={() => setShowDeepResearchModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-lg p-4">
                <p className="text-base font-semibold text-orange-300">
                  Launch deep AI research investigations on topics critical to your business.
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Deep Research goes beyond simple searches. Powered by advanced AI models, it conducts comprehensive multi-source analysis, synthesizes findings, and delivers actionable insights on complex business questions.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Search className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Multi-Source Analysis</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Aggregates information from multiple sources including your synced documents, web research, and industry databases.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Comprehensive Reports</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Receive detailed research reports with citations, data analysis, and executive summaries.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Hours of Research in Minutes</p>
                      <p className="text-xs text-slate-400 mt-1">
                        What would take your team hours or days to research is completed in minutes with AI-powered analysis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm font-medium text-white mb-3">Example Research Projects</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-xs text-slate-300">"Analyze our top 3 competitors' pricing strategies and market positioning"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-xs text-slate-300">"Research emerging AI regulations that could impact our SaaS product in 2025"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-xs text-slate-300">"Identify potential acquisition targets in the healthcare tech space under $50M valuation"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-xs text-slate-300">"Compare our employee benefits package against industry benchmarks"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-xs text-slate-300">"Research best practices for expanding into the European market"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
