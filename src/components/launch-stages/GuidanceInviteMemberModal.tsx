import React, { useState, useEffect } from 'react';
import { X, UserPlus, CheckCircle, ArrowRight, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SupportMenu } from '../SupportMenu';

interface GuidanceInviteMemberModalProps {
  onClose: () => void;
  onProceed: () => void;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

export const GuidanceInviteMemberModal: React.FC<GuidanceInviteMemberModalProps> = ({
  onClose,
  onProceed,
  onOpenHelpCenter,
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasInvited, setHasInvited] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');

  useEffect(() => {
    loadTeamMembers();
  }, [user]);

  const loadTeamMembers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (userData?.team_id) {
        setTeamId(userData.team_id);

        // Load team name
        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', userData.team_id)
          .single();

        if (teamData) {
          setTeamName(teamData.name);
        }

        const { data: members } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('team_id', userData.team_id)
          .neq('id', user.id);

        setTeamMembers(members || []);
        if ((members?.length || 0) > 0) {
          setHasInvited(true);
        }
      }
    } catch (err) {
      console.error('Error loading team members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!teamId) {
      setError('No team found');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Generate invite code
      const inviteCode = generateInviteCode();

      // Insert invite code into database
      const { error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code: inviteCode,
          team_id: teamId,
          invited_email: email.toLowerCase().trim(),
          assigned_role: 'member',
          view_financial: true,
          created_by: user?.id,
          max_uses: 1,
          is_active: true
        });

      if (insertError) throw insertError;

      // Send invite email
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            inviteCode: inviteCode,
            teamName: teamName || 'your team',
            role: 'member',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      setSuccessMessage('Invitation sent successfully!');
      setEmail('');
      setHasInvited(true);
      await loadTeamMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-purple-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Invite Team Members</h2>
              <p className="text-sm text-gray-300">Level 3 - Build your team and collaborate</p>
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
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Invite Team Members</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Invite your team members to collaborate and share insights through Astra Intelligence.
                </p>
              </div>

              {/* Invite Form */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    disabled={isSending}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={isSending || !email.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Invite</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Team Members */}
              {teamMembers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Current Team Members</h3>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="bg-gray-700/50 rounded-lg p-4 flex items-center space-x-3"
                      >
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.name || 'Team Member'}</p>
                          <p className="text-gray-400 text-sm">{member.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamMembers.length === 0 && (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No team members yet. Send your first invitation above!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
          {hasInvited ? (
            <button
              onClick={onProceed}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Proceed to Next Level</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
