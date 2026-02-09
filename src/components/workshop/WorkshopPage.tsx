import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WorkshopAuth } from './WorkshopAuth';
import { WorkshopOnboarding } from './WorkshopOnboarding';
import { WorkshopMindsetJourney, type Goal } from './WorkshopMindsetJourney';
import { WorkshopGoalsVisualization } from './WorkshopGoalsVisualization';
import { WorkshopDocumentSync } from './WorkshopDocumentSync';
import { WorkshopInfographic } from './WorkshopInfographic';
import { WorkshopHub } from './WorkshopHub';
import { BuildLabDashboard } from './BuildLabDashboard';
import { BuildLabDocuments } from './BuildLabDocuments';
import { WishPrototypeView } from './WishPrototypeView';
import AstraCreateView, { type SavedVisualization } from '../AstraCreateView';
import { VisualizationGallery } from '../astra-create/VisualizationGallery';
import { SlideViewer } from '../astra-create/SlideViewer';

type WorkshopStep =
  | 'auth'
  | 'onboarding'
  | 'mindset_journey'
  | 'goals'
  | 'goal_selection'
  | 'document_sync'
  | 'infographic'
  | 'hub'
  | 'gallery'
  | 'all_goals_create'
  | 'build_lab'
  | 'build_lab_documents'
  | 'build_lab_prototype';

interface WorkshopWishes {
  wish1: string;
  wish2: string;
  wish3: string;
}

interface WorkshopState {
  userId: string | null;
  registrationId: string | null;
  teamId: string | null;
  teamName: string;
  userName: string;
  userEmail: string;
  currentStep: WorkshopStep;
  goals: Goal[];
  selectedGoal: Goal | null;
  infographicUrl?: string;
  savedVisualizations: SavedVisualization[];
  loadingGallery: boolean;
  viewingVisualization: SavedVisualization | null;
  wishes: WorkshopWishes;
  currentPrototypeWish: number | null;
}

export const WorkshopPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workshopCode = searchParams.get('code');

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<WorkshopState>({
    userId: null,
    registrationId: null,
    teamId: null,
    teamName: '',
    userName: '',
    userEmail: '',
    currentStep: 'auth',
    goals: [],
    selectedGoal: null,
    savedVisualizations: [],
    loadingGallery: false,
    viewingVisualization: null,
    wishes: { wish1: '', wish2: '', wish3: '' },
    currentPrototypeWish: null
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: registration } = await supabase
          .from('workshop_registrations')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (registration) {
          if (registration.access_expires_at && new Date(registration.access_expires_at) < new Date()) {
            await supabase.auth.signOut();
            setState(prev => ({ ...prev, currentStep: 'auth' }));
            setLoading(false);
            return;
          }

          const { data: goals } = await supabase
            .from('workshop_goals')
            .select('*')
            .eq('user_id', session.user.id)
            .order('goal_number');

          const loadedGoals: Goal[] = (goals || []).map(g => ({
            goalNumber: g.goal_number,
            goalTitle: g.goal_title,
            goalDescription: g.goal_description,
            positiveImpact1: g.positive_impact_1,
            positiveImpact2: g.positive_impact_2,
            positiveImpact3: g.positive_impact_3
          }));

          const selectedGoalData = goals?.find(g => g.is_selected);
          const selectedGoal = selectedGoalData ? loadedGoals.find(g => g.goalNumber === selectedGoalData.goal_number) : null;

          const { data: viz } = await supabase
            .from('workshop_visualizations')
            .select('image_url')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: wishesData } = await supabase
            .from('workshop_wishes')
            .select('wish_1, wish_2, wish_3')
            .eq('user_id', session.user.id)
            .maybeSingle();

          let step = mapDbStepToWorkshopStep(registration.current_step);

          const allGoalsCompleted = goals && goals.length === 3 && goals.every(g => g.is_completed);
          if (step === 'hub' && allGoalsCompleted) {
            step = 'goals';
          }

          setState(prev => ({
            ...prev,
            userId: session.user.id,
            registrationId: registration.id,
            teamId: session.user.user_metadata?.team_id || '',
            teamName: registration.team_name || '',
            userName: session.user.user_metadata?.full_name || '',
            userEmail: session.user.email || '',
            currentStep: step,
            goals: loadedGoals,
            selectedGoal: selectedGoal || null,
            infographicUrl: viz?.image_url,
            wishes: wishesData ? {
              wish1: wishesData.wish_1 || '',
              wish2: wishesData.wish_2 || '',
              wish3: wishesData.wish_3 || ''
            } : { wish1: '', wish2: '', wish3: '' }
          }));
        } else {
          setState(prev => ({
            ...prev,
            userId: session.user.id,
            userEmail: session.user.email || '',
            currentStep: 'auth'
          }));
        }
      }
    } catch (err) {
      console.error('Error checking session:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapDbStepToWorkshopStep = (dbStep: string | null): WorkshopStep => {
    const stepMap: Record<string, WorkshopStep> = {
      'registered': 'onboarding',
      'onboarding': 'onboarding',
      'journey': 'mindset_journey',
      'mindset_journey': 'mindset_journey',
      'goals': 'goals',
      'goal_selection': 'hub',
      'documents': 'hub',
      'build_lab': 'build_lab',
      'document_sync': 'hub',
      'infographic': 'hub',
      'hub': 'hub',
      'completed': 'goals'
    };
    return stepMap[dbStep || 'registered'] || 'onboarding';
  };

  const handleAuthComplete = async (
    userId: string,
    registrationId: string,
    teamId: string,
    teamName: string,
    userName: string,
    userEmail: string
  ) => {
    const { data: registration } = await supabase
      .from('workshop_registrations')
      .select('current_step')
      .eq('id', registrationId)
      .maybeSingle();

    const { data: goals } = await supabase
      .from('workshop_goals')
      .select('*')
      .eq('user_id', userId)
      .order('goal_number');

    const loadedGoals: Goal[] = (goals || []).map(g => ({
      goalNumber: g.goal_number,
      goalTitle: g.goal_title,
      goalDescription: g.goal_description,
      positiveImpact1: g.positive_impact_1,
      positiveImpact2: g.positive_impact_2,
      positiveImpact3: g.positive_impact_3
    }));

    const selectedGoalData = goals?.find(g => g.is_selected);
    const selectedGoal = selectedGoalData ? loadedGoals.find(g => g.goalNumber === selectedGoalData.goal_number) : null;

    const { data: viz } = await supabase
      .from('workshop_visualizations')
      .select('image_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let step = mapDbStepToWorkshopStep(registration?.current_step || 'onboarding');

    const allGoalsCompleted = goals && goals.length === 3 && goals.every(g => g.is_completed);
    if (step === 'hub' && allGoalsCompleted) {
      step = 'goals';
    }

    setState(prev => ({
      ...prev,
      userId,
      registrationId,
      teamId,
      teamName,
      userName,
      userEmail,
      currentStep: step,
      goals: loadedGoals,
      selectedGoal: selectedGoal || null,
      infographicUrl: viz?.image_url
    }));
  };

  const handleOnboardingComplete = () => {
    setState(prev => ({ ...prev, currentStep: 'mindset_journey' }));
  };

  const handleMindsetJourneyComplete = (goals: Goal[]) => {
    setState(prev => ({
      ...prev,
      goals,
      currentStep: 'goals'
    }));
  };

  const handleGoalSelectionComplete = async (selectedGoal: Goal) => {
    const { data: existingDocs } = await supabase
      .from('workshop_documents')
      .select('id')
      .eq('user_id', state.userId)
      .limit(1);

    const hasDocuments = existingDocs && existingDocs.length > 0;

    setState(prev => ({
      ...prev,
      selectedGoal,
      currentStep: hasDocuments ? 'hub' : 'document_sync'
    }));
  };

  const handleDocumentSyncComplete = () => {
    setState(prev => ({ ...prev, currentStep: 'hub' }));
  };

  const handleInfographicComplete = () => {
    setState(prev => ({ ...prev, currentStep: 'hub' }));
  };

  const loadSavedVisualizations = async () => {
    if (!state.teamId && !state.userId) return;

    setState(prev => ({ ...prev, loadingGallery: true }));
    try {
      let query = supabase
        .from('astra_visualizations')
        .select(`
          id,
          title,
          type,
          content_types,
          style,
          layout,
          slide_count,
          generated_at,
          status,
          astra_visualization_slides (
            id,
            slide_number,
            title,
            image_url,
            image_base64,
            content,
            bullet_points,
            metrics
          )
        `)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(50);

      if (state.teamId) {
        query = query.eq('team_id', state.teamId);
      } else if (state.userId) {
        query = query.eq('user_id', state.userId);
      }

      const { data: visualizations, error: vizError } = await query;

      if (vizError) throw vizError;

      const mapped: SavedVisualization[] = (visualizations || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        type: v.type,
        contentTypes: v.content_types || [],
        style: v.style,
        layout: v.layout,
        slideCount: v.slide_count,
        generatedAt: v.generated_at,
        slides: (v.astra_visualization_slides || [])
          .sort((a: any, b: any) => a.slide_number - b.slide_number)
          .map((s: any) => ({
            id: s.id,
            slideNumber: s.slide_number,
            title: s.title || '',
            content: s.content || '',
            imageUrl: s.image_url,
            imageBase64: s.image_base64,
            bulletPoints: s.bullet_points || [],
            metrics: s.metrics || []
          }))
      }));

      setState(prev => ({ ...prev, savedVisualizations: mapped, loadingGallery: false }));
    } catch (err) {
      console.error('Error loading visualizations:', err);
      setState(prev => ({ ...prev, loadingGallery: false }));
    }
  };

  const handleOpenGallery = () => {
    setState(prev => ({ ...prev, currentStep: 'gallery', viewingVisualization: null }));
    loadSavedVisualizations();
  };

  const handleOpenAllGoalsCreate = () => {
    setState(prev => ({ ...prev, currentStep: 'all_goals_create' }));
  };

  const handleBackToGoals = () => {
    setState(prev => ({ ...prev, currentStep: 'goals' }));
  };

  const handleReturnToGoals = () => {
    setState(prev => ({ ...prev, currentStep: 'goals', selectedGoal: null }));
  };

  const handleSelectGoal = (goal: Goal) => {
    setState(prev => ({ ...prev, selectedGoal: goal }));
  };

  const handleAllGoalsCreateComplete = async () => {
    await supabase
      .from('workshop_registrations')
      .update({ all_goals_creation_completed: true })
      .eq('id', state.registrationId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setState({
      userId: null,
      registrationId: null,
      teamId: null,
      teamName: '',
      userName: '',
      userEmail: '',
      currentStep: 'auth',
      goals: [],
      selectedGoal: null,
      savedVisualizations: [],
      loadingGallery: false,
      viewingVisualization: null,
      wishes: { wish1: '', wish2: '', wish3: '' },
      currentPrototypeWish: null
    });
  };

  const handleOpenBuildLab = async () => {
    const { data: wishesData } = await supabase
      .from('workshop_wishes')
      .select('wish_1, wish_2, wish_3')
      .eq('user_id', state.userId)
      .maybeSingle();

    await supabase
      .from('workshop_registrations')
      .update({ current_step: 'build_lab' })
      .eq('id', state.registrationId);

    setState(prev => ({
      ...prev,
      currentStep: 'build_lab',
      wishes: wishesData ? {
        wish1: wishesData.wish_1 || '',
        wish2: wishesData.wish_2 || '',
        wish3: wishesData.wish_3 || ''
      } : prev.wishes
    }));
  };

  const handleOpenBuildLabDocuments = () => {
    setState(prev => ({ ...prev, currentStep: 'build_lab_documents' }));
  };

  const handleOpenBuildLabPrototype = async (wishNumber: number) => {
    let wishes = state.wishes;

    if (!wishes.wish1 && !wishes.wish2 && !wishes.wish3) {
      // First try to load from workshop_wishes table
      const { data: wishesData } = await supabase
        .from('workshop_wishes')
        .select('wish_1, wish_2, wish_3')
        .eq('user_id', state.userId)
        .maybeSingle();

      if (wishesData) {
        wishes = {
          wish1: wishesData.wish_1 || '',
          wish2: wishesData.wish_2 || '',
          wish3: wishesData.wish_3 || ''
        };
      } else {
        // If no wishes in database, try to load from existing prototypes
        // (which may have auto-generated descriptions)
        const { data: prototypes } = await supabase
          .from('build_lab_prototypes')
          .select('wish_number, wish_text')
          .eq('user_id', state.userId)
          .in('wish_number', [1, 2, 3]);

        if (prototypes && prototypes.length > 0) {
          wishes = {
            wish1: prototypes.find(p => p.wish_number === 1)?.wish_text || '',
            wish2: prototypes.find(p => p.wish_number === 2)?.wish_text || '',
            wish3: prototypes.find(p => p.wish_number === 3)?.wish_text || ''
          };
        }
      }
    }

    setState(prev => ({
      ...prev,
      currentStep: 'build_lab_prototype',
      currentPrototypeWish: wishNumber,
      wishes
    }));
  };

  const handleBackToBuildLab = () => {
    setState(prev => ({ ...prev, currentStep: 'build_lab', currentPrototypeWish: null }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading workshop...</p>
        </div>
      </div>
    );
  }

  switch (state.currentStep) {
    case 'auth':
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <WorkshopAuth
            workshopCode={workshopCode || undefined}
            onComplete={handleAuthComplete}
          />
        </div>
      );

    case 'onboarding':
      return (
        <WorkshopOnboarding
          userId={state.userId!}
          registrationId={state.registrationId!}
          onComplete={handleOnboardingComplete}
          onLogout={handleLogout}
        />
      );

    case 'mindset_journey':
      return (
        <WorkshopMindsetJourney
          userId={state.userId!}
          registrationId={state.registrationId!}
          onComplete={handleMindsetJourneyComplete}
          onLogout={handleLogout}
        />
      );

    case 'goals':
      return (
        <WorkshopGoalsVisualization
          userId={state.userId!}
          registrationId={state.registrationId!}
          teamId={state.teamId || undefined}
          initialGoals={state.goals}
          onComplete={handleGoalSelectionComplete}
          onOpenGallery={handleOpenGallery}
          onOpenAllGoalsCreate={handleOpenAllGoalsCreate}
          onOpenBuildLab={handleOpenBuildLab}
          onLogout={handleLogout}
        />
      );

    case 'document_sync':
      return (
        <WorkshopDocumentSync
          userId={state.userId!}
          teamId={state.teamId!}
          registrationId={state.registrationId!}
          selectedGoal={state.selectedGoal!}
          onComplete={handleDocumentSyncComplete}
          onLogout={handleLogout}
        />
      );

    case 'infographic':
      return (
        <WorkshopInfographic
          userId={state.userId!}
          registrationId={state.registrationId!}
          selectedGoal={state.selectedGoal!}
          onComplete={handleInfographicComplete}
          onLogout={handleLogout}
        />
      );

    case 'hub':
      return (
        <WorkshopHub
          userId={state.userId!}
          registrationId={state.registrationId!}
          teamId={state.teamId!}
          teamName={state.teamName}
          selectedGoal={state.selectedGoal || state.goals[0] || {
            goalNumber: 1,
            goalTitle: 'Your Goal',
            goalDescription: 'Complete the workshop to set your goal',
            positiveImpact1: '',
            positiveImpact2: '',
            positiveImpact3: ''
          }}
          infographicUrl={state.infographicUrl}
          onComplete={handleReturnToGoals}
          onLogout={handleLogout}
          onReturnToGoals={handleReturnToGoals}
          onSelectGoal={handleSelectGoal}
        />
      );

    case 'gallery':
      if (state.viewingVisualization) {
        return (
          <div className="min-h-screen bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, viewingVisualization: null }))}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-white">{state.viewingVisualization.title}</h1>
                  <p className="text-xs text-gray-400">
                    {state.viewingVisualization.slides.length} slide{state.viewingVisualization.slides.length !== 1 ? 's' : ''} - {state.viewingVisualization.style}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <SlideViewer
                slides={state.viewingVisualization.slides}
                layout={state.viewingVisualization.layout}
                isFullscreen={false}
                visualizationType={state.viewingVisualization.type}
                title={state.viewingVisualization.title}
              />
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gray-900">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBackToGoals}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">My Visualizations</h1>
                <p className="text-sm text-gray-400">{state.savedVisualizations.length} saved items</p>
              </div>
            </div>
            <VisualizationGallery
              visualizations={state.savedVisualizations}
              loading={state.loadingGallery}
              onView={(viz) => setState(prev => ({ ...prev, viewingVisualization: viz }))}
              onDelete={async (id) => {
                try {
                  await supabase.from('astra_visualizations').delete().eq('id', id);
                  setState(prev => ({
                    ...prev,
                    savedVisualizations: prev.savedVisualizations.filter(v => v.id !== id)
                  }));
                } catch (err) {
                  console.error('Error deleting visualization:', err);
                }
              }}
            />
          </div>
        </div>
      );

    case 'all_goals_create':
      return (
        <div className="min-h-screen bg-gray-900">
          <AstraCreateView
            workshopMode={true}
            workshopGoal={{
              goalNumber: 0,
              goalTitle: 'All Goals Combined',
              goalDescription: state.goals.map(g => g.goalTitle).join(', '),
              positiveImpact1: state.goals[0]?.positiveImpact1 || '',
              positiveImpact2: state.goals[1]?.positiveImpact1 || '',
              positiveImpact3: state.goals[2]?.positiveImpact1 || ''
            }}
            workshopConversationId={null}
            workshopTeamId={state.teamId}
            workshopAllGoals={state.goals}
            onClose={handleBackToGoals}
            onGenerationComplete={handleAllGoalsCreateComplete}
            onBackFromResult={handleBackToGoals}
          />
        </div>
      );

    case 'build_lab':
      return (
        <BuildLabDashboard
          userId={state.userId!}
          registrationId={state.registrationId!}
          teamId={state.teamId!}
          teamName={state.teamName}
          goals={state.goals}
          wishes={state.wishes}
          onOpenPrototype={handleOpenBuildLabPrototype}
          onOpenDocuments={handleOpenBuildLabDocuments}
          onLogout={handleLogout}
          onBack={handleBackToGoals}
        />
      );

    case 'build_lab_documents':
      return (
        <BuildLabDocuments
          userId={state.userId!}
          registrationId={state.registrationId!}
          teamId={state.teamId!}
          wishes={state.wishes}
          onBack={handleBackToBuildLab}
        />
      );

    case 'build_lab_prototype':
      const wishNumber = state.currentPrototypeWish || 1;
      const wishTexts = [state.wishes.wish1, state.wishes.wish2, state.wishes.wish3];
      return (
        <WishPrototypeView
          userId={state.userId!}
          registrationId={state.registrationId!}
          teamId={state.teamId!}
          wishNumber={wishNumber}
          wishText={wishTexts[wishNumber - 1] || ''}
          goals={state.goals}
          onBack={handleBackToBuildLab}
        />
      );

    default:
      return null;
  }
};
