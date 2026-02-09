import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to check if a feature flag is enabled for the current user
 * @param featureName - The name of the feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export const useFeatureFlag = (featureName: string): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsEnabled(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('feature_name', featureName)
          .or(`user_id.eq.${user.id},email.eq.${user.email},email.eq.*ALL_USERS*`);

        if (error) {
          console.error('Error checking feature flag:', error);
          setIsEnabled(false);
        } else {
          const isAnyEnabled = data?.some(flag => flag.enabled) ?? false;
          setIsEnabled(isAnyEnabled);
        }
      } catch (error) {
        console.error('Error in feature flag check:', error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeatureFlag();
  }, [featureName]);

  return loading ? false : isEnabled;
};
