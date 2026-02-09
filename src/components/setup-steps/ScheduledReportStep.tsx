import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, Mail, TrendingUp, Zap } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduledReportStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

export const ScheduledReportStep: React.FC<ScheduledReportStepProps> = ({ onComplete, progress }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scheduledReportsCount, setScheduledReportsCount] = useState(0);

  useEffect(() => {
    checkScheduledReports();
  }, [user]);

  const checkScheduledReports = async () => {
    if (!user) return;
    const teamId = user.user_metadata?.team_id;
    if (teamId) {
      const { data: teamUsers } = await supabase
        .from('users')
        .select('id')
        .eq('team_id', teamId);

      if (teamUsers && teamUsers.length > 0) {
        const teamUserIds = teamUsers.map(u => u.id);

        const { count } = await supabase
          .from('astra_reports')
          .select('id', { count: 'exact', head: true })
          .in('user_id', teamUserIds)
          .eq('schedule_type', 'scheduled')
          .eq('is_active', true);

        setScheduledReportsCount(count || 0);
      }
    }
    setLoading(false);
  };

  const hasScheduledReports = progress?.step_10_scheduled_report_created || scheduledReportsCount > 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/20 mb-3">
            <Calendar className="w-7 h-7 text-purple-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Schedule Reports</h2>
          <p className="text-sm text-gray-300">Checking your scheduled reports...</p>
        </div>
      </div>
    );
  }

  if (hasScheduledReports) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/20 mb-3">
            <CheckCircle className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Scheduled Reports Active!</h2>
          <p className="text-sm text-gray-300">{scheduledReportsCount} active scheduled report{scheduledReportsCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-600/20 rounded-lg p-3">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{scheduledReportsCount} Report{scheduledReportsCount !== 1 ? 's' : ''} Active</p>
                  <p className="text-xs text-gray-400 mt-0.5">Auto-generated on schedule</p>
                </div>
              </div>
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <p className="text-xs text-green-300 text-center">
            <span className="font-medium">✅ Excellent!</span> Your reports will be generated automatically
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 hover:from-orange-600 hover:via-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Complete Setup! 🎉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/20 mb-3">
          <Calendar className="w-7 h-7 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Schedule Automated Reports</h2>
        <p className="text-sm text-gray-300">Get regular insights delivered automatically</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-lg p-4 text-center">
          <div className="bg-blue-600/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-sm font-medium text-white mb-1">Flexible Schedule</div>
          <div className="text-xs text-gray-400">Daily, Weekly, or Monthly</div>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50 rounded-lg p-4 text-center">
          <div className="bg-green-600/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-6 h-6 text-green-400" />
          </div>
          <div className="text-sm font-medium text-white mb-1">Pick Your Day</div>
          <div className="text-xs text-gray-400">Choose day & time</div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-lg p-4 text-center">
          <div className="bg-orange-600/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
            <Zap className="w-6 h-6 text-orange-400" />
          </div>
          <div className="text-sm font-medium text-white mb-1">Auto-Generated</div>
          <div className="text-xs text-gray-400">Set it and forget it</div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/50 rounded-lg p-4 text-center">
          <div className="bg-purple-600/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-sm font-medium text-white mb-1">Track Progress</div>
          <div className="text-xs text-gray-400">Consistent insights</div>
        </div>
      </div>

      <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
        <p className="text-xs text-purple-300 text-center">
          <span className="font-medium">💡 Tip:</span> Set up from Reports view → Manage Reports → Schedule
        </p>
      </div>

      <div className="flex justify-center pt-2">
        <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 hover:from-orange-600 hover:via-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all min-h-[44px]">
          Complete Setup! 🎉
        </button>
      </div>
    </div>
  );
};
