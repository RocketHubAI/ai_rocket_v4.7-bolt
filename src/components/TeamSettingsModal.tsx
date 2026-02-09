import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Sparkles, FastForward, Calendar, Newspaper, Shield, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MeetingType, NewsPreferences } from '../types';
import { MeetingTypesSection } from './MeetingTypesSection';
import { NewsPreferencesSection } from './NewsPreferencesSection';
import { CategoryAccessManager } from './CategoryAccessManager';
import { TeamMembersPanel } from './TeamMembersPanel';

type SettingsTab = 'members' | 'meetings' | 'news' | 'access';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  isOnboarding?: boolean;
  isAdmin?: boolean;
  initialTab?: SettingsTab;
}

const DEFAULT_MEETING_TYPES: MeetingType[] = [
  {
    type: 'Team Leadership Meeting',
    description: 'Weekly or regular leadership team meetings',
    enabled: true,
  },
  {
    type: '1-1 Meeting',
    description: 'One-on-one discussions between team members',
    enabled: true,
  },
  {
    type: 'Customer Meeting',
    description: 'Meetings with customers and clients',
    enabled: true,
  },
  {
    type: 'Vendor Meeting',
    description: 'Meetings with vendors and suppliers',
    enabled: true,
  },
  {
    type: 'Sales Call',
    description: 'Sales-related calls and meetings',
    enabled: true,
  },
  {
    type: 'Misc Meeting',
    description: 'Other meetings not covered by standard types',
    enabled: true,
  },
];

const DEFAULT_NEWS_PREFERENCES: NewsPreferences = {
  industries: ['AI', 'Technology'],
  custom_topics: 'AI news, technology trends, business updates',
  max_results: 10,
};

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'members', label: 'Team Members', icon: <Users className="w-4 h-4" /> },
  { id: 'meetings', label: 'Meeting Types', icon: <Calendar className="w-4 h-4" /> },
  { id: 'news', label: 'News & Industry', icon: <Newspaper className="w-4 h-4" /> },
  { id: 'access', label: 'Category Access', icon: <Shield className="w-4 h-4" /> },
];

export const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({
  isOpen,
  onClose,
  teamId,
  isOnboarding = false,
  isAdmin: isAdminProp = false,
  initialTab = 'members',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedIsAdmin, setResolvedIsAdmin] = useState(isAdminProp);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>(DEFAULT_MEETING_TYPES);
  const [newsPreferences, setNewsPreferences] = useState<NewsPreferences>(
    DEFAULT_NEWS_PREFERENCES
  );

  useEffect(() => {
    if (isOpen && teamId) {
      loadTeamSettings();
      setActiveTab(initialTab);
    }
  }, [isOpen, teamId, initialTab]);

  useEffect(() => {
    if (isAdminProp) {
      setResolvedIsAdmin(true);
      return;
    }
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.role === 'admin') {
        setResolvedIsAdmin(true);
      }
    };
    checkAdmin();
  }, [isAdminProp]);

  const loadTeamSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setMeetingTypes(data.meeting_types || DEFAULT_MEETING_TYPES);
        setNewsPreferences(data.news_preferences || DEFAULT_NEWS_PREFERENCES);
      } else {
        setMeetingTypes(DEFAULT_MEETING_TYPES);
        setNewsPreferences(DEFAULT_NEWS_PREFERENCES);
      }
    } catch (err: any) {
      console.error('Error loading team settings:', err);
      setError('Failed to load team settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const enabledCount = meetingTypes.filter((t) => t.enabled).length;
    if (enabledCount === 0) {
      setError('At least one meeting type must be enabled');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: saveError } = await supabase
        .from('team_settings')
        .upsert(
          {
            team_id: teamId,
            meeting_types: meetingTypes,
            news_preferences: newsPreferences,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'team_id',
          }
        );

      if (saveError) throw saveError;

      setSuccessMessage('Team settings saved successfully');
      setHasUnsavedChanges(false);

      if (isOnboarding) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Error saving team settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !isOnboarding) {
      if (
        window.confirm(
          'You have unsaved changes. Are you sure you want to close without saving?'
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSkip = async () => {
    if (!isOnboarding) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: saveError } = await supabase
        .from('team_settings')
        .upsert(
          {
            team_id: teamId,
            meeting_types: DEFAULT_MEETING_TYPES,
            news_preferences: DEFAULT_NEWS_PREFERENCES,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'team_id',
          }
        );

      if (saveError) throw saveError;

      setSuccessMessage(
        'Default meeting types saved. News monitoring is disabled. You can customize these settings anytime in User Settings.'
      );
      setHasUnsavedChanges(false);

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Error saving default settings:', err);
      setError('Failed to save default settings. Please try again.');
      setIsSaving(false);
    }
  };

  const handleMeetingTypesChange = (types: MeetingType[]) => {
    setMeetingTypes(types);
    setHasUnsavedChanges(true);
  };

  const handleNewsPreferencesChange = (prefs: NewsPreferences) => {
    setNewsPreferences(prefs);
    setHasUnsavedChanges(true);
  };

  if (!isOpen) return null;

  const showTabs = !isOnboarding;
  const availableTabs = isOnboarding
    ? TABS.filter(t => t.id !== 'access' && t.id !== 'members')
    : TABS;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {isOnboarding ? (
          <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Let's Personalize Astra for Your Team
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Help me understand your workflow
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
              <p className="text-gray-300 text-sm leading-relaxed">
                Hi! I'm Astra, your AI assistant. To provide the most relevant insights and summaries, I need to learn about your team's meeting types and interests. This helps me:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">-</span>
                  <span>Automatically categorize and summarize your meetings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">-</span>
                  <span>Monitor industry news and trends relevant to your business</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">-</span>
                  <span>Provide better context-aware responses to your questions</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleSkip}
              disabled={isSaving}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FastForward className="w-5 h-5" />
              Skip for Now - Use Defaults Instead
            </button>
          </div>
        ) : (
          <div className="border-b border-gray-700">
            <div className="flex justify-between items-center p-4 sm:p-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Team Settings</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Manage your team preferences
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {showTabs && (
              <div className="px-4 sm:px-6 flex gap-1 overflow-x-auto">
                {availableTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'bg-gray-800 text-white border-t border-l border-r border-gray-600'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30">
          {activeTab === 'members' && !isOnboarding ? (
            <TeamMembersPanel />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {!resolvedIsAdmin && !isOnboarding && activeTab !== 'members' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 text-sm text-blue-300">
                  Only team admins can modify these settings.
                </div>
              )}
              <div className={!resolvedIsAdmin && !isOnboarding && activeTab !== 'members' ? 'pointer-events-none opacity-60' : ''}>
                {(activeTab === 'meetings' || isOnboarding) && (
                  <MeetingTypesSection
                    meetingTypes={meetingTypes}
                    onChange={handleMeetingTypesChange}
                  />
                )}

                {activeTab === 'news' && !isOnboarding && (
                  <NewsPreferencesSection
                    preferences={newsPreferences}
                    onChange={handleNewsPreferencesChange}
                  />
                )}

                {activeTab === 'access' && !isOnboarding && (
                  <CategoryAccessManager teamId={teamId} />
                )}

                {isOnboarding && (
                  <>
                    <div className="border-t border-gray-700 my-8"></div>
                    <NewsPreferencesSection
                      preferences={newsPreferences}
                      onChange={handleNewsPreferencesChange}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {activeTab !== 'members' && (resolvedIsAdmin || isOnboarding) && (
          <div className="border-t border-gray-700 p-6 space-y-3 bg-gray-900/50">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              {isOnboarding && (
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isSaving}
                >
                  <FastForward className="w-4 h-4" />
                  Use Defaults & Continue
                </button>
              )}
              {activeTab !== 'access' && (
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isOnboarding ? 'Save & Continue' : 'Save Settings'}
                    </>
                  )}
                </button>
              )}
              {activeTab === 'access' && (
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  Done
                </button>
              )}
            </div>

            {isOnboarding && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Don't worry, you can always update these settings later from User Settings
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
