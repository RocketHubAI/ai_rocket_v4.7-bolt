import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ReportsProvider } from './contexts/ReportsContext';
import { AuthScreen } from './components/AuthScreen';
import { MainContainer } from './components/MainContainer';
import { AgentModeLayout } from './components/agent-mode';
import { GoogleDriveCallback } from './components/GoogleDriveCallback';
import { MicrosoftGraphCallback } from './components/MicrosoftGraphCallback';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { FeedbackModal } from './components/FeedbackModal';
import { VersionChecker } from './components/VersionChecker';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminDashboardPage from './components/AdminDashboardPage';
import { AdminDashboard } from './components/AdminDashboard';
import { BuildAgentsPage } from './components/BuildAgentsPage';
import { MarketingPage } from './components/MarketingPage';
import { MarketingLogo } from './components/MarketingLogo';
import { UserMetricsDashboard } from './components/UserMetricsDashboard';
import { ProtectedMetricsRoute } from './components/ProtectedMetricsRoute';
import { PricingStrategyPage } from './components/PricingStrategyPage';
import { PlansPage } from './components/PlansPage';
import { MCPStrategyPage } from './components/MCPStrategyPage';
import { DataStrategyPage } from './components/DataStrategyPage';
import { PasswordResetPage } from './components/PasswordResetPage';
import { LaunchPreparationFlow } from './components/LaunchPreparationFlow';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { MoonshotChallengePage } from './components/MoonshotChallengePage';
import { MoonshotRegistrationPage } from './components/MoonshotRegistrationPage';
import { MoonshotProgressPage } from './components/MoonshotProgressPage';
import { WorkshopPage } from './components/workshop/WorkshopPage';
import { UpdatesPage } from './components/UpdatesPage';
import { DemoPage } from './pages/DemoPage';
import { UnsubscribeResultPage } from './components/UnsubscribeResultPage';
import { UnsubscribePage } from './components/UnsubscribePage';
import { useFeedbackPrompt } from './hooks/useFeedbackPrompt';
import { useActivityTracking } from './hooks/useActivityTracking';
import { useLaunchPreparation } from './hooks/useLaunchPreparation';
import { useAgentMode } from './hooks/useAgentMode';
import { supabase } from './lib/supabase';
import { FEATURES } from './config/features';
import { AlertTriangle, X } from 'lucide-react';

const SHOW_MAINTENANCE_BANNER = false;

const MaintenanceBanner: React.FC = () => {
  const [dismissed, setDismissed] = React.useState(false);

  if (!SHOW_MAINTENANCE_BANNER || dismissed) return null;

  return (
    <div className="bg-amber-500/90 text-gray-900 px-4 py-3 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium text-center">
          <span className="font-semibold">Agent Workflow Service Unavailable:</span> Our workflow automation service is currently experiencing issues.
          Some features may be temporarily unavailable. We are working with the provider on a fix.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-600/50 rounded transition-colors flex-shrink-0 ml-2"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

type AppView = 'loading' | 'auth' | 'onboarding' | 'launch_prep' | 'main';

const INDEPENDENT_ROUTES = ['/workshop', '/moonshot', '/marketing', '/demo', '/privacy', '/terms', '/plans', '/data-strategy', '/reset-password', '/unsubscribe'];

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [appView, setAppView] = useState<AppView>('loading');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const { shouldShowFeedback, questions, submitFeedback, skipFeedback, pointsReward } = useFeedbackPrompt();
  const { checkEligibility } = useLaunchPreparation();
  const { isAgentModeEnabled, disableAgentMode } = useAgentMode();

  const isIndependentRoute = INDEPENDENT_ROUTES.some(route => location.pathname.startsWith(route));

  // Track user activity for accurate "Last Active" metrics
  useActivityTracking();

  // Single unified check - determines which view to show
  // This eliminates race conditions by having ONE source of truth
  useEffect(() => {
    let isCancelled = false;

    const determineAppView = async () => {
      console.log('🚀 [App] Determining app view...', { user: !!user, loading, path: location.pathname });

      // Skip main app logic for independent routes (workshop, etc.)
      // These routes handle their own auth and should render immediately
      if (isIndependentRoute) {
        console.log('🚀 [App] Independent route detected, skipping main app logic');
        if (!isCancelled) setAppView('main');
        return;
      }

      // Step 1: Wait for auth to complete
      if (loading) {
        console.log('🚀 [App] Auth still loading...');
        return; // Stay in loading state
      }

      // Step 2: No user = auth screen
      if (!user) {
        console.log('🚀 [App] No user, showing auth');
        if (!isCancelled) setAppView('auth');
        return;
      }

      // Step 3: Check onboarding status
      console.log('🚀 [App] Checking onboarding for user:', user.id);
      const metadataTeamId = user.user_metadata?.team_id;

      if (!metadataTeamId) {
        // Check database for team
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();

        if (isCancelled) return;

        if (userData?.team_id) {
          // User has team in DB but not metadata - update metadata
          console.log('🚀 [App] User has team in database, updating metadata');
          await supabase.auth.updateUser({
            data: { team_id: userData.team_id, pending_team_setup: false }
          });
        } else {
          // User truly needs onboarding
          console.log('🚀 [App] User needs onboarding');
          if (!isCancelled) setAppView('onboarding');
          return;
        }
      }

      // Step 4: Check if returning from OAuth callback
      // Don't remove the flag here - FuelStage will remove it after handling the OAuth return
      // This prevents race conditions where auth state changes cause re-evaluation
      const shouldReturnToLaunchPrep = sessionStorage.getItem('return_to_launch_prep');
      if (shouldReturnToLaunchPrep === 'true') {
        console.log('🚀 [App] Returning to Launch Prep after OAuth');
        if (!isCancelled) setAppView('launch_prep');
        return;
      }

      // Step 5: Check launch preparation eligibility
      console.log('🚀 [App] Checking launch prep eligibility...');
      const eligible = await checkEligibility(user.email || '');

      if (isCancelled) return;

      console.log('🚀 [App] Launch Prep eligibility:', eligible);

      if (!eligible) {
        console.log('🚀 [App] User not eligible for Launch Prep, showing main');
        if (!isCancelled) setAppView('main');
        return;
      }

      // Step 6: Check if user has already launched
      console.log('🚀 [App] Checking if user has launched...');
      const { data: freshStatus, error: statusError } = await supabase
        .from('user_launch_status')
        .select('is_launched')
        .eq('user_id', user.id)
        .maybeSingle();

      if (isCancelled) return;

      console.log('🚀 [App] Fresh launch status from DB:', { freshStatus, error: statusError });

      if (statusError) {
        console.error('🚀 [App] Error fetching launch status:', statusError);
        if (!isCancelled) setAppView('main');
        return;
      }

      // If no record exists or is_launched is false, show launch prep
      if (!freshStatus || !freshStatus.is_launched) {
        console.log('🚀 [App] User needs Launch Preparation (is_launched:', freshStatus?.is_launched, ')');
        if (!isCancelled) setAppView('launch_prep');
      } else {
        console.log('🚀 [App] User already launched, showing main');
        if (!isCancelled) setAppView('main');
      }
    };

    determineAppView();

    return () => {
      isCancelled = true;
    };
  }, [user, loading, checkEligibility, isIndependentRoute, location.pathname]);

  const handleOnboardingComplete = async () => {
    const { data: { user: refreshedUser } } = await supabase.auth.getUser();
    if (refreshedUser) {
      // Check if user created a team or joined an existing team
      const { data: userData } = await supabase
        .from('users')
        .select('role, team_id')
        .eq('id', refreshedUser.id)
        .maybeSingle();

      const isTeamCreator = userData?.role === 'admin';

      console.log('🎯 [Onboarding Complete] User role:', userData?.role, 'Is team creator:', isTeamCreator);

      // Check if user is eligible for Launch Preparation
      const eligible = await checkEligibility(refreshedUser.email || '');
      console.log('🚀 [Onboarding Complete] Launch Preparation eligible:', eligible);

      if (eligible) {
        // User is eligible for Launch Preparation
        console.log('✅ [Onboarding Complete] User eligible for Launch Prep');
        setAppView('launch_prep');
      } else if (isTeamCreator) {
        // Not eligible for Launch Prep, use old guided setup flow
        console.log('✅ [Onboarding Complete] Redirecting team creator to Guided Setup');
        window.location.href = '/?openGuidedSetup=true';
      } else {
        console.log('✅ [Onboarding Complete] Invited member - skipping Guided Setup');
        window.location.href = '/';
      }
    }
  };

  const handleLaunchComplete = () => {
    // User has completed launch and seen WelcomeModal
    // If they clicked "Start Tour", the start_interactive_tour flag is already set
    console.log('🚀 [App] Launch complete, transitioning to main');
    setAppView('main');
  };

  // Show loading spinner until we determine the view
  // But for independent routes (workshop, etc.), render Routes immediately
  if (appView === 'loading' && !isIndependentRoute) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading AI Rocket...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* OAuth Callbacks */}
      {FEATURES.GOOGLE_DRIVE_SYNC_ENABLED && (
        <Route path="/auth/google-drive/callback" element={<GoogleDriveCallback />} />
      )}
      <Route path="/auth/microsoft/callback" element={<MicrosoftGraphCallback />} />

      {/* Admin Dashboard - Protected Route */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPage />
          </ProtectedAdminRoute>
        }
      />

      {/* User Metrics Dashboard - Super Admin Only */}
      <Route
        path="/user-metrics"
        element={
          <ProtectedMetricsRoute>
            <UserMetricsDashboard />
          </ProtectedMetricsRoute>
        }
      />

      {/* Pricing Strategy - Super Admin Only */}
      <Route
        path="/pricing-strategy"
        element={
          <ProtectedMetricsRoute>
            <PricingStrategyPage />
          </ProtectedMetricsRoute>
        }
      />

      {/* MCP Strategy - Super Admin Only */}
      <Route
        path="/mcp-strategy"
        element={
          <ProtectedMetricsRoute>
            <MCPStrategyPage />
          </ProtectedMetricsRoute>
        }
      />

      {/* Data Strategy - Public Page */}
      <Route
        path="/data-strategy"
        element={<DataStrategyPage />}
      />

      {/* Plans Page - Public Route */}
      <Route path="/plans" element={<PlansPage />} />

      {/* Build Agents - Protected Route */}
      <Route
        path="/build-agents"
        element={
          user ? (
            <BuildAgentsPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Marketing Page - Public Route */}
      <Route path="/marketing" element={<MarketingPage />} />

      {/* Marketing Logo Page - Public Route */}
      <Route path="/marketing-logo" element={<MarketingLogo />} />

      {/* Password Reset Page - Public Route */}
      <Route path="/reset-password" element={<PasswordResetPage />} />

      {/* Legal Pages - Public Routes */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />

      {/* Moonshot Challenge - Public Routes */}
      <Route path="/moonshot" element={<MoonshotChallengePage />} />
      <Route path="/moonshot/register" element={<MoonshotRegistrationPage />} />

      {/* AI-preneur Workshop - Public Route (handles own auth) */}
      <Route path="/workshop" element={<WorkshopPage />} />

      {/* Moonshot Progress - Protected Route */}
      <Route
        path="/moonshot-progress"
        element={
          user ? (
            <MoonshotProgressPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Updates Page - Public Route */}
      <Route path="/updates" element={<UpdatesPage />} />

      {/* Demo Page - Public Route */}
      <Route path="/demo" element={<DemoPage />} />

      {/* Unsubscribe Pages - Public Routes */}
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/unsubscribe-result" element={<UnsubscribeResultPage />} />

      {/* Reports Redirect - For notification backward compatibility */}
      <Route path="/reports" element={<Navigate to="/?openReports=true" replace />} />

      {/* Main App Routes */}
      <Route
        path="/"
        element={
          appView === 'auth' ? (
            <AuthScreen />
          ) : appView === 'onboarding' ? (
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          ) : appView === 'launch_prep' ? (
            <LaunchPreparationFlow onLaunch={handleLaunchComplete} />
          ) : isAgentModeEnabled ? (
            <>
              <VersionChecker />
              <AgentModeLayout
                onOpenAdminDashboard={() => setShowAdminDashboard(true)}
                onSwitchToClassicMode={disableAgentMode}
              />
              <PWAInstallPrompt />
              {shouldShowFeedback && questions.length > 0 && (
                <FeedbackModal questions={questions} onSubmit={submitFeedback} onSkip={skipFeedback} pointsReward={pointsReward} />
              )}
              {showAdminDashboard && (
                <AdminDashboard isOpen={true} onClose={() => setShowAdminDashboard(false)} />
              )}
            </>
          ) : (
            <>
              <VersionChecker />
              <MainContainer onOpenAdminDashboard={() => setShowAdminDashboard(true)} />
              <PWAInstallPrompt />
              {shouldShowFeedback && questions.length > 0 && (
                <FeedbackModal questions={questions} onSubmit={submitFeedback} onSkip={skipFeedback} pointsReward={pointsReward} />
              )}
              {showAdminDashboard && (
                <AdminDashboard isOpen={true} onClose={() => setShowAdminDashboard(false)} />
              )}
            </>
          )
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReportsProvider>
          <MaintenanceBanner />
          <AppContent />
        </ReportsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;