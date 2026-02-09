import { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Moon,
  Clock,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import {
  useUserAssistantPreferences,
  ProactiveLevel,
  NotificationTypes,
} from '../hooks/useUserAssistantPreferences';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

const NOTIFICATION_TYPE_LABELS: Record<keyof NotificationTypes, { label: string; description: string }> = {
  daily_summary: {
    label: 'Daily Summary',
    description: 'Morning briefing of team activity and priorities',
  },
  report_ready: {
    label: 'Report Ready',
    description: 'When a scheduled report has been generated',
  },
  goal_milestone: {
    label: 'Goal Milestone',
    description: 'Progress updates toward team goals',
  },
  meeting_reminder: {
    label: 'Meeting Reminder',
    description: 'Reminders for upcoming meetings',
  },
  action_item_due: {
    label: 'Action Item Due',
    description: 'When deadlines are approaching',
  },
  team_mention: {
    label: 'Team Mention',
    description: 'When you are mentioned in team chat',
  },
  insight_discovered: {
    label: 'Insight Discovered',
    description: 'AI found something interesting in your data',
  },
  sync_complete: {
    label: 'Sync Complete',
    description: 'Document sync finished with highlights',
  },
  weekly_recap: {
    label: 'Weekly Recap',
    description: 'End of week summary and achievements',
  },
};

const PROACTIVE_LEVEL_DESCRIPTIONS: Record<ProactiveLevel, string> = {
  low: 'Essential notifications only (reports, urgent mentions)',
  medium: 'Balanced mix of updates and insights',
  high: 'All notifications including daily summaries and insights',
};

export const AssistantNotificationSettings = () => {
  const {
    preferences,
    loading,
    saving,
    error,
    toggleProactiveEnabled,
    setProactiveLevel,
    toggleChannel,
    updateChannelDetails,
    updateQuietHours,
    toggleNotificationType,
  } = useUserAssistantPreferences();

  const [expandedSection, setExpandedSection] = useState<string | null>('channels');
  const [localSmsNumber, setLocalSmsNumber] = useState('');
  const [localWhatsAppNumber, setLocalWhatsAppNumber] = useState('');
  const [localTelegramId, setLocalTelegramId] = useState('');
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  const handleSaveWithStatus = async (
    key: string,
    saveFn: () => Promise<{ success: boolean; error?: string }>
  ) => {
    setSaveStatus((prev) => ({ ...prev, [key]: 'saving' }));
    const result = await saveFn();
    setSaveStatus((prev) => ({ ...prev, [key]: result.success ? 'saved' : 'error' }));
    if (result.success) {
      setTimeout(() => {
        setSaveStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[key];
          return newStatus;
        });
      }, 2000);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
        <span className="ml-2 text-slate-400">Loading notification settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading settings: {error}</span>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-slate-400 text-center py-8">
        Unable to load notification preferences.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <Bell className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Proactive Assistant</h3>
              <p className="text-sm text-slate-400">
                Allow Astra to reach out with updates and insights
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              handleSaveWithStatus('proactive', () =>
                toggleProactiveEnabled(!preferences.proactive_enabled)
              )
            }
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              preferences.proactive_enabled ? 'bg-teal-500' : 'bg-slate-600'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                preferences.proactive_enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {preferences.proactive_enabled && (
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Notification Frequency
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as ProactiveLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    handleSaveWithStatus('level', () => setProactiveLevel(level))
                  }
                  className={`p-3 rounded-lg border transition-all ${
                    preferences.proactive_level === level
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-400'
                      : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium capitalize">{level}</div>
                  <div className="text-xs mt-1 text-slate-400">
                    {level === 'low' && 'Essential'}
                    {level === 'medium' && 'Balanced'}
                    {level === 'high' && 'Everything'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {PROACTIVE_LEVEL_DESCRIPTIONS[preferences.proactive_level]}
            </p>
          </div>
        )}
      </div>

      {preferences.proactive_enabled && (
        <>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => toggleSection('channels')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-medium text-white">Notification Channels</h3>
                  <p className="text-sm text-slate-400">
                    Choose how Astra can reach you
                  </p>
                </div>
              </div>
              {expandedSection === 'channels' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedSection === 'channels' && (
              <div className="p-4 pt-0 space-y-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <div>
                        <span className="font-medium text-white">Email</span>
                        <span className="ml-2 text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleSaveWithStatus('email', () =>
                          toggleChannel('email', !preferences.email_enabled)
                        )
                      }
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.email_enabled ? 'bg-teal-500' : 'bg-slate-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.email_enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {preferences.email_enabled && (
                    <input
                      type="email"
                      placeholder="Use account email"
                      value={preferences.email_address || ''}
                      onChange={(e) =>
                        handleSaveWithStatus('email_address', () =>
                          updateChannelDetails('email', e.target.value || null)
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                    />
                  )}
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-white">SMS</span>
                    </div>
                    <button
                      onClick={() =>
                        handleSaveWithStatus('sms', () =>
                          toggleChannel('sms', !preferences.sms_enabled)
                        )
                      }
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.sms_enabled ? 'bg-teal-500' : 'bg-slate-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.sms_enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {preferences.sms_enabled && (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={localSmsNumber || preferences.sms_phone_number || ''}
                        onChange={(e) => setLocalSmsNumber(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                      />
                      <button
                        onClick={() => {
                          handleSaveWithStatus('sms_number', () =>
                            updateChannelDetails('sms', localSmsNumber || null)
                          );
                          setLocalSmsNumber('');
                        }}
                        disabled={!localSmsNumber && !preferences.sms_phone_number}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                      >
                        {saveStatus['sms_number'] === 'saving' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveStatus['sms_number'] === 'saved' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-white">WhatsApp</span>
                    </div>
                    <button
                      onClick={() =>
                        handleSaveWithStatus('whatsapp', () =>
                          toggleChannel('whatsapp', !preferences.whatsapp_enabled)
                        )
                      }
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.whatsapp_enabled ? 'bg-teal-500' : 'bg-slate-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.whatsapp_enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {preferences.whatsapp_enabled && (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={localWhatsAppNumber || preferences.whatsapp_number || ''}
                        onChange={(e) => setLocalWhatsAppNumber(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                      />
                      <button
                        onClick={() => {
                          handleSaveWithStatus('whatsapp_number', () =>
                            updateChannelDetails('whatsapp', localWhatsAppNumber || null)
                          );
                          setLocalWhatsAppNumber('');
                        }}
                        disabled={!localWhatsAppNumber && !preferences.whatsapp_number}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                      >
                        {saveStatus['whatsapp_number'] === 'saving' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveStatus['whatsapp_number'] === 'saved' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-white">Telegram</span>
                    </div>
                    <button
                      onClick={() =>
                        handleSaveWithStatus('telegram', () =>
                          toggleChannel('telegram', !preferences.telegram_enabled)
                        )
                      }
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.telegram_enabled ? 'bg-teal-500' : 'bg-slate-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.telegram_enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {preferences.telegram_enabled && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Your Telegram Chat ID"
                          value={localTelegramId || preferences.telegram_chat_id || ''}
                          onChange={(e) => setLocalTelegramId(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                        />
                        <button
                          onClick={() => {
                            handleSaveWithStatus('telegram_id', () =>
                              updateChannelDetails('telegram', localTelegramId || null)
                            );
                            setLocalTelegramId('');
                          }}
                          disabled={!localTelegramId && !preferences.telegram_chat_id}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                        >
                          {saveStatus['telegram_id'] === 'saving' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : saveStatus['telegram_id'] === 'saved' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            'Save'
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Message @AIRocketBot on Telegram to get your Chat ID
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => toggleSection('quiet')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-medium text-white">Quiet Hours</h3>
                  <p className="text-sm text-slate-400">
                    {preferences.quiet_hours_enabled
                      ? `${preferences.quiet_hours_start} - ${preferences.quiet_hours_end}`
                      : 'Not configured'}
                  </p>
                </div>
              </div>
              {expandedSection === 'quiet' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedSection === 'quiet' && (
              <div className="p-4 pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Enable Quiet Hours</span>
                  <button
                    onClick={() =>
                      handleSaveWithStatus('quiet_enabled', () =>
                        updateQuietHours({ enabled: !preferences.quiet_hours_enabled })
                      )
                    }
                    disabled={saving}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      preferences.quiet_hours_enabled ? 'bg-teal-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        preferences.quiet_hours_enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {preferences.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Start Time</label>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <input
                          type="time"
                          value={preferences.quiet_hours_start}
                          onChange={(e) =>
                            handleSaveWithStatus('quiet_start', () =>
                              updateQuietHours({ start: e.target.value })
                            )
                          }
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">End Time</label>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <input
                          type="time"
                          value={preferences.quiet_hours_end}
                          onChange={(e) =>
                            handleSaveWithStatus('quiet_end', () =>
                              updateQuietHours({ end: e.target.value })
                            )
                          }
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">Timezone</label>
                      <select
                        value={preferences.quiet_hours_timezone}
                        onChange={(e) =>
                          handleSaveWithStatus('quiet_tz', () =>
                            updateQuietHours({ timezone: e.target.value })
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => toggleSection('types')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-400" />
                <div>
                  <h3 className="font-medium text-white">Notification Types</h3>
                  <p className="text-sm text-slate-400">
                    Choose what triggers notifications
                  </p>
                </div>
              </div>
              {expandedSection === 'types' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedSection === 'types' && (
              <div className="p-4 pt-0 space-y-3">
                {(Object.keys(NOTIFICATION_TYPE_LABELS) as Array<keyof NotificationTypes>).map(
                  (type) => (
                    <div
                      key={type}
                      className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0"
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          {NOTIFICATION_TYPE_LABELS[type].label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {NOTIFICATION_TYPE_LABELS[type].description}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleSaveWithStatus(`type_${type}`, () =>
                            toggleNotificationType(type, !preferences.notification_types[type])
                          )
                        }
                        disabled={saving}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          preferences.notification_types[type] ? 'bg-teal-500' : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            preferences.notification_types[type]
                              ? 'translate-x-5'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};