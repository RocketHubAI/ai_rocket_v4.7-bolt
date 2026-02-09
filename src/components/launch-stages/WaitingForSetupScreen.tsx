import React, { useState, useEffect } from 'react';
import { Clock, Mail, X, RefreshCw, UserCheck, Rocket, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SetupDelegation {
  team_id: string;
  delegating_user_id: string;
  delegated_to_email: string;
  status: 'pending_invite' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  expires_at: string;
  created_at: string;
}

interface WaitingForSetupScreenProps {
  onSetupComplete: (adminName: string) => void;
  onCancelDelegation: () => void;
}

export const WaitingForSetupScreen: React.FC<WaitingForSetupScreenProps> = ({
  onSetupComplete,
  onCancelDelegation,
}) => {
  const { user } = useAuth();
  const [delegation, setDelegation] = useState<SetupDelegation | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDelegation();
    const channel = supabase
      .channel('delegation-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setup_delegation',
          filter: `delegating_user_id=eq.${user?.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            setDelegation(payload.new as SetupDelegation);
            if (payload.new.status === 'completed') {
              onSetupComplete(payload.new.delegated_to_email);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onSetupComplete]);

  const loadDelegation = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.team_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('setup_delegation')
        .select('*')
        .eq('team_id', userData.team_id)
        .eq('delegating_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setDelegation(data);

      if (data?.status === 'completed') {
        onSetupComplete(data.delegated_to_email);
      }
    } catch (err: any) {
      console.error('Error loading delegation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!delegation) return;

    setResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', delegation.team_id)
        .maybeSingle();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-setup-admin-invite`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: delegation.delegated_to_email,
          teamName: teamData?.name || 'Your Team',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to resend invitation');

      setSuccessMessage('Invitation resent successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error resending invite:', err);
      setError(err.message || 'Failed to resend invitation');
    } finally {
      setResending(false);
    }
  };

  const handleCancelDelegation = async () => {
    if (!delegation) return;

    setCancelling(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('setup_delegation')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'User chose to complete setup themselves'
        })
        .eq('team_id', delegation.team_id);

      if (updateError) throw updateError;

      await supabase
        .from('user_launch_status')
        .update({ awaiting_team_setup: false })
        .eq('user_id', user?.id);

      onCancelDelegation();
    } catch (err: any) {
      console.error('Error cancelling delegation:', err);
      setError(err.message || 'Failed to cancel delegation');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusIcon = () => {
    switch (delegation?.status) {
      case 'pending_invite':
        return <Mail className="w-8 h-8 text-blue-400" />;
      case 'accepted':
        return <UserCheck className="w-8 h-8 text-green-400" />;
      case 'in_progress':
        return <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (delegation?.status) {
      case 'pending_invite':
        return 'Waiting for admin to accept invitation';
      case 'accepted':
        return 'Admin has joined - setup in progress';
      case 'in_progress':
        return 'Admin is completing the setup';
      case 'completed':
        return 'Setup completed!';
      default:
        return 'Loading...';
    }
  };

  const getStatusDescription = () => {
    switch (delegation?.status) {
      case 'pending_invite':
        return `An invitation was sent to ${delegation.delegated_to_email}. They need to create an account and accept to begin setup.`;
      case 'accepted':
        return `${delegation.delegated_to_email} has joined your team and is now completing the Launch Preparation setup.`;
      case 'in_progress':
        return `The setup is being configured. You'll be notified when everything is ready.`;
      case 'completed':
        return `Your team is all set up and ready to launch!`;
      default:
        return '';
    }
  };

  const isExpired = delegation?.expires_at && new Date(delegation.expires_at) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {getStatusIcon()}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Setup In Progress</h1>
          <p className="text-gray-400">
            You've delegated the setup to a team admin
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {isExpired && (
          <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-400 text-sm font-medium">Invitation Expired</p>
              <p className="text-orange-300 text-xs mt-1">
                The invitation has expired. You can resend it or cancel and invite someone else.
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <div>
              <p className="text-white font-medium">{getStatusText()}</p>
              <p className="text-gray-400 text-sm">{delegation?.delegated_to_email}</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm">{getStatusDescription()}</p>
        </div>

        <div className="space-y-3">
          {(delegation?.status === 'pending_invite' || isExpired) && (
            <button
              onClick={handleResendInvite}
              disabled={resending}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Resend Invitation</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCancelDelegation}
            disabled={cancelling}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {cancelling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Cancel & Do It Myself</span>
              </>
            )}
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          You'll be notified when setup is complete. You can also cancel and complete the setup yourself.
        </p>
      </div>
    </div>
  );
};
