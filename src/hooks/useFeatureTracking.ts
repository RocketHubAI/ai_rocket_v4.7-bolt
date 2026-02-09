import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type FeatureType =
  | 'ask_astra'
  | 'visualizations'
  | 'scheduled_reports'
  | 'team_chat'
  | 'drive_sync'
  | 'local_uploads'
  | 'saved_prompts'
  | 'team_dashboard'
  | 'team_pulse'
  | 'astra_create';

export function useFeatureTracking() {
  const { user } = useAuth();

  const trackFeature = useCallback(async (feature: FeatureType, increment: number = 1) => {
    if (!user?.id) return;

    try {
      await supabase.rpc('track_feature_usage', {
        p_user_id: user.id,
        p_feature: feature,
        p_increment: increment
      });
    } catch (err) {
      console.error(`Error tracking ${feature} usage:`, err);
    }
  }, [user?.id]);

  return { trackFeature };
}

export async function trackFeatureUsage(userId: string, feature: FeatureType, increment: number = 1) {
  if (!userId) return;

  try {
    await supabase.rpc('track_feature_usage', {
      p_user_id: userId,
      p_feature: feature,
      p_increment: increment
    });
  } catch (err) {
    console.error(`Error tracking ${feature} usage:`, err);
  }
}
