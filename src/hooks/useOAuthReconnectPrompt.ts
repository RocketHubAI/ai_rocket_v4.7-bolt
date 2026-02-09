import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DISMISSED_KEY = 'oauth_reconnect_dismissed_at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

export const useOAuthReconnectPrompt = () => {
  const [showModal, setShowModal] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkReconnectNeeded = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userIsAdmin = user.user_metadata?.role === 'admin';
      setIsAdmin(userIsAdmin);
      const teamId = user.user_metadata?.team_id;

      const { data: connection } = await supabase
        .from('user_drive_connections')
        .select('connection_status, is_active, scope_version, user_id, provider')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('provider', 'google')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!connection) {
        setLoading(false);
        return;
      }

      const requiresReconnect =
        connection.connection_status === 'token_expired' ||
        (connection.scope_version || 1) < 3;

      console.log('[OAuth Reconnect Check]', {
        userId: user.id,
        teamId,
        connectionStatus: connection.connection_status,
        scopeVersion: connection.scope_version,
        requiresReconnect,
        isAdmin: userIsAdmin,
        connectionOwnerId: connection.user_id
      });

      setNeedsReconnect(requiresReconnect);
      setLoading(false);

      if (requiresReconnect && userIsAdmin) {
        const dismissedAt = localStorage.getItem(DISMISSED_KEY);
        if (dismissedAt) {
          const dismissedTime = parseInt(dismissedAt, 10);
          if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
            return;
          }
        }
        setTimeout(() => {
          setShowModal(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to check OAuth reconnect status:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkReconnectNeeded();
  }, [checkReconnectNeeded]);

  const triggerModal = () => {
    if (needsReconnect) {
      setShowModal(true);
    }
  };

  const dismissModal = () => {
    setShowModal(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleReconnect = () => {
    setShowModal(false);
    localStorage.removeItem(DISMISSED_KEY);
  };

  return {
    showModal,
    needsReconnect,
    loading,
    isAdmin,
    triggerModal,
    dismissModal,
    handleReconnect
  };
};
