import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { TeamSettingsModal } from '../TeamSettingsModal';
import { useAuth } from '../../contexts/AuthContext';

interface TeamSettingsStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

export const TeamSettingsStep: React.FC<TeamSettingsStepProps> = ({ onComplete, progress }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const hasConfiguredSettings = progress?.step_6_team_settings_configured || false;
  const teamId = user?.user_metadata?.team_id;

  useEffect(() => {
    if (!hasConfiguredSettings && teamId) {
      setShowModal(true);
    }
  }, [hasConfiguredSettings, teamId]);

  const handleModalClose = () => {
    setShowModal(false);
    onComplete();
  };

  if (hasConfiguredSettings) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Settings Configured!</h2>
          <p className="text-sm text-gray-400">Your team settings are ready</p>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xl">✅</span>
          <p className="text-xs text-green-300">
            Update anytime from User Settings
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Next: Ask Astra →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-3">
            <Settings className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configure Team Settings</h2>
          <p className="text-sm text-gray-400">Set up meeting types and preferences</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            Settings Include:
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-950/50 rounded-lg p-2 flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span className="text-xs text-blue-200">Meeting Types</span>
            </div>
            <div className="bg-purple-950/50 rounded-lg p-2 flex items-center gap-2">
              <span className="text-lg">📰</span>
              <span className="text-xs text-purple-200">News Topics</span>
            </div>
            <div className="bg-green-950/50 rounded-lg p-2 flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <span className="text-xs text-green-200">Industry</span>
            </div>
            <div className="bg-orange-950/50 rounded-lg p-2 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-xs text-orange-200">Interests</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <p className="text-xs text-blue-300 flex-1">
            Use defaults now, customize anytime later
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px]"
          >
            Configure Settings →
          </button>
        </div>
      </div>

      {teamId && (
        <TeamSettingsModal
          isOpen={showModal}
          onClose={handleModalClose}
          teamId={teamId}
          isOnboarding={true}
        />
      )}
    </>
  );
};
