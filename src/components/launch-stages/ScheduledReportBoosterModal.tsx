import React, { useState } from 'react';
import { X, CalendarClock, Send, Sparkles, Loader, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SupportMenu } from '../SupportMenu';

interface ScheduledReportBoosterModalProps {
  onClose: () => void;
  onComplete: () => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

export const ScheduledReportBoosterModal: React.FC<ScheduledReportBoosterModalProps> = ({ onClose, onComplete, onOpenHelpCenter }) => {
  const { user } = useAuth();
  const [reportTitle, setReportTitle] = useState('');
  const [reportPrompt, setReportPrompt] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleHour, setScheduleHour] = useState<number>(8);
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const suggestedScheduledReports = [
    {
      title: 'Daily News Update',
      prompt: 'Review the latest news over the last 24-48 hours and provide insights on anything affecting our mission, goals, or recent initiatives discussed in meetings.',
      frequency: 'daily' as const,
      day: 0,
      hour: 8
    },
    {
      title: 'Weekly Business Review',
      prompt: 'Analyze all data from the past week and provide a comprehensive business review including key metrics, achievements, challenges, and action items',
      frequency: 'weekly' as const,
      day: 1,
      hour: 9
    },
    {
      title: 'Monthly Executive Summary',
      prompt: 'Provide a comprehensive monthly summary of all strategy execution, financial performance, project progress, and key insights',
      frequency: 'monthly' as const,
      day: 1,
      hour: 10
    }
  ];

  const handleReportSelect = (report: typeof suggestedScheduledReports[0]) => {
    setReportTitle(report.title);
    setReportPrompt(report.prompt);
    setFrequency(report.frequency);
    setScheduleDay(report.day);
    setScheduleHour(report.hour);
  };

  const handleCreateScheduledReport = async () => {
    if (!reportTitle.trim() || !reportPrompt.trim()) {
      setErrorMessage('Please provide both a title and prompt for your scheduled report');
      return;
    }

    setIsCreating(true);
    setErrorMessage('');

    try {
      // Format schedule time as HH:MM
      const scheduleTime = `${scheduleHour.toString().padStart(2, '0')}:00`;

      // Create the scheduled report
      const { error: reportError } = await supabase
        .from('astra_reports')
        .insert({
          user_id: user?.id,
          title: reportTitle,
          prompt: reportPrompt,
          schedule_type: 'scheduled',
          schedule_frequency: frequency,
          schedule_day: scheduleDay,
          schedule_time: scheduleTime,
          is_active: true
        });

      if (reportError) throw reportError;

      // Complete the achievement
      await onComplete();
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      setErrorMessage('Failed to create scheduled report. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getScheduleDescription = () => {
    const timeStr = `${scheduleHour.toString().padStart(2, '0')}:00`;
    const tzAbbr = new Date().toLocaleTimeString('en-US', { timeZone: timezone, timeZoneName: 'short' }).split(' ').pop();

    if (frequency === 'daily') {
      return `Every day at ${timeStr} ${tzAbbr}`;
    } else if (frequency === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[scheduleDay]} at ${timeStr} ${tzAbbr}`;
    } else {
      return `Monthly on day ${scheduleDay} at ${timeStr} ${tzAbbr}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <CalendarClock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Scheduled Reports</h2>
              <p className="text-sm text-gray-400">Automate recurring insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Introduction */}
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-300 font-medium mb-1">
                  Automate Your Reporting Workflow
                </p>
                <p className="text-sm text-gray-300">
                  Set up recurring reports that are automatically generated and delivered on your schedule. Perfect for regular reviews, stakeholder updates, and staying on top of your business.
                </p>
              </div>
            </div>
          </div>

          {/* Suggested Scheduled Reports */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Popular Scheduled Reports:</h3>
            <div className="space-y-2">
              {suggestedScheduledReports.map((report, index) => (
                <button
                  key={index}
                  onClick={() => handleReportSelect(report)}
                  className="w-full text-left bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-yellow-500 rounded-lg p-3 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">{report.title}</p>
                    <span className="text-xs text-yellow-400 capitalize">{report.frequency}</span>
                  </div>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">{report.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Scheduled Report Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Report Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g., Weekly Performance Review"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                What would you like in this report?
              </label>
              <textarea
                value={reportPrompt}
                onChange={(e) => setReportPrompt(e.target.value)}
                placeholder="Describe what you want Astra to analyze and include in your recurring report..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Time (Hour)
                </label>
                <select
                  value={scheduleHour}
                  onChange={(e) => setScheduleHour(parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {Intl.supportedValuesOf('timeZone').map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {frequency !== 'daily' && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
                </label>
                <select
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {frequency === 'weekly' ? (
                    <>
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </>
                  ) : (
                    Array.from({ length: 28 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Day {i + 1}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Schedule: </span>
                {getScheduleDescription()}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateScheduledReport}
              disabled={isCreating || !reportTitle.trim() || !reportPrompt.trim()}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CalendarClock className="w-5 h-5" />
                  <span>Schedule Report</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Your scheduled report will be automatically generated at the specified time. You can manage all scheduled reports in the Reports section.
          </p>
        </div>
      </div>
    </div>
  );
};
