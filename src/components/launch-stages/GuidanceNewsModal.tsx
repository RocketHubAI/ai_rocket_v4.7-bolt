import React, { useState, useEffect } from 'react';
import { X, Save, Newspaper, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NewsPreferences } from '../../types';
import { NewsPreferencesSection } from '../NewsPreferencesSection';
import { useAuth } from '../../contexts/AuthContext';
import { SupportMenu } from '../SupportMenu';

interface GuidanceNewsModalProps {
  onClose: () => void;
  onProceed: () => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

const DEFAULT_NEWS_PREFERENCES: NewsPreferences = {
  industries: ['AI', 'Technology'],
  custom_topics: 'AI news, technology trends, business updates',
  max_results: 10,
};

export const GuidanceNewsModal: React.FC<GuidanceNewsModalProps> = ({
  onClose,
  onProceed,
  onOpenHelpCenter,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newsPreferences, setNewsPreferences] = useState<NewsPreferences>(DEFAULT_NEWS_PREFERENCES);
  const [hasConfigured, setHasConfigured] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    loadNewsPreferences();
  }, [user]);

  const loadNewsPreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get user's team_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const userTeamId = userData.team_id;
      setTeamId(userTeamId);

      if (!userTeamId) {
        setError('No team found for user');
        return;
      }

      // Load existing team settings
      const { data, error: fetchError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', userTeamId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setNewsPreferences(data.news_preferences || DEFAULT_NEWS_PREFERENCES);
      } else {
        setNewsPreferences(DEFAULT_NEWS_PREFERENCES);
      }
    } catch (err: any) {
      console.error('Error loading news preferences:', err);
      setError('Failed to load news preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!teamId) {
      setError('No team found');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Get existing meeting types to preserve them
      const { data: existing } = await supabase
        .from('team_settings')
        .select('meeting_types')
        .eq('team_id', teamId)
        .maybeSingle();

      const { error: saveError } = await supabase
        .from('team_settings')
        .upsert(
          {
            team_id: teamId,
            meeting_types: existing?.meeting_types || [],
            news_preferences: newsPreferences,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'team_id',
          }
        );

      if (saveError) throw saveError;

      setSuccessMessage('News preferences saved successfully!');
      setHasConfigured(true);
    } catch (err: any) {
      console.error('Error saving news preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-blue-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">News Preferences</h2>
              <p className="text-sm text-gray-300">Level 2 - Stay informed about your industry</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <NewsPreferencesSection
              preferences={newsPreferences}
              onChange={setNewsPreferences}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
          {hasConfigured ? (
            <button
              onClick={onProceed}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Proceed to Next Level</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
