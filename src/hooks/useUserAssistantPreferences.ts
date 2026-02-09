import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type ProactiveLevel = 'low' | 'medium' | 'high';

export interface NotificationTypes {
  daily_summary: boolean;
  report_ready: boolean;
  goal_milestone: boolean;
  meeting_reminder: boolean;
  action_item_due: boolean;
  team_mention: boolean;
  insight_discovered: boolean;
  sync_complete: boolean;
  weekly_recap: boolean;
}

export interface UserAssistantPreferences {
  user_id: string;
  assistant_name: string | null;
  member_onboarding_completed: boolean;
  proactive_enabled: boolean;
  proactive_level: ProactiveLevel;
  email_enabled: boolean;
  email_address: string | null;
  sms_enabled: boolean;
  sms_phone_number: string | null;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  notification_types: NotificationTypes;
  created_at: string;
  updated_at: string;
}

const DEFAULT_NOTIFICATION_TYPES: NotificationTypes = {
  daily_summary: true,
  report_ready: true,
  goal_milestone: true,
  meeting_reminder: true,
  action_item_due: true,
  team_mention: true,
  insight_discovered: true,
  sync_complete: false,
  weekly_recap: true,
};

const DEFAULT_PREFERENCES: Partial<UserAssistantPreferences> = {
  proactive_enabled: false,
  proactive_level: 'medium',
  email_enabled: true,
  email_address: null,
  sms_enabled: false,
  sms_phone_number: null,
  whatsapp_enabled: false,
  whatsapp_number: null,
  telegram_enabled: false,
  telegram_chat_id: null,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  quiet_hours_timezone: 'America/New_York',
  notification_types: DEFAULT_NOTIFICATION_TYPES,
};

export const useUserAssistantPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserAssistantPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_assistant_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setPreferences(data as UserAssistantPreferences);
      } else {
        const newPrefs = {
          user_id: user.id,
          ...DEFAULT_PREFERENCES,
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('user_assistant_preferences')
          .insert(newPrefs)
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(insertedData as UserAssistantPreferences);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      console.error('Error fetching assistant preferences:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_assistant_preferences_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_assistant_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setPreferences(payload.new as UserAssistantPreferences);
          } else if (payload.eventType === 'DELETE') {
            setPreferences(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updatePreferences = async (
    updates: Partial<Omit<UserAssistantPreferences, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('user_assistant_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setPreferences(data as UserAssistantPreferences);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      console.error('Error updating assistant preferences:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  };

  const toggleProactiveEnabled = async (enabled: boolean) => {
    return updatePreferences({ proactive_enabled: enabled });
  };

  const setProactiveLevel = async (level: ProactiveLevel) => {
    return updatePreferences({ proactive_level: level });
  };

  const toggleChannel = async (
    channel: 'email' | 'sms' | 'whatsapp' | 'telegram',
    enabled: boolean
  ) => {
    const key = `${channel}_enabled` as keyof UserAssistantPreferences;
    return updatePreferences({ [key]: enabled } as Partial<UserAssistantPreferences>);
  };

  const updateChannelDetails = async (
    channel: 'email' | 'sms' | 'whatsapp' | 'telegram',
    value: string | null
  ) => {
    const keyMap = {
      email: 'email_address',
      sms: 'sms_phone_number',
      whatsapp: 'whatsapp_number',
      telegram: 'telegram_chat_id',
    };
    const key = keyMap[channel] as keyof UserAssistantPreferences;
    return updatePreferences({ [key]: value } as Partial<UserAssistantPreferences>);
  };

  const updateQuietHours = async (settings: {
    enabled?: boolean;
    start?: string;
    end?: string;
    timezone?: string;
  }) => {
    const updates: Partial<UserAssistantPreferences> = {};
    if (settings.enabled !== undefined) updates.quiet_hours_enabled = settings.enabled;
    if (settings.start) updates.quiet_hours_start = settings.start;
    if (settings.end) updates.quiet_hours_end = settings.end;
    if (settings.timezone) updates.quiet_hours_timezone = settings.timezone;
    return updatePreferences(updates);
  };

  const toggleNotificationType = async (eventType: keyof NotificationTypes, enabled: boolean) => {
    if (!preferences) return { success: false, error: 'Preferences not loaded' };

    const newNotificationTypes = {
      ...preferences.notification_types,
      [eventType]: enabled,
    };
    return updatePreferences({ notification_types: newNotificationTypes });
  };

  const updateAllNotificationTypes = async (types: NotificationTypes) => {
    return updatePreferences({ notification_types: types });
  };

  const getEnabledChannels = (): string[] => {
    if (!preferences) return [];
    const channels: string[] = [];
    if (preferences.email_enabled) channels.push('email');
    if (preferences.sms_enabled && preferences.sms_phone_number) channels.push('sms');
    if (preferences.whatsapp_enabled && preferences.whatsapp_number) channels.push('whatsapp');
    if (preferences.telegram_enabled && preferences.telegram_chat_id) channels.push('telegram');
    return channels;
  };

  const getEnabledNotificationTypes = (): string[] => {
    if (!preferences) return [];
    return Object.entries(preferences.notification_types)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);
  };

  const updateAssistantName = async (name: string | null) => {
    return updatePreferences({ assistant_name: name } as Partial<UserAssistantPreferences>);
  };

  const markMemberOnboardingComplete = async () => {
    return updatePreferences({ member_onboarding_completed: true } as Partial<UserAssistantPreferences>);
  };

  return {
    preferences,
    loading,
    saving,
    error,
    fetchPreferences,
    updatePreferences,
    toggleProactiveEnabled,
    setProactiveLevel,
    toggleChannel,
    updateChannelDetails,
    updateQuietHours,
    toggleNotificationType,
    updateAllNotificationTypes,
    getEnabledChannels,
    getEnabledNotificationTypes,
    updateAssistantName,
    markMemberOnboardingComplete,
  };
};