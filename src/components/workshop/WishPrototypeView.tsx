import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  Download,
  Loader2,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Bot,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  Wand2,
  Check,
  X,
  Copy,
  Settings,
  Lightbulb
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BuildLabChat } from './BuildLabChat';
import type { Goal } from './WorkshopMindsetJourney';

interface BuildStep {
  stepNumber: number;
  title: string;
  description: string;
  details: string[];
  tips: string[];
  timeEstimate: string;
}

interface AdvancedOption {
  tool: string;
  description: string;
  useCase: string;
  setupSteps: string[];
}

interface PlatformBuildPlan {
  platform: 'claude' | 'chatgpt';
  overview: string;
  steps: BuildStep[];
  advancedOptions: AdvancedOption[];
  customInstructions: string;
  knowledgeFiles: string[];
}

interface UseCase {
  title: string;
  description: string;
  outcome: string;
  icon: string;
}

interface Summary {
  whatItDoes: string;
  howItWorks: string;
  keyBenefits: string[];
}

interface ToolPlanner {
  id: string;
  wishNumber: number;
  wishText: string;
  prototypeTitle: string | null;
  summary: Summary | null;
  useCases: UseCase[];
  status: 'pending' | 'generating' | 'ready' | 'error';
  errorMessage: string | null;
  claudeBuildPlan: PlatformBuildPlan | null;
  chatgptBuildPlan: PlatformBuildPlan | null;
  starterPrompts: string[];
}

interface WishPrototypeViewProps {
  userId: string;
  registrationId: string;
  teamId: string;
  wishNumber: number;
  wishText: string;
  goals: Goal[];
  onBack: () => void;
}

type PlatformTab = 'claude' | 'chatgpt';

export const WishPrototypeView: React.FC<WishPrototypeViewProps> = ({
  userId,
  registrationId,
  wishNumber,
  wishText: propsWishText,
  goals,
  onBack
}) => {
  const [toolPlanner, setToolPlanner] = useState<ToolPlanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [wishText, setWishText] = useState(propsWishText);
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('claude');
  const [showChat, setShowChat] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [expandedAdvanced, setExpandedAdvanced] = useState<Set<number>>(new Set());
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [generatingPlatform, setGeneratingPlatform] = useState<PlatformTab | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState<{ platform: PlatformTab; plan: PlatformBuildPlan } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: prototypeData } = await supabase
        .from('build_lab_prototypes')
        .select('*')
        .eq('user_id', userId)
        .eq('wish_number', wishNumber)
        .maybeSingle();

      if (prototypeData) {
        // Update wishText from database if it exists
        if (prototypeData.wish_text && prototypeData.wish_text.trim()) {
          setWishText(prototypeData.wish_text);
        }

        setToolPlanner({
          id: prototypeData.id,
          wishNumber: prototypeData.wish_number,
          wishText: prototypeData.wish_text,
          prototypeTitle: prototypeData.prototype_title,
          summary: prototypeData.summary || null,
          useCases: prototypeData.use_cases || [],
          status: prototypeData.status,
          errorMessage: prototypeData.error_message,
          claudeBuildPlan: prototypeData.claude_build_plan || null,
          chatgptBuildPlan: prototypeData.chatgpt_build_plan || null,
          starterPrompts: prototypeData.starter_prompts || []
        });
      }
    } catch (err) {
      console.error('Error loading tool planner data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, wishNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Update wishText if props change
    if (propsWishText && propsWishText.trim()) {
      setWishText(propsWishText);
    }
  }, [propsWishText]);

  useEffect(() => {
    if (toolPlanner?.status === 'generating') {
      const channel = supabase
        .channel(`prototype-${toolPlanner.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'build_lab_prototypes',
          filter: `id=eq.${toolPlanner.id}`
        }, (payload) => {
          const updated = payload.new as any;
          if (updated.status === 'ready' || updated.status === 'error') {
            loadData();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [toolPlanner?.id, toolPlanner?.status, loadData]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const { data: existingPrototype } = await supabase
        .from('build_lab_prototypes')
        .select('id')
        .eq('user_id', userId)
        .eq('wish_number', wishNumber)
        .maybeSingle();

      let prototypeId: string;

      if (existingPrototype) {
        prototypeId = existingPrototype.id;
        await supabase
          .from('build_lab_prototypes')
          .update({
            status: 'generating',
            generation_started_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', prototypeId);
      } else {
        const { data: newPrototype, error } = await supabase
          .from('build_lab_prototypes')
          .insert({
            user_id: userId,
            registration_id: registrationId,
            wish_number: wishNumber,
            wish_text: wishText,
            status: 'generating',
            generation_started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        prototypeId = newPrototype.id;
      }

      setToolPlanner(prev => ({
        id: prototypeId,
        wishNumber,
        wishText,
        prototypeTitle: prev?.prototypeTitle || null,
        summary: null,
        useCases: [],
        status: 'generating',
        errorMessage: null,
        claudeBuildPlan: null,
        chatgptBuildPlan: null,
        starterPrompts: []
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wish-prototype`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prototypeId,
            wishNumber,
            wishText,
            goals: goals.map(g => ({
              title: g.goalTitle,
              description: g.goalDescription,
              impacts: [g.positiveImpact1, g.positiveImpact2, g.positiveImpact3]
            }))
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation failed: ${errorText}`);
      }

      await loadData();
    } catch (err: any) {
      console.error('Error generating plan:', err);
      setToolPlanner(prev => prev ? { ...prev, status: 'error', errorMessage: err.message } : null);
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePlatformPlan = async (platform: PlatformTab) => {
    if (!toolPlanner) return;

    setGeneratingPlatform(platform);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      console.log(`Generating ${platform} plan for prototype ${toolPlanner.id}`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wish-prototype`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'generate-platform-plan',
            prototypeId: toolPlanner.id,
            platform,
            goals: goals.map(g => ({
              title: g.goalTitle,
              description: g.goalDescription,
              impacts: [g.positiveImpact1, g.positiveImpact2, g.positiveImpact3]
            }))
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to generate ${platform} plan:`, errorText);
        throw new Error(`Failed to generate ${platform} plan: ${errorText}`);
      }

      const result = await response.json();
      console.log(`${platform} plan generated successfully:`, result);

      // Validate that we got a valid plan
      if (!result.plan) {
        console.error(`No plan in response for ${platform}:`, result);
        throw new Error('Invalid response: missing plan data');
      }

      // Update local state with the new platform plan
      setToolPlanner(prev => prev ? {
        ...prev,
        [platform === 'claude' ? 'claudeBuildPlan' : 'chatgptBuildPlan']: result.plan
      } : null);

      console.log(`${platform} build plan updated in state successfully`);
    } catch (err: any) {
      console.error(`Error generating ${platform} plan:`, err);
      alert(`Failed to generate ${platform} plan: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingPlatform(null);
    }
  };

  const handleRegenerate = async () => {
    if (!toolPlanner || !regenerateInstructions.trim()) return;

    setRegenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      await supabase
        .from('build_lab_prototypes')
        .update({
          status: 'generating',
          customization_instructions: regenerateInstructions
        })
        .eq('id', toolPlanner.id);

      setToolPlanner(prev => prev ? { ...prev, status: 'generating' } : null);
      setShowRegenerateModal(false);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wish-prototype`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prototypeId: toolPlanner.id,
            wishNumber,
            wishText,
            customizationInstructions: regenerateInstructions,
            goals: goals.map(g => ({
              title: g.goalTitle,
              description: g.goalDescription,
              impacts: [g.positiveImpact1, g.positiveImpact2, g.positiveImpact3]
            }))
          })
        }
      );

      if (!response.ok) {
        throw new Error('Regeneration failed');
      }

      await loadData();
      setRegenerateInstructions('');
    } catch (err) {
      console.error('Error regenerating:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportGuidance = async (platform: PlatformTab) => {
    const plan = platform === 'claude' ? toolPlanner?.claudeBuildPlan : toolPlanner?.chatgptBuildPlan;
    if (!plan || !toolPlanner) return;

    // Show setup guide modal first
    setShowSetupGuide({ platform, plan });
  };

  const handleDownloadBlueprint = async (platform: PlatformTab) => {
    const plan = platform === 'claude' ? toolPlanner?.claudeBuildPlan : toolPlanner?.chatgptBuildPlan;
    if (!plan || !toolPlanner) return;

    const platformName = platform === 'claude' ? 'Claude Project' : 'Custom GPT';
    const toolTitle = toolPlanner.prototypeTitle || 'AI Tool';

    let markdown = `# ${toolTitle} - Project Knowledge\n\n`;
    markdown += `> **Note:** This document should be uploaded to your ${platformName} as Project Knowledge. The custom instructions have already been added to your project setup.\n\n`;
    markdown += `---\n\n`;
    markdown += `## Tool Overview\n\n`;
    markdown += `${plan.overview}\n\n`;

    if (toolPlanner.summary) {
      markdown += `### What It Does\n${toolPlanner.summary.whatItDoes}\n\n`;
      markdown += `### How It Works\n${toolPlanner.summary.howItWorks}\n\n`;
      if (toolPlanner.summary.keyBenefits?.length > 0) {
        markdown += `### Key Benefits\n`;
        toolPlanner.summary.keyBenefits.forEach(benefit => {
          markdown += `- ${benefit}\n`;
        });
        markdown += `\n`;
      }
    }

    markdown += `---\n\n`;
    markdown += `## Implementation Guide\n\n`;

    plan.steps.forEach((step, i) => {
      markdown += `### Step ${i + 1}: ${step.title}\n`;
      markdown += `*Estimated time: ${step.timeEstimate}*\n\n`;
      markdown += `${step.description}\n\n`;
      markdown += `**Details:**\n`;
      step.details.forEach(detail => {
        markdown += `- ${detail}\n`;
      });
      if (step.tips.length > 0) {
        markdown += `\n**Pro Tips:**\n`;
        step.tips.forEach(tip => {
          markdown += `- ${tip}\n`;
        });
      }
      markdown += `\n`;
    });

    if (plan.advancedOptions.length > 0) {
      markdown += `---\n\n`;
      markdown += `## Advanced Integration Options\n\n`;
      markdown += `These integrations can extend your tool's capabilities:\n\n`;
      plan.advancedOptions.forEach(option => {
        markdown += `### ${option.tool}\n`;
        markdown += `${option.description}\n\n`;
        markdown += `**When to use:** ${option.useCase}\n\n`;
        markdown += `**Setup Steps:**\n`;
        option.setupSteps.forEach((step, i) => {
          markdown += `${i + 1}. ${step}\n`;
        });
        markdown += `\n`;
      });
    }

    markdown += `---\n\n`;
    markdown += `## Additional Knowledge Files\n\n`;
    markdown += `Consider adding these types of files to enhance your ${platformName}:\n\n`;
    plan.knowledgeFiles.forEach(file => {
      markdown += `- ${file}\n`;
    });
    markdown += `\n---\n\n`;
    markdown += `*Generated by RocketHub Build Lab*\n`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${platform}-knowledge.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await markExported(platform);
    setShowSetupGuide(null);
  };

  const handleCopyInstructions = (instructions: string) => {
    navigator.clipboard.writeText(instructions);
    setCopiedInstructions(true);
    setTimeout(() => setCopiedInstructions(false), 2000);
  };

  const handleCopyPrompt = (prompt: string, index: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(index);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAdvanced = (index: number) => {
    setExpandedAdvanced(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const markExported = async (platform: PlatformTab) => {
    if (!toolPlanner) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wish-prototype`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'mark-exported',
            prototypeId: toolPlanner.id,
            platform
          })
        }
      );
    } catch (err) {
      console.error('Error marking export:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const isGenerating = toolPlanner?.status === 'generating' || generating;
  const isReady = toolPlanner?.status === 'ready';
  const currentPlan = activePlatform === 'claude' ? toolPlanner?.claudeBuildPlan : toolPlanner?.chatgptBuildPlan;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-cyan-400 uppercase tracking-wider">Build Plan {wishNumber}</p>
              <h1 className="font-semibold text-white">
                {toolPlanner?.prototypeTitle || 'AI Tool Plan'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isReady && (
              <>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    showChat
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className={`flex-1 flex flex-col overflow-hidden ${showChat ? 'lg:w-2/3' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto p-4">
            {!toolPlanner || toolPlanner.status === 'pending' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  {!wishText || wishText.trim() === '' ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-amber-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white mb-2">No Tool Idea Entered Yet</h2>
                      <p className="text-gray-400 mb-6">
                        You need to enter your AI tool ideas first before generating a plan.
                      </p>
                      <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all mx-auto"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Go Back
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-3">Create Your Build Plan</h2>
                      <p className="text-gray-400 mb-8">
                        Astra will create step-by-step guides for building this tool with both Claude Projects and Custom GPT.
                      </p>
                      <button
                        onClick={handleGeneratePlan}
                        disabled={generating}
                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all mx-auto disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate Build Plan
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : toolPlanner.status === 'generating' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">Creating Your Build Plans</h2>
                  <p className="text-gray-400">
                    Astra is researching best practices and building guides for Claude and ChatGPT...
                  </p>
                </div>
              </div>
            ) : toolPlanner.status === 'error' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Generation Failed</h2>
                  <p className="text-gray-400 mb-4">
                    {toolPlanner.errorMessage || 'An error occurred while generating your build plan.'}
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {toolPlanner.summary && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">{toolPlanner.prototypeTitle}</h2>
                        <p className="text-gray-400 text-sm">AI Tool Overview</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-2">What It Does</h3>
                        <p className="text-gray-300">{toolPlanner.summary.whatItDoes}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-2">How It Works</h3>
                        <p className="text-gray-300">{toolPlanner.summary.howItWorks}</p>
                      </div>

                      {toolPlanner.summary.keyBenefits?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-2">Key Benefits</h3>
                          <div className="grid gap-2">
                            {toolPlanner.summary.keyBenefits.map((benefit, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span className="text-gray-300">{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-700">
                    <button
                      onClick={() => setActivePlatform('claude')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-colors ${
                        activePlatform === 'claude'
                          ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-b-2 border-amber-500'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">C</span>
                      </div>
                      Build with Claude
                    </button>
                    <button
                      onClick={() => setActivePlatform('chatgpt')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-colors ${
                        activePlatform === 'chatgpt'
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-b-2 border-green-500'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                      Build with ChatGPT
                    </button>
                  </div>

                  <div className="p-6">
                    {generatingPlatform === activePlatform ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Generating {activePlatform === 'claude' ? 'Claude' : 'ChatGPT'} Build Plan
                        </h3>
                        <p className="text-gray-400 text-sm text-center max-w-md">
                          Creating your customized step-by-step guide with instructions and advanced integration options...
                        </p>
                      </div>
                    ) : currentPlan && currentPlan.steps && currentPlan.steps.length > 0 ? (
                      <div className="space-y-6">
                        {/* Custom Instructions Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-medium flex items-center gap-2">
                              <Settings className="w-4 h-4 text-cyan-400" />
                              Custom Instructions
                            </h3>
                            <button
                              onClick={() => handleCopyInstructions(currentPlan.customInstructions)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                            >
                              {copiedInstructions ? (
                                <>
                                  <Check className="w-4 h-4 text-green-400" />
                                  <span className="text-green-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm whitespace-pre-wrap overflow-x-auto max-h-48 font-mono">
                            {currentPlan.customInstructions}
                          </pre>
                        </div>

                        {/* Knowledge Files Section */}
                        {currentPlan.knowledgeFiles.length > 0 && (
                          <div>
                            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-cyan-400" />
                              Recommended Knowledge Files
                            </h3>
                            <div className="grid gap-2 md:grid-cols-2">
                              {currentPlan.knowledgeFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-3 py-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  <span className="text-gray-300 text-sm">{file}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Platform Overview */}
                        <div className="flex items-start gap-3 bg-gray-900/50 rounded-lg p-4">
                          <Lightbulb className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <p className="text-gray-300 text-sm">{currentPlan.overview}</p>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-cyan-400" />
                            Step-by-Step Guide
                          </h3>
                          <div className="space-y-3">
                            {currentPlan.steps.map((step, i) => {
                              const isExpanded = expandedSteps.has(i);
                              return (
                                <div
                                  key={i}
                                  className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden"
                                >
                                  <button
                                    onClick={() => toggleStep(i)}
                                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-700/30 transition-colors"
                                  >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      activePlatform === 'claude'
                                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                                        : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                                    }`}>
                                      <span className={`font-bold ${
                                        activePlatform === 'claude' ? 'text-amber-400' : 'text-green-400'
                                      }`}>{i + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-white font-medium">{step.title}</h4>
                                      <p className="text-gray-400 text-sm">{step.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-gray-500 text-xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {step.timeEstimate}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                      )}
                                    </div>
                                  </button>

                                  {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-700">
                                      <div className="pt-4 pl-14 space-y-3">
                                        <ul className="space-y-2">
                                          {step.details.map((detail, j) => (
                                            <li key={j} className="flex items-start gap-2 text-gray-300">
                                              <ArrowRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                                activePlatform === 'claude' ? 'text-amber-400' : 'text-green-400'
                                              }`} />
                                              {detail}
                                            </li>
                                          ))}
                                        </ul>
                                        {step.tips.length > 0 && (
                                          <div className="bg-gray-800 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Zap className="w-4 h-4 text-amber-400" />
                                              <span className="text-sm font-medium text-amber-400">Pro Tips</span>
                                            </div>
                                            <ul className="space-y-1">
                                              {step.tips.map((tip, j) => (
                                                <li key={j} className="flex items-start gap-2 text-gray-400 text-sm">
                                                  <span className="text-cyan-400">-</span>
                                                  {tip}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {currentPlan.advancedOptions.length > 0 && (
                          <div className="border-t border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                              <Settings className="w-5 h-5 text-cyan-400" />
                              Advanced Options
                            </h3>
                            <div className="space-y-3">
                              {currentPlan.advancedOptions.map((option, i) => {
                                const isExpanded = expandedAdvanced.has(i);
                                return (
                                  <div
                                    key={i}
                                    className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden"
                                  >
                                    <button
                                      onClick={() => toggleAdvanced(i)}
                                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-700/30 transition-colors"
                                    >
                                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-5 h-5 text-cyan-400" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="text-white font-medium">{option.tool}</h4>
                                        <p className="text-gray-400 text-sm">{option.description}</p>
                                      </div>
                                      {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                      )}
                                    </button>

                                    {isExpanded && (
                                      <div className="px-4 pb-4 border-t border-gray-700">
                                        <div className="pt-4 pl-14 space-y-3">
                                          <div>
                                            <span className="text-cyan-400 text-sm font-medium">When to use:</span>
                                            <p className="text-gray-300 text-sm mt-1">{option.useCase}</p>
                                          </div>
                                          <div>
                                            <span className="text-cyan-400 text-sm font-medium">Setup Steps:</span>
                                            <ol className="mt-2 space-y-2">
                                              {option.setupSteps.map((step, j) => (
                                                <li key={j} className="flex items-start gap-2 text-gray-300 text-sm">
                                                  <span className="text-cyan-400 font-medium">{j + 1}.</span>
                                                  {step}
                                                </li>
                                              ))}
                                            </ol>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-gray-700">
                          <button
                            onClick={() => handleExportGuidance(activePlatform)}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                              activePlatform === 'claude'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                            }`}
                          >
                            <Download className="w-5 h-5" />
                            Export {activePlatform === 'claude' ? 'Claude' : 'ChatGPT'} Guide
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        {generatingPlatform === activePlatform ? (
                          <>
                            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">
                              Creating Your {activePlatform === 'claude' ? 'Claude' : 'ChatGPT'} Plan
                            </h3>
                            <p className="text-gray-400">
                              Astra is researching best practices and building your guide...
                            </p>
                          </>
                        ) : (
                          <>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                              activePlatform === 'claude'
                                ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                                : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                            }`}>
                              <Sparkles className={`w-8 h-8 ${
                                activePlatform === 'claude' ? 'text-amber-400' : 'text-green-400'
                              }`} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                              Ready to Build with {activePlatform === 'claude' ? 'Claude' : 'ChatGPT'}?
                            </h3>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                              Generate a step-by-step guide for building this tool with {activePlatform === 'claude' ? 'Claude Projects' : 'Custom GPT'}.
                            </p>
                            <button
                              onClick={() => handleGeneratePlatformPlan(activePlatform)}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all mx-auto ${
                                activePlatform === 'claude'
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                              }`}
                            >
                              <Sparkles className="w-5 h-5" />
                              Generate {activePlatform === 'claude' ? 'Claude' : 'ChatGPT'} Plan
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Starter Prompts Section */}
                {toolPlanner.starterPrompts && toolPlanner.starterPrompts.length > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-cyan-400" />
                      Recommended Starter Prompts
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Use these prompts to get started with your {activePlatform === 'claude' ? 'Claude Project' : 'Custom GPT'}:
                    </p>
                    <div className="space-y-3">
                      {toolPlanner.starterPrompts.map((prompt, i) => (
                        <div
                          key={i}
                          className="bg-gray-900/50 rounded-lg p-4 flex items-start gap-3 group hover:bg-gray-900/70 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            activePlatform === 'claude'
                              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                              : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                          }`}>
                            <span className={`font-semibold text-sm ${
                              activePlatform === 'claude' ? 'text-amber-400' : 'text-green-400'
                            }`}>{i + 1}</span>
                          </div>
                          <p className="text-gray-300 text-sm flex-1">{prompt}</p>
                          <button
                            onClick={() => handleCopyPrompt(prompt, i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-1"
                          >
                            {copiedPrompt === i ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-400 text-xs">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {showChat && isReady && toolPlanner && (
          <>
            <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/95 flex flex-col">
              <BuildLabChat
                userId={userId}
                prototypeId={toolPlanner.id}
                wishNumber={wishNumber}
                wishText={wishText}
                prototypeContext={{
                  title: toolPlanner.prototypeTitle || '',
                  summary: toolPlanner.summary,
                  claudePlan: toolPlanner.claudeBuildPlan,
                  chatgptPlan: toolPlanner.chatgptBuildPlan
                }}
                onClose={() => setShowChat(false)}
              />
            </div>
            <aside className="hidden lg:block w-1/3 border-l border-gray-700 bg-gray-800/50">
              <BuildLabChat
                userId={userId}
                prototypeId={toolPlanner.id}
                wishNumber={wishNumber}
                wishText={wishText}
                prototypeContext={{
                  title: toolPlanner.prototypeTitle || '',
                  summary: toolPlanner.summary,
                  claudePlan: toolPlanner.claudeBuildPlan,
                  chatgptPlan: toolPlanner.chatgptBuildPlan
                }}
                onClose={() => setShowChat(false)}
              />
            </aside>
          </>
        )}
      </div>

      {showSetupGuide && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl my-8 max-h-[calc(100vh-4rem)]">
            <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
              <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Setup Instructions</h2>
                    <p className="text-gray-400 text-sm">Follow these steps to create your {showSetupGuide.platform === 'claude' ? 'Claude Project' : 'Custom GPT'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSetupGuide(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl p-5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-cyan-400 font-semibold text-base mb-1.5">Important: Paid Subscription Required</p>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        You need a {showSetupGuide.platform === 'claude' ? 'Claude Pro subscription' : 'ChatGPT Plus or Enterprise subscription'} to create {showSetupGuide.platform === 'claude' ? 'Projects' : 'Custom GPTs'}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-md">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      Create a New {showSetupGuide.platform === 'claude' ? 'Claude Project' : 'Custom GPT'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">
                      Go to {showSetupGuide.platform === 'claude' ? 'Claude.ai' : 'ChatGPT'} and create a new {showSetupGuide.platform === 'claude' ? 'Project' : 'Custom GPT'}.
                    </p>
                    <a
                      href={showSetupGuide.platform === 'claude' ? 'https://claude.ai' : 'https://chat.openai.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      Open {showSetupGuide.platform === 'claude' ? 'Claude' : 'ChatGPT'}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-md">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Give it a Name and Description</h3>
                    <div className="bg-gray-900/50 rounded-lg p-3 text-sm space-y-2">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="text-white font-medium">{toolPlanner?.prototypeTitle || 'AI Tool'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <p className="text-gray-300">{toolPlanner?.summary?.whatItDoes || 'An AI-powered tool to help with your business needs.'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-md">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Copy and Paste the Project Instructions</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      Add these custom instructions to your {showSetupGuide.platform === 'claude' ? 'Project' : 'GPT'}:
                    </p>
                    <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-700">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                        {showSetupGuide.plan.customInstructions}
                      </pre>
                    </div>
                    <button
                      onClick={() => handleCopyInstructions(showSetupGuide.plan.customInstructions)}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                    >
                      {copiedInstructions ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Instructions
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-md">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Download and Upload the Knowledge File</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Click the button below to download the knowledge document, then upload it to your {showSetupGuide.platform === 'claude' ? 'Project Knowledge' : 'GPT Knowledge'}.
                    </p>
                    <button
                      onClick={() => handleDownloadBlueprint(showSetupGuide.platform)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-lg font-medium transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download Knowledge File
                    </button>
                  </div>
                </div>
              </div>

                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <h4 className="font-medium text-white mb-2">What's Next?</h4>
                  <p className="text-gray-400 text-sm">
                    After completing these steps, your {showSetupGuide.platform === 'claude' ? 'Claude Project' : 'Custom GPT'} will be ready to use. Test it with a few queries to make sure it's working as expected, and refine as needed!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Regenerate Tool Concept</h2>
                  <p className="text-gray-400 text-sm">Provide instructions to create a new version</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4 text-sm text-gray-400">
                <p className="mb-2">Describe how you want the tool concept changed:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li><span className="text-cyan-400">Focus</span> - Change the main purpose or functionality</li>
                  <li><span className="text-cyan-400">Features</span> - Add or remove specific capabilities</li>
                  <li><span className="text-cyan-400">Approach</span> - Adjust the implementation strategy</li>
                </ul>
              </div>

              <textarea
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                placeholder="Examples:
- Make this tool focus more on automation rather than analysis
- Change it to a customer service assistant instead
- Add integration with email marketing platforms
- Focus on financial tracking and reporting features..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
              />

              <div className="mt-4 flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={!regenerateInstructions.trim() || regenerating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Regenerate Tool
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
