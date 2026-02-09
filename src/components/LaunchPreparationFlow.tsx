import React, { useState, useEffect } from 'react';
import { useLaunchPreparation } from '../hooks/useLaunchPreparation';
import { useLaunchActivity } from '../hooks/useLaunchActivity';
import { useAuth } from '../contexts/AuthContext';
import { Loader, Rocket } from 'lucide-react';
import { FuelStage } from './launch-stages/FuelStage';
import { BoostersStage } from './launch-stages/BoostersStage';
import { GuidanceStage } from './launch-stages/GuidanceStage';
import { ReadyToLaunchPanel } from './launch-stages/ReadyToLaunchPanel';
import { StageSelector } from './launch-stages/StageSelector';
import { LaunchOnboardingScreens } from './launch-stages/LaunchOnboardingScreens';
import { WaitingForSetupScreen } from './launch-stages/WaitingForSetupScreen';
import { LaunchToast, useLaunchToast } from './LaunchToast';
import { WelcomeModal } from './WelcomeModal';
import { isReadyToLaunch } from '../lib/launch-preparation-utils';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import { HelpCenter, HelpCenterTab } from './HelpCenter';

interface LaunchPreparationFlowProps {
  onLaunch: () => void;
}

export const LaunchPreparationFlow: React.FC<LaunchPreparationFlowProps> = ({ onLaunch }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const {
    launchStatus,
    stageProgress,
    loading,
    error,
    initializeLaunchStatus,
    updateCurrentStage,
    refresh,
    checkIsLegacyUser
  } = useLaunchPreparation();

  const [showStageSelector, setShowStageSelector] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isLegacyUser, setIsLegacyUser] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [helpCenterTab, setHelpCenterTab] = useState<HelpCenterTab>('faq');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isSetupAdmin, setIsSetupAdmin] = useState(false);
  const [isAwaitingSetup, setIsAwaitingSetup] = useState(false);
  const [isTeamCreator, setIsTeamCreator] = useState(true);
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);
  const { notifications, dismissToast, showLaunch, showLevelUp } = useLaunchToast();

  // Enable background activity tracking
  useLaunchActivity();

  // Check if user has seen onboarding and if they're awaiting team setup
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_launch_status')
          .select('has_seen_onboarding, awaiting_team_setup')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setCheckingOnboarding(false);
          return;
        }

        // Check if user is a legacy user
        const legacyStatus = await checkIsLegacyUser(user.email || '');
        setIsLegacyUser(legacyStatus);

        // Check if user is awaiting team setup (delegated to admin)
        if (data?.awaiting_team_setup) {
          setIsAwaitingSetup(true);
        }

        // If user has no launch status or hasn't seen onboarding, show it
        if (!data || !data.has_seen_onboarding) {
          setShowOnboarding(true);
        }

        setCheckingOnboarding(false);
      } catch (err) {
        console.error('Error in checkOnboarding:', err);
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user, checkIsLegacyUser]);

  // Check for URL parameter or sessionStorage flag to redirect to specific stage (e.g., from OAuth callback)
  useEffect(() => {
    if (!launchStatus) return;

    // Check sessionStorage first (for OAuth callbacks)
    const shouldReopenFuel = sessionStorage.getItem('reopen_fuel_stage');
    if (shouldReopenFuel === 'true') {
      console.log('🚀 [LaunchPreparationFlow] Detected reopen_fuel_stage flag - navigating to Fuel');
      // Don't remove the flag here - let FuelStage handle it to open the modal
      setShowStageSelector(false);
      updateCurrentStage('fuel');
      return;
    }

    // Check URL parameter
    const params = new URLSearchParams(window.location.search);
    const openStage = params.get('openLaunchPrep');

    if (openStage) {
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);

      // Navigate to the specified stage
      if (openStage === 'fuel') {
        setShowStageSelector(false);
        updateCurrentStage('fuel');
      }
    }
  }, [launchStatus, updateCurrentStage]);

  // Initialize launch status on mount
  useEffect(() => {
    if (user && !launchStatus && !loading && !checkingOnboarding) {
      initializeLaunchStatus();
    }
  }, [user, launchStatus, loading, checkingOnboarding, initializeLaunchStatus]);

  // Fetch team name and check if user is team creator
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user) return;
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('name, created_by')
            .eq('id', userData.team_id)
            .maybeSingle();

          if (teamData) {
            if (teamData.name) {
              setTeamName(teamData.name);
            }
            setIsTeamCreator(teamData.created_by === user.id);
          }
        }
      } catch (err) {
        console.error('Error fetching team data:', err);
      }
    };
    fetchTeamData();
  }, [user]);

  // Check if user is a setup admin (invited to do setup for another user)
  useEffect(() => {
    const checkSetupAdminStatus = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_launch_status')
          .select('is_setup_admin')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsSetupAdmin(data?.is_setup_admin || false);
      } catch (err) {
        console.error('Error checking setup admin status:', err);
      }
    };
    checkSetupAdminStatus();
  }, [user]);

  // Handle successful delegation - redirect to waiting screen
  const handleDelegateSuccess = () => {
    setIsAwaitingSetup(true);
  };

  // Handle when setup admin completes the setup
  const handleSetupComplete = (adminName: string) => {
    setIsAwaitingSetup(false);
    refresh();
  };

  // Handle cancelling delegation - return to normal flow
  const handleCancelDelegation = () => {
    setIsAwaitingSetup(false);
  };

  // Get progress for each stage
  const fuelProgress = stageProgress.find(p => p.stage === 'fuel') || null;
  const boostersProgress = stageProgress.find(p => p.stage === 'boosters') || null;
  const guidanceProgress = stageProgress.find(p => p.stage === 'guidance') || null;

  // Check if user is ready to launch
  const readyToLaunch = isReadyToLaunch(fuelProgress, boostersProgress, guidanceProgress);

  // Handle stage navigation
  const navigateToStage = async (stage: 'fuel' | 'boosters' | 'guidance' | 'ready') => {
    setShowStageSelector(false);
    await updateCurrentStage(stage);
  };

  // Handle back to stage selector
  const backToStageSelector = async () => {
    setShowStageSelector(true);
    // Refresh data to show updated progress
    await refresh();
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    try {
      // Mark onboarding as seen
      const { error } = await supabase
        .from('user_launch_status')
        .upsert({
          user_id: user!.id,
          has_seen_onboarding: true,
          current_stage: 'fuel',
          total_points: 0,
          is_launched: false
        });

      if (error) {
        console.error('Error updating onboarding status:', error);
      }

      setShowOnboarding(false);
      setJustCompletedOnboarding(true);
    } catch (err) {
      console.error('Error in handleOnboardingComplete:', err);
      setShowOnboarding(false);
    }
  };

  // Handle launch button click - show WelcomeModal directly
  // CRITICAL: Show WelcomeModal BEFORE updating is_launched to avoid race condition
  const handleLaunch = async () => {
    showLaunch();
    setTimeout(() => {
      setShowWelcomeModal(true);
    }, 2000);
  };

  // Handle Welcome Modal - Start Tour
  // ONLY mark as launched AFTER user interacts with WelcomeModal
  const handleStartTour = async () => {
    setShowWelcomeModal(false);
    sessionStorage.setItem('start_interactive_tour', 'true');
    await updateCurrentStage('launched');
    onLaunch();
  };

  // Handle Welcome Modal - Dismiss
  // ONLY mark as launched AFTER user interacts with WelcomeModal
  const handleDismissWelcome = async () => {
    setShowWelcomeModal(false);
    await updateCurrentStage('launched');
    onLaunch();
  };

  // Handle opening help center
  const openHelpCenter = (tab?: HelpCenterTab) => {
    setHelpCenterTab(tab || 'faq');
    setShowHelpCenter(true);
  };

  // Show onboarding screens if user hasn't seen them
  if (showOnboarding && !checkingOnboarding) {
    return (
      <LaunchOnboardingScreens
        onComplete={handleOnboardingComplete}
        onClose={() => {
          // Users cannot skip onboarding - closing just logs them out
          // This is handled by the header's close button which calls signOut
        }}
        userName={profile?.name || user?.email?.split('@')[0]}
        isLegacyUser={isLegacyUser}
        teamName={teamName}
        userRole={profile?.role}
        hasTeam={!!profile?.team_id}
        isTeamCreator={isTeamCreator}
      />
    );
  }

  // Show waiting screen if user has delegated setup to an admin
  if (isAwaitingSetup && !checkingOnboarding) {
    return (
      <WaitingForSetupScreen
        onSetupComplete={handleSetupComplete}
        onCancelDelegation={handleCancelDelegation}
      />
    );
  }

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Preparing your Launch Sequence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!launchStatus) {
    return null;
  }

  // Show stage selector or current stage
  if (showStageSelector || launchStatus.current_stage === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <StageSelector
          currentStage={launchStatus.current_stage}
          fuelProgress={fuelProgress}
          boostersProgress={boostersProgress}
          guidanceProgress={guidanceProgress}
          totalPoints={launchStatus.total_points}
          onNavigateToStage={navigateToStage}
          onExit={onLaunch}
          onOpenHelpCenter={openHelpCenter}
          onLaunch={handleLaunch}
          showFuelPulse={justCompletedOnboarding}
        />

        {/* Help Center */}
        {showHelpCenter && (
          <HelpCenter
            isOpen={showHelpCenter}
            onClose={() => setShowHelpCenter(false)}
            onStartTour={() => setShowHelpCenter(false)}
            isAdmin={isSetupAdmin}
            initialTab={helpCenterTab}
          />
        )}

        {/* Welcome Modal - shown after launch */}
        {showWelcomeModal && (
          <WelcomeModal
            userName={profile?.name || user?.email?.split('@')[0] || 'User'}
            teamName={teamName}
            onStartTour={handleStartTour}
            onDismiss={handleDismissWelcome}
          />
        )}
      </div>
    );
  }

  // Show current stage
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <LaunchToast notifications={notifications} onDismiss={dismissToast} />

      {launchStatus.current_stage === 'fuel' && (
        <FuelStage
          progress={fuelProgress}
          fuelProgress={fuelProgress}
          boostersProgress={boostersProgress}
          guidanceProgress={guidanceProgress}
          onBack={backToStageSelector}
          onNavigateToStage={navigateToStage}
          onRefresh={refresh}
          onOpenHelpCenter={openHelpCenter}
          onDelegateSetup={handleDelegateSuccess}
          teamName={teamName}
          showDelegationBanner={!isLegacyUser && !isSetupAdmin && !!user?.user_metadata?.new_team_name}
          userRole={profile?.role}
          onComplete={() => {
            if (boostersProgress && boostersProgress.level > 0) {
              backToStageSelector();
            } else {
              navigateToStage('boosters');
            }
          }}
        />
      )}

      {launchStatus.current_stage === 'boosters' && (
        <BoostersStage
          progress={boostersProgress}
          fuelProgress={fuelProgress}
          boostersProgress={boostersProgress}
          guidanceProgress={guidanceProgress}
          onBack={backToStageSelector}
          onNavigateToStage={navigateToStage}
          onOpenHelpCenter={openHelpCenter}
          onDelegateSetup={handleDelegateSuccess}
          teamName={teamName}
          showDelegationBanner={!isLegacyUser && !isSetupAdmin && !!user?.user_metadata?.new_team_name}
          onComplete={async () => {
            await refresh();
            const updatedBoostersProgress = stageProgress.find(p => p.stage === 'boosters');
            const updatedGuidanceProgress = stageProgress.find(p => p.stage === 'guidance');
            const nowReadyToLaunch = isReadyToLaunch(fuelProgress, updatedBoostersProgress || null, updatedGuidanceProgress || null);

            if (nowReadyToLaunch) {
              navigateToStage('ready');
            } else if (guidanceProgress && guidanceProgress.level > 0) {
              backToStageSelector();
            } else {
              navigateToStage('guidance');
            }
          }}
          showLevelUp={showLevelUp}
          onExitToChat={(prompt: string) => {
            // Store prompt for main chat to pick up
            sessionStorage.setItem('astra_guided_prompt', prompt);
            sessionStorage.setItem('exit_launch_prep', 'true');
            // Exit to main app
            onLaunch();
          }}
        />
      )}

      {launchStatus.current_stage === 'guidance' && (
        <GuidanceStage
          progress={guidanceProgress}
          fuelProgress={fuelProgress}
          boostersProgress={boostersProgress}
          guidanceProgress={guidanceProgress}
          onBack={backToStageSelector}
          onNavigateToStage={navigateToStage}
          onOpenHelpCenter={openHelpCenter}
          onDelegateSetup={handleDelegateSuccess}
          teamName={teamName}
          showDelegationBanner={!isLegacyUser && !isSetupAdmin && !!user?.user_metadata?.new_team_name}
          userRole={profile?.role}
          onComplete={() => {
            if (readyToLaunch) {
              navigateToStage('ready');
            } else {
              backToStageSelector();
            }
          }}
        />
      )}

      {/* Help Center */}
      {showHelpCenter && (
        <HelpCenter
          isOpen={showHelpCenter}
          onClose={() => setShowHelpCenter(false)}
          onStartTour={() => setShowHelpCenter(false)}
          isAdmin={isSetupAdmin}
          initialTab={helpCenterTab}
        />
      )}

      {/* Welcome Modal - shown after launch */}
      {showWelcomeModal && (
        <WelcomeModal
          userName={profile?.name || user?.email?.split('@')[0] || 'User'}
          teamName={teamName}
          onStartTour={handleStartTour}
          onDismiss={handleDismissWelcome}
        />
      )}
    </div>
  );
};
