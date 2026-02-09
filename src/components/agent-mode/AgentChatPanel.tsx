import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Bot, User, ChevronLeft, ChevronRight,
  MoreVertical, Trash2, RefreshCw, Rocket, ArrowRight,
  Database, Sparkles, Settings2, Shield, ChevronDown, LogOut,
  Flame, Zap, FileText, MessageSquare
} from 'lucide-react';
import { useAgentConversation, AgentMessage, AgentAction } from '../../hooks/useAgentConversation';
import { useTeamAgent } from '../../hooks/useTeamAgent';
import { useUserAssistantPreferences } from '../../hooks/useUserAssistantPreferences';
import { useAgentAppContext } from '../../contexts/AgentAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  generateAgentResponse,
  generateGreeting,
  isDataQuery,
  extractContextFromMessage,
  AgentContext,
  DynamicSuggestion
} from '../../lib/agent-gemini-service';
import InsightFeedbackModal from './InsightFeedbackModal';

interface AgentChatPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onAction?: (action: AgentAction) => void;
  onDataQuery?: (query: string) => Promise<string>;
  hideHeader?: boolean;
}

type OnboardingPhase = 'awaiting_name' | 'priorities' | 'preferences' | 'education' | 'sync_check' | 'tutorial' | 'live';

interface OnboardingData {
  phase: OnboardingPhase;
  prioritiesCollected: string[];
  preferencesCollected: string[];
  questionCount: number;
  educationViewed: string[];
  tutorialOffset: number;
  allImpactItems: ImpactSuggestion[];
}

interface ImpactSuggestion {
  feature_key: string;
  feature_name: string;
  feature_description: string;
  action_type: string | null;
  action_target: string | null;
}

const WELCOME_MESSAGE = `Hi there! I'm your team's AI assistant, here to help you get the most out of AI Rocket.

Before we dive in, what would you like to call me?`;

interface SuggestionItem {
  id: string;
  label: string;
  description: string;
  icon?: string;
  action?: { type: 'trigger_sync' | 'navigate'; target: string };
  prompt?: string;
  startPreferences?: boolean;
}

const SCREEN_CONTEXT_MESSAGES: Record<string, string> = {
  'fuel-stage': `Great choice! This is where you can sync your documents to power up AI Rocket.

To get started:
- Click "Add Local Files" to upload documents directly
- Click "Add or Manage" to connect your Google Drive or OneDrive

Once you sync some documents, I'll be able to help you find information, generate reports, and answer questions about your team's content.`,
  'reports': `This is the AI Reports feature where you can generate insights from your synced data.

To create a report:
- Click the "+ New Report" button
- Choose a report template or describe what you want to analyze
- I'll generate a detailed report based on your team's documents

You can also schedule reports to run automatically!`,
  'team': `Welcome to Team Chat! This is where your team can collaborate together.

You can:
- Have group discussions with your team members
- Share insights and updates
- Use @mentions to tag specific people

It's a great place for team-wide communication!`,
  'visualizations': `This is your Visualization Library where all your saved charts, reports, and presentations live.

To create a new visualization:
- Ask me to create a chart, graph, or visual from your data in this chat
- I'll generate it and you can save it here
- You can also filter by Reports, Images, or Presentations using the tabs above`,
  'team-dashboard': `This is your Team Dashboard - a daily snapshot of your team's progress and health.

The dashboard shows:
- Goal progress and alignment
- Key metrics and KPIs
- Recent activity highlights

Check back daily for fresh insights!`,
  'creative-suite': `Welcome to the Creative Suite! This is where you can create AI-powered presentations and infographics.

To get started:
- Choose a content type to create
- Select your style and preferences
- I'll generate professional visuals for you!`
};

const EDUCATION_SUGGESTIONS: SuggestionItem[] = [
  {
    id: 'education-capabilities',
    label: 'What can I do for you and how do I work?',
    description: 'Learn about my capabilities, tools, and how I can help your team',
    icon: 'Sparkles'
  },
  {
    id: 'education-security',
    label: 'How do I keep your data safe and private?',
    description: 'Understand how your data is protected and our privacy practices',
    icon: 'Shield'
  },
  {
    id: 'education-skip',
    label: 'Skip this and get started!',
    description: 'Jump right in and start using the platform',
    icon: 'ArrowRight'
  }
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Sparkles,
  Settings2,
  ArrowRight,
  Shield
};

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
  is_new_day: boolean;
  docs_changed: number;
  days_away: number;
}

function getTimeAwareGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}!`;
  if (hour < 17) return `Good afternoon, ${name}!`;
  return `Good evening, ${name}!`;
}

function getTimeAwareSuggestion(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'Start your day with a quick review of action items from recent meetings?';
  if (hour < 14) return 'Want a mid-day check on your team\'s progress toward goals?';
  if (hour < 17) return 'Want a summary of what happened today to wrap up your afternoon?';
  return 'Review tomorrow\'s priorities before you head out?';
}

function cleanRawJsonMessage(text: string): string {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return text;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.message && typeof parsed.message === 'string') return parsed.message;
  } catch {
    const msgMatch = trimmed.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (msgMatch) {
      return msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
    }
    const partialMatch = trimmed.match(/"message"\s*:\s*"([\s\S]+)/);
    if (partialMatch) {
      let msg = partialMatch[1];
      msg = msg.replace(/",?\s*"(action|onboarding|shouldQueryData)[\s\S]*$/, '');
      msg = msg.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
      if (msg.endsWith('"')) msg = msg.slice(0, -1);
      return msg.trim();
    }
  }
  return text;
}

function buildStreakMessage(streak: StreakData, agentName: string): string {
  if (streak.current_streak >= 30) return `\n\n${agentName} streak: ${streak.current_streak} days! You're a powerhouse -- that's your longest streak yet!`;
  if (streak.current_streak >= 14) return `\n\n${agentName} streak: ${streak.current_streak} days! Incredible consistency -- keep it going!`;
  if (streak.current_streak >= 7) return `\n\n${agentName} streak: ${streak.current_streak} days in a row! You're building a great habit.`;
  if (streak.current_streak >= 3) return `\n\n${agentName} streak: ${streak.current_streak} days! Nice momentum.`;
  return '';
}

function buildNudgeMessage(streak: StreakData): string {
  if (streak.days_away >= 7) {
    let msg = `It's been a while since we last connected!`;
    if (streak.docs_changed > 0) msg += ` While you were away, ${streak.docs_changed} new document${streak.docs_changed > 1 ? 's were' : ' was'} synced.`;
    return msg + ' ';
  }
  if (streak.days_away >= 3) {
    let msg = `Welcome back!`;
    if (streak.docs_changed > 0) msg += ` ${streak.docs_changed} new document${streak.docs_changed > 1 ? 's' : ''} synced since your last visit.`;
    return msg + ' ';
  }
  if (streak.docs_changed > 5) {
    return `${streak.docs_changed} new documents have been synced since yesterday! `;
  }
  return '';
}

const QUICK_ACTION_SHORTCUTS: Record<string, { prompt: string; action?: AgentAction }> = {
  '/report': { prompt: 'Generate a report on my team\'s recent activity', action: { type: 'send_to_agent', target: 'agent-chat', prompt: 'Generate a comprehensive report on our team\'s recent activity, meeting highlights, and key action items.' } },
  '/goals': { prompt: 'Show me our team\'s goal progress', action: { type: 'send_to_agent', target: 'agent-chat', prompt: 'Analyze our team\'s progress toward stated goals. What goals are on track and which need attention?' } },
  '/sync': { prompt: 'Take me to data sync', action: { type: 'navigate', target: 'fuel-stage' } },
  '/meetings': { prompt: 'Summarize my recent meetings', action: { type: 'send_to_agent', target: 'agent-chat', prompt: 'Summarize my most recent meetings including key decisions, action items, and follow-ups needed.' } },
  '/actions': { prompt: 'What action items do I have?', action: { type: 'send_to_agent', target: 'agent-chat', prompt: 'List all pending action items from my recent meetings and documents, organized by priority.' } },
  '/dashboard': { prompt: 'Open team dashboard', action: { type: 'navigate', target: 'team-dashboard' } },
  '/pulse': { prompt: 'Open team pulse', action: { type: 'navigate', target: 'team-pulse' } },
  '/help': { prompt: 'What can you help me with?' },
};

export default function AgentChatPanel({
  isCollapsed = false,
  onToggleCollapse,
  onAction,
  onDataQuery,
  hideHeader = false
}: AgentChatPanelProps) {
  const { messages, loading, sending, addUserMessage, addAgentMessage, clearConversation } = useAgentConversation();
  const { settings, context: teamContext, addContext, updateAgentName, isAdmin } = useTeamAgent();
  const { preferences: assistantPrefs, updateAssistantName, markMemberOnboardingComplete, loading: prefsLoading } = useUserAssistantPreferences();
  const appContext = useAgentAppContext();
  const { user } = useAuth();

  const effectiveAgentName = assistantPrefs?.assistant_name || settings?.agentName || 'Astra';

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    phase: 'awaiting_name',
    prioritiesCollected: [],
    preferencesCollected: [],
    questionCount: 0,
    educationViewed: [],
    tutorialOffset: 0,
    allImpactItems: []
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<AgentMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isCollapsed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (!loading && !prefsLoading && !hasInitialized && messages.length === 0) {
      const hasPersonalName = !!assistantPrefs?.assistant_name;
      if (hasPersonalName) {
        setOnboardingData(prev => ({ ...prev, phase: 'live' }));
        initializeReturningUser();
      } else {
        initializeWelcome();
      }
      setHasInitialized(true);
    } else if (!loading && !prefsLoading && !hasInitialized && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const rawPhase = lastMessage?.metadata?.onboardingPhase as string | undefined;
      const savedPriorities = lastMessage?.metadata?.prioritiesCollected as string[] | undefined;
      const savedPreferences = lastMessage?.metadata?.preferencesCollected as string[] | undefined;

      const legacyPhaseMap: Record<string, OnboardingPhase> = {
        'complete': 'live', 'general': 'live'
      };
      const savedPhase: OnboardingPhase = legacyPhaseMap[rawPhase || ''] || (rawPhase as OnboardingPhase) || 'live';

      if (savedPhase !== 'live') {
        setOnboardingData(prev => ({
          ...prev,
          phase: savedPhase,
          prioritiesCollected: savedPriorities || [],
          preferencesCollected: savedPreferences || [],
          questionCount: (lastMessage?.metadata?.questionCount as number) || 0
        }));
      } else {
        setOnboardingData(prev => ({ ...prev, phase: 'live' }));
      }
      setHasInitialized(true);
    }
  }, [loading, prefsLoading, hasInitialized, messages.length, assistantPrefs?.assistant_name]);

  const initializeWelcome = async () => {
    try {
      await addAgentMessage(WELCOME_MESSAGE, {
        action: { type: 'none' },
        onboardingPhase: 'awaiting_name'
      });
      setOnboardingData(prev => ({ ...prev, phase: 'awaiting_name' }));
    } catch (err) {
      console.error('Error initializing welcome:', err);
    }
  };


  const initializeReturningUser = async () => {
    try {
      const userName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';
      const displayName = userName || appContext.teamName || 'there';
      const docCount = appContext.documentCount || 0;

      let streakData: StreakData | null = null;
      if (user?.id) {
        const { data } = await supabase.rpc('update_user_engagement_streak', {
          p_user_id: user.id,
          p_current_doc_count: docCount
        });
        if (data) streakData = data as StreakData;
      }

      const streakMsg = streakData ? buildStreakMessage(streakData, effectiveAgentName) : '';
      const nudge = streakData ? buildNudgeMessage(streakData) : '';

      const greetingResult = await generateGreeting({
        userName: displayName,
        isReturning: true,
        streakMessage: nudge || undefined
      });

      const fullGreeting = `${greetingResult.greeting}${nudge ? ` ${nudge}` : ''}${streakMsg}`;

      await addAgentMessage(fullGreeting, {
        action: { type: 'none' },
        onboardingPhase: 'live',
        liveChoices: true,
        dynamicSuggestions: greetingResult.suggestions,
        streakData: streakData
      });
    } catch (err) {
      console.error('Error initializing returning user:', err);
    }
  };

  const getSmartRecommendations = async (count: number): Promise<{ id: string; title: string }[]> => {
    if (!user?.id) return [];

    const { data: usage } = await supabase
      .from('user_task_recommendation_usage')
      .select('recommendation_id, times_shown')
      .eq('user_id', user.id);

    const shownMap = new Map<string, number>();
    (usage || []).forEach((u: { recommendation_id: string; times_shown: number }) => {
      shownMap.set(u.recommendation_id, u.times_shown);
    });

    const { data: allRecs } = await supabase
      .from('task_recommendations')
      .select('id, title')
      .eq('is_active', true)
      .order('sort_order');

    if (!allRecs || allRecs.length === 0) return [];

    const sorted = [...allRecs].sort((a, b) => {
      const aShown = shownMap.get(a.id) || 0;
      const bShown = shownMap.get(b.id) || 0;
      if (aShown !== bShown) return aShown - bShown;
      return Math.random() - 0.5;
    });

    const selected = sorted.slice(0, count);

    for (const rec of selected) {
      const existing = shownMap.get(rec.id);
      if (existing !== undefined) {
        await supabase
          .from('user_task_recommendation_usage')
          .update({ times_shown: existing + 1, last_shown_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('recommendation_id', rec.id);
      } else {
        await supabase
          .from('user_task_recommendation_usage')
          .insert({ user_id: user.id, recommendation_id: rec.id, times_shown: 1 });
      }
    }

    return selected;
  };

  const handleNameResponse = async (userMessage: string) => {
    const name = userMessage.trim().replace(/^(call me |name me |i'd like |i want |you can be |be |let's call you |how about |name: )/i, '').replace(/[.!?,]$/g, '').trim();

    if (name.length > 0 && name.length < 30) {
      try {
        await updateAssistantName(name);
        if (isAdmin) {
          try { await updateAgentName(name); } catch { /* team default is optional */ }
        }
        const thankYouMessage = `${name} - I love it! Thank you for the name. I'm excited to help ${appContext.teamName || 'your team'} succeed.

Now I'd love to understand your biggest needs so I can be more helpful. What are the biggest AI needs or wishes you hope to accomplish?`;
        await addAgentMessage(thankYouMessage, {
          action: { type: 'none' },
          onboardingPhase: 'priorities',
          prioritiesCollected: [],
          questionCount: 1
        });
        setOnboardingData({
          phase: 'priorities',
          prioritiesCollected: [],
          preferencesCollected: [],
          questionCount: 1,
          educationViewed: [],
          tutorialOffset: 0,
          allImpactItems: []
        });
      } catch (err) {
        console.error('Error saving name:', err);
        await addAgentMessage("I had trouble saving that name. Could you try again?", {
          action: { type: 'none' },
          onboardingPhase: 'awaiting_name'
        });
      }
    } else {
      await addAgentMessage("I'd love a name! It can be anything you'd like - just type it and I'll remember it.", {
        action: { type: 'none' },
        onboardingPhase: 'awaiting_name'
      });
    }
  };


  const proceedToSyncCheck = async () => {
    const teamId = user?.user_metadata?.team_id;
    let actualDocCount = 0;

    if (teamId) {
      const { data: syncStats } = await supabase.rpc('get_document_sync_stats', { p_team_id: teamId });
      if (syncStats) {
        actualDocCount = typeof syncStats === 'object' && !Array.isArray(syncStats)
          ? (syncStats as Record<string, number>).total_documents || 0
          : Array.isArray(syncStats) ? (syncStats[0]?.total_documents || 0) : 0;
      }
    }

    if (actualDocCount > 0) {
      setOnboardingData(prev => ({ ...prev, phase: 'sync_check' }));
      await addAgentMessage(`Your team already has **${actualDocCount} document${actualDocCount > 1 ? 's' : ''}** synced -- that's great! This means I can already search, analyze, and generate reports from your team's content.

With synced documents, I can:
- **Search and retrieve** information from your files instantly
- **Generate reports** based on your actual team data
- **Analyze trends** and surface key insights
- **Answer questions** using your real documents

You can always add more documents later from the Fuel page. Let's keep going!`, {
        action: { type: 'none' },
        onboardingPhase: 'sync_check'
      });
      await enterLiveMode();
    } else {
      setOnboardingData(prev => ({ ...prev, phase: 'sync_check' }));
      await addAgentMessage(`First, let's make sure you have some documents synced so I can work with your real data. Syncing your Google Drive or OneDrive lets me search, analyze, and generate reports from your team's actual content.`, {
        action: { type: 'none' },
        onboardingPhase: 'sync_check',
        syncActions: true
      });
    }
  };

  const handleConversationalOnboarding = async (userMessage: string) => {
    const agentName = effectiveAgentName;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        await addAgentMessage("I'm having trouble connecting. Please try refreshing the page.", { action: { type: 'none' } });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/team-agent-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          userMessage,
          agentContext: { agentName, teamName: appContext.teamName || 'Your Team', onboardingCompleted: false },
          appContext: appContext.getContextSummary(),
          conversationHistory: messages.map(m => ({ role: m.role, message: m.message })),
          onboardingState: onboardingData,
          isMemberOnboarding: !isAdmin
        })
      });

      if (!response.ok) throw new Error(`Edge function error: ${response.status}`);
      const result = await response.json();
      result.message = cleanRawJsonMessage(result.message);

      if (result.onboarding) {
        const { extractedPriorities, extractedPreferences, phaseComplete, nextPhase } = result.onboarding;
        const newPriorities = [...onboardingData.prioritiesCollected, ...(extractedPriorities || [])];
        const newPreferences = [...onboardingData.preferencesCollected, ...(extractedPreferences || [])];
        let newPhase = onboardingData.phase;
        const newQuestionCount = onboardingData.questionCount + 1;

        const allCollectedPrefs = [...onboardingData.preferencesCollected, ...(extractedPreferences || [])];
        const prefsLookComplete = onboardingData.phase === 'preferences' &&
          allCollectedPrefs.some(p => ['playful', 'witty', 'adventurous', 'grit', 'creative', 'analytical', 'empathetic', 'encouraging', 'supportive', 'formal', 'casual', 'friendly', 'professional', 'brief', 'detailed', 'direct', 'warm'].some(t => p.toLowerCase().includes(t))) &&
          allCollectedPrefs.some(p => /proactive_(high|medium|low)/.test(p.toLowerCase())) &&
          allCollectedPrefs.some(p => /notify_/.test(p.toLowerCase())) &&
          allCollectedPrefs.some(p => /channel_/.test(p.toLowerCase()));

        const shouldForceEducation = onboardingData.phase === 'preferences' && !phaseComplete && prefsLookComplete;

        if (phaseComplete || shouldForceEducation) {
          if (nextPhase === 'preferences' && !shouldForceEducation && !prefsLookComplete) {
            newPhase = 'preferences';
          } else {
            await addAgentMessage(result.message, {
              action: result.action || { type: 'none' },
              onboardingPhase: onboardingData.phase,
              prioritiesCollected: newPriorities,
              preferencesCollected: newPreferences,
              questionCount: newQuestionCount
            });

            setOnboardingData(prev => ({
              ...prev,
              prioritiesCollected: newPriorities,
              preferencesCollected: newPreferences,
              questionCount: newQuestionCount
            }));

            await markMemberOnboardingComplete();

            setOnboardingData(prev => ({ ...prev, phase: 'education' }));
            await addAgentMessage(`Great setup, ${agentName} is ready! Before we go any further, let me walk you through the key tools available to you and your team.`, {
              action: { type: 'none' },
              onboardingPhase: 'education',
              suggestions: EDUCATION_SUGGESTIONS
            });
            return;
          }
        }

        setOnboardingData(prev => ({
          ...prev,
          phase: newPhase,
          prioritiesCollected: newPriorities,
          preferencesCollected: newPreferences,
          questionCount: newQuestionCount
        }));

        await addAgentMessage(result.message, {
          action: result.action || { type: 'none' },
          onboardingPhase: newPhase,
          prioritiesCollected: newPriorities,
          preferencesCollected: newPreferences,
          questionCount: newQuestionCount
        });

        if (result.action && result.action.type !== 'none' && onAction) {
          setTimeout(() => onAction(result.action), 300);
        }
      } else {
        await addAgentMessage(result.message, {
          action: result.action || { type: 'none' }
        });
        if (result.action && result.action.type !== 'none' && onAction) {
          setTimeout(() => onAction(result.action), 300);
        }
      }
    } catch (error) {
      console.error('Error in conversational onboarding:', error);
      await addAgentMessage("I encountered an issue. Let me try a different approach - what would you like to do?", {
        action: { type: 'none' }
      });
    }
  };

  const enterTutorialMode = async () => {
    const agentName = effectiveAgentName;

    const { data: impactData } = await supabase
      .from('user_impact_progress')
      .select(`
        feature_key,
        is_completed,
        user_impact_items (
          feature_name,
          feature_description,
          action_type,
          action_target
        )
      `)
      .eq('user_id', user?.id)
      .eq('is_completed', false)
      .order('custom_priority', { ascending: true, nullsFirst: false });

    const allItems: ImpactSuggestion[] = (impactData || []).map((item: Record<string, unknown>) => {
      const itemData = item.user_impact_items as Record<string, unknown> | null;
      return {
        feature_key: item.feature_key as string,
        feature_name: itemData?.feature_name as string || '',
        feature_description: itemData?.feature_description as string || '',
        action_type: itemData?.action_type as string | null,
        action_target: itemData?.action_target as string | null
      };
    });

    const firstBatch = allItems.slice(0, 3);

    setOnboardingData(prev => ({
      ...prev,
      phase: 'tutorial',
      tutorialOffset: 0,
      allImpactItems: allItems
    }));

    await addAgentMessage(`Now let me show you what ${agentName} can do! Here are some of the key tools and features available to you. Try any of them to see how they work:`, {
      action: { type: 'none' },
      onboardingPhase: 'tutorial',
      impactSuggestions: firstBatch,
      tutorialControls: true,
      hasMoreItems: allItems.length > 3
    });
  };

  const handleTutorialShowMore = async () => {
    const newOffset = onboardingData.tutorialOffset + 3;
    const nextBatch = onboardingData.allImpactItems.slice(newOffset, newOffset + 3);
    const hasMore = onboardingData.allImpactItems.length > newOffset + 3;

    setOnboardingData(prev => ({ ...prev, tutorialOffset: newOffset }));

    if (nextBatch.length > 0) {
      await addAgentMessage(`Here are more tools to explore:`, {
        action: { type: 'none' },
        onboardingPhase: 'tutorial',
        impactSuggestions: nextBatch,
        tutorialControls: true,
        hasMoreItems: hasMore
      });
    } else {
      await addAgentMessage(`You've seen all the available tools! Feel free to try any of them, or exit the tutorial when you're ready.`, {
        action: { type: 'none' },
        onboardingPhase: 'tutorial',
        tutorialControls: true,
        hasMoreItems: false
      });
    }
  };

  const handleTutorialExit = async () => {
    await enterLiveMode();
  };

  const enterLiveMode = async () => {
    const userName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';
    const displayName = userName || appContext.teamName || 'there';

    setOnboardingData(prev => ({ ...prev, phase: 'live' }));

    const greetingResult = await generateGreeting({
      userName: displayName,
      isReturning: false
    });

    await addAgentMessage(greetingResult.greeting, {
      action: { type: 'none' },
      onboardingPhase: 'live',
      liveChoices: true,
      dynamicSuggestions: greetingResult.suggestions
    });
  };

  const handleSyncAction = async (action: 'sync' | 'skip') => {
    if (action === 'sync') {
      await addUserMessage("Help me sync my documents", {});
      if (onAction) {
        onAction({ type: 'trigger_sync' });
      }
      await addAgentMessage(`I've opened the **Fuel page** where you can sync your documents. Here's how to get started:

**Option 1: Upload Local Files**
- Click **"Add Local Files"** to upload documents directly from your computer

**Option 2: Connect Cloud Storage**
- Click **"Add or Manage"** to connect your Google Drive or OneDrive
- Select the folders you want to sync
- Your documents will start syncing automatically

Once your documents are synced, come back to this chat and let me know -- I'll check your progress and we'll continue from there!`, {
        action: { type: 'none' },
        onboardingPhase: 'sync_check'
      });
    } else {
      await addUserMessage("Skip for now", {});
      await addAgentMessage(`No problem! You can always sync documents later from the **Fuel** page. Keep in mind that many features work best with synced documents, but you can still explore the platform.`, {
        action: { type: 'none' },
        onboardingPhase: 'sync_check'
      });
      await enterLiveMode();
    }
  };

  const handleOvernightAction = (actionType: 'overnight_detail' | 'overnight_visualization' | 'overnight_create', metadata: Record<string, unknown>) => {
    if (onAction) {
      onAction({
        type: actionType,
        params: metadata,
      });
    }
  };

  const handleLiveChoice = async (choice: string) => {
    setIsTyping(true);
    try {
      await addUserMessage(choice, {});
      const response = await generateAgentResponse(
        choice,
        buildAgentContext(),
        appContext.getContextSummary(),
        messages
      );
      await addAgentMessage(response.message, {
        action: response.action || { type: 'none' },
        onboardingPhase: 'live'
      });
      if (response.action && response.action.type !== 'none' && onAction) {
        setTimeout(() => onAction(response.action), 300);
      }
    } catch (err) {
      console.error('Error handling live choice:', err);
      await addAgentMessage("Let me help you with that. What specifically would you like to do?", {
        action: { type: 'none' },
        onboardingPhase: 'live'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmitFeedback = async (feedback: { wasHelpful: boolean | null; message: string }) => {
    if (!feedbackMessage || !user?.id) return;
    const feedbackTeamId = user?.user_metadata?.team_id;
    const batchId = (feedbackMessage.metadata?.batch_id as string) || '';
    const isOvernight = feedbackMessage.metadata?.source === 'overnight_assistant';

    try {
      if (feedbackTeamId) {
        await supabase.from('assistant_conversation_feedback').insert({
          user_id: user.id,
          team_id: feedbackTeamId,
          batch_id: batchId || null,
          source: isOvernight ? 'daily_overnight' : 'conversation',
          feedback_message: feedback.message || (feedback.wasHelpful ? 'Helpful' : 'Not helpful')
        });
      }

      if (batchId) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collect-insight-feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              batch_id: batchId,
              was_helpful: feedback.wasHelpful,
              user_feedback: feedback.message || undefined
            })
          });
        } catch (err) {
          console.error('Error sending insight feedback:', err);
        }
      }
    } catch (err) {
      console.error('Error saving feedback:', err);
    }
  };

  const buildAgentContext = (): AgentContext => ({
    agentName: effectiveAgentName,
    teamName: appContext.teamName || 'Your Team',
    teamMission: teamContext.find(c => c.contextType === 'mission')?.contextValue,
    teamValues: teamContext.filter(c => c.contextType === 'values').map(c => c.contextValue),
    teamGoals: teamContext.filter(c => c.contextType === 'goals').map(c => c.contextValue),
    learnedFacts: teamContext.filter(c => c.contextType === 'facts').map(c => c.contextValue),
    onboardingCompleted: settings?.onboardingCompleted || false,
    currentOnboardingStep: onboardingData.phase
  });

  const handleSend = async () => {
    if (!input.trim() || sending || isTyping) return;
    const userMessage = input.trim();
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const shortcutKey = userMessage.toLowerCase().split(' ')[0];
      const shortcut = QUICK_ACTION_SHORTCUTS[shortcutKey];
      if (shortcut && onboardingData.phase === 'live') {
        await addUserMessage(shortcut.prompt, {});
        if (shortcut.action && onAction) {
          onAction(shortcut.action);
          const contextKey = shortcut.action.target || shortcut.action.type;
          const contextMessage = SCREEN_CONTEXT_MESSAGES[contextKey];
          if (contextMessage) {
            setTimeout(async () => {
              await addAgentMessage(contextMessage, { action: { type: 'none' }, onboardingPhase: 'live' });
            }, 500);
          } else if (shortcut.action.type === 'send_to_agent') {
            await addAgentMessage(`I've sent that request to the Team Agent. You'll see the results in the Agent Chat window.`, {
              action: { type: 'none' }, onboardingPhase: 'live'
            });
          }
        } else {
          const response = await generateAgentResponse(shortcut.prompt, buildAgentContext(), appContext.getContextSummary(), messages);
          await addAgentMessage(response.message, { action: response.action || { type: 'none' }, onboardingPhase: 'live' });
        }
        setIsTyping(false);
        return;
      }

      await addUserMessage(userMessage, { appContext: appContext.getContextSummary() });

      if (onboardingData.phase === 'awaiting_name') {
        await handleNameResponse(userMessage);
      } else if (onboardingData.phase === 'priorities' || onboardingData.phase === 'preferences') {
        await handleConversationalOnboarding(userMessage);
      } else if (onboardingData.phase === 'education') {
        const skipPhrases = ['skip', 'get started', 'let\'s go', 'continue', 'move on', 'next', 'ready', 'done'];
        if (skipPhrases.some(p => userMessage.toLowerCase().includes(p))) {
          await proceedToSyncCheck();
        } else {
          await handleConversationalOnboarding(userMessage);
        }
      } else if (onboardingData.phase === 'sync_check') {
        const teamId = user?.user_metadata?.team_id;
        let docCount = 0;
        if (teamId) {
          const { data: syncStats } = await supabase.rpc('get_document_sync_stats', { p_team_id: teamId });
          docCount = typeof syncStats === 'object' && !Array.isArray(syncStats)
            ? (syncStats as Record<string, number>).total_documents || 0
            : Array.isArray(syncStats) ? (syncStats[0]?.total_documents || 0) : 0;
        }
        if (docCount > 0) {
          await addAgentMessage(`I can see you now have **${docCount} document${docCount > 1 ? 's' : ''}** synced! Now I can search, analyze, and generate reports from your team's content.`, {
            action: { type: 'none' },
            onboardingPhase: 'sync_check'
          });
          await enterLiveMode();
        } else {
          await addAgentMessage(`It looks like there aren't any documents synced yet. No worries -- you can sync anytime from the Fuel page! Would you like to continue exploring, or try syncing now?`, {
            action: { type: 'none' },
            onboardingPhase: 'sync_check',
            syncActions: true
          });
        }
      } else {
        const contextExtracted = extractContextFromMessage(userMessage);
        if (contextExtracted) {
          await addContext(contextExtracted.type, contextExtracted.value, 'conversation');
        }

        if (isDataQuery(userMessage) && onDataQuery) {
          await addAgentMessage("Let me search your data for that...", { action: { type: 'none' }, pending: true });
          const dataResponse = await onDataQuery(userMessage);
          await addAgentMessage(dataResponse, { action: { type: 'none' }, dataQueryResult: true });
        } else {
          const response = await generateAgentResponse(
            userMessage,
            buildAgentContext(),
            appContext.getContextSummary(),
            messages
          );

          const metadata: Record<string, unknown> = {
            action: response.action,
            onboardingPhase: onboardingData.phase
          };

          if (response.impactSuggestions?.length) {
            metadata.impactSuggestions = response.impactSuggestions;
          }

          await addAgentMessage(response.message, metadata);

          if (response.action && response.action.type !== 'none' && onAction) {
            setTimeout(() => onAction(response.action), 300);
          }

          if (response.shouldQueryData && response.dataQuery && onDataQuery) {
            const dataResponse = await onDataQuery(response.dataQuery);
            await addAgentMessage(dataResponse, { action: { type: 'none' }, dataQueryResult: true });
          }
        }

        if (onboardingData.phase === 'tutorial') {
          const currentItems = onboardingData.allImpactItems.slice(
            onboardingData.tutorialOffset,
            onboardingData.tutorialOffset + 3
          );
          if (currentItems.length > 0) {
            await addAgentMessage(`Here are the tools you can explore:`, {
              action: { type: 'none' },
              onboardingPhase: 'tutorial',
              impactSuggestions: currentItems,
              tutorialControls: true,
              hasMoreItems: onboardingData.allImpactItems.length > onboardingData.tutorialOffset + 3
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in agent chat:', error);
      await addAgentMessage("I encountered an issue. Let me try that differently - what would you like to do?", { action: { type: 'none' } });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearConversation = async () => {
    await clearConversation();
    setShowMenu(false);
    setHasInitialized(false);
    setOnboardingData({
      phase: 'awaiting_name',
      prioritiesCollected: [],
      preferencesCollected: [],
      questionCount: 0,
      educationViewed: [],
      tutorialOffset: 0,
      allImpactItems: []
    });
  };

  const handleSuggestionClick = async (suggestion: SuggestionItem) => {
    if (suggestion.id === 'education-capabilities') {
      await addUserMessage(suggestion.label, {});
      const newViewed = [...onboardingData.educationViewed, 'capabilities'];
      const remaining = EDUCATION_SUGGESTIONS.filter(s => {
        if (s.id === 'education-skip') return true;
        const key = s.id.replace('education-', '');
        return !newViewed.includes(key);
      });
      setOnboardingData(prev => ({
        ...prev,
        educationViewed: newViewed
      }));
      await addAgentMessage(`Great question! There are actually **two AI systems** working together for you -- let me explain how it all works.

**How I Work With You (Two AI Systems)**

1. **Team AI Assistant (Me!)** -- I'm this chat on the left side of your screen. Think of me as your personal navigator:
   - I answer questions and provide guidance
   - I help you find and navigate features
   - I recommend high-impact actions based on your priorities
   - I remember our conversations and learn your preferences
   - When you need deep analysis, I send requests to the Team Agent for you

2. **Team Agent** -- This is the powerful AI engine in the Agent Chat (main window). It runs sophisticated workflows that:
   - Search and analyze your team's documents in depth
   - Generate comprehensive reports and insights
   - Create dashboards and visualizations
   - Cross-analyze data across categories (strategy, meetings, financial, projects)
   - Search the web for current information

Together, I handle the conversation and guidance while the Team Agent handles the heavy data analysis. I'm powered by multiple AI models (Gemini, Claude, OpenAI) working together for the best results.

---

**Key Platform Features**

- **AI Data Sync** -- Connect Google Drive, Microsoft OneDrive/SharePoint, or upload local files. This powers everything else
- **AI Reports** -- Generate detailed reports, schedule automated delivery, and receive beautiful email summaries
- **Team Dashboard** -- Daily AI-generated snapshot with goals tracking, mission alignment, and team health metrics
- **Team Chat** -- Real-time group chat with teammates AND AI -- @mention anyone for instant insights
- **Creative Suite** -- Generate AI-powered presentations and images from your data with 15+ content types and multiple styles
- **Smart Visualizations** -- Turn any conversation into charts, graphs, and visual reports
- **Mission Control** -- Track your progress, launch points, achievements, and access all AI tools in one place
- **Category Access Controls** -- Admins control which data categories each team member can access

**Coming Soon:** Agent Builder, AI Specialists, Team SOPs, Research Projects, and Email Control

What else would you like to know?`, {
        action: { type: 'none' },
        onboardingPhase: 'education',
        suggestions: remaining
      });
      return;
    }

    if (suggestion.id === 'education-security') {
      await addUserMessage(suggestion.label, {});
      const newViewed = [...onboardingData.educationViewed, 'security'];
      const remaining = EDUCATION_SUGGESTIONS.filter(s => {
        if (s.id === 'education-skip') return true;
        const key = s.id.replace('education-', '');
        return !newViewed.includes(key);
      });
      setOnboardingData(prev => ({
        ...prev,
        educationViewed: newViewed
      }));
      await addAgentMessage(`Your data security is our highest priority. Here's a complete overview of how we protect your information:

**Enterprise-Grade Security**
- All data is fully encrypted using industry-leading encryption -- both in transit (TLS) and at rest
- We maintain **SOC2 Type II Security Compliance**, meeting the highest security standards
- Row Level Security (RLS) policies are enforced at the database level on every single table

**Complete Data Isolation**
- Each team's data is completely isolated -- no team can ever access another team's information
- Category-level access controls let admins restrict who sees Strategy, Meetings, Financial, and Projects data
- The AI automatically filters responses based on each user's permissions

**Privacy Controls**
- Team admins set granular, per-user access controls
- No cross-team data exposure is possible at any level
- Document access is strictly controlled based on team membership and category permissions

**Your Data, Your Control**
- Export your documents, data, and conversation history at any time
- Delete your data completely whenever you choose -- we honor deletion requests immediately
- Your data belongs to you, not us

**AI Model Privacy**
- We never share your team's data with outside companies
- The AI models we use (Gemini, Claude, OpenAI) do **not** retain or train on your data
- Your conversations and documents remain private and confidential

**Compliance**
- GDPR compliant data handling
- Regular security audits and penetration testing
- All credentials and API keys are server-side only -- never exposed to the browser

Your data stays yours -- we just help you make it more useful!`, {
        action: { type: 'none' },
        onboardingPhase: 'education',
        suggestions: remaining
      });
      return;
    }

    if (suggestion.id === 'education-skip') {
      await addUserMessage(suggestion.label, {});
      await proceedToSyncCheck();
      return;
    }

    if (suggestion.action && onAction) {
      await addUserMessage(suggestion.label, {});
      onAction(suggestion.action as AgentAction);
      const contextKey = suggestion.action.target || suggestion.action.type;
      const contextMessage = SCREEN_CONTEXT_MESSAGES[contextKey];
      if (contextMessage) {
        setTimeout(async () => {
          await addAgentMessage(contextMessage, { action: { type: 'none' } });
        }, 500);
      }
    } else if (suggestion.prompt) {
      await addUserMessage(suggestion.prompt, {});
      setIsTyping(true);
      try {
        const context = buildAgentContext();
        const response = await generateAgentResponse(suggestion.prompt, context);
        await addAgentMessage(response.message, {
          action: response.action || { type: 'none' }
        });
      } catch (err) {
        console.error('Error generating response:', err);
        await addAgentMessage("I'd be happy to help! What would you like to explore first?", {
          action: { type: 'none' }
        });
      } finally {
        setIsTyping(false);
      }
    } else if (suggestion.startPreferences) {
      await addUserMessage("I'd like to customize how you work", {});
      setOnboardingData(prev => ({
        ...prev,
        phase: 'preferences',
        questionCount: 1
      }));
      await addAgentMessage(`Great! I'd love to understand how you'd like me to work with you.

Describe your ideal AI assistant -- what personality traits or communication style would be most helpful? For example:
- **Tone**: Brief and direct, or detailed and thorough?
- **Style**: Professional, casual, playful, encouraging?
- **Proactivity**: Would you like me to proactively reach out with suggestions and insights, or prefer I only respond when asked?
- **Notifications**: If I do reach out, would you prefer email, SMS, WhatsApp, or just in-app?

What would work best for you?`, {
        action: { type: 'none' },
        onboardingPhase: 'preferences',
        preferencesCollected: [],
        questionCount: 1
      });
    }
  };

  const handleActionClick = (action: AgentAction) => {
    if (onAction) {
      onAction(action);
    }
  };

  const handleImpactClick = async (impact: ImpactSuggestion) => {
    await addUserMessage(impact.feature_name, {});

    if (impact.action_type && impact.action_type !== 'none' && onAction) {
      if (impact.action_type === 'send_to_agent') {
        let agentPrompt = '';
        if (impact.feature_key === 'analyze_mission_values') {
          agentPrompt = `Please analyze our team's mission statement, core values, and goals from our synced strategy documents. Provide insights on:
1. How well our current activities align with our mission
2. Whether our core values are reflected in our recent work
3. Progress toward our stated goals
4. Recommendations for better alignment`;
        } else if (impact.feature_key === 'cross_category_analysis') {
          agentPrompt = `Please perform a cross-category analysis of our team's data. Analyze connections and insights across:
1. Strategy documents and meeting notes - Are our meetings aligned with strategic goals?
2. Financial data and project status - Are projects on budget and delivering value?
3. Overall patterns and recommendations based on data from multiple categories`;
        } else {
          agentPrompt = impact.feature_description;
        }

        onAction({ type: 'send_to_agent', target: 'agent-chat', prompt: agentPrompt });
        await addAgentMessage(`I've sent this request to the **Agent Chat** in the main window. The Team Agent will analyze your data and provide detailed insights there.`, {
          action: { type: 'none' }
        });
      } else {
        onAction({ type: impact.action_type as AgentAction['type'], target: impact.action_target || undefined });
        const contextKey = impact.action_target || impact.action_type;
        const contextMessage = SCREEN_CONTEXT_MESSAGES[contextKey];
        if (contextMessage) {
          setTimeout(async () => {
            await addAgentMessage(contextMessage, { action: { type: 'none' } });
          }, 500);
        }
      }
    }

    if (onboardingData.phase === 'tutorial') {
      setTimeout(async () => {
        const currentItems = onboardingData.allImpactItems.slice(
          onboardingData.tutorialOffset,
          onboardingData.tutorialOffset + 3
        );
        if (currentItems.length > 0) {
          await addAgentMessage(`Want to try another tool? Here's what else you can explore:`, {
            action: { type: 'none' },
            onboardingPhase: 'tutorial',
            impactSuggestions: currentItems,
            tutorialControls: true,
            hasMoreItems: onboardingData.allImpactItems.length > onboardingData.tutorialOffset + 3
          });
        }
      }, 1500);
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-full w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-4 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {!hideHeader && (
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-medium">{effectiveAgentName}</h2>
              <p className="text-xs text-gray-400">AI Rocket</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-4">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Rocket className="w-6 h-6 text-cyan-400" />
              <span className="text-lg font-semibold text-white">AI Rocket</span>
            </div>
            <div className="text-center text-gray-400 text-sm">
              {isAdmin ? 'Starting conversation...' : 'Welcome! Ask me anything about AI Rocket.'}
            </div>
          </div>
        ) : (
          <>
            {messages.length >= 1 && messages[0].metadata?.onboardingPhase === 'awaiting_name' && (
              <WelcomeHeader />
            )}
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                agentName={effectiveAgentName}
                onActionClick={handleActionClick}
                onSuggestionClick={handleSuggestionClick}
                onImpactClick={handleImpactClick}
                onTutorialShowMore={handleTutorialShowMore}
                onTutorialExit={handleTutorialExit}
                onSyncAction={handleSyncAction}
                onLiveChoice={handleLiveChoice}
                onOvernightAction={handleOvernightAction}
                onFeedbackClick={(msg) => setFeedbackMessage(msg)}
                isLastMessage={index === messages.length - 1}
                currentPhase={onboardingData.phase}
              />
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={onboardingData.phase === 'awaiting_name' ? 'Type a name for me...' : `Message ${effectiveAgentName}...`}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none overflow-y-auto"
            rows={1}
            style={{ minHeight: '44px' }}
            disabled={sending || isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || isTyping}
            className="absolute right-2 bottom-2 p-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {sending || isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <InsightFeedbackModal
        isOpen={!!feedbackMessage}
        onClose={() => setFeedbackMessage(null)}
        onSubmit={handleSubmitFeedback}
        agentName={effectiveAgentName}
        messagePreview={feedbackMessage?.message || ''}
      />
    </div>
  );
}

function WelcomeHeader() {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Rocket className="w-6 h-6 text-cyan-400" />
        <span className="text-lg font-semibold text-white">AI Rocket</span>
      </div>
      <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-lg mb-2">
          Welcome to your AI-powered command center
        </h3>
        <p className="text-gray-400 text-sm">
          I'm your team's AI assistant, here to help you get the most out of this platform.
        </p>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: AgentMessage;
  agentName: string;
  onActionClick: (action: AgentAction) => void;
  onSuggestionClick: (suggestion: SuggestionItem) => void;
  onImpactClick?: (impact: ImpactSuggestion) => void;
  onTutorialShowMore?: () => void;
  onTutorialExit?: () => void;
  onSyncAction?: (action: 'sync' | 'skip') => void;
  onLiveChoice?: (choice: string) => void;
  onOvernightAction?: (actionType: 'overnight_detail' | 'overnight_visualization' | 'overnight_create', metadata: Record<string, unknown>) => void;
  onFeedbackClick?: (message: AgentMessage) => void;
  isLastMessage?: boolean;
  currentPhase?: OnboardingPhase;
}

function formatMessageText(text: string): React.ReactNode {
  const cleanedText = text
    .replace(/\\n\\n/g, '\n\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/•\\t/g, '• ')
    .replace(/\\"/g, '"');

  const paragraphs = cleanedText.split(/\n\n+/);

  return paragraphs.map((paragraph, pIndex) => {
    const lines = paragraph.split('\n');

    const formattedLines = lines.map((line, lIndex) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formattedParts = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${lIndex}-${partIndex}`} className="font-semibold text-cyan-300">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <React.Fragment key={lIndex}>
          {formattedParts}
          {lIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });

    return (
      <p key={pIndex} className={pIndex > 0 ? 'mt-3' : ''}>
        {formattedLines}
      </p>
    );
  });
}

function MessageBubble({
  message, agentName, onActionClick, onSuggestionClick, onImpactClick,
  onTutorialShowMore, onTutorialExit, onSyncAction, onLiveChoice,
  onOvernightAction, onFeedbackClick,
  isLastMessage, currentPhase
}: MessageBubbleProps) {
  const isAgent = message.role === 'agent';
  const suggestions = message.metadata?.suggestions as SuggestionItem[] | undefined;
  const impactSuggestions = message.metadata?.impactSuggestions as ImpactSuggestion[] | undefined;
  const action = message.metadata?.action;
  const hasAction = action && action.type !== 'none';
  const isOvernightMessage = message.metadata?.source === 'overnight_assistant' || message.metadata?.source === 'feedback_auto_adjust';
  const batchId = message.metadata?.batch_id as string | undefined;

  const showTutorialControls = isLastMessage && isAgent &&
    message.metadata?.tutorialControls === true &&
    currentPhase === 'tutorial';
  const showSyncActions = isLastMessage && isAgent &&
    message.metadata?.syncActions === true &&
    currentPhase === 'sync_check';
  const showLiveChoices = isLastMessage && isAgent &&
    message.metadata?.liveChoices === true &&
    currentPhase === 'live';
  const isLivePhase = message.metadata?.onboardingPhase === 'live';
  const showFeedbackTag = isAgent && (isLivePhase || isOvernightMessage) && !message.metadata?.pending;
  const dynamicSuggestions = message.metadata?.dynamicSuggestions as DynamicSuggestion[] | undefined;
  const hasMoreItems = message.metadata?.hasMoreItems as boolean;

  return (
    <div className={`flex items-start gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAgent
          ? 'bg-gradient-to-br from-cyan-500 to-teal-500'
          : 'bg-gray-700'
      }`}>
        {isAgent ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-gray-300" />
        )}
      </div>
      <div className="max-w-[85%] space-y-2">
        <div className={`${isAgent ? 'bg-gray-800 rounded-2xl rounded-tl-sm' : 'bg-cyan-600 rounded-2xl rounded-tr-sm'} px-4 py-3`}>
          <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">
            {formatMessageText(message.message)}
          </div>
        </div>

        {isAgent && hasAction && action.type !== 'send_to_agent' && (
          <button
            onClick={() => onActionClick(action)}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-sm text-cyan-400 hover:text-cyan-300 transition-all group"
          >
            <ArrowRight className="w-4 h-4" />
            <span>
              {action.type === 'navigate' && `Open ${action.target}`}
              {action.type === 'trigger_sync' && 'Open Data Sync'}
              {action.type === 'run_report' && 'Open Reports'}
              {action.type === 'open_modal' && `Open ${action.target}`}
            </span>
          </button>
        )}

        {isAgent && suggestions && suggestions.length > 0 && (
          <div className="space-y-2 pt-1">
            {suggestions.map((suggestion) => {
              const Icon = ICON_MAP[suggestion.icon || 'Sparkles'] || Sparkles;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="w-full flex items-start gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 rounded-lg text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-700 group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                      {suggestion.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {suggestion.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isAgent && showSyncActions && onSyncAction && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onSyncAction('sync')}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-sm text-cyan-400 hover:text-cyan-300 transition-all"
            >
              <Database className="w-4 h-4" />
              Sync My Documents
            </button>
            <button
              onClick={() => onSyncAction('skip')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
            >
              Skip for now
            </button>
          </div>
        )}

        {isAgent && impactSuggestions && impactSuggestions.length > 0 && onImpactClick && (
          <div className="space-y-2 pt-1">
            {impactSuggestions.map((impact, idx) => (
              <button
                key={impact.feature_key}
                onClick={() => onImpactClick(impact)}
                className="w-full flex items-start gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 rounded-lg text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-700 group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <span className="text-sm font-bold text-gray-400 group-hover:text-cyan-400">{idx + 1}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                    {impact.feature_name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {impact.feature_description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showTutorialControls && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {hasMoreItems && onTutorialShowMore && (
                <button
                  onClick={onTutorialShowMore}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-white transition-all"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show more tools
                </button>
              )}
            </div>
            {onTutorialExit && (
              <button
                onClick={onTutorialExit}
                className="flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit tutorial mode, I'm ready to go
              </button>
            )}
          </div>
        )}

        {showLiveChoices && onLiveChoice && (
          <div className="flex flex-col gap-2 pt-1">
            {dynamicSuggestions && dynamicSuggestions.length > 0 ? (
              dynamicSuggestions.map((suggestion, idx) => {
                const icons = [Rocket, Sparkles, ArrowRight];
                const SugIcon = icons[idx % icons.length];
                return (
                  <button
                    key={idx}
                    onClick={() => onLiveChoice(suggestion.prompt)}
                    className="w-full flex items-start gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 rounded-lg text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-700 group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                      <SugIcon className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {suggestion.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {suggestion.description}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <>
                <button
                  onClick={() => onLiveChoice('Help me with daily tasks')}
                  className="w-full flex items-start gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 rounded-lg text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-700 group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Rocket className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                      Help me with daily tasks
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Action items, meeting summaries, follow-ups, and more
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onLiveChoice('Help me explore AI Rocket features')}
                  className="w-full flex items-start gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 rounded-lg text-left transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-700 group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                      Help me explore AI Rocket features
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Discover reports, visualizations, dashboards, and AI tools
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>
        )}

        {isAgent && isOvernightMessage && onOvernightAction && message.metadata?.detailed_content && (
          <div className="pt-2">
            <button
              onClick={() => onOvernightAction('overnight_detail', {
                detailedContent: message.metadata.detailed_content,
                batchId: batchId || '',
                insightTitles: message.metadata.insight_titles || [],
              })}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-all"
            >
              <FileText className="w-4 h-4" />
              View Full Details
            </button>
          </div>
        )}

        {showFeedbackTag && onFeedbackClick && (
          <button
            onClick={() => onFeedbackClick(message)}
            className="self-start flex items-center gap-1 text-xs text-gray-600 hover:text-cyan-400 transition-colors mt-1 py-0.5"
          >
            <MessageSquare className="w-3 h-3" />
            Feedback
          </button>
        )}
      </div>
    </div>
  );
}
