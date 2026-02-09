import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, FileText, Clock, Sparkles, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SyncProgressBannerProps {
  onSyncComplete?: () => void;
  initialDocCount?: number;
}

interface SyncStats {
  totalFiles: number;
  syncedDocs: number;
  categories: number;
  isActive: boolean;
  lastUpdated: Date | null;
}

const POLL_INTERVAL = 10000;
const ESTIMATED_SECONDS_PER_FILE = 3;
const MIN_DISPLAY_TIME_MS = 60000;
const MAX_DISPLAY_TIME_MS = 600000;
const MIN_DOCS_FOR_COMPLETION = 1;
const STABILITY_TIMEOUT_MS = 90000;

export const SyncProgressBanner: React.FC<SyncProgressBannerProps> = ({
  onSyncComplete,
  initialDocCount = 0
}) => {
  const { user } = useAuth();
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalFiles: 0,
    syncedDocs: initialDocCount,
    categories: 0,
    isActive: true,
    lastUpdated: null
  });
  const [showComplete, setShowComplete] = useState(false);
  const [previousDocCount, setPreviousDocCount] = useState(initialDocCount);
  const [noChangeCount, setNoChangeCount] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);
  const [startTime] = useState(() => Date.now());
  const [lastDocChange, setLastDocChange] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');

  const fetchSyncStats = useCallback(async () => {
    if (!user) return;

    const teamId = user.user_metadata?.team_id;
    if (!teamId) return;

    try {
      const { data: fuelData } = await supabase.rpc('calculate_fuel_level', {
        p_team_id: teamId
      });

      const currentDocs = fuelData?.fully_synced_documents || 0;
      const currentCategories = fuelData?.category_count || 0;

      const { data: sessionData } = await supabase
        .from('data_sync_sessions')
        .select('total_files_discovered, files_stored, files_classified, status')
        .eq('team_id', teamId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const totalFilesDiscovered = sessionData?.total_files_discovered || 0;
      const filesStored = sessionData?.files_stored || 0;
      const isStillActive = sessionData?.status === 'in_progress';

      if (totalFilesDiscovered > 0 && filesStored < totalFilesDiscovered) {
        const remainingFiles = totalFilesDiscovered - filesStored;
        const estimatedSeconds = remainingFiles * ESTIMATED_SECONDS_PER_FILE;

        if (estimatedSeconds < 60) {
          setEstimatedTimeRemaining('Less than a minute');
        } else if (estimatedSeconds < 3600) {
          const mins = Math.ceil(estimatedSeconds / 60);
          setEstimatedTimeRemaining(`About ${mins} minute${mins !== 1 ? 's' : ''}`);
        } else {
          const hours = Math.ceil(estimatedSeconds / 3600);
          setEstimatedTimeRemaining(`About ${hours} hour${hours !== 1 ? 's' : ''}`);
        }
      } else {
        setEstimatedTimeRemaining(null);
      }

      setSyncStats({
        totalFiles: totalFilesDiscovered,
        syncedDocs: currentDocs,
        categories: currentCategories,
        isActive: isStillActive,
        lastUpdated: new Date()
      });

      const elapsedTime = Date.now() - startTime;
      const docIncrease = currentDocs - initialDocCount;

      if (currentDocs > previousDocCount) {
        setPreviousDocCount(currentDocs);
        setNoChangeCount(0);
        setLastDocChange(Date.now());
      } else {
        setNoChangeCount(prev => prev + 1);
      }

      const timeSinceLastChange = Date.now() - lastDocChange;
      const canComplete = elapsedTime >= MIN_DISPLAY_TIME_MS;
      const shouldForceComplete = elapsedTime >= MAX_DISPLAY_TIME_MS;
      const hasProgress = docIncrease >= MIN_DOCS_FOR_COMPLETION;
      const hasStabilized = timeSinceLastChange >= STABILITY_TIMEOUT_MS;

      console.log('[SyncProgressBanner] Status check:', {
        elapsedTime: Math.round(elapsedTime / 1000) + 's',
        timeSinceLastChange: Math.round(timeSinceLastChange / 1000) + 's',
        docIncrease,
        currentDocs,
        initialDocCount,
        isStillActive,
        canComplete,
        hasProgress,
        hasStabilized
      });

      if (shouldForceComplete) {
        console.log('[SyncProgressBanner] Force completing after max time');
        setShowComplete(true);
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else if (canComplete && hasStabilized && hasProgress) {
        console.log('[SyncProgressBanner] Completing - stabilized with progress');
        setShowComplete(true);
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else if (canComplete && !isStillActive && hasProgress) {
        console.log('[SyncProgressBanner] Completing - no active session, has progress');
        setShowComplete(true);
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error);
    }
  }, [user, previousDocCount, noChangeCount, initialDocCount, onSyncComplete, startTime, lastDocChange]);

  useEffect(() => {
    fetchSyncStats();

    const interval = setInterval(fetchSyncStats, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchSyncStats]);

  useEffect(() => {
    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (!user) return;
    const teamId = user.user_metadata?.team_id;
    if (!teamId) return;

    const sessionsSubscription = supabase
      .channel('sync_progress_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_sync_sessions',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchSyncStats();
        }
      )
      .subscribe();

    const chunksSubscription = supabase
      .channel('sync_progress_chunks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_chunks',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchSyncStats();
        }
      )
      .subscribe();

    return () => {
      sessionsSubscription.unsubscribe();
      chunksSubscription.unsubscribe();
    };
  }, [user, fetchSyncStats]);

  if (showComplete) {
    const newDocs = syncStats.syncedDocs - initialDocCount;
    return (
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-600/50 rounded-lg p-4 relative overflow-hidden">
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-300">Sync Complete!</p>
            <p className="text-xs text-green-400/80">
              {newDocs > 0
                ? `${newDocs} new document${newDocs !== 1 ? 's' : ''} synced successfully.`
                : 'Your documents are up to date.'}
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-green-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-600/50 rounded-lg p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 animate-pulse" />

      <div className="relative">
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-300">Syncing Your Documents</p>
            <p className="text-xs text-blue-400/80 mt-0.5">
              Your files are being processed in the background.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-800/50 rounded-lg p-2.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-white leading-none">{syncStats.syncedDocs}</p>
              <p className="text-[10px] text-gray-400">Documents Synced</p>
            </div>
          </div>
          {syncStats.totalFiles > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-2.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold text-white leading-none">{syncStats.totalFiles}</p>
                <p className="text-[10px] text-gray-400">Files Discovered</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 mb-3 text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Elapsed: {elapsedTime}</span>
          </div>
          {estimatedTimeRemaining && (
            <div className="flex items-center gap-2 text-blue-400">
              <span>Remaining: {estimatedTimeRemaining}</span>
            </div>
          )}
        </div>

        {syncStats.totalFiles > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Progress</span>
              <span>{Math.round((syncStats.syncedDocs / Math.max(syncStats.totalFiles, 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (syncStats.syncedDocs / Math.max(syncStats.totalFiles, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 bg-gray-800/30 rounded-lg p-2.5">
          <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            You can continue using Astra while your files sync. New documents will appear automatically as they're processed.
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-slide-x"
           style={{ width: '30%', animation: 'slideX 2s ease-in-out infinite' }} />

      <style>{`
        @keyframes slideX {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(233%); }
        }
      `}</style>
    </div>
  );
};
