import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const useActivityTracking = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);

  const updateActivity = async () => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Only update if it's been at least 5 minutes since last update
    if (timeSinceLastUpdate < ACTIVITY_UPDATE_INTERVAL) return;

    try {
      await supabase.rpc('update_user_last_active');
      lastUpdateRef.current = now;
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Update activity on mount
    updateActivity();

    // Track various user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also update periodically if window is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        updateActivity();
      }
    }, ACTIVITY_UPDATE_INTERVAL);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [user]);

  return { updateActivity };
};
