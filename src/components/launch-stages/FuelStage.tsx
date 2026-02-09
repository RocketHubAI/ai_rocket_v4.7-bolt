import React, { useState, useEffect } from 'react';
import { X, Fuel, CheckCircle, ArrowRight, ArrowLeft, Loader, FileText, Folder, Database, HardDrive, Rocket, Info, RefreshCw, BookOpen, AlertTriangle, Zap, Flame, Target, Trophy, Circle, Grid } from 'lucide-react';
import { StageProgress } from '../../hooks/useLaunchPreparation';
import { useLaunchPreparation } from '../../hooks/useLaunchPreparation';
import { useFuelLevel, FUEL_LEVEL_THRESHOLDS } from '../../hooks/useFuelLevel';
import { useDataSyncProgress } from '../../hooks/useDataSyncProgress';
import { formatPoints } from '../../lib/launch-preparation-utils';
import { getGoogleDriveConnection, isTokenExpired, initiateGoogleDriveOAuth } from '../../lib/google-drive-oauth';
import { getActiveConnection, hasAnyRootFolder } from '../../lib/unified-drive-utils';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectDriveStep } from '../setup-steps/ConnectDriveStep';
import { ChooseFolderStep } from '../setup-steps/ChooseFolderStep';
import { PlaceFilesStep } from '../setup-steps/PlaceFilesStep';
import { SyncDataStep } from '../setup-steps/SyncDataStep';
import { AddMoreFoldersStep } from '../setup-steps/AddMoreFoldersStep';
import { FolderSetupGuide } from '../setup-steps/FolderSetupGuide';
import { ConnectedFoldersStatus } from '../ConnectedFoldersStatus';
import { StageProgressBar } from './StageProgressBar';
import { SupportMenu } from '../SupportMenu';
import { DelegateSetupBanner } from './DelegateSetupBanner';
import { DocumentsListModal } from './DocumentsListModal';
import { CategoriesDetailModal } from './CategoriesDetailModal';
import { FolderManagementSection } from './FolderManagementSection';
import { SyncProgressBanner } from './SyncProgressBanner';
import { supabase } from '../../lib/supabase';
import { triggerSyncNow } from '../../lib/manual-folder-sync';

const LEVEL_ICONS = [Circle, Zap, Flame, Rocket, Target, Trophy];

interface FuelStageProps {
  progress: StageProgress | null;
  fuelProgress: StageProgress | null;
  boostersProgress: StageProgress | null;
  guidanceProgress: StageProgress | null;
  onBack: () => void;
  onNavigateToStage?: (stage: 'fuel' | 'boosters' | 'guidance' | 'ready') => void;
  onComplete: () => void;
  onRefresh?: () => Promise<void>;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
  onDelegateSetup?: () => void;
  teamName?: string;
  showDelegationBanner?: boolean;
  userRole?: string;
  isInMainApp?: boolean;
}

export const FuelStage: React.FC<FuelStageProps> = ({ progress, fuelProgress, boostersProgress, guidanceProgress, onBack, onNavigateToStage, onComplete, onRefresh, onOpenHelpCenter, onDelegateSetup, teamName, showDelegationBanner = false, userRole = 'admin', isInMainApp = false }) => {
  const { user } = useAuth();
  const isAdmin = userRole === 'admin';
  const { updateStageLevel, completeAchievement, awardPoints, stageProgress, refresh: refreshLaunchPrep } = useLaunchPreparation();
  const { fuelData, loading: fuelLoading, getProgressToNextLevel, getCurrentThreshold, getNextThreshold, getLevelDisplayInfo, hasLeveledUp, clearLevelUpNotification, refresh: refreshFuelLevel } = useFuelLevel();
  const { getSyncProgress, currentSession } = useDataSyncProgress();

  const internalFuelProgress = stageProgress.find(s => s.stage === 'fuel');
  const oauthHandledRef = React.useRef(false);
  const [showDriveFlow, setShowDriveFlow] = useState(false);
  const [driveFlowStep, setDriveFlowStep] = useState<'status' | 'connect' | 'choose-folder' | 'add-more-folders' | 'place-files' | 'sync-data' | 'setup-guide'>('status');
  const [folderData, setFolderData] = useState<any>(null);
  const [placeFilesForFolder, setPlaceFilesForFolder] = useState<'strategy' | 'meetings' | 'financial' | 'projects' | null>(null);
  const [checkingLevel, setCheckingLevel] = useState(false);
  const [hasCloudDrive, setHasCloudDrive] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<'google' | 'microsoft' | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [checkingDrive, setCheckingDrive] = useState(true);
  const [userClosedModal, setUserClosedModal] = useState(false);
  const [reauthorizing, setReauthorizing] = useState(false);
  const [showLevelInfoModal, setShowLevelInfoModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasShownInitialGuide, setHasShownInitialGuide] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showDataSyncTipsModal, setShowDataSyncTipsModal] = useState(false);
  const [documentsFilterCategory, setDocumentsFilterCategory] = useState<string | null>(null);
  const [folderSectionKey, setFolderSectionKey] = useState(0);
  const [addFoldersProvider, setAddFoldersProvider] = useState<'google' | 'microsoft' | undefined>(undefined);
  const [isNewConnection, setIsNewConnection] = useState(false);
  const [syncJustStarted, setSyncJustStarted] = useState(false);
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const [initialDocCountForSync, setInitialDocCountForSync] = useState(0);

  useEffect(() => {
    const checkActiveSyncSession = async () => {
      if (!user) return;
      const teamId = user.user_metadata?.team_id;
      if (!teamId) return;

      try {
        const { data: sessionData } = await supabase
          .from('data_sync_sessions')
          .select('id, status')
          .eq('team_id', teamId)
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionData) {
          setShowSyncBanner(true);
          setInitialDocCountForSync(fuelData?.fully_synced_documents ?? 0);
        }
      } catch (error) {
        console.error('Error checking active sync session:', error);
      }
    };

    checkActiveSyncSession();
  }, [user, fuelData?.fully_synced_documents]);

  useEffect(() => {
    if (!user) return;
    const teamId = user.user_metadata?.team_id;
    if (!teamId) return;

    const chunksSubscription = supabase
      .channel('fuel_stage_chunks_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_chunks',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          refreshFuelLevel();
        }
      )
      .subscribe();

    return () => {
      chunksSubscription.unsubscribe();
    };
  }, [user, refreshFuelLevel]);

  const isOAuthReturn = () => {
    const shouldReopenFuel = sessionStorage.getItem('reopen_fuel_stage');
    const msOAuthComplete = sessionStorage.getItem('microsoft_oauth_complete');
    const params = new URLSearchParams(window.location.search);
    const selectMicrosoftDrive = params.get('selectMicrosoftDrive');
    return shouldReopenFuel === 'true' || selectMicrosoftDrive === 'true' || msOAuthComplete === 'true';
  };

  const refreshCounts = async () => {
    await refreshFuelLevel();
    setFolderSectionKey(prev => prev + 1);
  };

  const currentLevel = fuelData?.current_level ?? internalFuelProgress?.level ?? progress?.level ?? 0;
  const targetLevel = currentLevel + 1;
  const currentThreshold = getCurrentThreshold();
  const nextThreshold = getNextThreshold();

  // Refresh data when component mounts to ensure we have latest progress
  useEffect(() => {
    const refreshData = async () => {
      if (onRefresh) {
        await onRefresh();
      }
      await refreshFuelLevel();
      await refreshLaunchPrep();
    };
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - refresh functions are stable refs

  // Helper function to persist flow state to database
  const persistFlowState = async (step: typeof driveFlowStep | null, folderDataToPersist?: any, provider?: 'google' | 'microsoft' | null) => {
    if (!user) return;

    try {
      const dataToUpsert: any = {
        user_id: user.id,
        stage: 'fuel',
        drive_flow_step: step,
        drive_flow_folder_data: folderDataToPersist || folderData
      };

      if (provider !== undefined) {
        dataToUpsert.drive_flow_provider = provider;
      }

      const { error } = await supabase
        .from('launch_preparation_progress')
        .upsert(dataToUpsert, {
          onConflict: 'user_id,stage'
        });

      if (error) {
        console.error('Error persisting flow state:', error);
      } else {
        console.log('✅ Persisted flow state:', step, 'provider:', provider);
      }
    } catch (error) {
      console.error('Error persisting flow state:', error);
    }
  };

  // Helper function to clear flow state from database
  const clearFlowState = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('launch_preparation_progress')
        .update({
          drive_flow_step: null,
          drive_flow_folder_data: null,
          drive_flow_provider: null
        })
        .eq('user_id', user.id)
        .eq('stage', 'fuel');

      if (error) {
        console.error('Error clearing flow state:', error);
      } else {
        console.log('🧹 Cleared flow state');
      }
    } catch (error) {
      console.error('Error clearing flow state:', error);
    }
  };

  // Load persisted flow state on mount - but validate it makes sense
  useEffect(() => {
    const loadPersistedState = async () => {
      if (!user) return;

      if (isOAuthReturn()) {
        console.log('🚫 Skipping persisted state - OAuth return in progress');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('launch_preparation_progress')
          .select('drive_flow_step, drive_flow_folder_data, drive_flow_provider')
          .eq('user_id', user.id)
          .eq('stage', 'fuel')
          .maybeSingle();

        if (error) {
          console.error('Error loading persisted state:', error);
          return;
        }

        if (data?.drive_flow_step) {
          const step = data.drive_flow_step as typeof driveFlowStep;

          if (step === 'connect' || step === 'status') {
            console.log('🧹 Clearing transient flow state:', step);
            await clearFlowState();
            return;
          }

          if (step === 'sync-data' || step === 'place-files') {
            const connection = await getGoogleDriveConnection();
            const hasAnyFolder = connection?.strategy_folder_id || connection?.meetings_folder_id ||
                                connection?.financial_folder_id || connection?.projects_folder_id;

            if (!hasAnyFolder) {
              console.log('🧹 Clearing invalid flow state - no folders configured for step:', step);
              await clearFlowState();
              return;
            }
          }

          console.log('🔄 Restoring flow state:', step, 'provider:', data.drive_flow_provider);
          setDriveFlowStep(step);
          if (data.drive_flow_folder_data) {
            setFolderData(data.drive_flow_folder_data);
          }
          if (data.drive_flow_provider) {
            setCloudProvider(data.drive_flow_provider);
          }
          setShowDriveFlow(true);
        }
      } catch (error) {
        console.error('Error loading persisted state:', error);
      }
    };

    loadPersistedState();
  }, [user]);

  // Check if user has any cloud drive connected (Google Drive or Microsoft OneDrive)
  useEffect(() => {
    const checkDriveConnection = async () => {
      try {
        const connection = await getActiveConnection();
        const isConnected = !!connection && connection.is_active;
        setHasCloudDrive(isConnected);
        setCloudProvider(connection?.provider === 'google' || connection?.provider === 'microsoft' ? connection.provider : null);
        setCheckingDrive(false);

        const isExpired = connection?.token_expires_at ? isTokenExpired(connection.token_expires_at) : false;
        setTokenExpired(isExpired);

        console.log('🔍 [FuelStage] Drive connection check:', {
          isConnected,
          provider: connection?.provider,
          tokenExpired: isExpired,
          tokenExpiresAt: connection?.token_expires_at,
          hasRootFolder: connection?.root_folder_id,
          hasStrategyFolder: connection?.strategy_folder_id,
          hasMeetingsFolder: connection?.meetings_folder_id,
          hasFinancialFolder: connection?.financial_folder_id,
          hasProjectsFolder: connection?.projects_folder_id
        });

        const shouldReopenFuel = sessionStorage.getItem('reopen_fuel_stage');
        const msOAuthComplete = sessionStorage.getItem('microsoft_oauth_complete');
        const selectMicrosoftDrive = new URLSearchParams(window.location.search).get('selectMicrosoftDrive');

        if ((shouldReopenFuel === 'true' || selectMicrosoftDrive === 'true') && !oauthHandledRef.current) {
          oauthHandledRef.current = true;
          sessionStorage.removeItem('reopen_fuel_stage');
          sessionStorage.removeItem('return_to_launch_prep');
          sessionStorage.removeItem('google_drive_from_launch_prep');
          sessionStorage.removeItem('microsoft_from_launch_prep');

          if (selectMicrosoftDrive) {
            window.history.replaceState({}, '', window.location.pathname);
          }

          let teamId = user?.user_metadata?.team_id;
          if (!teamId) {
            const { data: userData } = await supabase
              .from('users')
              .select('team_id')
              .eq('id', user.id)
              .maybeSingle();
            teamId = userData?.team_id;
          }

          const hasRootFolder = teamId ? await hasAnyRootFolder(teamId) : false;

          if (msOAuthComplete === 'true' || selectMicrosoftDrive === 'true') {
            sessionStorage.removeItem('microsoft_oauth_complete');
            console.log('🚀 [FuelStage] Reopening modal after Microsoft OAuth return, hasRootFolder:', hasRootFolder);
            await clearFlowState();
            setCloudProvider('microsoft');
            setAddFoldersProvider('microsoft');
            setIsNewConnection(true);
            if (hasRootFolder) {
              setDriveFlowStep('add-more-folders');
            } else {
              setDriveFlowStep('choose-folder');
            }
          } else {
            console.log('🚀 [FuelStage] Reopening modal after Google OAuth return, hasRootFolder:', hasRootFolder);
            await clearFlowState();
            setCloudProvider('google');
            setAddFoldersProvider('google');
            setIsNewConnection(true);
            if (hasRootFolder) {
              setDriveFlowStep('add-more-folders');
            } else {
              setDriveFlowStep('choose-folder');
            }
          }

          setShowDriveFlow(true);
          await refreshFuelLevel();
          if (onRefresh) {
            await onRefresh();
          }
          return;
        }

        // Auto-open folder selection if they connected but no folders configured
        // BUT respect if user manually closed the modal
        if (connection && connection.is_active && !showDriveFlow && !userClosedModal) {
          const hasAnyFolder = connection.strategy_folder_id || connection.meetings_folder_id || connection.financial_folder_id || connection.projects_folder_id || connection.root_folder_id;
          if (!hasAnyFolder) {
            console.log('🔔 [FuelStage] Auto-opening folder selection - no folders configured');
            setDriveFlowStep('choose-folder');
            setShowDriveFlow(true);
          }
        }
      } catch (error) {
        console.error('Error checking drive connection:', error);
        setCheckingDrive(false);
      }
    };

    if (user) {
      checkDriveConnection();
    }
  }, [user, refreshFuelLevel, onRefresh]);

  // Show data sync tips modal on first visit to Fuel Stage
  useEffect(() => {
    const hasSeenTips = sessionStorage.getItem('fuel_data_sync_tips_shown');

    if (!checkingDrive && !hasSeenTips && !showDriveFlow && !showDataSyncTipsModal) {
      const timer = setTimeout(() => {
        setShowDataSyncTipsModal(true);
        sessionStorage.setItem('fuel_data_sync_tips_shown', 'true');
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [checkingDrive, showDriveFlow, showDataSyncTipsModal]);

  // Show setup guide after user dismisses the data sync tips modal (for new users at level 0)
  useEffect(() => {
    const hasSeenGuide = sessionStorage.getItem('fuel_stage_guide_shown');
    const hasSeenTips = sessionStorage.getItem('fuel_data_sync_tips_shown');

    if (!checkingDrive && !hasShownInitialGuide && !hasSeenGuide && hasSeenTips && currentLevel === 0 && !showDriveFlow && !showDataSyncTipsModal) {
      const timer = setTimeout(() => {
        setDriveFlowStep('setup-guide');
        setShowDriveFlow(true);
        setHasShownInitialGuide(true);
        sessionStorage.setItem('fuel_stage_guide_shown', 'true');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [checkingDrive, hasShownInitialGuide, currentLevel, showDriveFlow, showDataSyncTipsModal]);

  // Sync fuel level with launch preparation system when it changes
  useEffect(() => {
    const syncFuelLevel = async () => {
      if (fuelLoading || checkingLevel || !fuelData) return;

      const recordedLevel = internalFuelProgress?.level ?? 0;
      const actualLevel = fuelData.current_level;

      // If actual level is higher than recorded level, update launch prep
      if (actualLevel > recordedLevel) {
        setCheckingLevel(true);

        try {
          // Complete achievements for all levels up to actual level
          for (let level = recordedLevel + 1; level <= actualLevel; level++) {
            const achievementKey = `fuel_level_${level}`;
            const achievementSuccess = await completeAchievement(achievementKey, 'fuel');
            if (!achievementSuccess) {
              console.error('Failed to complete achievement:', achievementKey);
            }
            const levelSuccess = await updateStageLevel('fuel', level);
            if (!levelSuccess) {
              console.error('Failed to update stage level:', level);
            }
          }

          await refreshLaunchPrep();
        } catch (error) {
          console.error('Error syncing fuel level:', error);
        } finally {
          setCheckingLevel(false);
        }
      }
    };

    syncFuelLevel();
  }, [fuelData, fuelLoading, checkingLevel, completeAchievement, updateStageLevel, refreshLaunchPrep, internalFuelProgress]);

  const levelIcons = [FileText, Folder, Database, HardDrive, Rocket];
  const LevelIcon = levelIcons[currentLevel] || FileText;

  const handleStageNavigation = (stage: 'fuel' | 'boosters' | 'guidance') => {
    if (stage === 'fuel') return; // Already here
    if (onNavigateToStage) {
      onNavigateToStage(stage);
    } else {
      onBack(); // Fallback to stage selector
    }
  };

  const handleSyncDocuments = async () => {
    if (!user || syncing) return;

    setSyncing(true);
    setSyncMessage(null);
    const initialTotal = fuelData?.fully_synced_documents ?? 0;
    setInitialDocCountForSync(initialTotal);

    try {
      const teamId = user?.user_metadata?.team_id;
      if (!teamId) {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: 'Team ID not found' });
        return;
      }

      const result = await triggerSyncNow({
        team_id: teamId,
        user_id: user.id,
        source: 'manual_sync_now'
      });

      if (result.success) {
        setShowSyncBanner(true);
        setSyncing(false);
      } else {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: result.message || 'Failed to start sync.' });
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncing(false);
      setSyncMessage({ type: 'error', text: 'Failed to sync. Please try again.' });
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleReauthorize = async () => {
    setReauthorizing(true);
    try {
      initiateGoogleDriveOAuth(false, true);
    } catch (error) {
      console.error('Failed to initiate reauthorization:', error);
      setReauthorizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Compact Progress Bar at Top */}
      <StageProgressBar
        fuelProgress={fuelProgress}
        boostersProgress={boostersProgress}
        guidanceProgress={guidanceProgress}
        currentStage="fuel"
        onStageClick={handleStageNavigation}
      />

      <div className="p-3 max-w-5xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Fuel className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Fuel Stage</h1>
              <p className="text-xs text-gray-400">Add data to power your AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setDriveFlowStep('setup-guide');
                setShowDriveFlow(true);
              }}
              className="px-2 py-1 text-blue-400 hover:bg-blue-500/10 text-[10px] font-medium rounded transition-colors flex items-center gap-1 min-h-[32px]"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Guide to AI Data Sync</span>
            </button>
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            {isInMainApp ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm text-slate-300 min-h-[36px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Mission Control</span>
                <span className="sm:hidden">Back</span>
              </button>
            ) : (
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Back to Mission Control"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Delegate Setup Banner */}
        {showDelegationBanner && onDelegateSetup && (
          <DelegateSetupBanner
            teamName={teamName}
            onDelegateSuccess={onDelegateSetup}
          />
        )}

        {/* Expired Token Banner */}
        {tokenExpired && hasCloudDrive && (
          <div className="bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">
                  {cloudProvider === 'microsoft' ? 'Microsoft OneDrive/SharePoint' : 'Google Drive'} Authorization Expired
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Your {cloudProvider === 'microsoft' ? 'Microsoft OneDrive/SharePoint' : 'Google Drive'} connection has expired and needs to be refreshed.
                  Click below to re-authorize and continue syncing your documents.
                </p>
                <button
                  onClick={handleReauthorize}
                  disabled={reauthorizing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 min-h-[44px]"
                >
                  <RefreshCw className={`w-4 h-4 ${reauthorizing ? 'animate-spin' : ''}`} />
                  {reauthorizing ? 'Redirecting...' : 'Refresh Authorization'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fuel Gauge Section */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/30 to-yellow-500/30 rounded-lg flex items-center justify-center">
                <Fuel className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {currentLevel === 0 ? 'Fuel Tank Empty' : `Level ${currentLevel}`}
                </h2>
                <p className="text-xs text-gray-400">
                  {fuelData?.fully_synced_documents ?? 0} documents synced
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLevelInfoModal(true)}
              className="text-gray-400 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Visual Fuel Gauge */}
          <div className="relative mb-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((level) => {
                const isCompleted = currentLevel >= level;
                const isCurrent = currentLevel === level - 1;
                const LevelIconComponent = LEVEL_ICONS[level];
                const progressData = getProgressToNextLevel();
                const segmentProgress = isCurrent ? progressData.documentsProgress : (isCompleted ? 100 : 0);

                return (
                  <div key={level} className="flex-1 relative">
                    <div className="h-6 bg-gray-700/50 rounded overflow-hidden border border-gray-600/50">
                      <div
                        className={`h-full transition-all duration-700 ease-out ${
                          isCompleted
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                            : isCurrent
                            ? 'bg-gradient-to-r from-orange-500/70 to-yellow-500/70'
                            : ''
                        }`}
                        style={{ width: `${segmentProgress}%` }}
                      />
                    </div>
                    <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium ${
                      isCompleted ? 'text-orange-400' : isCurrent ? 'text-yellow-400' : 'text-gray-500'
                    }`}>
                      L{level}
                    </div>
                    {isCompleted && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <LevelIconComponent className="w-3 h-3 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sync Progress Indicator */}
          {currentSession && (
            <div className="mt-6 mb-1 bg-blue-900/20 border border-blue-700/50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-xs font-medium text-blue-300">
                  {getSyncProgress().statusMessage}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {getSyncProgress().overallProgress}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${getSyncProgress().overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Sync Progress Banner */}
          {(syncJustStarted || showSyncBanner) && (
            <div className="mt-6 mb-1">
              <SyncProgressBanner
                initialDocCount={initialDocCountForSync}
                onSyncComplete={async () => {
                  setSyncJustStarted(false);
                  setShowSyncBanner(false);
                  await refreshFuelLevel();
                  if (onRefresh) {
                    await onRefresh();
                  }
                }}
              />
            </div>
          )}

          {/* Next Level Requirements - Compact inline version */}
          {currentLevel < 5 && nextThreshold && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-yellow-400" />
                  Level {currentLevel + 1}
                </h3>
                <span className="text-[10px] text-yellow-400 font-medium bg-yellow-500/10 px-1.5 py-0.5 rounded">
                  +{formatPoints(nextThreshold.points_value)} pts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const progressData = getProgressToNextLevel();
                  const docsMet = progressData.documentsNeeded === 0;
                  const catsMet = progressData.categoriesNeeded === 0;
                  const currentDocs = fuelData?.fully_synced_documents ?? 0;
                  const currentCats = fuelData?.category_count ?? 0;

                  return (
                    <>
                      {nextThreshold.documents_required > 0 && (
                        <div
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            docsMet ? 'bg-green-900/20 border border-green-700/50' : 'bg-gray-700/30 border border-gray-600/50'
                          }`}
                        >
                          {docsMet ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 border-2 border-gray-500 rounded-full flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs ${docsMet ? 'text-green-300' : 'text-gray-300'}`}>
                              {nextThreshold.documents_required}+ docs
                            </span>
                            <p className="text-[10px] text-gray-500 truncate">
                              {currentDocs} now {!docsMet && `(${progressData.documentsNeeded} more)`}
                            </p>
                          </div>
                        </div>
                      )}
                      {nextThreshold.categories_required > 0 && (
                        <div
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            catsMet ? 'bg-green-900/20 border border-green-700/50' : 'bg-gray-700/30 border border-gray-600/50'
                          }`}
                        >
                          {catsMet ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 border-2 border-gray-500 rounded-full flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs ${catsMet ? 'text-green-300' : 'text-gray-300'}`}>
                              {nextThreshold.categories_required}+ categories
                            </span>
                            <p className="text-[10px] text-gray-500 truncate">
                              {currentCats} now {!catsMet && `(${progressData.categoriesNeeded} more)`}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {currentLevel === 5 && (
            <div className="mt-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Maximum Fuel!</p>
                <p className="text-[10px] text-gray-300">Ready for liftoff!</p>
              </div>
            </div>
          )}
        </div>

        {/* Synced Data Section - Compact side-by-side */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xs font-semibold text-gray-300">Your Data</h2>
            {isAdmin && hasCloudDrive && !tokenExpired && (
              <button
                onClick={handleSyncDocuments}
                disabled={syncing}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium rounded transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
          {syncMessage && (
            <p className={`text-[10px] mb-1.5 ${
              syncMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {syncMessage.text}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setDocumentsFilterCategory(null);
                setShowDocumentsModal(true);
              }}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800 hover:border-orange-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500/30 transition-colors flex-shrink-0">
                  <FileText className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white">{fuelData?.fully_synced_documents ?? 0}</p>
                  <p className="text-[10px] text-gray-400 group-hover:text-orange-400 transition-colors">Documents</p>
                </div>
              </div>
              {(fuelData?.pending_classification ?? 0) > 0 && (
                <p className="text-[10px] text-yellow-400 mt-1">
                  +{fuelData?.pending_classification} processing
                </p>
              )}
            </button>
            <button
              onClick={() => setShowCategoriesModal(true)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800 hover:border-blue-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
                  <Grid className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white">{fuelData?.category_count ?? 0}</p>
                  <p className="text-[10px] text-gray-400 group-hover:text-blue-400 transition-colors">Categories</p>
                </div>
              </div>
              {fuelData?.categories && fuelData.categories.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {fuelData.categories.slice(0, 3).map((cat: string) => (
                    <span key={cat} className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">
                      {cat}
                    </span>
                  ))}
                  {fuelData.categories.length > 3 && (
                    <span className="text-[9px] text-gray-400">+{fuelData.categories.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Folder Management Section */}
        <FolderManagementSection
          key={folderSectionKey}
          onOpenFolderManager={async (provider) => {
            await clearFlowState();
            setDriveFlowStep('status');
            setShowDriveFlow(true);
          }}
          onConnectProvider={async (provider) => {
            await clearFlowState();
            setDriveFlowStep('connect');
            setShowDriveFlow(true);
          }}
          userRole={userRole}
          onLocalUploadComplete={async () => {
            await refreshCounts();
            await refreshFuelLevel();
            if (onRefresh) {
              await onRefresh();
            }
          }}
          onDisconnectComplete={async () => {
            await refreshCounts();
            await refreshFuelLevel();
            if (onRefresh) {
              await onRefresh();
            }
          }}
        />


        {/* Launch Boosters Stage - Show for level 1+ */}
        {currentLevel >= 1 && (
          <button
            onClick={onComplete}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>Proceed to Boosters Stage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {currentLevel < 1 && (
          <p className="text-center text-gray-400 text-[10px] mt-2">
            Reach Level 1 to unlock Boosters Stage
          </p>
        )}
      </div>

      {/* Google Drive Setup Flow Modal */}
      {showDriveFlow && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={async (e) => {
            // Allow closing by clicking backdrop
            if (e.target === e.currentTarget) {
              await clearFlowState();
              setShowDriveFlow(false);
              setUserClosedModal(true);
            }
          }}
        >
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {driveFlowStep === 'status' && 'AI Data Sync'}
                {driveFlowStep === 'connect' && 'Connect Your Data'}
                {driveFlowStep === 'choose-folder' && 'Choose Your Folder'}
                {driveFlowStep === 'add-more-folders' && 'Connect More Folders'}
                {driveFlowStep === 'place-files' && 'Place Your Files'}
                {driveFlowStep === 'sync-data' && 'Sync Your Data'}
                {driveFlowStep === 'setup-guide' && 'Folder Setup Guide'}
              </h2>
              <div className="flex items-center gap-2">
                <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await clearFlowState();
                    setShowDriveFlow(false);
                    setUserClosedModal(true);
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {driveFlowStep === 'status' && (
                <ConnectedFoldersStatus
                  onConnectMore={(provider) => {
                    setAddFoldersProvider(provider);
                    setDriveFlowStep('add-more-folders');
                  }}
                  onClose={async () => {
                    setShowDriveFlow(false);
                    await clearFlowState();
                    await refreshCounts();
                    await refreshLaunchPrep();
                    if (onRefresh) {
                      await onRefresh();
                    }
                  }}
                  onDisconnected={async () => {
                    setHasCloudDrive(false);
                    setCloudProvider(null);
                    await clearFlowState();
                    setShowDriveFlow(false);
                    await refreshCounts();
                    await refreshLaunchPrep();
                    if (onRefresh) {
                      await onRefresh();
                    }
                  }}
                  onOpenLocalUpload={() => {
                    // We need to add local upload modal here
                  }}
                  onSyncStarted={() => {
                    setInitialDocCountForSync(fuelData?.fully_synced_documents ?? 0);
                    setSyncJustStarted(true);
                    setShowSyncBanner(true);
                  }}
                />
              )}
              {driveFlowStep === 'connect' && (
                <ConnectDriveStep
                  onComplete={async (provider?: 'google' | 'microsoft') => {
                    const selectedProvider = provider || 'google';
                    setIsNewConnection(true);
                    setHasCloudDrive(true);
                    setCloudProvider(selectedProvider);
                    setAddFoldersProvider(selectedProvider);

                    let teamId = user?.user_metadata?.team_id;
                    if (!teamId && user) {
                      const { data: userData } = await supabase
                        .from('users')
                        .select('team_id')
                        .eq('id', user.id)
                        .maybeSingle();
                      teamId = userData?.team_id;
                    }
                    const hasRootFolder = teamId ? await hasAnyRootFolder(teamId) : false;

                    if (hasRootFolder) {
                      setDriveFlowStep('add-more-folders');
                      await persistFlowState('add-more-folders', null, selectedProvider);
                    } else {
                      setDriveFlowStep('choose-folder');
                      await persistFlowState('choose-folder', null, selectedProvider);
                    }
                  }}
                  progress={null}
                  fromLaunchPrep={true}
                />
              )}
              {driveFlowStep === 'choose-folder' && (
                <ChooseFolderStep
                  provider={cloudProvider || undefined}
                  isNewConnection={isNewConnection}
                  onComplete={async (data) => {
                    console.log('Folder selected:', data);
                    setFolderData(data);
                    setIsNewConnection(false);
                    await persistFlowState('choose-folder', data, cloudProvider);
                    await refreshCounts();
                  }}
                  onProceed={async () => {
                    setDriveFlowStep('place-files');
                    await persistFlowState('place-files', null, cloudProvider);
                  }}
                  onSkipToSync={async () => {
                    console.log('Skipping to sync - folder already has files');
                    setDriveFlowStep('sync-data');
                    await persistFlowState('sync-data', null, cloudProvider);
                  }}
                  progress={null}
                />
              )}
              {driveFlowStep === 'add-more-folders' && (
                <AddMoreFoldersStep
                  provider={addFoldersProvider}
                  onComplete={async () => {
                    setShowDriveFlow(false);
                    setInitialDocCountForSync(fuelData?.fully_synced_documents ?? 0);
                    setSyncJustStarted(true);
                    setShowSyncBanner(true);
                    setAddFoldersProvider(undefined);
                    await clearFlowState();
                    await refreshCounts();
                    if (onRefresh) {
                      await onRefresh();
                    }
                  }}
                  onBack={() => {
                    setAddFoldersProvider(undefined);
                    setDriveFlowStep('status');
                  }}
                />
              )}
              {driveFlowStep === 'place-files' && (
                <PlaceFilesStep
                  onComplete={async () => {
                    // Move to sync step
                    setDriveFlowStep('sync-data');
                    setPlaceFilesForFolder(null);
                    await persistFlowState('sync-data');
                  }}
                  onGoBack={placeFilesForFolder ? () => {
                    setDriveFlowStep('status');
                    setPlaceFilesForFolder(null);
                  } : undefined}
                  progress={null}
                  folderData={folderData}
                  folderType={placeFilesForFolder || 'strategy'}
                  forceChooseOption={!!placeFilesForFolder}
                />
              )}
              {driveFlowStep === 'sync-data' && (
                <SyncDataStep
                  onComplete={async () => {
                    setShowDriveFlow(false);
                    setInitialDocCountForSync(fuelData?.fully_synced_documents ?? 0);
                    setSyncJustStarted(true);
                    setShowSyncBanner(true);
                    await clearFlowState();
                    await refreshCounts();
                    if (onRefresh) {
                      await onRefresh();
                    }
                  }}
                  onGoBack={async () => {
                    setDriveFlowStep('place-files');
                    await persistFlowState('place-files');
                  }}
                  progress={null}
                  fromLaunchPrep={true}
                />
              )}
              {driveFlowStep === 'setup-guide' && (
                <FolderSetupGuide
                  onBack={() => setDriveFlowStep('status')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level Info Modal */}
      {showLevelInfoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-orange-900/30 to-blue-900/30 border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center">
                    <Fuel className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Fuel Stage Levels</h3>
                </div>
                <button
                  onClick={() => setShowLevelInfoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300 mb-4">
                Progress through 5 Fuel Levels by syncing more documents and expanding your data categories. Each level unlocks more Launch Points and enhances Astra's capabilities.
              </p>

              {FUEL_LEVEL_THRESHOLDS.map((threshold, index) => {
                const isCurrentLevel = currentLevel === threshold.level;
                const isCompleted = currentLevel > threshold.level;
                const LevelIcon = levelIcons[index];

                return (
                  <div
                    key={threshold.level}
                    className={`border rounded-lg p-4 ${
                      isCurrentLevel
                        ? 'border-orange-500 bg-orange-900/10'
                        : isCompleted
                        ? 'border-green-700 bg-green-900/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isCurrentLevel
                              ? 'bg-orange-600/20'
                              : isCompleted
                              ? 'bg-green-600/20'
                              : 'bg-gray-700/50'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          ) : (
                            <LevelIcon
                              className={`w-6 h-6 ${
                                isCurrentLevel ? 'text-orange-400' : 'text-gray-400'
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <h4
                            className={`font-semibold ${
                              isCurrentLevel
                                ? 'text-orange-400'
                                : isCompleted
                                ? 'text-green-400'
                                : 'text-white'
                            }`}
                          >
                            Level {threshold.level}
                          </h4>
                          <p className="text-xs text-gray-400">{threshold.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-medium ${
                            isCompleted ? 'text-green-400' : 'text-yellow-400'
                          }`}
                        >
                          +{formatPoints(threshold.points_value)}
                        </span>
                        {isCurrentLevel && (
                          <p className="text-xs text-orange-400 mt-1">Current</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-400 font-medium mb-1">Requirements:</p>
                      {threshold.documents_required > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted ? 'bg-green-400' : 'bg-gray-600'
                            }`}
                          />
                          <p
                            className={`text-xs ${
                              isCompleted ? 'text-green-300' : 'text-gray-400'
                            }`}
                          >
                            {threshold.documents_required}+ documents synced
                          </p>
                        </div>
                      )}
                      {threshold.categories_required > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted ? 'bg-green-400' : 'bg-gray-600'
                            }`}
                          />
                          <p
                            className={`text-xs ${
                              isCompleted ? 'text-green-300' : 'text-gray-400'
                            }`}
                          >
                            {threshold.categories_required}+ data categories
                          </p>
                        </div>
                      )}
                      {threshold.documents_required === 0 && threshold.categories_required === 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted ? 'bg-green-400' : 'bg-gray-600'
                            }`}
                          />
                          <p
                            className={`text-xs ${
                              isCompleted ? 'text-green-300' : 'text-gray-400'
                            }`}
                          >
                            Connect cloud drive
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-300">
                  Tip: Sync more documents from your cloud drive folders or upload local files to progress faster. Higher levels unlock more Launch Points and enhanced AI capabilities!
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowLevelInfoModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentsListModal
        isOpen={showDocumentsModal}
        onClose={() => {
          setShowDocumentsModal(false);
          setDocumentsFilterCategory(null);
        }}
        onDocumentDeleted={() => {
          refreshFuelLevel();
        }}
        initialCategory={documentsFilterCategory}
      />

      <CategoriesDetailModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoryClick={(category) => {
          setShowCategoriesModal(false);
          setDocumentsFilterCategory(category);
          setShowDocumentsModal(true);
        }}
        categories={fuelData?.categories}
      />

      {showDataSyncTipsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-lg w-full shadow-2xl">
            <div className="bg-gradient-to-r from-orange-900/30 to-blue-900/30 border-b border-gray-700 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-600/20 flex items-center justify-center">
                  <Fuel className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Not sure what data to sync?</h3>
                  <p className="text-sm text-gray-400">Tips for getting maximum value from Astra</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Astra works best when it understands your team's purpose and direction. Consider syncing documents that include:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                  <Target className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Mission & Vision</p>
                    <p className="text-xs text-gray-400">Your team's purpose and long-term aspirations</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                  <BookOpen className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Core Values</p>
                    <p className="text-xs text-gray-400">The principles that guide your team's decisions</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <Rocket className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Goals & Plans</p>
                    <p className="text-xs text-gray-400">Strategic objectives and action plans</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  <span className="text-orange-400 font-medium">Tip:</span> All data types can be synced, but strategic documents help Astra provide more aligned and relevant insights for your team.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowDataSyncTipsModal(false)}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl min-h-[48px]"
                >
                  Got It, Let's Start!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
