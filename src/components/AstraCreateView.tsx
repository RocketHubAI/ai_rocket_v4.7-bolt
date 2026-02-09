import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, ChevronLeft, ChevronRight, Check,
  Loader2, AlertCircle, Bookmark, Grid3X3,
  Maximize2, Minimize2, X, RefreshCw, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { trackFeatureUsage } from '../hooks/useFeatureTracking';
import { ContentSelectionStep, DataAvailability, SelectedDocument } from './astra-create/ContentSelectionStep';
import { TypeSelectionStep } from './astra-create/TypeSelectionStep';
import { StyleSelectionStep } from './astra-create/StyleSelectionStep';
import { LayoutSelectionStep } from './astra-create/LayoutSelectionStep';
import { SlideCountStep } from './astra-create/SlideCountStep';
import { GeneratingState } from './astra-create/GeneratingState';
import { SlideViewer } from './astra-create/SlideViewer';
import { VisualizationGallery } from './astra-create/VisualizationGallery';

export type VisualizationType = 'single_image' | 'slide_presentation';
export type LayoutType = 'landscape' | 'portrait';
export type SlideCountType = 3 | 5 | 7;

export interface GeneratedSlide {
  id: string;
  slideNumber: number;
  title: string;
  content: string;
  imageUrl?: string;
  imageBase64?: string;
  bulletPoints?: string[];
  metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
}

export interface SavedVisualization {
  id: string;
  title: string;
  type: VisualizationType;
  contentTypes: string[];
  style: string;
  layout: LayoutType;
  slideCount: number;
  generatedAt: string;
  slides: GeneratedSlide[];
}

type ViewMode = 'create' | 'preview' | 'gallery';
type CreateStep = 'content' | 'type' | 'style' | 'layout' | 'slideCount' | 'generating';

const STEP_ORDER: CreateStep[] = ['content', 'type', 'style', 'layout', 'slideCount'];
const WORKSHOP_STEP_ORDER: CreateStep[] = ['type', 'style', 'layout', 'slideCount'];

interface WorkshopGoal {
  goalNumber: number;
  goalTitle: string;
  goalDescription: string;
  positiveImpact1: string;
  positiveImpact2: string;
  positiveImpact3: string;
}

interface AstraCreateViewProps {
  onClose?: () => void;
  onNavigateToLibrary?: () => void;
  onGenerationComplete?: () => void;
  workshopMode?: boolean;
  workshopGoal?: WorkshopGoal;
  workshopConversationId?: string | null;
  workshopTeamId?: string | null;
  workshopAllGoals?: WorkshopGoal[];
  onBackFromResult?: () => void;
  initialCustomContent?: string | null;
}

export default function AstraCreateView({
  onClose,
  onNavigateToLibrary,
  onGenerationComplete,
  workshopMode = false,
  workshopGoal,
  workshopConversationId,
  workshopTeamId,
  workshopAllGoals,
  onBackFromResult,
  initialCustomContent
}: AstraCreateViewProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('create');
  const [currentStep, setCurrentStep] = useState<CreateStep>(workshopMode ? 'type' : 'content');
  const [teamId, setTeamId] = useState<string | null>(workshopMode ? workshopTeamId || null : null);
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode | null>(null);

  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(initialCustomContent ? ['custom'] : []);
  const [visualizationType, setVisualizationType] = useState<VisualizationType | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [textIntegration, setTextIntegration] = useState<string>('integrated');
  const [layout, setLayout] = useState<LayoutType>('landscape');
  const [slideCount, setSlideCount] = useState<SlideCountType>(3);
  const [customPrompt, setCustomPrompt] = useState(initialCustomContent || '');
  const [selectedDocuments, setSelectedDocuments] = useState<SelectedDocument[]>([]);
  const [useTeamData, setUseTeamData] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<GeneratedSlide[]>([]);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasTrackedRef = useRef(false);
  const [dataAvailability, setDataAvailability] = useState<DataAvailability | undefined>(undefined);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_CONTENT_SELECTIONS = 3;

  useEffect(() => {
    if (workshopMode && workshopTeamId) {
      setTeamId(workshopTeamId);
      return;
    }

    if (user?.id) {
      fetchTeamId();
      loadSavedVisualizations();
      fetchDataAvailability();
      checkForPendingGenerations();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, workshopMode, workshopTeamId]);

  useEffect(() => {
    if (user?.id && !hasTrackedRef.current && viewMode === 'create') {
      trackFeatureUsage(user.id, 'astra_create');
      hasTrackedRef.current = true;
    }
  }, [user?.id, viewMode]);

  const fetchTeamId = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.team_id) {
      setTeamId(data.team_id);
    }
  };

  const fetchDataAvailability = async () => {
    if (!user?.id) return;

    try {
      const teamIdFromMeta = user.user_metadata?.team_id;
      if (!teamIdFromMeta) return;

      const { data: categoryData, error: catError } = await supabase.rpc('get_team_category_counts', {
        p_team_id: teamIdFromMeta
      });

      if (catError) {
        console.error('Error fetching category counts:', catError);
        return;
      }

      const byCategory: Record<string, number> = {};
      let total = 0;

      (categoryData || []).forEach((cat: { category: string; count: number }) => {
        byCategory[cat.category] = cat.count;
        total += cat.count;
      });

      setDataAvailability({ byCategory, total });
    } catch (err) {
      console.error('Error fetching data availability:', err);
    }
  };

  const checkForPendingGenerations = async () => {
    if (!user?.id) return;

    try {
      const teamIdFromMeta = user.user_metadata?.team_id;
      if (!teamIdFromMeta) return;

      const { data: pendingViz } = await supabase
        .from('astra_visualizations')
        .select('id, status, title, type, style, layout, content_types')
        .eq('team_id', teamIdFromMeta)
        .eq('user_id', user.id)
        .in('status', ['pending', 'generating'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingViz) {
        setPendingJobId(pendingViz.id);
        setGenerating(true);
        setCurrentStep('generating');
        setSelectedContentTypes(pendingViz.content_types || []);
        setVisualizationType(pendingViz.type);
        setSelectedStyle(pendingViz.style);
        setLayout(pendingViz.layout || 'landscape');
        startPolling(pendingViz.id);
      }
    } catch (err) {
      console.error('Error checking for pending generations:', err);
    }
  };

  const startPolling = (jobId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      await pollJobStatus(jobId);
    }, 3000);
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-astra-create-slides`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'check_status', jobId })
        }
      );

      if (!response.ok) return;

      const result = await response.json();

      if (result.status === 'complete') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setGeneratedSlides(result.slides);
        setGeneratedTitle(result.title || 'Astra Visualization');
        setGenerating(false);
        setPendingJobId(null);
        setViewMode('preview');
        loadSavedVisualizations();
        onGenerationComplete?.();
      } else if (result.status === 'error') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setError(result.error || 'Generation failed');
        setGenerating(false);
        setPendingJobId(null);
        setCurrentStep('content');
      }
    } catch (err) {
      console.error('Error polling job status:', err);
    }
  };

  const loadSavedVisualizations = async () => {
    if (!user?.id) return;
    setLoadingGallery(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.team_id) return;

      const { data: visualizations, error: vizError } = await supabase
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
        .eq('team_id', userData.team_id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(20);

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

      setSavedVisualizations(mapped);
    } catch (err) {
      console.error('Error loading visualizations:', err);
    } finally {
      setLoadingGallery(false);
    }
  };

  const stepOrder = workshopMode ? WORKSHOP_STEP_ORDER : STEP_ORDER;

  const getStepIndex = (step: CreateStep): number => {
    return stepOrder.indexOf(step);
  };

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 'content':
        return selectedContentTypes.length > 0;
      case 'type':
        return visualizationType !== null;
      case 'style':
        return selectedStyle !== null;
      case 'layout':
        return true;
      case 'slideCount':
        return true;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      let nextStep = stepOrder[currentIndex + 1];
      if (nextStep === 'slideCount' && visualizationType === 'single_image') {
        handleGenerate();
        return;
      }
      setCurrentStep(nextStep);
    } else {
      handleGenerate();
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      let prevStep = stepOrder[currentIndex - 1];
      setCurrentStep(prevStep);
    }
  };

  const toggleContentType = (contentId: string) => {
    setSelectedContentTypes(prev => {
      if (prev.includes(contentId)) {
        return prev.filter(id => id !== contentId);
      }
      if (prev.length >= MAX_CONTENT_SELECTIONS) {
        return prev;
      }
      return [...prev, contentId];
    });
  };

  const handleGenerate = async () => {
    if (!teamId || !visualizationType || !selectedStyle) return;
    if (!workshopMode && selectedContentTypes.length === 0) return;

    setCurrentStep('generating');
    setGenerating(true);
    setError(null);
    setGeneratedSlides([]);
    setSaved(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const actualSlideCount = visualizationType === 'single_image' ? 1 : slideCount;

      let workshopChatMessages: string | null = null;
      if (workshopMode && workshopConversationId) {
        const { data: chatMessages } = await supabase
          .from('astra_chats')
          .select('user_email, message')
          .eq('conversation_id', workshopConversationId)
          .order('created_at', { ascending: true });

        if (chatMessages && chatMessages.length > 0) {
          workshopChatMessages = chatMessages
            .map(m => `${m.user_email === 'astra@rockethub.ai' ? 'Astra' : 'User'}: ${m.message}`)
            .join('\n\n');
        }
      } else if (workshopMode && workshopAllGoals && workshopAllGoals.length > 0) {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          const { data: goalData } = await supabase
            .from('workshop_goals')
            .select('goal_number, goal_title, conversation_id')
            .eq('user_id', userId)
            .order('goal_number');

          if (goalData && goalData.length > 0) {
            const allMessages: string[] = [];

            for (const goal of goalData) {
              if (goal.conversation_id) {
                const { data: chatMessages } = await supabase
                  .from('astra_chats')
                  .select('user_email, message')
                  .eq('conversation_id', goal.conversation_id)
                  .order('created_at', { ascending: true });

                if (chatMessages && chatMessages.length > 0) {
                  allMessages.push(`\n--- GOAL ${goal.goal_number}: ${goal.goal_title} ---\n`);
                  allMessages.push(
                    chatMessages
                      .map(m => `${m.user_email === 'astra@rockethub.ai' ? 'Astra' : 'User'}: ${m.message}`)
                      .join('\n\n')
                  );
                }
              }
            }

            if (allMessages.length > 0) {
              workshopChatMessages = allMessages.join('\n');
            }
          }
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-astra-create-slides`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            teamId,
            contentTypes: workshopMode ? ['workshop_goal'] : selectedContentTypes,
            visualizationType,
            style: selectedStyle,
            textIntegration,
            layout,
            slideCount: actualSlideCount,
            customPrompt: customPrompt || null,
            selectedDocuments: selectedDocuments.length > 0 ? selectedDocuments.map(d => ({ id: d.id, name: d.name })) : null,
            useTeamData,
            workshopMode,
            workshopGoal: workshopMode ? workshopGoal : null,
            workshopChatMessages: workshopMode ? workshopChatMessages : null
          })
        }
      );

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        if (result.jobId) {
          setPendingJobId(result.jobId);
          startPolling(result.jobId);
          return;
        }
        throw new Error(result.error || 'Failed to generate visualization');
      }

      if (result.status === 'complete') {
        setGeneratedSlides(result.slides);
        setGeneratedTitle(result.title || 'Astra Visualization');
        setViewMode('preview');
        setSaved(true);
        setGenerating(false);
        loadSavedVisualizations();
        onGenerationComplete?.();
      } else if (result.status === 'generating' && result.jobId) {
        setPendingJobId(result.jobId);
        startPolling(result.jobId);
      } else if (result.visualizationId) {
        setPendingJobId(result.visualizationId);
        startPolling(result.visualizationId);
      }
    } catch (err: any) {
      console.error('Error generating visualization:', err);
      if (err.name === 'AbortError') {
        setError('Generation is taking longer than expected. Please check "My Visualizations" gallery - your creation may still complete in the background.');
      } else {
        setError(err.message || 'Failed to generate visualization');
      }
      setCurrentStep(workshopMode ? 'type' : 'content');
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!teamId || !user?.id || generatedSlides.length === 0) return;

    setSaving(true);
    try {
      const { data: visualization, error: vizError } = await supabase
        .from('astra_visualizations')
        .insert({
          team_id: teamId,
          user_id: user.id,
          title: generatedTitle,
          type: visualizationType,
          content_types: selectedContentTypes,
          style: selectedStyle,
          layout,
          slide_count: generatedSlides.length,
          custom_prompt: customPrompt || null
        })
        .select()
        .single();

      if (vizError) throw vizError;

      const slidesData = generatedSlides.map((slide, index) => ({
        visualization_id: visualization.id,
        slide_number: index + 1,
        title: slide.title,
        content: slide.content,
        image_url: slide.imageUrl,
        image_base64: slide.imageBase64,
        bullet_points: slide.bulletPoints,
        metrics: slide.metrics
      }));

      const { error: slidesError } = await supabase
        .from('astra_visualization_slides')
        .insert(slidesData);

      if (slidesError) throw slidesError;

      setSaved(true);
      loadSavedVisualizations();
    } catch (err: any) {
      console.error('Error saving visualization:', err);
      setError(err.message || 'Failed to save visualization');
    } finally {
      setSaving(false);
    }
  };

  const handleStartOver = (exitWorkshop: boolean = false) => {
    if (workshopMode && exitWorkshop && onBackFromResult) {
      onBackFromResult();
      return;
    }
    setViewMode('create');
    setCurrentStep(workshopMode ? 'type' : 'content');
    setSelectedContentTypes([]);
    setVisualizationType(null);
    setSelectedStyle(null);
    setTextIntegration('integrated');
    setLayout('landscape');
    setSlideCount(3);
    setCustomPrompt('');
    setSelectedDocuments([]);
    setGeneratedSlides([]);
    setGeneratedTitle('');
    setError(null);
    setSaved(false);
    setPreviousViewMode(null);
  };

  const handleViewGallery = () => {
    if (onNavigateToLibrary) {
      onNavigateToLibrary();
    } else {
      setPreviousViewMode(viewMode);
      setViewMode('gallery');
    }
  };

  const handleBackFromGallery = () => {
    if (previousViewMode === 'preview' && generatedSlides.length > 0) {
      setViewMode('preview');
    } else {
      setViewMode('create');
    }
    setPreviousViewMode(null);
  };

  const handleViewSaved = (visualization: SavedVisualization) => {
    setGeneratedSlides(visualization.slides);
    setGeneratedTitle(visualization.title);
    setSelectedContentTypes(visualization.contentTypes);
    setVisualizationType(visualization.type);
    setSelectedStyle(visualization.style);
    setLayout(visualization.layout);
    setSlideCount(visualization.slideCount as SlideCountType);
    setSaved(true);
    setPreviousViewMode(null);
    setViewMode('preview');
  };

  const handleDeleteVisualization = async (id: string) => {
    try {
      const { error } = await supabase
        .from('astra_visualizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSavedVisualizations();
    } catch (err) {
      console.error('Error deleting visualization:', err);
    }
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'content': return 'Select Content';
      case 'type': return 'Choose Type';
      case 'style': return 'Select Style';
      case 'layout': return 'Choose Layout';
      case 'slideCount': return 'Number of Slides';
      case 'generating': return 'Creating...';
      default: return '';
    }
  };

  const getStepDescription = (): string => {
    switch (currentStep) {
      case 'content': return `Choose up to ${MAX_CONTENT_SELECTIONS} content types to include`;
      case 'type': return 'Single image or multi-slide presentation?';
      case 'style': return 'Pick a visual style for your creation';
      case 'layout': return 'Choose orientation for your visualization';
      case 'slideCount': return 'How many slides in your presentation?';
      default: return '';
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'content':
        return (
          <ContentSelectionStep
            selectedTypes={selectedContentTypes}
            onToggle={toggleContentType}
            maxSelections={MAX_CONTENT_SELECTIONS}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
            dataAvailability={dataAvailability}
            selectedDocuments={selectedDocuments}
            onSelectedDocumentsChange={setSelectedDocuments}
            useTeamData={useTeamData}
            onUseTeamDataChange={setUseTeamData}
          />
        );
      case 'type':
        return (
          <TypeSelectionStep
            selectedType={visualizationType}
            onSelect={setVisualizationType}
          />
        );
      case 'style':
        return (
          <StyleSelectionStep
            visualizationType={visualizationType!}
            selectedStyle={selectedStyle}
            onSelect={setSelectedStyle}
            textIntegration={textIntegration}
            onTextIntegrationChange={setTextIntegration}
          />
        );
      case 'layout':
        return (
          <LayoutSelectionStep
            selectedLayout={layout}
            onSelect={setLayout}
          />
        );
      case 'slideCount':
        return (
          <SlideCountStep
            selectedCount={slideCount}
            onSelect={setSlideCount}
          />
        );
      case 'generating':
        return <GeneratingState isPresentation={visualizationType === 'slide_presentation'} slideCount={slideCount} />;
      default:
        return null;
    }
  };

  if (viewMode === 'gallery') {
    return (
      <div className="h-full bg-gray-900 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackFromGallery}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">My Visualizations</h1>
                <p className="text-sm text-gray-400">{savedVisualizations.length} saved items</p>
              </div>
            </div>

            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>

          <VisualizationGallery
            visualizations={savedVisualizations}
            loading={loadingGallery}
            onView={handleViewSaved}
            onDelete={handleDeleteVisualization}
          />
        </div>
      </div>
    );
  }

  if (viewMode === 'preview' && generatedSlides.length > 0) {
    return (
      <div className={`bg-gray-900 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStartOver(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{generatedTitle}</h1>
              <p className="text-xs text-gray-400">
                {generatedSlides.length} slide{generatedSlides.length !== 1 ? 's' : ''} - {selectedStyle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartOver(false)}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Create New
            </button>
            <button
              onClick={handleViewGallery}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              Gallery
              {savedVisualizations.length > 0 && (
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                  {savedVisualizations.length}
                </span>
              )}
            </button>
            {!saved && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            {saved && (
              <span className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <SlideViewer
          slides={generatedSlides}
          layout={layout}
          isFullscreen={isFullscreen}
          visualizationType={visualizationType || undefined}
          title={generatedTitle}
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Creative Suite</h1>
                <p className="text-sm text-gray-400">Images & Presentations</p>
              </div>
            </div>

            <button
              onClick={handleViewGallery}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              My Visualizations
              {savedVisualizations.length > 0 && (
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                  {savedVisualizations.length}
                </span>
              )}
            </button>
          </div>

          {currentStep !== 'generating' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                {stepOrder.map((step, index) => {
                  if (step === 'slideCount' && visualizationType === 'single_image') return null;
                  const isActive = step === currentStep;
                  const isCompleted = getStepIndex(currentStep) > index;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500 text-white'
                          : isCompleted
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-gray-800 text-gray-500'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      {index < stepOrder.length - 1 && !(step === 'layout' && visualizationType === 'single_image') && (
                        <div className={`w-8 h-0.5 ${isCompleted ? 'bg-cyan-500/50' : 'bg-gray-700'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-white">{getStepTitle()}</h2>
                  <p className="text-sm text-gray-400">{getStepDescription()}</p>
                </div>
                <div className="text-sm text-gray-500">
                  Step {getStepIndex(currentStep) + 1} of {workshopMode ? (visualizationType === 'single_image' ? 3 : 4) : (visualizationType === 'single_image' ? 4 : 5)}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            {renderCurrentStep()}
          </div>
        </div>
      </div>

      {currentStep !== 'generating' && (
        <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-[900px] mx-auto flex items-center justify-between">
            <button
              onClick={goToPreviousStep}
              disabled={currentStep === 'content'}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={goToNextStep}
              disabled={!canProceedToNextStep()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
            >
              {currentStep === 'slideCount' || (currentStep === 'layout' && visualizationType === 'single_image') ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
