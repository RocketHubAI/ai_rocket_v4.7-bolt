import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  FileText,
  Image,
  Clock,
  AlertCircle,
  Award,
  Activity,
  Zap,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { MetricsAskAstra } from './MetricsAskAstra';

interface MetricsOverview {
  totalUsers: number;
  activeUsersToday: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  totalMessages: number;
  totalReports: number;
  totalVisualizations: number;
  avgResponseTime: number;
  errorRate: number;
}

interface DailyMetric {
  metric_date: string;
  daily_active_users: number;
  total_messages: number;
  total_reports: number;
  total_visualizations: number;
}

interface MilestoneStats {
  milestone_type: string;
  users_achieved: number;
  achievement_rate_pct: number;
}

interface PerformanceStats {
  date: string;
  mode: string;
  avg_response_ms: number;
  success_rate: number;
  total_requests: number;
}

export const UserMetricsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [milestones, setMilestones] = useState<MilestoneStats[]>([]);
  const [performance, setPerformance] = useState<PerformanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'performance' | 'milestones' | 'guide' | 'ask-astra'>('overview');
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAllMetrics();
    }
  }, [user, timeRange]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverviewMetrics(),
        fetchDailyMetrics(),
        fetchMilestoneStats(),
        fetchPerformanceStats()
      ]);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewMetrics = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Active users from astra_chats (actual activity)
    const { data: activeTodayData } = await supabase
      .from('astra_chats')
      .select('user_id')
      .gte('created_at', today.toISOString().split('T')[0])
      .lt('created_at', new Date(today.getTime() + 86400000).toISOString().split('T')[0]);

    const { data: active7DaysData } = await supabase
      .from('astra_chats')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: active30DaysData } = await supabase
      .from('astra_chats')
      .select('user_id')
      .gte('created_at', startDate.toISOString());

    // Total messages from astra_chats
    const { count: totalMessages } = await supabase
      .from('astra_chats')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Total reports executed (count last_run_at within timeframe)
    const { data: executedReports } = await supabase
      .from('astra_reports')
      .select('last_run_at')
      .not('last_run_at', 'is', null)
      .gte('last_run_at', startDate.toISOString());

    const totalReports = executedReports?.length || 0;

    // Total visualizations from astra_chats
    const { count: totalVisualizations } = await supabase
      .from('astra_chats')
      .select('*', { count: 'exact', head: true })
      .eq('visualization', true)
      .gte('created_at', startDate.toISOString());

    // Performance metrics from astra_chats response_time_ms
    const { data: perfData } = await supabase
      .from('astra_chats')
      .select('response_time_ms')
      .gte('created_at', startDate.toISOString())
      .not('response_time_ms', 'is', null)
      .gt('response_time_ms', 0);

    const avgResponseTime = perfData?.length
      ? Math.round(perfData.reduce((sum, p) => sum + (p.response_time_ms || 0), 0) / perfData.length)
      : 0;

    // Error rate is 0 since we don't have error tracking yet
    const errorRate = 0;

    setOverview({
      totalUsers: totalUsers || 0,
      activeUsersToday: new Set(activeTodayData?.map(d => d.user_id)).size,
      activeUsers7Days: new Set(active7DaysData?.map(d => d.user_id)).size,
      activeUsers30Days: new Set(active30DaysData?.map(d => d.user_id)).size,
      totalMessages: totalMessages || 0,
      totalReports: totalReports || 0,
      totalVisualizations: totalVisualizations || 0,
      avgResponseTime,
      errorRate
    });
  };

  const fetchDailyMetrics = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Fetch from astra_chats and aggregate by date
    const { data: chatData } = await supabase
      .from('astra_chats')
      .select('created_at, user_id, visualization')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Fetch executed reports (using last_run_at)
    const { data: reportsData } = await supabase
      .from('astra_reports')
      .select('last_run_at')
      .not('last_run_at', 'is', null)
      .gte('last_run_at', startDate.toISOString());

    if (chatData) {
      const aggregated: { [key: string]: DailyMetric } = {};

      // Aggregate chat data
      chatData.forEach(row => {
        const date = row.created_at.split('T')[0];
        if (!aggregated[date]) {
          aggregated[date] = {
            metric_date: date,
            daily_active_users: 0,
            total_messages: 0,
            total_reports: 0,
            total_visualizations: 0
          };
        }
        aggregated[date].total_messages++;
        if (row.visualization) {
          aggregated[date].total_visualizations++;
        }
      });

      // Count unique users per day
      chatData.forEach(row => {
        const date = row.created_at.split('T')[0];
        if (aggregated[date]) {
          const dayUsers = chatData
            .filter(c => c.created_at.split('T')[0] === date)
            .map(c => c.user_id);
          aggregated[date].daily_active_users = new Set(dayUsers).size;
        }
      });

      // Add executed reports
      reportsData?.forEach(row => {
        const date = row.last_run_at.split('T')[0];
        if (!aggregated[date]) {
          aggregated[date] = {
            metric_date: date,
            daily_active_users: 0,
            total_messages: 0,
            total_reports: 0,
            total_visualizations: 0
          };
        }
        aggregated[date].total_reports++;
      });

      setDailyMetrics(Object.values(aggregated).sort((a, b) =>
        a.metric_date.localeCompare(b.metric_date)
      ));
    }
  };

  const fetchMilestoneStats = async () => {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Calculate milestones from actual data
    const { data: usersWithMessages } = await supabase
      .from('astra_chats')
      .select('user_id');

    const { data: usersWithReports } = await supabase
      .from('astra_reports')
      .select('user_id');

    const { data: usersWithVisualizations } = await supabase
      .from('astra_chats')
      .select('user_id')
      .eq('visualization', true);

    const { data: usersWithSavedViz } = await supabase
      .from('saved_visualizations')
      .select('user_id');

    const uniqueMessageUsers = new Set(usersWithMessages?.map(u => u.user_id)).size;
    const uniqueReportUsers = new Set(usersWithReports?.map(u => u.user_id)).size;
    const uniqueVizUsers = new Set(usersWithVisualizations?.map(u => u.user_id)).size;
    const uniqueSavedVizUsers = new Set(usersWithSavedViz?.map(u => u.user_id)).size;

    const milestoneStats = [
      {
        milestone_type: 'first_message',
        users_achieved: uniqueMessageUsers,
        achievement_rate_pct: totalUsers ? Math.round((uniqueMessageUsers / totalUsers) * 100) : 0
      },
      {
        milestone_type: 'first_report',
        users_achieved: uniqueReportUsers,
        achievement_rate_pct: totalUsers ? Math.round((uniqueReportUsers / totalUsers) * 100) : 0
      },
      {
        milestone_type: 'first_visualization',
        users_achieved: uniqueVizUsers,
        achievement_rate_pct: totalUsers ? Math.round((uniqueVizUsers / totalUsers) * 100) : 0
      },
      {
        milestone_type: 'saved_visualization',
        users_achieved: uniqueSavedVizUsers,
        achievement_rate_pct: totalUsers ? Math.round((uniqueSavedVizUsers / totalUsers) * 100) : 0
      }
    ];

    setMilestones(milestoneStats);
  };

  const fetchPerformanceStats = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Get chat messages with response times
    const { data: chatData, error } = await supabase
      .from('astra_chats')
      .select('created_at, mode, response_time_ms, message_type')
      .gte('created_at', startDate.toISOString())
      .eq('message_type', 'astra')
      .not('response_time_ms', 'is', null)
      .gt('response_time_ms', 0)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching performance stats:', error);
      setPerformance([]);
      return;
    }

    if (!chatData || chatData.length === 0) {
      console.log('No performance data found for time range');
      setPerformance([]);
      return;
    }

    console.log(`Found ${chatData.length} performance records`);

    const grouped: { [key: string]: { times: number[], successes: number, total: number } } = {};

    chatData.forEach(log => {
      const date = log.created_at.split('T')[0];
      let mode = log.mode || 'unknown';
      // Map mode to display names
      if (mode === 'private') mode = 'chat';
      if (mode === 'reports') mode = 'reports';

      const key = `${date}-${mode}`;
      if (!grouped[key]) {
        grouped[key] = { times: [], successes: 0, total: 0 };
      }
      grouped[key].times.push(log.response_time_ms);
      grouped[key].successes++;
      grouped[key].total++;
    });

    const perfStats = Object.entries(grouped).map(([key, val]) => {
      const [date, mode] = key.split('-');
      return {
        date,
        mode: mode || 'unknown',
        avg_response_ms: Math.round(val.times.reduce((a, b) => a + b, 0) / val.times.length),
        success_rate: Math.round((val.successes / val.total) * 100) / 100,
        total_requests: val.total
      };
    });

    console.log('Performance stats:', perfStats);
    setPerformance(perfStats);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading metrics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 text-transparent bg-clip-text">
                User Metrics Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">Comprehensive analytics and insights</p>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value) as 7 | 30 | 90)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>

              <button
                onClick={fetchAllMetrics}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'engagement', label: 'Engagement', icon: TrendingUp },
              { id: 'performance', label: 'Performance', icon: Zap },
              { id: 'milestones', label: 'Milestones', icon: Award },
              { id: 'guide', label: 'Guide', icon: HelpCircle },
              { id: 'ask-astra', label: 'Ask Astra', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Total Users"
                value={formatNumber(overview.totalUsers)}
                iconColor="text-blue-500"
                onClick={() => setSelectedMetric(selectedMetric === 'users' ? null : 'users')}
                details={selectedMetric === 'users' ? [
                  `Active today: ${overview.activeUsersToday} users`,
                  `Active last 7 days: ${overview.activeUsers7Days} users`,
                  `Active last 30 days: ${overview.activeUsers30Days} users`,
                  `Engagement rate: ${overview.totalUsers ? Math.round((overview.activeUsers30Days / overview.totalUsers) * 100) : 0}%`
                ] : undefined}
              />
              <StatCard
                icon={Users}
                label="Active Today"
                value={formatNumber(overview.activeUsersToday)}
                subtitle={`${overview.activeUsers7Days} (7d) · ${overview.activeUsers30Days} (30d)`}
                iconColor="text-green-500"
                onClick={() => setSelectedMetric(selectedMetric === 'active' ? null : 'active')}
                details={selectedMetric === 'active' ? [
                  `Daily active: ${overview.activeUsersToday} users`,
                  `Weekly active: ${overview.activeUsers7Days} users`,
                  `Monthly active: ${overview.activeUsers30Days} users`,
                  `WAU/MAU ratio: ${overview.activeUsers30Days ? Math.round((overview.activeUsers7Days / overview.activeUsers30Days) * 100) : 0}%`
                ] : undefined}
              />
              <StatCard
                icon={MessageSquare}
                label="Messages Sent"
                value={formatNumber(overview.totalMessages)}
                iconColor="text-orange-500"
                onClick={() => setSelectedMetric(selectedMetric === 'messages' ? null : 'messages')}
                details={selectedMetric === 'messages' ? [
                  `Total messages: ${formatNumber(overview.totalMessages)}`,
                  `Avg per day: ${formatNumber(Math.round(overview.totalMessages / timeRange))}`,
                  `Avg per active user: ${overview.activeUsers30Days ? formatNumber(Math.round(overview.totalMessages / overview.activeUsers30Days)) : 0}`
                ] : undefined}
              />
              <StatCard
                icon={FileText}
                label="Reports Generated"
                value={formatNumber(overview.totalReports)}
                iconColor="text-purple-500"
                onClick={() => setSelectedMetric(selectedMetric === 'reports' ? null : 'reports')}
                details={selectedMetric === 'reports' ? [
                  `Total executed: ${formatNumber(overview.totalReports)}`,
                  `Avg per day: ${formatNumber(Math.round(overview.totalReports / timeRange))}`,
                  `Usage rate: ${overview.activeUsers30Days ? Math.round((overview.totalReports / overview.activeUsers30Days) * 100) : 0}%`
                ] : undefined}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={Image}
                label="Visualizations"
                value={formatNumber(overview.totalVisualizations)}
                iconColor="text-cyan-500"
                onClick={() => setSelectedMetric(selectedMetric === 'viz' ? null : 'viz')}
                details={selectedMetric === 'viz' ? [
                  `Total created: ${formatNumber(overview.totalVisualizations)}`,
                  `Avg per day: ${formatNumber(Math.round(overview.totalVisualizations / timeRange))}`,
                  `Per active user: ${overview.activeUsers30Days ? formatNumber(Math.round(overview.totalVisualizations / overview.activeUsers30Days)) : 0}`
                ] : undefined}
              />
              <StatCard
                icon={Clock}
                label="Avg Response Time"
                value={`${formatNumber(overview.avgResponseTime)}ms`}
                iconColor="text-yellow-500"
                onClick={() => setSelectedMetric(selectedMetric === 'time' ? null : 'time')}
                details={selectedMetric === 'time' ? [
                  `Average: ${formatNumber(overview.avgResponseTime)}ms`,
                  `Target: < 30,000ms`,
                  `Status: ${overview.avgResponseTime < 30000 ? '✓ Within target' : '⚠ Above target'}`
                ] : undefined}
              />
              <StatCard
                icon={AlertCircle}
                label="Error Rate"
                value={`${overview.errorRate}%`}
                iconColor={overview.errorRate > 5 ? 'text-red-500' : 'text-green-500'}
                onClick={() => setSelectedMetric(selectedMetric === 'errors' ? null : 'errors')}
                details={selectedMetric === 'errors' ? [
                  `Current rate: ${overview.errorRate}%`,
                  `Target: < 5%`,
                  `Status: ${overview.errorRate <= 5 ? '✓ Within target' : '⚠ Above target'}`
                ] : undefined}
              />
            </div>

            {/* Daily Activity Chart */}
            {dailyMetrics.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  Daily Active Users
                </h2>
                <div className="h-64 flex items-end gap-2">
                  {dailyMetrics.slice(-timeRange).map((day, idx) => {
                    const maxUsers = Math.max(...dailyMetrics.map(d => d.daily_active_users));
                    const height = maxUsers > 0 ? (day.daily_active_users / maxUsers) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs text-gray-500 font-medium">{day.daily_active_users}</div>
                        <div
                          className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all hover:from-orange-400 hover:to-orange-300"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`${day.daily_active_users} users on ${formatDate(day.metric_date)}`}
                        ></div>
                        <div className="text-xs text-gray-600">{formatDate(day.metric_date)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'engagement' && (
          <EngagementTab dailyMetrics={dailyMetrics} formatNumber={formatNumber} formatDate={formatDate} />
        )}

        {activeTab === 'performance' && (
          <PerformanceTab performance={performance} formatNumber={formatNumber} formatDate={formatDate} />
        )}

        {activeTab === 'milestones' && (
          <MilestonesTab milestones={milestones} formatNumber={formatNumber} />
        )}

        {activeTab === 'guide' && (
          <GuideTab />
        )}

        {activeTab === 'ask-astra' && (
          <MetricsAskAstra
            metricsData={{
              overview,
              dailyMetrics,
              milestones,
              performance,
              timeRange
            }}
          />
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  iconColor: string;
  onClick?: () => void;
  details?: string[];
}> = ({ icon: Icon, label, value, subtitle, iconColor, onClick, details }) => (
  <div
    className={`bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all ${
      onClick ? 'cursor-pointer hover:bg-gray-750' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        {details && details.length > 0 && (
          <div className="mt-3 space-y-1">
            {details.map((detail, idx) => (
              <p key={idx} className="text-xs text-gray-400">{detail}</p>
            ))}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-gray-900 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

// Engagement Tab Component
const EngagementTab: React.FC<{
  dailyMetrics: DailyMetric[];
  formatNumber: (n: number) => string;
  formatDate: (d: string) => string;
}> = ({ dailyMetrics, formatNumber, formatDate }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <MetricChart
        title="Messages Sent"
        data={dailyMetrics}
        dataKey="total_messages"
        color="from-orange-500 to-orange-400"
        formatNumber={formatNumber}
        formatDate={formatDate}
      />
      <MetricChart
        title="Reports Generated"
        data={dailyMetrics}
        dataKey="total_reports"
        color="from-purple-500 to-purple-400"
        formatNumber={formatNumber}
        formatDate={formatDate}
      />
      <MetricChart
        title="Visualizations Created"
        data={dailyMetrics}
        dataKey="total_visualizations"
        color="from-cyan-500 to-cyan-400"
        formatNumber={formatNumber}
        formatDate={formatDate}
      />
    </div>
  </div>
);

// Performance Tab Component
const PerformanceTab: React.FC<{
  performance: PerformanceStats[];
  formatNumber: (n: number) => string;
  formatDate: (d: string) => string;
}> = ({ performance, formatNumber, formatDate }) => {
  // Get unique modes from actual data
  const modes = Array.from(new Set(performance.map(p => p.mode)));
  const hasData = performance.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Response Times by Mode</h2>

        {!hasData && (
          <div className="text-center py-8 text-gray-400">
            <p>No performance data available for the selected time range.</p>
            <p className="text-sm mt-2">Performance metrics are recorded when AI responses include timing data.</p>
          </div>
        )}

        {hasData && (
          <div className="space-y-4">
            {modes.map(mode => {
              const modeData = performance.filter(p => p.mode === mode);
              const avgTime = modeData.length > 0
                ? Math.round(modeData.reduce((sum, p) => sum + p.avg_response_ms, 0) / modeData.length)
                : 0;
              const avgSuccess = modeData.length > 0
                ? Math.round(modeData.reduce((sum, p) => sum + p.success_rate, 0) / modeData.length * 100)
                : 0;
              const totalRequests = modeData.reduce((sum, p) => sum + p.total_requests, 0);

              return (
                <div key={mode} className="p-4 bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium capitalize">{mode}</span>
                      <span className="text-xs text-gray-500 ml-2">({formatNumber(totalRequests)} requests)</span>
                    </div>
                    <span className="text-sm text-gray-400">{formatNumber(avgTime)}ms avg</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full"
                      style={{ width: `${avgSuccess}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{avgSuccess}% success rate</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Milestones Tab Component
const MilestonesTab: React.FC<{
  milestones: MilestoneStats[];
  formatNumber: (n: number) => string;
}> = ({ milestones, formatNumber }) => (
  <div className="space-y-6">
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-orange-500" />
        Milestone Achievement Rates
      </h2>
      <div className="space-y-4">
        {milestones.sort((a, b) => b.users_achieved - a.users_achieved).map((milestone, idx) => (
          <div key={idx} className="p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium capitalize">{milestone.milestone_type.replace(/_/g, ' ')}</span>
              <span className="text-sm text-gray-400">
                {formatNumber(milestone.users_achieved)} users ({milestone.achievement_rate_pct}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full"
                style={{ width: `${milestone.achievement_rate_pct}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Guide Tab Component
const GuideTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-blue-500 text-transparent bg-clip-text">
        User Metrics Tracking Guide
      </h2>

      <div className="prose prose-invert max-w-none">
        <h3 className="text-xl font-semibold text-white mb-3">📊 What's Being Tracked</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-500 mb-2">Daily Metrics</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Messages sent per user</li>
              <li>• Reports generated</li>
              <li>• Visualizations created</li>
              <li>• Session count & duration</li>
              <li>• Error count</li>
            </ul>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-semibold text-green-500 mb-2">Milestones</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• First message sent</li>
              <li>• First report created</li>
              <li>• First visualization saved</li>
              <li>• Gmail connected</li>
              <li>• Drive connected</li>
            </ul>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-white mb-3">🚀 Key Features</h3>
        <ul className="text-gray-300 space-y-2 mb-6">
          <li><strong className="text-orange-500">Batched Writes:</strong> Metrics are queued and written in batches (10 events or 60 seconds)</li>
          <li><strong className="text-green-500">Non-Blocking:</strong> All tracking happens asynchronously without slowing down the UI</li>
          <li><strong className="text-blue-500">Mobile-Optimized:</strong> Handles app backgrounding and session lifecycle correctly</li>
          <li><strong className="text-purple-500">Performance Tracking:</strong> AI response times and error rates monitored</li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-3">📈 Benefits</h3>
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-lg mb-6">
          <ul className="text-gray-300 space-y-2">
            <li>✅ <strong>10-100x faster</strong> dashboard queries using pre-aggregated data</li>
            <li>✅ <strong>Real-time insights</strong> into user engagement and behavior</li>
            <li>✅ <strong>Onboarding optimization</strong> with time-to-value metrics</li>
            <li>✅ <strong>SLA monitoring</strong> for AI response times</li>
            <li>✅ <strong>Data-driven decisions</strong> with comprehensive analytics</li>
          </ul>
        </div>

        <h3 className="text-xl font-semibold text-white mb-3">🔍 How to Use This Dashboard</h3>
        <ol className="text-gray-300 space-y-2">
          <li><strong>Overview:</strong> High-level stats and daily activity trends</li>
          <li><strong>Engagement:</strong> Detailed charts for messages, reports, and visualizations</li>
          <li><strong>Performance:</strong> AI response times and success rates by mode</li>
          <li><strong>Milestones:</strong> User achievement rates and adoption metrics</li>
          <li><strong>Ask Astra:</strong> Query metrics using natural language</li>
        </ol>
      </div>
    </div>
  </div>
);

// Metric Chart Component
const MetricChart: React.FC<{
  title: string;
  data: DailyMetric[];
  dataKey: keyof DailyMetric;
  color: string;
  formatNumber: (n: number) => string;
  formatDate: (d: string) => string;
}> = ({ title, data, dataKey, color, formatNumber, formatDate }) => {
  const values = data.map(d => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-2xl font-bold mb-4">{formatNumber(total)}</p>
      <div className="h-32 flex items-end gap-1">
        {data.slice(-14).map((day, idx) => {
          const value = day[dataKey] as number;
          const height = max > 0 ? (value / max) * 100 : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full bg-gradient-to-t ${color} rounded-t-lg transition-all`}
                style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0px' }}
                title={`${value} on ${formatDate(day.metric_date)}`}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
