import { AgentMessage, AgentAction } from '../hooks/useAgentConversation';
import { supabase } from './supabase';

export interface AppContext {
  activeTab: string;
  activeTabLabel: string;
  openModals: string[];
  recentActions: string[];
  dataSyncStatus: 'idle' | 'syncing' | 'complete' | 'error';
  connectedSources: string[];
  documentCount: number;
  teamName: string;
}

export interface AgentContext {
  agentName: string;
  teamName: string;
  teamMission?: string;
  teamValues?: string[];
  teamGoals?: string[];
  learnedFacts?: string[];
  onboardingCompleted: boolean;
  currentOnboardingStep?: string;
}

export interface DynamicSuggestion {
  label: string;
  description: string;
  prompt: string;
}

export interface AgentResponse {
  message: string;
  action?: AgentAction;
  shouldQueryData?: boolean;
  dataQuery?: string;
  impactSuggestions?: Array<{
    feature_key: string;
    feature_name: string;
    feature_description: string;
    action_type: string | null;
    action_target: string | null;
  }> | null;
}

export interface GreetingResponse {
  greeting: string;
  suggestions: DynamicSuggestion[];
}

export async function generateAgentResponse(
  userMessage: string,
  agentContext: AgentContext,
  appContext?: AppContext,
  conversationHistory?: AgentMessage[]
): Promise<AgentResponse> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return {
        message: "I'm having trouble connecting right now. Please try refreshing the page.",
        action: { type: 'none' }
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/team-agent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userMessage,
        agentContext,
        appContext: appContext || {},
        conversationHistory: conversationHistory?.map(m => ({
          role: m.role,
          message: m.message
        })) || []
      })
    });

    if (!response.ok) {
      throw new Error(`Edge function error: ${response.status}`);
    }

    const result = await response.json();
    let cleanMsg = result.message || "I'm not sure how to help with that. Could you rephrase?";
    if (typeof cleanMsg === 'string' && cleanMsg.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanMsg.trim());
        if (parsed.message) cleanMsg = parsed.message;
      } catch {
        const m = cleanMsg.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (m) cleanMsg = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    }

    return {
      message: cleanMsg,
      action: result.action || { type: 'none' },
      shouldQueryData: result.shouldQueryData || false,
      dataQuery: result.dataQuery || undefined,
      impactSuggestions: result.impactSuggestions || null
    };
  } catch (error) {
    console.error('Error generating agent response:', error);
    return {
      message: "I encountered an issue processing that. Let me try to help differently - what would you like to do?",
      action: { type: 'none' }
    };
  }
}

export async function generateGreeting(
  greetingContext: {
    userName: string;
    isReturning: boolean;
    streakMessage?: string;
  }
): Promise<GreetingResponse> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return {
        greeting: "Hello! I'm ready to help you today.",
        suggestions: [
          { label: 'Help me with daily tasks', description: 'Action items, summaries, and follow-ups', prompt: 'Help me with daily tasks' },
          { label: 'Review my goals', description: 'Check progress on priorities', prompt: 'Review my goals and priorities' },
          { label: 'Explore features', description: 'Discover AI tools available', prompt: 'Help me explore AI Rocket features' }
        ]
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/team-agent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        generateGreeting: true,
        greetingContext
      })
    });

    if (!response.ok) {
      throw new Error(`Greeting generation error: ${response.status}`);
    }

    const result = await response.json();
    return {
      greeting: result.greeting || "Hello! I'm ready to help you today.",
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('Error generating greeting:', error);
    return {
      greeting: "Hello! I'm ready to help you today.",
      suggestions: [
        { label: 'Help me with daily tasks', description: 'Action items, summaries, and follow-ups', prompt: 'Help me with daily tasks' },
        { label: 'Review my goals', description: 'Check progress on priorities', prompt: 'Review my goals and priorities' },
        { label: 'Explore features', description: 'Discover AI tools available', prompt: 'Help me explore AI Rocket features' }
      ]
    };
  }
}

export function isDataQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const capabilityAndSecurityPatterns = [
    'what can you do',
    'what are your',
    'what features',
    'how can you help',
    'tell me about yourself',
    'what do you offer',
    'your capabilities',
    'what tools',
    'list your',
    'what are all the things you can do',
    'for my team',
    'how do you work',
    'how do i work',
    'how does it work',
    'how does this work',
    'keep my data secure',
    'keep data secure',
    'keep our data secure',
    'data safe',
    'data secure',
    'data privacy',
    'data protection',
    'privacy policy',
    'security policy',
    'how secure',
    'is my data safe',
    'is our data safe',
    'what can i do',
    'what can we do',
    'capabilities',
    'your features',
    'platform features'
  ];

  if (capabilityAndSecurityPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return false;
  }

  const dataKeywords = [
    'my documents', 'our documents', 'my files', 'our files',
    'my meetings', 'our meetings', 'last meeting', 'recent meeting',
    'analyze my', 'analyze our', 'insights from', 'metrics from',
    'show me my', 'show me our', 'find my', 'find our', 'search my', 'search our',
    'how many documents', 'when did we', 'what did we discuss',
    'financial report', 'strategy document', 'goal progress'
  ];

  return dataKeywords.some(keyword => lowerMessage.includes(keyword));
}

export function extractContextFromMessage(message: string): {
  type: 'mission' | 'values' | 'goals' | 'preferences' | 'facts';
  value: string;
} | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('our mission is') || lowerMessage.includes('our purpose is')) {
    const match = message.match(/(?:our )?mission (?:is|:)\s*(.+)/i);
    if (match) return { type: 'mission', value: match[1].trim() };
  }

  if (lowerMessage.includes('our values') || lowerMessage.includes('we value')) {
    const match = message.match(/(?:our values|we value)[:\s]+(.+)/i);
    if (match) return { type: 'values', value: match[1].trim() };
  }

  if (lowerMessage.includes('our goal') || lowerMessage.includes('we want to')) {
    const match = message.match(/(?:our goal|we want to)[:\s]+(.+)/i);
    if (match) return { type: 'goals', value: match[1].trim() };
  }

  return null;
}
