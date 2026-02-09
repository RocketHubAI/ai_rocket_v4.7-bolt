import React, { useState } from 'react';
import { UserPlus, X, Mail, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DelegateSetupBannerProps {
  teamName?: string;
  onDelegateSuccess: () => void;
}

export const DelegateSetupBanner: React.FC<DelegateSetupBannerProps> = ({
  teamName,
  onDelegateSuccess,
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDelegate = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setError('You cannot invite yourself');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!userData?.team_id) throw new Error('Team not found');

      const { data: existingDelegation } = await supabase
        .from('setup_delegation')
        .select('*')
        .eq('team_id', userData.team_id)
        .maybeSingle();

      if (existingDelegation && !['cancelled', 'completed'].includes(existingDelegation.status)) {
        throw new Error('A setup delegation already exists. Cancel it first to invite someone new.');
      }

      if (existingDelegation) {
        await supabase
          .from('setup_delegation')
          .delete()
          .eq('team_id', userData.team_id);
      }

      const { error: delegationError } = await supabase
        .from('setup_delegation')
        .insert({
          team_id: userData.team_id,
          delegating_user_id: user?.id,
          delegated_to_email: email.trim().toLowerCase(),
          status: 'pending_invite',
        });

      if (delegationError) throw delegationError;

      await supabase
        .from('user_launch_status')
        .update({ awaiting_team_setup: true })
        .eq('user_id', user?.id);

      await supabase
        .from('launch_preparation_progress')
        .update({ level: 0, points_earned: 0, achievements: '[]' })
        .eq('user_id', user?.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-setup-admin-invite`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          teamName: teamName || 'Your Team',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send invitation');

      setSuccess(true);
      setTimeout(() => {
        onDelegateSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Error delegating setup:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-green-400 font-medium">Invitation sent!</p>
            <p className="text-green-300 text-sm">Redirecting to waiting screen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6 transition-colors text-left group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 font-medium text-sm">Delegate Setup to New Admin</p>
              <p className="text-gray-400 text-xs">Invite an admin to complete this for you</p>
            </div>
          </div>
          <span className="text-blue-400 text-sm group-hover:underline">Invite Admin</span>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-blue-400 font-medium text-sm">Invite an Admin to Complete Setup</p>
        </div>
        <button
          onClick={() => {
            setIsExpanded(false);
            setError(null);
            setEmail('');
          }}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@company.com"
          disabled={isSending}
          className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleDelegate}
          disabled={isSending || !email.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center space-x-2"
        >
          {isSending ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          <span>Send</span>
        </button>
      </div>

      <p className="text-gray-400 text-xs mt-3">
        Your progress will be reset and the invited admin will start fresh. You'll wait until they complete setup.
      </p>
    </div>
  );
};
