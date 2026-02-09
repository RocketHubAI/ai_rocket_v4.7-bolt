import React, { useState, useEffect } from 'react';
import {
  Users, Building2, FileText, MessageSquare, BarChart3, Download,
  TrendingUp, TrendingDown, Minus, Mail, HardDrive, AlertCircle,
  CheckCircle, XCircle, Search, ArrowUpDown, MessageCircleQuestion, Shield, X, ChevronRight, MessageCircle,
  Copy, UserPlus, Send, RefreshCw, ClipboardList, Rocket, Trash2, Workflow, KeyRound, Calendar, Sparkles, FileCode
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import SupportResponseModal from './SupportResponseModal';
import { MarketingEmailsPanel } from './MarketingEmailsPanel';
import { SetupProgressPanel } from './SetupProgressPanel';
import { MoonshotAnalyticsPanel } from './MoonshotAnalyticsPanel';
import { WorkshopAnalyticsPanel } from './WorkshopAnalyticsPanel';
import { DatabaseMetricsPanel } from './DatabaseMetricsPanel';
import { AgentWorkflowsPanel } from './AgentWorkflowsPanel';
import { DevUpdatesPanel } from './DevUpdatesPanel';
import { ReportsAnalyticsPanel } from './ReportsAnalyticsPanel';

interface UserMetric {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  team_id: string;
  team_name: string;
  role: string;
  last_sign_in_at: string;
  last_active_at: string;
  private_chats_count: number;
  team_messages_count: number;
  documents_synced: boolean;
  strategy_docs_count: number;
  meeting_docs_count: number;
  financial_docs_count: number;
  total_docs_count: number;
  reports_count: number;
  drive_connected: boolean;
  workshop_only: boolean;
  document_categories: Record<string, number>;
  launch_stage: string;
  launch_stage_level: number;
  is_launched: boolean;
}

interface CategoryCount {
  name: string;
  label: string;
  count: number;
  color: string;
}

interface OverviewMetrics {
  totalUsers: number;
  totalTeams: number;
  totalDocuments: number;
  strategyDocsCount: number;
  meetingDocsCount: number;
  financialDocsCount: number;
  peopleDocsCount: number;
  legalDocsCount: number;
  customerDocsCount: number;
  industryDocsCount: number;
  productDocsCount: number;
  marketingDocsCount: number;
  salesDocsCount: number;
  operationsDocsCount: number;
  supportDocsCount: number;
  referenceDocsCount: number;
  otherDocsCount: number;
  topCategories: CategoryCount[];
  totalChats: number;
  privateChats: number;
  teamChats: number;
  reportsChats: number;
  totalReports: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
}

interface FeedbackItem {
  id: string;
  user_email: string;
  created_at: string;
  answers: Array<{
    question_text: string;
    rating: number;
    comment: string | null;
  }>;
  general_feedback: string | null;
}

interface SupportMessage {
  id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  support_type: string;
  support_details: {
    subject?: string;
    description?: string;
    url_context?: string;
  };
  attachment_urls: string[];
  status?: 'needs_response' | 'responded';
  admin_response?: string;
  responded_at?: string;
  internal_notes?: string;
  not_resolved?: boolean;
}

interface PreviewRequest {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  invite_sent: boolean;
  invite_sent_at: string | null;
  invite_code: string | null;
  user_onboarded?: boolean;
  team_name?: string | null;
  team_created_at?: string | null;
}

interface FeedbackStats {
  avgRatingByCategory: Record<string, number>;
  totalResponses: number;
  categoryBreakdown: Array<{
    category: string;
    avg_rating: number;
    count: number;
  }>;
}

interface OAuthCertification {
  id: string;
  oauth_app_id: string;
  app_name: string;
  client_id: string;
  certification_date: string;
  recertification_due: string;
  status: 'active' | 'pending_recertification' | 'expired';
  last_recertification: string | null;
  notification_sent_30_days: boolean;
  notification_sent_7_days: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type TimeFilter = '7days' | '30days' | '90days' | 'all';
type SortField = 'email' | 'created_at' | 'team_name' | 'documents' | 'messages';
type SortDirection = 'asc' | 'desc';
type DetailView = 'users' | 'teams' | 'documents' | 'chats' | 'preview_requests' | 'support' | 'feedback' | 'active_users' | 'marketing_emails' | 'setup_progress' | 'moonshot' | 'workshop' | 'database_metrics' | 'agent_workflows' | 'oauth_certifications' | 'dev_updates' | 'reports' | null;
type SupportFilter = 'all' | 'bug_report' | 'support_message' | 'feature_request';
type DocumentCategoryFilter = 'all' | 'strategy' | 'meetings' | 'financial' | 'people' | 'legal' | 'customer' | 'industry' | 'product' | 'marketing' | 'sales' | 'operations' | 'support' | 'reference' | 'other';

interface AdminDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen = true, onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [users, setUsers] = useState<UserMetric[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [previewRequests, setPreviewRequests] = useState<PreviewRequest[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [detailView, setDetailView] = useState<DetailView>('users');
  const [supportFilter, setSupportFilter] = useState<SupportFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategoryFilter>('all');
  const [invitingPreview, setInvitingPreview] = useState<string | null>(null);
  const [generatedPreviewCode, setGeneratedPreviewCode] = useState<string>('');
  const [previewInviteEmail, setPreviewInviteEmail] = useState<string>('');
  const [sendingPreviewEmail, setSendingPreviewEmail] = useState(false);
  const [previewInviteSuccess, setPreviewInviteSuccess] = useState('');
  const [previewInviteError, setPreviewInviteError] = useState('');
  const [deletingPreviewId, setDeletingPreviewId] = useState<string | null>(null);
  const [newPreviewEmail, setNewPreviewEmail] = useState('');
  const [addingPreviewRequest, setAddingPreviewRequest] = useState(false);
  const [addPreviewError, setAddPreviewError] = useState('');
  const [teamsData, setTeamsData] = useState<Array<{
    id: string;
    name: string;
    created_at: string;
    member_count: number;
    documents_count: number;
    chunk_count: number;
    reports_count: number;
    scheduled_reports_count: number;
    manual_reports_count: number;
    private_messages_count: number;
    team_messages_count: number;
    total_messages_count: number;
    last_active_at: string;
  }>>([]);
  const [documentsData, setDocumentsData] = useState<any[]>([]);
  const [teamsSortField, setTeamsSortField] = useState<'name' | 'created_at' | 'member_count' | 'documents_count' | 'reports_count' | 'total_messages_count' | 'last_active_at'>('created_at');
  const [teamsSortDirection, setTeamsSortDirection] = useState<'asc' | 'desc'>('desc');
  const [responseModalMessage, setResponseModalMessage] = useState<SupportMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_response' | 'responded' | 'not_resolved'>('all');
  const [activeUsersToday, setActiveUsersToday] = useState<Array<{
    id: string;
    email: string;
    name?: string;
    team_name: string;
    private_messages_today: number;
    team_messages_today: number;
    reports_today: number;
    total_actions_today: number;
  }>>([]);
  const [setupProgressData, setSetupProgressData] = useState<any[]>([]);
  const [loadingSetupProgress, setLoadingSetupProgress] = useState(false);
  const [moonshotRegistrationCount, setMoonshotRegistrationCount] = useState<number>(0);
  const [workshopRegistrationCount, setWorkshopRegistrationCount] = useState<number>(0);
  const [workflowExecutionCount, setWorkflowExecutionCount] = useState<number | null>(null);
  const [devUpdatesCount, setDevUpdatesCount] = useState<number>(0);
  const [oauthCertifications, setOauthCertifications] = useState<OAuthCertification[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserMetric | null>(null);

  const superAdminEmails = ['clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai'];
  const isSuperAdmin = user?.email && superAdminEmails.includes(user.email);

  useEffect(() => {
    if (isOpen && user && isSuperAdmin) {
      // Only reload if data doesn't exist or timeFilter changed
      const lastTimeFilter = sessionStorage.getItem('adminDashboardTimeFilter');
      if (!overviewMetrics || timeFilter !== lastTimeFilter) {
        loadAllMetrics();
        loadPreviewRequests();
        loadSetupProgress();
        loadMoonshotCount();
        loadWorkshopCount();
        loadWorkflowExecutionCount();
        loadOAuthCertifications();
        sessionStorage.setItem('adminDashboardTimeFilter', timeFilter);
      } else {
        setLoading(false);
      }
    } else if (isOpen && user && !isSuperAdmin) {
      // User is not a super admin
      setLoading(false);
    } else if (isOpen && !authLoading && !user) {
      // Not authenticated
      setLoading(false);
    }
  }, [isOpen, timeFilter, user, isSuperAdmin, authLoading]);

  // Real-time subscriptions for key tables - use granular updates instead of full refresh
  useEffect(() => {
    if (!isOpen || !user || !isSuperAdmin) return;

    // Subscribe to feedback_submissions - only reload feedback data
    const feedbackChannel = supabase
      .channel('admin-feedback-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feedback_submissions' },
        () => {
          console.log('Feedback submitted, updating feedback data...');
          loadFeedback();
          loadFeedbackStats();
        }
      )
      .subscribe();

    // Subscribe to preview_requests
    const previewChannel = supabase
      .channel('admin-preview-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'preview_requests' },
        () => {
          console.log('Preview request changed, updating preview data...');
          loadPreviewRequests();
        }
      )
      .subscribe();

    // Subscribe to setup_guide_progress
    const setupProgressChannel = supabase
      .channel('admin-setup-progress-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'setup_guide_progress' },
        () => {
          console.log('Setup progress changed, updating setup data...');
          loadSetupProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(previewChannel);
      supabase.removeChannel(setupProgressChannel);
    };
  }, [isOpen, user, isSuperAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllMetrics();
      await loadPreviewRequests();
      await loadSetupProgress();
      await loadMoonshotCount();
      await loadWorkshopCount();
      await loadOAuthCertifications();
    } finally {
      setRefreshing(false);
    }
  };

  const loadAllMetrics = async () => {
    setLoading(true);
    try {
      // Call the Edge Function with service role access
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard-data?_t=${Date.now()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          cache: 'no-store',
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch admin data';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      await processAdminDashboardData(data);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error loading metrics:', error);
      // Log detailed error for debugging
      console.error('Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const processAdminDashboardData = async (data: any) => {
    const users = data.users || [];
    const teams = data.teams || [];
    const documents = data.documents || [];
    const chats = data.chats || [];
    const reports = data.reports || [];
    const driveConnections = data.drive_connections || [];
    const allFeedback = data.feedback || [];
    const launchStatus = data.launch_status || [];
    const launchProgress = data.launch_progress || [];
    const documentStats = data.document_stats || [];

    const teamMap = new Map(teams.map((t: any) => [t.id, t.name]));
    const driveMap = new Map(driveConnections.map((d: any) => [d.user_id, d.is_active]));
    const launchStatusMap = new Map(launchStatus.map((ls: any) => [ls.user_id, ls]));
    const launchProgressMap = new Map();

    launchProgress.forEach((lp: any) => {
      if (!launchProgressMap.has(lp.user_id)) {
        launchProgressMap.set(lp.user_id, {});
      }
      launchProgressMap.get(lp.user_id)[lp.stage] = lp;
    });

    const enrichedUsers = users.map((user: any) => {
      const userChats = chats.filter((c: any) => c.user_id === user.id);
      const privateChats = userChats.filter((c: any) => c.mode === 'private' && c.message_type === 'user').length;
      const teamMessages = userChats.filter((c: any) => c.mode === 'team' && c.message_type === 'user').length;
      const reportsChats = userChats.filter((c: any) => c.mode === 'reports').length;

      const userDocs = documents.filter((d: any) => d.teamId === user.team_id);
      const strategyCount = userDocs.filter((d: any) => d.category === 'strategy').length;
      const meetingCount = userDocs.filter((d: any) => d.category === 'meetings').length;
      const financialCount = userDocs.filter((d: any) => d.category === 'financial').length;
      const totalDocs = userDocs.length;

      const teamDocStats = documentStats.filter((ds: any) => ds.team_id === user.team_id);
      const documentCategories: Record<string, number> = {};
      teamDocStats.forEach((stat: any) => {
        const category = stat.doc_category || 'uncategorized';
        documentCategories[category] = parseInt(stat.doc_count);
      });

      const userLaunchStatus = launchStatusMap.get(user.id);
      const userLaunchProgress = launchProgressMap.get(user.id) || {};
      const currentStageProgress = userLaunchStatus
        ? userLaunchProgress[userLaunchStatus.current_stage]
        : null;

      return {
        id: user.id,
        email: user.email,
        name: user.name || null,
        created_at: user.created_at,
        team_id: user.team_id,
        team_name: teamMap.get(user.team_id) || 'No Team',
        role: user.role || 'member',
        last_sign_in_at: user.last_sign_in_at || user.created_at,
        last_active_at: user.last_active_at || user.created_at,
        private_chats_count: privateChats,
        team_messages_count: teamMessages,
        documents_synced: totalDocs > 0,
        strategy_docs_count: strategyCount,
        meeting_docs_count: meetingCount,
        financial_docs_count: financialCount,
        total_docs_count: totalDocs,
        reports_count: reportsChats,
        drive_connected: driveMap.get(user.id) || false,
        workshop_only: user.workshop_only || false,
        document_categories: documentCategories,
        launch_stage: userLaunchStatus?.current_stage || 'onboarding',
        launch_stage_level: currentStageProgress?.level || 0,
        is_launched: userLaunchStatus?.is_launched || false
      };
    });

    const teamStatsMap = new Map((data.team_stats || []).map((stat: any) => [
      stat.team_id,
      { doc_count: parseInt(stat.doc_count), chunk_count: parseInt(stat.chunk_count) }
    ]));

    const enrichedTeams = teams.map((team: any) => {
      const memberCount = users.filter((u: any) => u.team_id === team.id).length;
      const teamStats = teamStatsMap.get(team.id) || { doc_count: 0, chunk_count: 0 };

      const teamUsers = users.filter((u: any) => u.team_id === team.id);
      const teamReportConfigs = reports.filter((r: any) =>
        teamUsers.some((u: any) => u.id === r.user_id)
      );
      const scheduledReports = teamReportConfigs.filter((r: any) => r.schedule_frequency && r.schedule_frequency !== 'manual').length;
      const manualReports = teamReportConfigs.filter((r: any) => !r.schedule_frequency || r.schedule_frequency === 'manual').length;

      const privateMessages = chats.filter((c: any) =>
        c.mode === 'private' && c.message_type === 'user' && teamUsers.some((u: any) => u.id === c.user_id)
      ).length;
      const teamMessages = chats.filter((c: any) =>
        c.mode === 'team' && c.message_type === 'user' && teamUsers.some((u: any) => u.id === c.user_id)
      ).length;
      const reportsMessages = chats.filter((c: any) =>
        c.mode === 'reports' && teamUsers.some((u: any) => u.id === c.user_id)
      ).length;

      // Get most recent last_active_at from team users
      const lastActiveAt = teamUsers.length > 0
        ? teamUsers.reduce((latest: string, u: any) => {
            const userLastActive = u.last_active_at || u.created_at;
            return !latest || new Date(userLastActive) > new Date(latest) ? userLastActive : latest;
          }, '')
        : team.created_at;

      return {
        id: team.id,
        name: team.name,
        created_at: team.created_at,
        member_count: memberCount,
        documents_count: teamStats.doc_count,
        chunk_count: teamStats.chunk_count,
        reports_count: reportsMessages,
        scheduled_reports_count: scheduledReports,
        manual_reports_count: manualReports,
        private_messages_count: privateMessages,
        team_messages_count: teamMessages,
        total_messages_count: privateMessages + teamMessages + reportsMessages,
        last_active_at: lastActiveAt
      };
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const active7Days = users.filter((u: any) =>
      u.last_active_at && new Date(u.last_active_at) >= sevenDaysAgo
    ).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const active30Days = users.filter((u: any) =>
      u.last_active_at && new Date(u.last_active_at) >= thirtyDaysAgo
    ).length;

    const feedbackSubmissions = allFeedback.filter((f: any) => !f.support_type);
    const supportMsgs = allFeedback.filter((f: any) => f.support_type);

    const strategyDocsCount = documents.filter((d: any) => d.category === 'strategy').length;
    const meetingDocsCount = documents.filter((d: any) => d.category === 'meetings').length;
    const financialDocsCount = documents.filter((d: any) => d.category === 'financial').length;
    const peopleDocsCount = documents.filter((d: any) => d.category === 'people').length;
    const legalDocsCount = documents.filter((d: any) => d.category === 'legal').length;
    const customerDocsCount = documents.filter((d: any) => d.category === 'customer').length;
    const industryDocsCount = documents.filter((d: any) => d.category === 'industry').length;
    const productDocsCount = documents.filter((d: any) => d.category === 'product').length;
    const marketingDocsCount = documents.filter((d: any) => d.category === 'marketing').length;
    const salesDocsCount = documents.filter((d: any) => d.category === 'sales').length;
    const operationsDocsCount = documents.filter((d: any) => d.category === 'operations').length;
    const supportDocsCount = documents.filter((d: any) => d.category === 'support').length;
    const referenceDocsCount = documents.filter((d: any) => d.category === 'reference').length;
    const otherDocsCount = documents.filter((d: any) => d.category === 'other' || d.category === 'uncategorized').length;

    setUsers(enrichedUsers);
    setTeamsData(enrichedTeams);
    setDocumentsData(documents);

    const chatCounts = data.chat_counts || { private: 0, team: 0, reports: 0, total: chats.length };

    // Calculate top 3 categories by document count
    const categoryColors: Record<string, string> = {
      strategy: 'blue',
      meetings: 'purple',
      financial: 'green',
      people: 'orange',
      legal: 'red',
      customer: 'pink',
      industry: 'indigo',
      product: 'cyan',
      marketing: 'yellow',
      sales: 'teal',
      operations: 'lime',
      support: 'amber',
      reference: 'sky',
      other: 'gray'
    };

    const allCategories: CategoryCount[] = [
      { name: 'strategy', label: 'Strategy', count: strategyDocsCount, color: categoryColors.strategy },
      { name: 'meetings', label: 'Meetings', count: meetingDocsCount, color: categoryColors.meetings },
      { name: 'financial', label: 'Financial', count: financialDocsCount, color: categoryColors.financial },
      { name: 'people', label: 'People', count: peopleDocsCount, color: categoryColors.people },
      { name: 'legal', label: 'Legal', count: legalDocsCount, color: categoryColors.legal },
      { name: 'customer', label: 'Customer', count: customerDocsCount, color: categoryColors.customer },
      { name: 'industry', label: 'Industry', count: industryDocsCount, color: categoryColors.industry },
      { name: 'product', label: 'Product', count: productDocsCount, color: categoryColors.product },
      { name: 'marketing', label: 'Marketing', count: marketingDocsCount, color: categoryColors.marketing },
      { name: 'sales', label: 'Sales', count: salesDocsCount, color: categoryColors.sales },
      { name: 'operations', label: 'Operations', count: operationsDocsCount, color: categoryColors.operations },
      { name: 'support', label: 'Support', count: supportDocsCount, color: categoryColors.support },
      { name: 'reference', label: 'Reference', count: referenceDocsCount, color: categoryColors.reference },
      { name: 'other', label: 'Other', count: otherDocsCount, color: categoryColors.other }
    ];

    const topCategories = allCategories
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    setOverviewMetrics({
      totalUsers: users.length,
      totalTeams: teams.length,
      totalDocuments: documents.length,
      strategyDocsCount,
      meetingDocsCount,
      financialDocsCount,
      peopleDocsCount,
      legalDocsCount,
      customerDocsCount,
      industryDocsCount,
      productDocsCount,
      marketingDocsCount,
      salesDocsCount,
      operationsDocsCount,
      supportDocsCount,
      referenceDocsCount,
      otherDocsCount,
      topCategories,
      totalChats: chatCounts.total,
      privateChats: chatCounts.private,
      teamChats: chatCounts.team,
      reportsChats: chatCounts.reports,
      totalReports: chatCounts.reports_today || 0,
      activeUsersLast7Days: active7Days,
      activeUsersLast30Days: active30Days
    });

    // Set active users today from the edge function data
    if (data.active_users_today) {
      setActiveUsersToday(data.active_users_today);
    }
    setSupportMessages(supportMsgs.map((msg: any) => ({
      id: msg.id,
      user_email: users.find((u: any) => u.id === msg.user_id)?.email || 'Unknown',
      created_at: msg.created_at,
      support_type: msg.support_type,
      support_details: msg.support_details || {},
      attachment_urls: msg.attachment_urls || [],
      status: msg.status,
      admin_response: msg.admin_response,
      responded_at: msg.responded_at,
      internal_notes: msg.internal_notes,
      not_resolved: msg.not_resolved
    })));
    setFeedback(feedbackSubmissions.map((fb: any) => ({
      id: fb.id,
      user_email: users.find((u: any) => u.id === fb.user_id)?.email || 'Unknown',
      created_at: fb.created_at,
      answers: [],
      general_feedback: fb.general_feedback
    })));

    // Load feedback stats for chart display
    await loadFeedbackStats();
    await loadFeedback();
  };

  const loadTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedTeams = await Promise.all((teams || []).map(async (team) => {
        const { count: memberCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        return {
          id: team.id,
          name: team.name,
          created_at: team.created_at,
          member_count: memberCount || 0
        };
      }));

      setTeamsData(enrichedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadOverviewMetrics = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { data: teamsCount } = await supabase
        .from('teams')
        .select('id');

      const { count: totalDocuments } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      const { count: privateChats } = await supabase
        .from('astra_chats')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'private');

      const { count: teamMessages } = await supabase
        .from('astra_chats')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'team');

      const { count: reports } = await supabase
        .from('astra_chats')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'reports');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: active7Days } = await supabase
        .from('users')
        .select('id')
        .gte('last_active_at', sevenDaysAgo.toISOString());

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: active30Days } = await supabase
        .from('users')
        .select('id')
        .gte('last_active_at', thirtyDaysAgo.toISOString());

      setOverviewMetrics({
        totalUsers: totalUsers || 0,
        totalTeams: teamsCount?.length || 0,
        totalDocuments: totalDocuments || 0,
        strategyDocsCount: 0,
        meetingDocsCount: 0,
        financialDocsCount: 0,
        totalChats: (privateChats || 0) + (teamMessages || 0) + (reports || 0),
        privateChats: privateChats || 0,
        teamChats: teamMessages || 0,
        reportsChats: reports || 0,
        totalReports: reports || 0,
        activeUsersLast7Days: active7Days?.length || 0,
        activeUsersLast30Days: active30Days?.length || 0
      });
    } catch (error) {
      console.error('Error loading overview metrics:', error);
    }
  };

  const loadPreviewRequests = async () => {
    try {
      const { data, error } = await supabase.rpc('get_preview_requests_with_onboarding');

      if (error) throw error;

      setPreviewRequests(data || []);
    } catch (error) {
      console.error('Error loading preview requests:', error);
    }
  };

  // NOTE: loadActiveUsersToday is no longer needed - data now comes from admin-dashboard-data edge function

  const loadSetupProgress = async () => {
    setLoadingSetupProgress(true);
    try {
      // Get launch status data (overall user progress)
      const { data: launchStatusData, error: statusError } = await supabase
        .from('user_launch_status')
        .select('*')
        .order('updated_at', { ascending: false });

      if (statusError) {
        console.error('Error fetching launch status:', statusError);
        throw statusError;
      }

      // Get stage progress data
      const { data: stageProgressData, error: stageError } = await supabase
        .from('launch_preparation_progress')
        .select('*');

      if (stageError) {
        console.error('Error fetching stage progress:', stageError);
        throw stageError;
      }

      // Get users data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, team_id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Get teams data
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, total_launch_points');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      // Create lookup maps
      const userMap = new Map(usersData?.map(u => [u.id, { email: u.email, team_id: u.team_id }]) || []);
      const teamMap = new Map(teamsData?.map(t => [t.id, { name: t.name, total_points: t.total_launch_points }]) || []);

      // Group stage progress by user
      const stageProgressMap = new Map<string, any>();
      (stageProgressData || []).forEach((sp: any) => {
        if (!stageProgressMap.has(sp.user_id)) {
          stageProgressMap.set(sp.user_id, {});
        }
        stageProgressMap.get(sp.user_id)[sp.stage] = sp;
      });

      const enrichedProgress = (launchStatusData || []).map((status: any) => {
        const user = userMap.get(status.user_id);
        const team = user?.team_id ? teamMap.get(user.team_id) : null;
        const userStageProgress = stageProgressMap.get(status.user_id) || {};

        const fuelProgress = userStageProgress['fuel'] || { level: 0, points_earned: 0 };
        const boostersProgress = userStageProgress['boosters'] || { level: 0, points_earned: 0 };
        const guidanceProgress = userStageProgress['guidance'] || { level: 0, points_earned: 0 };

        const computeAchievedStage = (): 'fuel' | 'boosters' | 'guidance' | 'launched' => {
          if (status.is_launched) return 'launched';
          if (guidanceProgress.level >= 1 && boostersProgress.level >= 4) return 'guidance';
          if (boostersProgress.level >= 1) return 'boosters';
          return 'fuel';
        };

        return {
          user_id: status.user_id,
          user_email: user?.email || 'Unknown',
          team_name: team?.name || 'No team',
          team_total_points: team?.total_points || 0,
          current_stage: computeAchievedStage(),
          total_points: status.total_points,
          is_launched: status.is_launched,
          launched_at: status.launched_at,
          daily_streak: status.daily_streak,
          last_active_date: status.last_active_date,
          updated_at: status.updated_at,
          fuel_level: fuelProgress.level,
          fuel_points: fuelProgress.points_earned,
          boosters_level: boostersProgress.level,
          boosters_points: boostersProgress.points_earned,
          guidance_level: guidanceProgress.level,
          guidance_points: guidanceProgress.points_earned,
          total_level: fuelProgress.level + boostersProgress.level + guidanceProgress.level,
          max_level: 15,
        };
      });

      setSetupProgressData(enrichedProgress);
    } catch (error) {
      console.error('Error loading setup progress:', error);
    } finally {
      setLoadingSetupProgress(false);
    }
  };

  const loadMoonshotCount = async () => {
    try {
      const { count, error } = await supabase
        .from('moonshot_registrations')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setMoonshotRegistrationCount(count || 0);
    } catch (error) {
      console.error('Error loading moonshot count:', error);
    }
  };

  const loadWorkshopCount = async () => {
    try {
      const { count, error } = await supabase
        .from('workshop_registrations')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setWorkshopRegistrationCount(count || 0);
    } catch (error) {
      console.error('Error loading workshop count:', error);
    }
  };

  const loadWorkflowExecutionCount = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-execution-metrics?action=metrics`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflowExecutionCount(data.summary?.totalExecutions || 0);
      }
    } catch (error) {
      console.error('Error loading workflow execution count:', error);
    }
  };

  const loadOAuthCertifications = async () => {
    try {
      const { data, error } = await supabase
        .from('oauth_app_certifications')
        .select('*')
        .order('recertification_due', { ascending: true });

      if (error) throw error;
      setOauthCertifications(data || []);
    } catch (error) {
      console.error('Error loading OAuth certifications:', error);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleInvitePreviewRequest = async (email: string) => {
    setInvitingPreview(email);
    setPreviewInviteError('');
    setPreviewInviteSuccess('');

    try {
      const inviteCode = generateInviteCode();

      // Create invite code with no team (for new team creation)
      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code: inviteCode,
          team_id: null, // No team ID for new team invites
          invited_email: email.toLowerCase().trim(),
          assigned_role: 'admin', // New team creators are admins
          view_financial: true,
          created_by: user?.id,
          max_uses: 1,
          is_active: true
        });

      if (error) throw error;

      setGeneratedPreviewCode(inviteCode);
      setPreviewInviteEmail(email);
      setPreviewInviteSuccess(`Invite code generated for ${email}`);
    } catch (err: any) {
      console.error('Error creating invite:', err);
      setPreviewInviteError(err.message || 'Failed to create invite');
      setInvitingPreview(null);
    }
  };

  const sendPreviewInviteEmail = async () => {
    if (!generatedPreviewCode || !previewInviteEmail) {
      setPreviewInviteError('Missing invite code or email');
      return;
    }

    setSendingPreviewEmail(true);
    setPreviewInviteError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: previewInviteEmail,
            inviteCode: generatedPreviewCode,
            teamName: 'Astra Intelligence',
            role: 'admin',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invite email');
      }

      // Update the preview request to mark invite as sent
      const { error: updateError } = await supabase
        .from('preview_requests')
        .update({
          invite_sent: true,
          invite_sent_at: new Date().toISOString(),
          invite_code: generatedPreviewCode
        })
        .eq('email', previewInviteEmail);

      if (updateError) {
        console.error('Error updating preview request:', updateError);
        // Don't throw - email was sent successfully
      }

      // Refresh the preview requests list to show updated status
      await loadPreviewRequests();

      setPreviewInviteSuccess(`Invite email sent successfully to ${previewInviteEmail}!`);
    } catch (err: any) {
      console.error('Error sending invite email:', err);
      setPreviewInviteError(err.message || 'Failed to send invite email');
    } finally {
      setSendingPreviewEmail(false);
    }
  };

  const copyPreviewInviteMessage = () => {
    const message = `You've been invited to join Astra Intelligence!

Use this invite code to create your account: ${generatedPreviewCode}
Email: ${previewInviteEmail}

Sign up here: https://airocket.app`;

    navigator.clipboard.writeText(message);
    setPreviewInviteSuccess('Invite message copied to clipboard!');
  };

  const resetPreviewInvite = () => {
    setInvitingPreview(null);
    setGeneratedPreviewCode('');
    setPreviewInviteEmail('');
    setPreviewInviteError('');
    setPreviewInviteSuccess('');
    setSendingPreviewEmail(false);
  };

  const handleDeletePreviewRequest = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the preview request for ${email}?`)) {
      return;
    }

    setDeletingPreviewId(id);
    try {
      const { error } = await supabase
        .from('preview_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPreviewRequests(prev => prev.filter(r => r.id !== id));
      setPreviewInviteSuccess(`Deleted preview request for ${email}`);
    } catch (err: any) {
      console.error('Error deleting preview request:', err);
      setPreviewInviteError(err.message || 'Failed to delete preview request');
    } finally {
      setDeletingPreviewId(null);
    }
  };

  const handleAddPreviewRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPreviewEmail.trim()) {
      setAddPreviewError('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPreviewEmail.trim())) {
      setAddPreviewError('Please enter a valid email address');
      return;
    }

    setAddingPreviewRequest(true);
    setAddPreviewError('');

    try {
      const { error } = await supabase
        .from('preview_requests')
        .insert([{ email: newPreviewEmail.trim().toLowerCase() }]);

      if (error) throw error;

      // Clear the form and reload the list
      setNewPreviewEmail('');
      await loadPreviewRequests();
      setPreviewInviteSuccess(`Added preview request for ${newPreviewEmail.trim()}`);
      setTimeout(() => setPreviewInviteSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error adding preview request:', err);
      setAddPreviewError(err.message || 'Failed to add preview request');
    } finally {
      setAddingPreviewRequest(false);
    }
  };

  const loadUserMetrics = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, created_at, team_id, role, last_sign_in_at, last_active_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name');

      const teamMap = new Map(teamsData?.map(t => [t.id, t.name]) || []);

      const { data: workshopRegs } = await supabase
        .from('workshop_registrations')
        .select('user_id');

      const workshopUserIds = new Set(workshopRegs?.map(r => r.user_id) || []);

      const enrichedUsers = await Promise.all((usersData || []).map(async (user) => {
        const [
          { count: privateChats },
          { count: teamMessages },
          { data: documents },
          { count: reports },
          { data: driveConn }
        ] = await Promise.all([
          supabase.from('astra_chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('mode', 'private').eq('message_type', 'user'),
          supabase.from('astra_chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('mode', 'team').eq('message_type', 'user'),
          supabase.from('documents').select('id, folder_type').eq('team_id', user.team_id),
          supabase.from('astra_chats').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('mode', 'reports'),
          supabase.from('user_drive_connections').select('is_active').eq('user_id', user.id).maybeSingle()
        ]);

        const strategyCount = documents?.filter(d => d.folder_type === 'strategy').length || 0;
        const meetingCount = documents?.filter(d => d.folder_type === 'meeting').length || 0;
        const financialCount = documents?.filter(d => d.folder_type === 'financial').length || 0;
        const totalDocs = strategyCount + meetingCount + financialCount;

        const hasWorkshopReg = workshopUserIds.has(user.id);
        const hasDriveConnection = driveConn?.is_active || false;
        const workshopOnly = hasWorkshopReg && !hasDriveConnection;

        return {
          id: user.id,
          email: user.email,
          name: user.name || null,
          created_at: user.created_at,
          team_id: user.team_id,
          team_name: teamMap.get(user.team_id) || 'No Team',
          role: user.role || 'member',
          last_sign_in_at: user.last_sign_in_at || user.created_at,
          last_active_at: user.last_active_at || user.created_at,
          private_chats_count: privateChats || 0,
          team_messages_count: teamMessages || 0,
          documents_synced: totalDocs > 0,
          strategy_docs_count: strategyCount,
          meeting_docs_count: meetingCount,
          financial_docs_count: financialCount,
          total_docs_count: totalDocs,
          reports_count: reports || 0,
          drive_connected: hasDriveConnection,
          workshop_only: workshopOnly
        };
      }));

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error loading user metrics:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      const { data: submissions, error: submissionsError } = await supabase
        .from('user_feedback_submissions')
        .select('id, user_id, submitted_at, general_feedback')
        .is('support_type', null)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      const enrichedFeedback = await Promise.all((submissions || []).map(async (submission) => {
        const [
          { data: userData },
          { data: answers }
        ] = await Promise.all([
          supabase.from('users').select('email').eq('id', submission.user_id).maybeSingle(),
          supabase.from('user_feedback_answers')
            .select(`
              rating,
              comment,
              feedback_questions(question_text)
            `)
            .eq('submission_id', submission.id)
        ]);

        return {
          id: submission.id,
          user_email: userData?.email || 'Unknown',
          created_at: submission.submitted_at,
          answers: (answers || []).map(a => ({
            question_text: (a.feedback_questions as any)?.question_text || '',
            rating: a.rating,
            comment: a.comment
          })),
          general_feedback: submission.general_feedback
        };
      }));

      setFeedback(enrichedFeedback);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      const { data: answers } = await supabase
        .from('user_feedback_answers')
        .select(`
          rating,
          feedback_questions(question_text, category)
        `);

      if (!answers || answers.length === 0) {
        setFeedbackStats({
          avgRatingByCategory: {},
          totalResponses: 0,
          categoryBreakdown: []
        });
        return;
      }

      const questionStats: Record<string, { sum: number; count: number }> = {};

      answers.forEach(answer => {
        const questionText = (answer.feedback_questions as any)?.question_text || 'Unknown Question';
        if (!questionStats[questionText]) {
          questionStats[questionText] = { sum: 0, count: 0 };
        }
        questionStats[questionText].sum += answer.rating;
        questionStats[questionText].count += 1;
      });

      const avgRatingByCategory: Record<string, number> = {};
      const categoryBreakdown = Object.entries(questionStats).map(([question, stats]) => {
        const avg = stats.sum / stats.count;
        avgRatingByCategory[question] = avg;
        return {
          category: question,
          avg_rating: avg,
          count: stats.count
        };
      });

      setFeedbackStats({
        avgRatingByCategory,
        totalResponses: answers.length,
        categoryBreakdown: categoryBreakdown.sort((a, b) => b.avg_rating - a.avg_rating)
      });
    } catch (error) {
      console.error('Error loading feedback stats:', error);
      setFeedbackStats({
        avgRatingByCategory: {},
        totalResponses: 0,
        categoryBreakdown: []
      });
    }
  };

  const loadSupportMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feedback_submissions')
        .select('id, user_id, submitted_at, support_type, support_details, attachment_urls, status, admin_response, responded_at, internal_notes, not_resolved')
        .not('support_type', 'is', null)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const enrichedSupport = await Promise.all((data || []).map(async (msg) => {
        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', msg.user_id)
          .maybeSingle();

        return {
          id: msg.id,
          user_name: userData?.name || userData?.email || 'Unknown',
          user_email: userData?.email || 'Unknown',
          created_at: msg.submitted_at,
          support_type: msg.support_type || 'general',
          support_details: msg.support_details || {},
          attachment_urls: msg.attachment_urls || [],
          status: msg.status,
          admin_response: msg.admin_response,
          responded_at: msg.responded_at,
          internal_notes: msg.internal_notes,
          not_resolved: msg.not_resolved
        };
      }));

      setSupportMessages(enrichedSupport);
    } catch (error) {
      console.error('Error loading support messages:', error);
    }
  };

  const toggleNotResolved = async (messageId: string, currentValue: boolean) => {
    try {
      console.log('Toggling not_resolved:', { messageId, currentValue, newValue: !currentValue });

      // Update local state immediately for responsive UI
      setSupportMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, not_resolved: !currentValue } : msg
      ));

      const { error } = await supabase.rpc('toggle_feedback_not_resolved', {
        submission_id: messageId,
        new_value: !currentValue
      });

      if (error) {
        console.error('Database update error:', error);
        // Revert the optimistic update on error
        setSupportMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, not_resolved: currentValue } : msg
        ));
        throw error;
      }

      console.log('Database update successful - not_resolved toggled to:', !currentValue);
    } catch (error) {
      console.error('Error toggling not_resolved status:', error);
      alert('Failed to update status. Please check the console for details.');
    }
  };

  const toggleResponseStatus = async (messageId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'needs_response' ? 'responded' : 'needs_response';
      console.log('Toggling status:', { messageId, currentStatus, newStatus });

      const { data, error } = await supabase
        .from('user_feedback_submissions')
        .update({ status: newStatus })
        .eq('id', messageId)
        .select();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Database update successful:', data);

      // Update local state immediately for responsive UI
      setSupportMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, status: newStatus } : msg
      ));
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status. Please check the console for details.');
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const flattenObject = (obj: any, prefix = ''): any => {
      const flattened: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          flattened[newKey] = JSON.stringify(value);
        } else {
          flattened[newKey] = value;
        }
      });
      return flattened;
    };

    const flatData = data.map(item => flattenObject(item));
    const headers = Object.keys(flatData[0]);

    const csvContent = [
      headers.join(','),
      ...flatData.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedUsers = React.useMemo(() => {
    let filtered = [...users];

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.team_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (timeFilter === '7days') filterDate.setDate(now.getDate() - 7);
      else if (timeFilter === '30days') filterDate.setDate(now.getDate() - 30);
      else if (timeFilter === '90days') filterDate.setDate(now.getDate() - 90);

      filtered = filtered.filter(user => new Date(user.created_at) >= filterDate);
    }

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'documents') {
        aValue = a.total_docs_count;
        bValue = b.total_docs_count;
      } else if (sortField === 'messages') {
        aValue = a.private_chats_count + a.team_messages_count;
        bValue = b.private_chats_count + b.team_messages_count;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, timeFilter, sortField, sortDirection]);

  const filteredSupportMessages = React.useMemo(() => {
    let filtered = supportMessages;

    // Filter by type
    if (supportFilter !== 'all') {
      filtered = filtered.filter(msg => msg.support_type === supportFilter);
    }

    // Filter by status
    if (statusFilter === 'not_resolved') {
      filtered = filtered.filter(msg => msg.not_resolved === true);
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(msg => (msg.status || 'needs_response') === statusFilter);
    }

    // Sort by created_at descending (newest first)
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [supportMessages, supportFilter, statusFilter]);

  const sortedTeamsData = React.useMemo(() => {
    const sorted = [...teamsData].sort((a, b) => {
      let aValue: any = a[teamsSortField];
      let bValue: any = b[teamsSortField];

      if (aValue < bValue) return teamsSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return teamsSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [teamsData, teamsSortField, teamsSortDirection]);

  const handleTeamsSort = (field: typeof teamsSortField) => {
    if (teamsSortField === field) {
      setTeamsSortDirection(teamsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamsSortField(field);
      setTeamsSortDirection('asc');
    }
  };

  const averageDocsPerTeam = teamsData.length > 0
    ? (teamsData.reduce((sum, t) => sum + t.documents_count, 0) / teamsData.length).toFixed(1)
    : '0';

  const averageUsersPerTeam = teamsData.length > 0
    ? (teamsData.reduce((sum, t) => sum + t.member_count, 0) / teamsData.length).toFixed(1)
    : '0';

  const averageMessagesPerTeam = teamsData.length > 0
    ? (teamsData.reduce((sum, t) => sum + t.total_messages_count, 0) / teamsData.length).toFixed(1)
    : '0';

  const isModal = !!onClose;
  const containerClass = isModal ? "fixed inset-0 z-50" : "";

  if (!isOpen) {
    return null;
  }

  if (authLoading) {
    return (
      <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">You must be logged in to access this page.</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-2">This page is restricted to super administrators only.</p>
          <p className="text-gray-500 text-sm mb-6">Your account: {user.email}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClass} bg-gray-900 ${isModal ? 'overflow-y-auto' : ''}`}>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-8">
          <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-4 z-10">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm md:text-base text-gray-400">Comprehensive metrics and analytics for AI Rocket</p>
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Last updated: {format(lastUpdated, 'h:mm a')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 border border-blue-500 rounded-lg text-white text-sm transition-colors disabled:cursor-not-allowed"
                title="Refresh dashboard data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className="px-3 md:px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Close Dashboard"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {overviewMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <button
                onClick={() => setDetailView('users')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'users'
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-400" />
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{overviewMetrics.totalUsers}</div>
                <div className="text-sm text-gray-400">Total Users</div>
                <div className="mt-2 text-xs text-gray-500">
                  Active: {overviewMetrics.activeUsersLast7Days} (7d) / {overviewMetrics.activeUsersLast30Days} (30d)
                </div>
              </button>

              <button
                onClick={() => setDetailView('teams')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'teams'
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'border-gray-700 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Building2 className="w-8 h-8 text-emerald-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{overviewMetrics.totalTeams}</div>
                <div className="text-sm text-gray-400">Total Teams</div>
              </button>

              <button
                onClick={() => setDetailView('database_metrics')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'database_metrics'
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <HardDrive className="w-8 h-8 text-blue-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{overviewMetrics?.totalDocuments.toLocaleString() || '0'}</div>
                <div className="text-sm text-gray-400">Data Sync</div>
                <div className="mt-2 text-xs text-gray-500">
                  Database Metrics
                </div>
              </button>

              <button
                onClick={() => setDetailView('chats')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'chats'
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                    : 'border-gray-700 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <MessageSquare className="w-8 h-8 text-orange-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{overviewMetrics.totalChats}</div>
                <div className="text-sm text-gray-400">Total Messages</div>
              </button>

              <button
                onClick={() => setDetailView('preview_requests')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'preview_requests'
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-gray-700 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <UserPlus className="w-8 h-8 text-green-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{previewRequests.length}</div>
                <div className="text-sm text-gray-400">Preview Requests</div>
              </button>

              <button
                onClick={() => setDetailView('support')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'support'
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'border-gray-700 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{supportMessages.length}</div>
                <div className="text-sm text-gray-400">Support Messages</div>
                <div className="mt-2 text-xs text-gray-500">
                  {supportMessages.filter(m => m.status === 'needs_response' || m.not_resolved).length} need attention
                </div>
              </button>

              <button
                onClick={() => setDetailView('feedback')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'feedback'
                    ? 'border-pink-500 shadow-lg shadow-pink-500/20'
                    : 'border-gray-700 hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <MessageCircleQuestion className="w-8 h-8 text-pink-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{feedback.length}</div>
                <div className="text-sm text-gray-400">User Feedback</div>
                {feedbackStats && feedbackStats.avgRatingByCategory && Object.keys(feedbackStats.avgRatingByCategory).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Avg Rating: {(Object.values(feedbackStats.avgRatingByCategory).reduce((a, b) => a + b, 0) / Object.values(feedbackStats.avgRatingByCategory).length).toFixed(1)}/10
                  </div>
                )}
              </button>

              <button
                onClick={() => setDetailView('active_users')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'active_users'
                    ? 'border-teal-500 shadow-lg shadow-teal-500/20'
                    : 'border-gray-700 hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-teal-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{activeUsersToday.length}</div>
                <div className="text-sm text-gray-400">Active Users Today</div>
                <div className="mt-2 text-xs text-gray-500">
                  {activeUsersToday.reduce((sum, u) => sum + u.total_actions_today, 0)} total actions
                </div>
              </button>

              <button
                onClick={() => setDetailView('marketing_emails')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'marketing_emails'
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-gray-700 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Send className="w-8 h-8 text-purple-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  <Mail className="w-8 h-8 inline" />
                </div>
                <div className="text-sm text-gray-400">Marketing Emails</div>
                <div className="mt-2 text-xs text-gray-500">
                  Create and manage campaigns
                </div>
              </button>

              <button
                onClick={() => setDetailView('setup_progress')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'setup_progress'
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-700 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <ClipboardList className="w-8 h-8 text-cyan-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{setupProgressData.length}</div>
                <div className="text-sm text-gray-400">Launch Prep</div>
                <div className="mt-2 text-xs text-gray-500">
                  {setupProgressData.filter(p => p.is_launched).length} launched
                </div>
              </button>

              <button
                onClick={() => setDetailView('moonshot')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'moonshot'
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                    : 'border-gray-700 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Rocket className="w-8 h-8 text-orange-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {moonshotRegistrationCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Moonshot Challenge</div>
                <div className="mt-2 text-xs text-gray-500">
                  Total registrations
                </div>
              </button>

              <button
                onClick={() => setDetailView('workshop')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'workshop'
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-700 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {workshopRegistrationCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">AI-preneur Workshop</div>
                <div className="mt-2 text-xs text-gray-500">
                  Total registrations
                </div>
              </button>

              <button
                onClick={() => setDetailView('agent_workflows')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'agent_workflows'
                    ? 'border-teal-500 shadow-lg shadow-teal-500/20'
                    : 'border-gray-700 hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Workflow className="w-8 h-8 text-teal-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {workflowExecutionCount !== null ? workflowExecutionCount.toLocaleString() : '...'}
                </div>
                <div className="text-sm text-gray-400">Agent Workflows</div>
                <div className="mt-2 text-xs text-gray-500">
                  Execution Metrics
                </div>
              </button>

              <button
                onClick={() => setDetailView('oauth_certifications')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'oauth_certifications'
                    ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'border-gray-700 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <KeyRound className="w-8 h-8 text-amber-400" />
                  {oauthCertifications.some(c => {
                    const daysUntilDue = Math.ceil((new Date(c.recertification_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return daysUntilDue <= 90;
                  }) ? (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {oauthCertifications.length}
                </div>
                <div className="text-sm text-gray-400">OAuth Apps</div>
                <div className="mt-2 text-xs text-gray-500">
                  {oauthCertifications.filter(c => c.status === 'active').length} active
                </div>
              </button>

              <button
                onClick={() => setDetailView('reports')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'reports'
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <ClipboardList className="w-8 h-8 text-blue-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {overviewMetrics?.totalReports || 0}
                </div>
                <div className="text-sm text-gray-400">Reports</div>
                <div className="mt-2 text-xs text-gray-500">
                  Run today
                </div>
              </button>

              <button
                onClick={() => setDetailView('dev_updates')}
                className={`bg-gray-800 border rounded-xl p-6 transition-all text-left w-full ${
                  detailView === 'dev_updates'
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <FileCode className="w-8 h-8 text-blue-400" />
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {devUpdatesCount > 0 ? devUpdatesCount.toLocaleString() : '...'}
                </div>
                <div className="text-sm text-gray-400">Dev Updates</div>
                <div className="mt-2 text-xs text-gray-500">
                  Development changelog
                </div>
              </button>

            </div>
          )}

          {/* Main Content Area - Updates based on selected metric box */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:p-6">
            {detailView === 'users' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-400" />
                    User Metrics ({users.length})
                  </h2>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => exportToCSV(filteredAndSortedUsers, 'user-metrics')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-2">
                        Email
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                      onClick={() => handleSort('team_name')}
                    >
                      <div className="flex items-center gap-2">
                        Team
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-2">
                        Joined
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 whitespace-nowrap">Last Active</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 whitespace-nowrap">Documents</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 whitespace-nowrap">Messages</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 whitespace-nowrap">Reports</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400 whitespace-nowrap">Integrations</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="py-3 px-4">
                        <div className="text-sm text-white">{user.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.role === 'admin' && (
                            <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                              Admin
                            </span>
                          )}
                          {user.workshop_only && (
                            <span className="inline-block px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                              Workshop
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          const team = teamsData.find(t => t.id === user.team_id);
                          if (team) {
                            setSelectedTeam(team);
                          }
                        }}
                      >
                        {user.team_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 whitespace-nowrap">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 whitespace-nowrap">
                        {format(new Date(user.last_active_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {user.documents_synced ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm text-white">{user.total_docs_count}</span>
                        </div>
                        {user.documents_synced && (
                          <div className="text-xs text-gray-400 mt-1">
                            S:{user.strategy_docs_count} M:{user.meeting_docs_count} F:{user.financial_docs_count}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-white">{user.private_chats_count + user.team_messages_count}</div>
                        <div className="text-xs text-gray-400">
                          P:{user.private_chats_count} T:{user.team_messages_count}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-white">{user.reports_count}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {user.drive_connected ? (
                            <HardDrive className="w-4 h-4 text-blue-400" title="Drive Connected" />
                          ) : (
                            <span className="text-xs text-gray-500">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </>
            )}
            {detailView === 'teams' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4">
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">{averageDocsPerTeam}</div>
                      <div className="text-sm text-gray-300">Avg Documents Per Team</div>
                    </div>
                    <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-400">{averageUsersPerTeam}</div>
                      <div className="text-sm text-gray-300">Avg Users Per Team</div>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400">{averageMessagesPerTeam}</div>
                      <div className="text-sm text-gray-300">Avg Messages Per Team</div>
                    </div>
                  </div>
                  <button
                    onClick={() => exportToCSV(sortedTeamsData, 'team-details')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Team Name
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('member_count')}
                        >
                          <div className="flex items-center gap-2">
                            Members
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('documents_count')}
                        >
                          <div className="flex items-center gap-2">
                            Documents
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('reports_count')}
                        >
                          <div className="flex items-center gap-2">
                            Reports
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('total_messages_count')}
                        >
                          <div className="flex items-center gap-2">
                            Messages
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('last_active_at')}
                        >
                          <div className="flex items-center gap-2">
                            Last Active
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white whitespace-nowrap"
                          onClick={() => handleTeamsSort('created_at')}
                        >
                          <div className="flex items-center gap-2">
                            Created
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeamsData.map((team) => (
                        <tr
                          key={team.id}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedTeam(team)}
                        >
                          <td className="py-3 px-4 text-sm font-medium text-white">{team.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-300">{team.member_count}</td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold text-white mb-1">{team.documents_count.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">
                              {team.chunk_count.toLocaleString()} records
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-white">
                            {team.reports_count}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold text-white">{team.total_messages_count}</div>
                            <div className="text-xs text-gray-400">
                              Private:{team.private_messages_count} Team:{team.team_messages_count}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300 whitespace-nowrap">
                            {format(new Date(team.last_active_at), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300 whitespace-nowrap">
                            {format(new Date(team.created_at), 'MMM d, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailView === 'documents' && overviewMetrics && (
              <div className="text-gray-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-2xl font-bold text-white">{overviewMetrics.totalDocuments}</p>
                    <p className="text-sm text-gray-400">Total Documents</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400">Filter by Category:</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as DocumentCategoryFilter)}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Categories ({overviewMetrics.totalDocuments})</option>
                      {[
                        { value: 'strategy', label: 'Strategy', count: overviewMetrics.strategyDocsCount },
                        { value: 'meetings', label: 'Meetings', count: overviewMetrics.meetingDocsCount },
                        { value: 'financial', label: 'Financial', count: overviewMetrics.financialDocsCount },
                        { value: 'people', label: 'People', count: overviewMetrics.peopleDocsCount },
                        { value: 'legal', label: 'Legal', count: overviewMetrics.legalDocsCount },
                        { value: 'customer', label: 'Customer', count: overviewMetrics.customerDocsCount },
                        { value: 'industry', label: 'Industry', count: overviewMetrics.industryDocsCount },
                        { value: 'product', label: 'Product', count: overviewMetrics.productDocsCount },
                        { value: 'marketing', label: 'Marketing', count: overviewMetrics.marketingDocsCount },
                        { value: 'sales', label: 'Sales', count: overviewMetrics.salesDocsCount },
                        { value: 'operations', label: 'Operations', count: overviewMetrics.operationsDocsCount },
                        { value: 'support', label: 'Support', count: overviewMetrics.supportDocsCount },
                        { value: 'reference', label: 'Reference', count: overviewMetrics.referenceDocsCount },
                        { value: 'other', label: 'Other', count: overviewMetrics.otherDocsCount }
                      ]
                        .filter(cat => cat.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label} ({cat.count})</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {overviewMetrics.topCategories && overviewMetrics.topCategories.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {overviewMetrics.topCategories.map((category, index) => {
                      const bgColors = ['bg-blue-500/10', 'bg-purple-500/10', 'bg-green-500/10', 'bg-orange-500/10', 'bg-red-500/10'];
                      const borderColors = ['border-blue-500/30', 'border-purple-500/30', 'border-green-500/30', 'border-orange-500/30', 'border-red-500/30'];
                      return (
                        <div
                          key={category.name}
                          className={`${bgColors[index % bgColors.length]} border ${borderColors[index % borderColors.length]} rounded-lg p-4`}
                        >
                          <div className="text-3xl font-bold text-white">{category.count}</div>
                          <div className="text-sm text-gray-400">{category.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold mb-4 text-white">Documents by Team</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Team</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Number of Documents</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Number of Records</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamsData
                          .filter(t => t.documents_count > 0)
                          .sort((a, b) => b.documents_count - a.documents_count)
                          .map(team => (
                            <tr key={team.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                              <td className="py-3 px-4 text-sm font-medium text-white">{team.name}</td>
                              <td className="py-3 px-4 text-sm text-right font-semibold">{team.documents_count.toLocaleString()}</td>
                              <td className="py-3 px-4 text-sm text-right text-gray-300">{team.chunk_count.toLocaleString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {teamsData.filter(t => t.documents_count > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-400">No documents uploaded yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detailView === 'chats' && overviewMetrics && (
              <div className="text-gray-300">
                <p className="mb-4 text-lg font-semibold">Total Messages: {overviewMetrics.totalChats.toLocaleString()}</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {overviewMetrics.privateChats.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Private</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {overviewMetrics.teamChats.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Team</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {overviewMetrics.reportsChats.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Reports</div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold mb-4 text-white">Messages by User</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">User</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Team</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Private</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Team</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Reports</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...users]
                          .filter(u => (u.private_chats_count + u.team_messages_count + u.reports_count) > 0)
                          .sort((a, b) => (b.private_chats_count + b.team_messages_count + b.reports_count) - (a.private_chats_count + a.team_messages_count + a.reports_count))
                          .map(user => (
                            <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                              <td className="py-3 px-4 text-sm">{user.name || user.email}</td>
                              <td className="py-3 px-4 text-sm text-gray-400">{user.team_name}</td>
                              <td className="py-3 px-4 text-sm text-right">{user.private_chats_count}</td>
                              <td className="py-3 px-4 text-sm text-right">{user.team_messages_count}</td>
                              <td className="py-3 px-4 text-sm text-right">{user.reports_count}</td>
                              <td className="py-3 px-4 text-sm text-right font-semibold">{user.private_chats_count + user.team_messages_count + user.reports_count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {users.filter(u => (u.private_chats_count + u.team_messages_count + u.reports_count) > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-400">No messages yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detailView === 'preview_requests' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Total Requests: {previewRequests.length}</p>
                  <button
                    onClick={() => exportToCSV(previewRequests, 'preview-requests')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                {/* Add New Preview Request Form */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-400" />
                    Add New Preview Request
                  </h3>
                  <form onSubmit={handleAddPreviewRequest} className="space-y-3">
                    <div>
                      <input
                        type="email"
                        value={newPreviewEmail}
                        onChange={(e) => setNewPreviewEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors"
                        disabled={addingPreviewRequest}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={addingPreviewRequest}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {addingPreviewRequest ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Add Preview Request</span>
                          </>
                        )}
                      </button>
                      {addPreviewError && (
                        <p className="text-red-400 text-sm">{addPreviewError}</p>
                      )}
                    </div>
                  </form>
                </div>

                <div className="space-y-3">
                  {previewRequests.length > 0 ? (
                    previewRequests.map((request) => (
                      <div key={request.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {request.user_onboarded && (
                                <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/50 px-2 py-1 rounded">
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  <span className="text-xs font-medium text-green-400">Onboarded</span>
                                </div>
                              )}
                              {request.invite_sent && !request.user_onboarded && (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              )}
                              <Mail className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-white">{request.email}</span>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</div>
                              {request.invite_sent && request.invite_sent_at && (
                                <div className="text-green-400">
                                  Invite sent: {format(new Date(request.invite_sent_at), 'MMM d, yyyy h:mm a')}
                                </div>
                              )}
                              {request.invite_code && (
                                <div className="text-gray-500">
                                  Code: <span className="font-mono">{request.invite_code}</span>
                                </div>
                              )}
                              {request.user_onboarded && request.team_name && (
                                <div className="text-green-400">
                                  Team: <span className="font-medium">{request.team_name}</span>
                                  {request.team_created_at && (
                                    <span className="text-gray-500 ml-2">
                                      (Created: {format(new Date(request.team_created_at), 'MMM d, yyyy')})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {invitingPreview === request.email && generatedPreviewCode ? (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              <div className="bg-green-500/20 border border-green-500/50 rounded p-2 text-center">
                                <div className="text-xs text-green-400 mb-1">Invite Code:</div>
                                <div className="text-sm font-mono font-bold text-green-300">{generatedPreviewCode}</div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={sendPreviewInviteEmail}
                                  disabled={sendingPreviewEmail}
                                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center justify-center gap-1"
                                >
                                  {sendingPreviewEmail ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Mail className="w-3 h-3" />
                                      <span>{request.invite_sent ? 'Send Again' : 'Send Email'}</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={copyPreviewInviteMessage}
                                  className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors flex items-center justify-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </button>
                              </div>
                              <button
                                onClick={resetPreviewInvite}
                                className="w-full px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                              >
                                Done
                              </button>
                              {previewInviteSuccess && (
                                <div className="text-xs text-green-400 text-center">{previewInviteSuccess}</div>
                              )}
                              {previewInviteError && (
                                <div className="text-xs text-red-400 text-center">{previewInviteError}</div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleInvitePreviewRequest(request.email)}
                                disabled={!!invitingPreview || deletingPreviewId === request.id}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                              >
                                <UserPlus className="w-4 h-4" />
                                Invite New Team
                              </button>
                              <button
                                onClick={() => handleDeletePreviewRequest(request.id, request.email)}
                                disabled={!!invitingPreview || deletingPreviewId === request.id}
                                className="p-2 bg-red-600/20 hover:bg-red-600/40 disabled:bg-gray-600 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                                title="Delete request"
                              >
                                {deletingPreviewId === request.id ? (
                                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No preview requests yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {detailView === 'support' && (
              <div>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400">Total Messages: {supportMessages.length}</p>
                    <button
                      onClick={() => exportToCSV(supportMessages, 'support-messages')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-2 font-medium">Filter by Type:</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSupportFilter('all')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            supportFilter === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          All ({supportMessages.length})
                        </button>
                        <button
                          onClick={() => setSupportFilter('bug_report')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            supportFilter === 'bug_report'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Bug Reports ({supportMessages.filter(m => m.support_type === 'bug_report').length})
                        </button>
                        <button
                          onClick={() => setSupportFilter('support_message')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            supportFilter === 'support_message'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Support ({supportMessages.filter(m => m.support_type === 'support_message').length})
                        </button>
                        <button
                          onClick={() => setSupportFilter('feature_request')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            supportFilter === 'feature_request'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Feature Requests ({supportMessages.filter(m => m.support_type === 'feature_request').length})
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-2 font-medium">Filter by Status:</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            statusFilter === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setStatusFilter('needs_response')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            statusFilter === 'needs_response'
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Needs Response
                        </button>
                        <button
                          onClick={() => setStatusFilter('responded')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            statusFilter === 'responded'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Responded
                        </button>
                        <button
                          onClick={() => setStatusFilter('not_resolved')}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            statusFilter === 'not_resolved'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Not Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-[700px] overflow-y-auto">
                  {filteredSupportMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`border rounded-lg p-4 ${
                        message.not_resolved
                          ? 'bg-red-900/20 border-red-500/50'
                          : message.status === 'needs_response'
                          ? 'bg-orange-900/20 border-orange-500/50'
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{message.user_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                message.support_type === 'bug_report'
                                  ? 'bg-red-600 text-white'
                                  : message.support_type === 'feature_request'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-yellow-600 text-white'
                              }`}
                            >
                              {message.support_type.replace('_', ' ')}
                            </span>
                            {message.not_resolved && (
                              <button
                                onClick={() => toggleNotResolved(message.id, message.not_resolved || false)}
                                className="px-2 py-0.5 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                                title="Click to mark as resolved"
                              >
                                Not Resolved
                              </button>
                            )}
                            {message.status === 'responded' && !message.not_resolved && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        <button
                          onClick={() => setResponseModalMessage(message)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          {message.status === 'responded' ? 'View/Update' : 'Respond'}
                        </button>
                      </div>

                      {message.support_details.subject && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-white">{message.support_details.subject}</div>
                        </div>
                      )}

                      {message.support_details.description && (
                        <div className="text-sm text-gray-300 mb-2">{message.support_details.description}</div>
                      )}

                      {message.admin_response && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="text-xs text-green-400 mb-1">Admin Response:</div>
                          <div className="text-sm text-gray-300">{message.admin_response}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredSupportMessages.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      {supportMessages.length === 0 ? 'No support messages yet' : 'No messages in this category'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {detailView === 'feedback' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Total Responses: {feedback.length}</h3>
                  <button
                    onClick={() => exportToCSV(feedback, 'user-feedback')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                {feedbackStats && feedbackStats.categoryBreakdown && feedbackStats.categoryBreakdown.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-white font-semibold mb-4">Average Ratings by Question</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {feedbackStats.categoryBreakdown.map((cat) => (
                        <div key={cat.category} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-300">
                              {cat.category}
                            </div>
                            <div className={`text-2xl font-bold ${
                              cat.avg_rating >= 8 ? 'text-emerald-400' :
                              cat.avg_rating >= 6 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {cat.avg_rating.toFixed(1)}
                            </div>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full ${
                                cat.avg_rating >= 8 ? 'bg-emerald-500' :
                                cat.avg_rating >= 6 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${(cat.avg_rating / 10) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400">
                            {cat.count} {cat.count === 1 ? 'response' : 'responses'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h4 className="text-white font-semibold mb-4">Individual Feedback</h4>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {feedback.map((fb) => (
                    <div key={fb.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-white">{fb.user_email}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(fb.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {fb.answers.map((answer, idx) => (
                          <div key={idx} className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm text-gray-300">{answer.question_text}</div>
                              {answer.comment && (
                                <div className="text-xs text-gray-400 mt-1 italic">"{answer.comment}"</div>
                              )}
                            </div>
                            <div className={`ml-4 px-2 py-1 text-white text-xs rounded font-medium ${
                              answer.rating >= 8 ? 'bg-emerald-600' :
                              answer.rating >= 6 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}>
                              {answer.rating}/10
                            </div>
                          </div>
                        ))}
                      </div>

                      {fb.general_feedback && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="text-xs text-gray-400 mb-1">Additional Feedback:</div>
                          <div className="text-sm text-gray-300">{fb.general_feedback}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {feedback.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No feedback submissions yet
                  </div>
                )}
              </div>
            )}

            {detailView === 'active_users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Active Users Today - {activeUsersToday.length} users</h3>
                  <button
                    onClick={() => exportToCSV(activeUsersToday, 'active-users-today')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {activeUsersToday.reduce((sum, u) => sum + u.private_messages_today, 0)}
                    </div>
                    <div className="text-sm text-gray-400">Private Messages Today</div>
                  </div>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {activeUsersToday.reduce((sum, u) => sum + u.team_messages_today, 0)}
                    </div>
                    <div className="text-sm text-gray-400">Team Messages Today</div>
                  </div>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {activeUsersToday.reduce((sum, u) => sum + u.reports_today, 0)}
                    </div>
                    <div className="text-sm text-gray-400">AI Reports Today</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">User</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Team</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Private Messages</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Team Messages</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Reports</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Total Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsersToday.map((user) => (
                        <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 px-4 text-sm text-white">{user.name || user.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-400">{user.team_name}</td>
                          <td className="py-3 px-4 text-sm text-right">{user.private_messages_today}</td>
                          <td className="py-3 px-4 text-sm text-right">{user.team_messages_today}</td>
                          <td className="py-3 px-4 text-sm text-right">{user.reports_today}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold text-white">{user.total_actions_today}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {activeUsersToday.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No users with activity today
                    </div>
                  )}
                </div>
              </div>
            )}

            {detailView === 'marketing_emails' && (
              <MarketingEmailsPanel />
            )}

            {detailView === 'setup_progress' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-cyan-400" />
                    Launch Preparation Progress ({setupProgressData.length} users)
                  </h2>
                </div>
                <SetupProgressPanel
                  progressData={setupProgressData}
                  loading={loadingSetupProgress}
                />
              </div>
            )}

            {detailView === 'moonshot' && (
              <MoonshotAnalyticsPanel />
            )}

            {detailView === 'workshop' && (
              <WorkshopAnalyticsPanel />
            )}

            {detailView === 'database_metrics' && (
              <DatabaseMetricsPanel />
            )}

            {detailView === 'agent_workflows' && (
              <AgentWorkflowsPanel onMetricsLoad={setWorkflowExecutionCount} />
            )}

            {detailView === 'oauth_certifications' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <KeyRound className="w-6 h-6 text-amber-400" />
                    OAuth App Certifications
                  </h2>
                </div>

                {oauthCertifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    No OAuth apps configured yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {oauthCertifications.map((cert) => {
                      const daysUntilDue = Math.ceil((new Date(cert.recertification_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntilDue <= 30;
                      const isWarning = daysUntilDue <= 90 && daysUntilDue > 30;
                      const isExpired = daysUntilDue <= 0;

                      return (
                        <div
                          key={cert.id}
                          className={`p-4 rounded-xl border ${
                            isExpired ? 'bg-red-900/20 border-red-500/50' :
                            isUrgent ? 'bg-amber-900/20 border-amber-500/50' :
                            isWarning ? 'bg-yellow-900/20 border-yellow-500/50' :
                            'bg-gray-700/50 border-gray-600'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-white">{cert.app_name}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  cert.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                  cert.status === 'pending_recertification' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {cert.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">OAuth App ID:</span>
                                  <code className="bg-gray-800 px-2 py-0.5 rounded text-xs">{cert.oauth_app_id}</code>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Client ID:</span>
                                  <code className="bg-gray-800 px-2 py-0.5 rounded text-xs truncate max-w-xs">{cert.client_id}</code>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-400">Certified:</span>
                                <span className="text-white">{format(new Date(cert.certification_date), 'MMM d, yyyy')}</span>
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${
                                isExpired ? 'text-red-400' :
                                isUrgent ? 'text-amber-400' :
                                isWarning ? 'text-yellow-400' :
                                'text-emerald-400'
                              }`}>
                                {isExpired ? (
                                  <AlertCircle className="w-4 h-4" />
                                ) : isUrgent || isWarning ? (
                                  <AlertCircle className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                <span>
                                  {isExpired ? 'EXPIRED - Recertification overdue' :
                                   isUrgent ? `Recertification due in ${daysUntilDue} days` :
                                   isWarning ? `Recertification due in ${daysUntilDue} days` :
                                   `${daysUntilDue} days until recertification`}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Due: {format(new Date(cert.recertification_due), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          {cert.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-600">
                              <p className="text-sm text-gray-400">{cert.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">Google OAuth Recertification Guide</h3>
                  <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                    <li>Google requires annual recertification for OAuth apps with sensitive scopes</li>
                    <li>Start the process 90 days before the due date to allow time for review</li>
                    <li>Visit the Google Cloud Console to initiate recertification</li>
                    <li>Ensure your privacy policy and terms of service are up to date</li>
                    <li>Review and update your OAuth consent screen information</li>
                  </ul>
                </div>
              </div>
            )}

            {detailView === 'reports' && (
              <ReportsAnalyticsPanel />
            )}

            {detailView === 'dev_updates' && (
              <DevUpdatesPanel onMetricsLoad={setDevUpdatesCount} />
            )}
          </div>
        </div>
      </div>

      {responseModalMessage && (
        <SupportResponseModal
          message={responseModalMessage}
          onClose={() => setResponseModalMessage(null)}
          onSuccess={() => {
            loadAllMetrics();
          }}
        />
      )}

      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedTeam.name}</h2>
                <p className="text-sm text-gray-400 mt-1">Team Details</p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{selectedTeam.member_count}</div>
                  <div className="text-sm text-gray-400">Members</div>
                </div>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{selectedTeam.documents_count.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">Documents</div>
                  <div className="text-xs text-gray-500 mt-1">{selectedTeam.chunk_count.toLocaleString()} records</div>
                </div>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{selectedTeam.reports_count}</div>
                  <div className="text-sm text-gray-400">Reports</div>
                </div>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{selectedTeam.total_messages_count}</div>
                  <div className="text-sm text-gray-400">Messages</div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Message Breakdown</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xl font-bold text-blue-400">{selectedTeam.private_messages_count}</div>
                    <div className="text-sm text-gray-400">Private Messages</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-400">{selectedTeam.team_messages_count}</div>
                    <div className="text-sm text-gray-400">Team Chat Messages</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-400">{selectedTeam.reports_count}</div>
                    <div className="text-sm text-gray-400">Report Messages</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Report Configurations</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xl font-bold text-cyan-400">{selectedTeam.scheduled_reports_count}</div>
                    <div className="text-sm text-gray-400">Scheduled Reports</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-400">{selectedTeam.manual_reports_count}</div>
                    <div className="text-sm text-gray-400">Manual Reports</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Created</span>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(selectedTeam.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Last Active</span>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(selectedTeam.last_active_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Team Members</h3>
                <div className="space-y-2">
                  {users
                    .filter(u => u.team_id === selectedTeam.id)
                    .map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedTeam(null);
                          setSelectedUser(user);
                        }}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{user.email}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {user.role === 'admin' && (
                              <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded mr-2">
                                Admin
                              </span>
                            )}
                            Last active: {format(new Date(user.last_active_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedUser.name || selectedUser.email}</h2>
                <p className="text-sm text-gray-400 mt-1">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Team</span>
                    <button
                      onClick={() => {
                        const team = teamsData.find(t => t.id === selectedUser.team_id);
                        if (team) {
                          setSelectedUser(null);
                          setSelectedTeam(team);
                        }
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      {selectedUser.team_name}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Role</span>
                    <span className="text-sm text-white font-medium capitalize">{selectedUser.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Joined</span>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(selectedUser.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Last Active</span>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(selectedUser.last_active_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Last Sign In</span>
                    <span className="text-sm text-white font-medium">
                      {format(new Date(selectedUser.last_sign_in_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Launch Stage</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Status</span>
                    <span className="text-sm text-white font-medium">
                      {selectedUser.is_launched ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded">
                          <Rocket className="w-4 h-4" />
                          Launched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded capitalize">
                          Onboarding
                        </span>
                      )}
                    </span>
                  </div>
                  {!selectedUser.is_launched && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Current Stage</span>
                        <span className="text-sm text-white font-medium capitalize">
                          {selectedUser.launch_stage.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Stage Level</span>
                        <span className="text-sm text-white font-medium">
                          {selectedUser.launch_stage_level > 0
                            ? `Level ${selectedUser.launch_stage_level}`
                            : 'Not Started'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Activity Overview</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{selectedUser.private_chats_count}</div>
                    <div className="text-sm text-gray-400">Private Messages</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{selectedUser.team_messages_count}</div>
                    <div className="text-sm text-gray-400">Team Messages</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{selectedUser.reports_count}</div>
                    <div className="text-sm text-gray-400">Reports</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Documents & Integrations</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Drive Connected</span>
                    <span className="text-sm">
                      {selectedUser.drive_connected ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Documents Synced</span>
                    <span className="text-sm">
                      {selectedUser.documents_synced ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Documents</span>
                    <span className="text-sm text-white font-medium">{selectedUser.total_docs_count}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Document Categories</h3>
                {Object.keys(selectedUser.document_categories).length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(selectedUser.document_categories)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([category, count], index) => {
                        const colors = [
                          'text-blue-400',
                          'text-purple-400',
                          'text-green-400',
                          'text-orange-400',
                          'text-cyan-400',
                          'text-pink-400',
                          'text-amber-400',
                          'text-teal-400',
                          'text-lime-400',
                          'text-indigo-400',
                          'text-red-400',
                          'text-yellow-400',
                          'text-emerald-400',
                          'text-sky-400',
                          'text-gray-400'
                        ];
                        const colorClass = colors[index % colors.length];
                        return (
                          <div key={category}>
                            <div className={`text-xl font-bold ${colorClass}`}>{count}</div>
                            <div className="text-sm text-gray-400 capitalize">{category}</div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4">No documents synced yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
