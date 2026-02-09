import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Sparkles, X, ArrowLeft, Upload, Cloud } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingCarousel } from './LoadingCarousel';
import { FUEL_LEVELS } from '../../lib/launch-preparation-utils';
import { triggerSyncNow } from '../../lib/manual-folder-sync';
import { OAuthReconnectModal } from '../OAuthReconnectModal';
import LocalFileUpload from '../LocalFileUpload';

interface SyncDataStepProps {
  onComplete: () => void;
  onGoBack?: () => void;
  progress: SetupGuideProgress | null;
  fromLaunchPrep?: boolean;
}

type SyncMode = 'google-drive' | 'local-upload';


export const SyncDataStep: React.FC<SyncDataStepProps> = ({ onComplete, onGoBack, fromLaunchPrep = false }) => {
  const { user } = useAuth();
  const [syncMode, setSyncMode] = useState<SyncMode>('google-drive');
  const [syncing, setSyncing] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);
  const [documentCounts, setDocumentCounts] = useState<{ total: number; categoryCount: number }>({ total: 0, categoryCount: 0 });
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [showNoDocumentModal, setShowNoDocumentModal] = useState(false);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [newLevel, setNewLevel] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const maxCheckAttempts = 90;

  useEffect(() => {
    if (syncMode === 'google-drive') {
      triggerSync();
    }
  }, [syncMode]);


  useEffect(() => {
    if (!syncing || syncComplete || !user) return;

    const teamId = user.user_metadata?.team_id;
    if (!teamId) return;

    const channel = supabase
      .channel('sync-data-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_sync_sessions',
          filter: `team_id=eq.${teamId}`
        },
        async (payload) => {
          console.log('[SyncDataStep] Realtime sync session update:', payload);
          if (payload.new) {
            const session = payload.new as { status: string; files_stored: number };

            if (session.files_stored > 0) {
              await checkSyncedData();
            }

            if (session.status === 'completed') {
              console.log('[SyncDataStep] Sync completed via realtime');
              await checkSyncedData();
            }
          }
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      checkSyncedData();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [syncing, syncComplete, user]);

  const triggerSync = async () => {
    console.log('========================================');
    console.log('[SyncDataStep] TRIGGERING SYNC');
    console.log('========================================');
    setSyncing(true);

    try {
      const teamId = user?.user_metadata?.team_id;
      const userId = user?.id;

      console.log('[SyncDataStep] User info:', { teamId, userId, email: user?.email });

      if (!teamId || !userId) {
        console.error('[SyncDataStep] No team ID or user ID found');
        return;
      }

      console.log('Calling sync now for team:', teamId);

      const result = await triggerSyncNow({
        team_id: teamId,
        user_id: userId,
        source: 'new_folder_connected'
      });

      console.log('Sync now triggered:', result);

      if (result.success) {
        console.log('Sync triggered successfully');
        if (result.session_id) {
          console.log('[SyncDataStep] Sync session created:', result.session_id);
        }
      } else {
        console.warn('Failed to trigger sync:', result.message);
      }
    } catch (error) {
      console.error('Error triggering sync:', error);

      if (error instanceof Error && error.message === 'GOOGLE_TOKEN_EXPIRED') {
        console.log('Token expired - showing reconnect modal');
        setSyncing(false);
        setShowTokenExpiredModal(true);
        return;
      }
    }

    checkSyncedData();
  };

  const calculateFuelLevel = (counts: { total: number; categoryCount: number }) => {
    const { total, categoryCount } = counts;

    if (total >= 1000 && categoryCount >= 8) return 5;
    if (total >= 200 && categoryCount >= 4) return 4;
    if (total >= 50 && categoryCount >= 2) return 3;
    if (total >= 1) return 2;
    return 0;
  };

  const checkAndUpdateLevel = async (counts: { total: number; categoryCount: number }) => {
    if (!user || !fromLaunchPrep) return;

    try {
      const userId = user.id;
      if (!userId) return;

      const { data: fuelProgress, error: progressError } = await supabase
        .from('launch_preparation_progress')
        .select('level, points_earned')
        .eq('user_id', userId)
        .eq('stage', 'fuel')
        .maybeSingle();

      if (progressError) {
        console.error('Error fetching fuel progress:', progressError);
        return;
      }

      const oldLevel = fuelProgress?.level || 0;
      const calculatedLevel = calculateFuelLevel(counts);

      setCurrentLevel(oldLevel);
      setNewLevel(calculatedLevel);

      if (calculatedLevel > oldLevel) {
        setLeveledUp(true);

        let pointsToAward = 0;
        for (let i = oldLevel + 1; i <= calculatedLevel; i++) {
          pointsToAward += FUEL_LEVELS[i - 1]?.points || 0;
        }

        const currentPoints = fuelProgress?.points_earned || 0;

        const { error: updateError } = await supabase
          .from('launch_preparation_progress')
          .update({
            level: calculatedLevel,
            points_earned: currentPoints + pointsToAward
          })
          .eq('user_id', userId)
          .eq('stage', 'fuel');

        if (updateError) {
          console.error('Error updating fuel progress:', updateError);
        } else {
          console.log(`Level up! ${oldLevel} -> ${calculatedLevel}, awarded ${pointsToAward} points (${currentPoints} -> ${currentPoints + pointsToAward})`);
        }
      }
    } catch (error) {
      console.error('Error checking/updating level:', error);
    }
  };

  const checkSyncedData = async () => {
    if (!user || syncComplete) return;

    try {
      const teamId = user.user_metadata?.team_id;
      if (!teamId) return;

      const { data: fuelData, error } = await supabase.rpc('calculate_fuel_level', {
        p_team_id: teamId
      });

      if (error) {
        console.error('Error checking synced data:', error);
        return;
      }

      const counts = {
        total: fuelData?.fully_synced_documents || 0,
        categoryCount: fuelData?.category_count || 0
      };

      setDocumentCounts(counts);

      if (counts.total > 0) {
        setSyncing(false);
        setSyncComplete(true);
        await checkAndUpdateLevel(counts);
      } else {
        setCheckAttempts(prev => {
          const newCount = prev + 1;

          if (newCount >= maxCheckAttempts) {
            setSyncing(false);
            setShowNoDocumentModal(true);
          }

          return newCount;
        });
      }
    } catch (error) {
      console.error('Error checking synced data:', error);
    }
  };

  const handleRetry = () => {
    setShowNoDocumentModal(false);
    setCheckAttempts(0);
    triggerSync();
  };

  const handleTokenRefreshed = () => {
    setShowTokenExpiredModal(false);
    setCheckAttempts(0);
    triggerSync();
  };

  const handleUploadComplete = async (uploadIds: string[]) => {
    console.log('Files uploaded successfully:', uploadIds);
    setUploadSuccess(true);

    await checkSyncedData();
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection Tabs */}
      <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => setSyncMode('google-drive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
            syncMode === 'google-drive'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cloud className="w-4 h-4" />
          Google Drive
        </button>
        <button
          onClick={() => setSyncMode('local-upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
            syncMode === 'local-upload'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
      </div>

      {/* Google Drive Sync Mode */}
      {syncMode === 'google-drive' && !syncComplete ? (
        <>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-blue-500/20 mb-4 animate-pulse">
              <RefreshCw className="w-10 h-10 text-orange-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Syncing Your Data
            </h2>
            <p className="text-gray-300 text-sm">
              We're processing your Google Drive documents...
            </p>
            {checkAttempts > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Checked {checkAttempts} time{checkAttempts !== 1 ? 's' : ''}...
              </p>
            )}
          </div>

          <LoadingCarousel />

          {documentCounts.total > 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-medium">
                {documentCounts.total} document{documentCounts.total !== 1 ? 's' : ''} synced
              </p>
              <p className="text-xs text-green-400/70 mt-1">
                Across {documentCounts.categoryCount} categor{documentCounts.categoryCount !== 1 ? 'ies' : 'y'}
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            {onGoBack ? (
              <button
                onClick={onGoBack}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onComplete}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Continue Later
            </button>
          </div>
        </>
      ) : syncMode === 'local-upload' ? (
        <>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4">
              <Upload className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Upload Your Files
            </h2>
            <p className="text-gray-300 text-sm">
              Upload documents directly from your computer
            </p>
          </div>

          <LocalFileUpload
            category="other"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />

          {uploadSuccess && documentCounts.total > 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-medium">
                Files uploaded successfully!
              </p>
              <p className="text-xs text-green-400/70 mt-1">
                {documentCounts.total} document{documentCounts.total !== 1 ? 's' : ''} processed
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            {onGoBack ? (
              <button
                onClick={onGoBack}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onComplete}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-all"
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Sync Complete!
          </h2>

          {leveledUp && (
            <div className="bg-gradient-to-r from-orange-900/30 to-blue-900/30 border border-orange-500/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold">Level Up!</span>
              </div>
              <p className="text-white">
                Fuel Level: {currentLevel} {'->'} {newLevel}
              </p>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-orange-400">{documentCounts.total}</p>
                <p className="text-xs text-gray-400">Documents Synced</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{documentCounts.categoryCount}</p>
                <p className="text-xs text-gray-400">Categories</p>
              </div>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            Your documents have been processed and are ready. Astra can now search across all your synced data!
          </p>

          <button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg"
          >
            Continue
          </button>
        </div>
      )}

      {showNoDocumentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-600/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">No Documents Found Yet</h3>
                <p className="text-sm text-gray-300 mb-4">
                  We couldn't find any documents in your connected folders. This could happen if:
                </p>
                <ul className="text-sm text-gray-400 space-y-1 mb-4">
                  <li>- The folders are empty</li>
                  <li>- Files are still being processed</li>
                  <li>- The folder permissions need updating</li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowNoDocumentModal(false);
                      onComplete();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Continue Anyway
                  </button>
                  <button
                    onClick={handleRetry}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowNoDocumentModal(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showTokenExpiredModal && (
        <OAuthReconnectModal
          onClose={() => setShowTokenExpiredModal(false)}
          onReconnect={handleTokenRefreshed}
        />
      )}
    </div>
  );
};
