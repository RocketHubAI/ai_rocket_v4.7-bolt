import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface InviteMembersStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

export const InviteMembersStep: React.FC<InviteMembersStepProps> = ({ onComplete, progress }) => {
  const { user } = useAuth();
  const [teamMemberCount, setTeamMemberCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    checkTeamMembers();
  }, [user]);

  const checkTeamMembers = async () => {
    if (!user) return;
    const teamId = user.user_metadata?.team_id;
    if (teamId) {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('team_id', teamId);
      setTeamMemberCount(count || 1);
    }
    setLoading(false);
  };

  const hasInvitedMembers = progress?.step_11_team_members_invited || teamMemberCount > 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-4">
            <UserPlus className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Invite Team Members</h2>
          <p className="text-gray-300">Checking your team...</p>
        </div>
      </div>
    );
  }

  if (hasInvitedMembers) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-4">
            <CheckCircle className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Team Members Added!</h2>
          <p className="text-gray-300">Your team has {teamMemberCount} member{teamMemberCount !== 1 ? 's' : ''}.</p>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-sm text-green-300">
            <span className="font-medium">✅ Great teamwork!</span> You can manage team members anytime from settings.
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 hover:from-orange-600 hover:via-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Complete Setup! 🎉
          </button>
        </div>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're All Set!</h2>
          <p className="text-gray-300">You can invite team members anytime from settings.</p>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-sm text-green-300">
            <span className="font-medium">✅ Setup Complete!</span> You can now start using all of Astra's powerful features.
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 hover:from-orange-600 hover:via-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Complete Setup! 🎉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-4">
          <UserPlus className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Invite Team Members</h2>
        <p className="text-gray-300">Collaborate with your team on Astra</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Team Collaboration Features:</h3>
        <div className="space-y-3">
          {['Shared access to all team documents', 'Collaborative AI conversations', 'Team-wide visualizations and reports', 'Unified knowledge base'].map((item, idx) => (
            <div key={idx} className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <span className="font-medium">💡 Tip:</span> Invite members from the team settings or team members panel.
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <button onClick={() => setSkipped(true)} className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all min-h-[44px]">
          Skip for Now
        </button>
      </div>
    </div>
  );
};
