import React, { useState, useEffect } from 'react';
import {
  FileText, RefreshCw, CheckCircle, XCircle, Clock, Mail,
  TrendingUp, Calendar, AlertCircle, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';

interface ReportsMetrics {
  totalReportsConfigured: number;
  scheduledReportsCount: number;
  manualReportsCount: number;
  activeReportsCount: number;
  inactiveReportsCount: number;
  reportsRunToday: number;
  reportsRunLast7Days: number;
  reportsRunLast30Days: number;
  pendingDeliveryCount: number;
  emailsSentToday: number;
  emailsSentLast7Days: number;
  emailsFailedLast7Days: number;
  reportsWithEmailEnabled: number;
  teamReportsCount: number;
}

interface ReportExecution {
  id: string;
  title: string;
  user_email: string;
  team_name: string;
  schedule_frequency: string;
  last_run_at: string;
  next_run_at: string;
  is_active: boolean;
  send_email: boolean;
  is_team_report: boolean;
}

interface EmailDelivery {
  id: string;
  email: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

export const ReportsAnalyticsPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ReportsMetrics | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<ReportExecution[]>([]);
  const [recentEmailDeliveries, setRecentEmailDeliveries] = useState<EmailDelivery[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'executions' | 'emails' | 'pending'>('overview');

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const todayStart = startOfDay(now);
      const sevenDaysAgo = subDays(todayStart, 7);
      const thirtyDaysAgo = subDays(todayStart, 30);

      const { data: allReports } = await supabase
        .from('astra_reports')
        .select('*');

      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, team_id, teams(name)');

      const userMap = new Map((allUsers || []).map(u => [u.id, u]));

      const { data: reportsChats } = await supabase
        .from('astra_chats')
        .select('id, created_at, user_email, metadata, deliver_at')
        .eq('mode', 'reports')
        .eq('message_type', 'astra')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      const { data: emailDeliveries } = await supabase
        .from('report_email_deliveries')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      const { data: pendingDeliveries } = await supabase
        .from('astra_chats')
        .select('id, user_email, created_at, metadata, deliver_at')
        .eq('mode', 'reports')
        .eq('message_type', 'astra')
        .not('deliver_at', 'is', null)
        .gt('deliver_at', now.toISOString())
        .order('deliver_at', { ascending: true });

      const reports = allReports || [];
      const chats = reportsChats || [];
      const deliveries = emailDeliveries || [];
      const pending = pendingDeliveries || [];

      const reportsRunToday = chats.filter(c => new Date(c.created_at) >= todayStart).length;
      const reportsRunLast7Days = chats.filter(c => new Date(c.created_at) >= sevenDaysAgo).length;
      const reportsRunLast30Days = chats.length;

      const emailsSentToday = deliveries.filter(
        d => d.status === 'sent' && new Date(d.created_at) >= todayStart
      ).length;
      const emailsSentLast7Days = deliveries.filter(d => d.status === 'sent').length;
      const emailsFailedLast7Days = deliveries.filter(
        d => d.status === 'failed' || d.status === 'retry_failed'
      ).length;

      setMetrics({
        totalReportsConfigured: reports.length,
        scheduledReportsCount: reports.filter(r => r.schedule_type === 'scheduled').length,
        manualReportsCount: reports.filter(r => r.schedule_type === 'manual').length,
        activeReportsCount: reports.filter(r => r.is_active).length,
        inactiveReportsCount: reports.filter(r => !r.is_active).length,
        reportsRunToday,
        reportsRunLast7Days,
        reportsRunLast30Days,
        pendingDeliveryCount: pending.length,
        emailsSentToday,
        emailsSentLast7Days,
        emailsFailedLast7Days,
        reportsWithEmailEnabled: reports.filter(r => r.send_email !== false).length,
        teamReportsCount: reports.filter(r => r.is_team_report).length,
      });

      setRecentExecutions(
        reports
          .filter(r => r.last_run_at)
          .sort((a, b) => new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime())
          .slice(0, 20)
          .map(r => {
            const user = userMap.get(r.user_id);
            return {
              id: r.id,
              title: r.title,
              user_email: user?.email || 'Unknown',
              team_name: (user as any)?.teams?.name || 'No team',
              schedule_frequency: r.schedule_frequency,
              last_run_at: r.last_run_at,
              next_run_at: r.next_run_at,
              is_active: r.is_active,
              send_email: r.send_email !== false,
              is_team_report: r.is_team_report || false,
            };
          })
      );

      setRecentEmailDeliveries(
        deliveries.slice(0, 50).map(d => ({
          id: d.id,
          email: d.email,
          status: d.status,
          created_at: d.created_at,
          sent_at: d.sent_at,
          error_message: d.error_message,
        }))
      );

      setPendingReports(
        pending.map(p => ({
          id: p.id,
          user_email: p.user_email,
          title: p.metadata?.title || 'Unknown',
          deliver_at: p.deliver_at,
          created_at: p.created_at,
        }))
      );

    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReportsData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          Reports Analytics
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Configured</span>
              </div>
              <div className="text-2xl font-bold text-white">{metrics.totalReportsConfigured}</div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics.activeReportsCount} active / {metrics.inactiveReportsCount} inactive
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-gray-400">Run Today</span>
              </div>
              <div className="text-2xl font-bold text-white">{metrics.reportsRunToday}</div>
              <div className="text-xs text-gray-500 mt-1">
                7d: {metrics.reportsRunLast7Days} / 30d: {metrics.reportsRunLast30Days}
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-400">Emails Sent (7d)</span>
              </div>
              <div className="text-2xl font-bold text-white">{metrics.emailsSentLast7Days}</div>
              <div className="text-xs text-gray-500 mt-1">
                Today: {metrics.emailsSentToday} / Failed: {metrics.emailsFailedLast7Days}
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-gray-400">Pending Delivery</span>
              </div>
              <div className="text-2xl font-bold text-white">{metrics.pendingDeliveryCount}</div>
              <div className="text-xs text-gray-500 mt-1">
                Pre-generated, awaiting delivery time
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{metrics.scheduledReportsCount}</div>
              <div className="text-xs text-gray-400">Scheduled</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-400">{metrics.manualReportsCount}</div>
              <div className="text-xs text-gray-400">Manual</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-cyan-400">{metrics.teamReportsCount}</div>
              <div className="text-xs text-gray-400">Team Reports</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{metrics.reportsWithEmailEnabled}</div>
              <div className="text-xs text-gray-400">Email Enabled</div>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 mb-4 border-b border-gray-700">
        {(['overview', 'executions', 'emails', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'executions' && `Recent Executions (${recentExecutions.length})`}
            {tab === 'emails' && `Email Deliveries (${recentEmailDeliveries.length})`}
            {tab === 'pending' && `Pending (${pendingReports.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Report Execution Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{metrics.reportsRunToday}</div>
                <div className="text-sm text-gray-400">Today</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{metrics.reportsRunLast7Days}</div>
                <div className="text-sm text-gray-400">Last 7 Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{metrics.reportsRunLast30Days}</div>
                <div className="text-sm text-gray-400">Last 30 Days</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              Email Delivery Health
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-white">{metrics.emailsSentLast7Days} sent</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-white">{metrics.emailsFailedLast7Days} failed</span>
              </div>
              {metrics.emailsFailedLast7Days > 0 && (
                <div className="text-yellow-400 text-sm">
                  ({((metrics.emailsFailedLast7Days / (metrics.emailsSentLast7Days + metrics.emailsFailedLast7Days)) * 100).toFixed(1)}% failure rate)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'executions' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Report</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Frequency</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Last Run</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Next Run</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentExecutions.map((report) => (
                <tr key={report.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4">
                    <div className="text-sm text-white">{report.title}</div>
                    {report.is_team_report && (
                      <span className="text-xs text-cyan-400">Team Report</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    <div>{report.user_email}</div>
                    <div className="text-xs text-gray-500">{report.team_name}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400 capitalize">{report.schedule_frequency}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {format(new Date(report.last_run_at), 'MMM d, h:mm a')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {report.next_run_at ? format(new Date(report.next_run_at), 'MMM d, h:mm a') : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {report.is_active ? (
                        <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">Inactive</span>
                      )}
                      {report.send_email && (
                        <Mail className="w-4 h-4 text-cyan-400" title="Email enabled" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentExecutions.length === 0 && (
            <div className="text-center py-8 text-gray-400">No report executions found</div>
          )}
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Created</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Sent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Error</th>
              </tr>
            </thead>
            <tbody>
              {recentEmailDeliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-sm text-white">{delivery.email}</td>
                  <td className="py-3 px-4">
                    {delivery.status === 'sent' && (
                      <span className="flex items-center gap-1 text-emerald-400 text-sm">
                        <CheckCircle className="w-4 h-4" /> Sent
                      </span>
                    )}
                    {delivery.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-400 text-sm">
                        <Clock className="w-4 h-4" /> Pending
                      </span>
                    )}
                    {(delivery.status === 'failed' || delivery.status === 'retry_failed') && (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <XCircle className="w-4 h-4" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {format(new Date(delivery.created_at), 'MMM d, h:mm a')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {delivery.sent_at ? format(new Date(delivery.sent_at), 'MMM d, h:mm a') : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-red-400 max-w-xs truncate" title={delivery.error_message || ''}>
                    {delivery.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentEmailDeliveries.length === 0 && (
            <div className="text-center py-8 text-gray-400">No email deliveries in the last 7 days</div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div>
          {pendingReports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>No pre-generated reports pending delivery</p>
              <p className="text-sm mt-2">Reports are pre-generated at 2 AM EST for delivery at scheduled times</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Report</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Pre-generated</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Deliver At</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-sm text-white">{report.title}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">{report.user_email}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {format(new Date(report.created_at), 'MMM d, h:mm a')}
                      </td>
                      <td className="py-3 px-4 text-sm text-amber-400">
                        {format(new Date(report.deliver_at), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
