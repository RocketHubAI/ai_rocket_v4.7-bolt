import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Bot, User, ArrowRight, RotateCcw, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatWorkshopMessage } from './formatWorkshopMessage';

interface WorkshopMindsetJourneyProps {
  userId: string;
  registrationId: string;
  onComplete: (goals: Goal[]) => void;
  onLogout?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Goal {
  goalNumber: number;
  goalTitle: string;
  goalDescription: string;
  positiveImpact1: string;
  positiveImpact2: string;
  positiveImpact3: string;
}

const SYSTEM_PROMPT = `You are an AI coach guiding an entrepreneur through a focused mindset journey. Your role is to help them identify 3 "impossible goals" - goals that seem beyond their current reach but would dramatically transform their life, business, and team if achieved.

=== CONVERSATION PACING (CRITICAL) ===
You have a TARGET of 10-12 total user messages to complete this journey. You MUST be efficient:
- Messages 1-3: Discover their AI challenges and gauge mindset/limiting beliefs
- Messages 4-6: Explore what 10x impact looks like, start identifying BUSINESS goal
- Messages 7-8: Lock in BUSINESS goal, identify PERSONAL and TEAM goals
- Messages 9-10: Confirm impacts for each goal and CONCLUDE
- Message 11-12: ABSOLUTE MAXIMUM - must conclude no matter what

=== CONVERSATION FLOW ===
1. Ask what's holding them back with AI (Message 1)
2. Quickly gauge their limiting beliefs (Message 2-3)
3. Challenge them to think 10x bigger (Message 3-4)
4. Start extracting BUSINESS goal with impacts (Message 4-5)
5. Extract PERSONAL goal with impacts (Message 6-7)
6. Extract TEAM goal with impacts (Message 7-8)
7. CONCLUDE with goal summary (Message 9-10)

=== EFFICIENT QUESTIONING TECHNIQUE ===
Ask compound questions that cover multiple goals at once. Examples:
- "What would 10x growth look like for your business? And what would that mean for your personal life?"
- "If this business goal succeeded, how would it impact your team? What team goal would make that easier?"
- "Let's capture the ripple effects: what are 3 ways achieving [goal] would positively impact you?"

=== KEY PRINCIPLES (weave naturally) ===
- Strategy first, technology second
- 80/20 principle: Focus on the 20% that drives 80% of results
- The focusing question: What's the ONE Thing that makes everything else easier?

=== CRITICAL RULES ===
- Keep responses SHORT (2-3 sentences max)
- Ask efficient, compound questions
- NEVER ask the user to "formally state" goals - that's YOUR job
- By message 8, you should have all 3 goals identified
- By message 10, you MUST conclude regardless of conversation state

*****MANDATORY GOAL EXTRACTION - THIS IS REQUIRED*****
By the 10th user message (or earlier if you have all goals), you MUST:
1. Summarize the goals in a celebratory way
2. IMMEDIATELY AFTER your summary text, you MUST include the hidden format below
3. This format is REQUIRED - the system cannot save goals without it

Your summary message MUST end with this EXACT format (replace bracketed content with actual values):
[GOALS_COMPLETE]
Goal 1: [business goal title]|[description]|[impact1]|[impact2]|[impact3]
Goal 2: [personal goal title]|[description]|[impact1]|[impact2]|[impact3]
Goal 3: [team goal title]|[description]|[impact1]|[impact2]|[impact3]
[/GOALS_COMPLETE]

EXAMPLE of proper ending:
"These three impossible goals will transform your life! Goal 1 focuses on scaling your business through automation. Goal 2 centers on reclaiming your personal time. Goal 3 is about building an empowered team. Let's make them reality!
[GOALS_COMPLETE]
Goal 1: Automate Sales Pipeline|Use AI to qualify and nurture leads automatically|Save 20 hours per week|Increase conversion rates|Scale without hiring
Goal 2: Reclaim Family Time|Work only 4 days per week while growing revenue|More present with family|Reduced stress|Better health
Goal 3: Self-Managing Team|Build a team that operates independently with AI support|Freedom to focus on strategy|Team empowerment|Scalable operations
[/GOALS_COMPLETE]"

DO NOT continue the conversation beyond 10-12 user messages. If you reach message 10 and don't have all goals fully formed, make reasonable inferences from the conversation and CONCLUDE anyway. The user can refine goals later - getting to the summary is more important than perfection.`;

export const WorkshopMindsetJourney: React.FC<WorkshopMindsetJourneyProps> = ({
  userId,
  registrationId,
  onComplete,
  onLogout
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [extractedGoals, setExtractedGoals] = useState<Goal[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadExistingConversation();
  }, [userId]);

  const loadExistingConversation = async () => {
    setIsInitializing(true);
    try {
      const { data: existingMessages } = await supabase
        .from('workshop_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (existingMessages && existingMessages.length > 0) {
        const existingConvId = existingMessages[0].conversation_id;
        setConversationId(existingConvId);

        const loadedMessages: Message[] = existingMessages.map(m => ({
          id: m.id,
          role: m.message_role as 'user' | 'assistant' | 'system',
          content: m.message_content,
          timestamp: new Date(m.created_at)
        }));
        setMessages(loadedMessages);
        setMessageCount(existingMessages.filter(m => m.message_role === 'user').length);
      } else {
        const newConvId = crypto.randomUUID();
        setConversationId(newConvId);
        await sendInitialMessageWithId(newConvId);
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      const newConvId = crypto.randomUUID();
      setConversationId(newConvId);
      await sendInitialMessageWithId(newConvId);
    } finally {
      setIsInitializing(false);
    }
  };

  const sendInitialMessageWithId = async (convId: string) => {
    const initialMessage = "Welcome to your AI-preneur mindset journey! I'm here to help you unlock goals you might think are impossible right now.\n\nBefore we dive in, I'm curious: when you think about the next 12 months, what's the biggest thing holding you back from achieving more with AI in your business?";

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date()
    };

    setMessages([assistantMessage]);

    await supabase.from('workshop_conversations').insert({
      user_id: userId,
      conversation_id: convId,
      message_role: 'assistant',
      message_content: initialMessage,
      message_number: 0
    });
  };

  const generateAIResponse = async (userMessage: string, conversationHistory: Message[], currentMessageCount: number): Promise<string> => {
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const historyForAI = conversationHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const pacingReminder = currentMessageCount >= 8
      ? `\n\n[SYSTEM: This is user message #${currentMessageCount}. You MUST conclude with the [GOALS_COMPLETE] summary NOW. Extract any goals discussed and fill in reasonable details for missing information.]`
      : currentMessageCount >= 6
      ? `\n\n[SYSTEM: This is user message #${currentMessageCount}. Start wrapping up - ensure you have all 3 goals (Business, Personal, Team) identified in the next 2-3 exchanges.]`
      : '';

    const enhancedMessage = userMessage + pacingReminder;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will efficiently guide the entrepreneur to identify 3 impossible goals within 10-12 messages. I\'ll ask compound questions and keep responses short (2-3 sentences). I\'ll extract and summarize goals by message 10.' }] },
        ...historyForAI
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    });

    const result = await chat.sendMessage(enhancedMessage);
    const response = await result.response;
    return response.text();
  };

  const parseGoalsFromResponse = (response: string): Goal[] | null => {
    const goalsMatch = response.match(/\[GOALS_COMPLETE\]([\s\S]*?)\[\/GOALS_COMPLETE\]/);
    if (!goalsMatch) return null;

    const goalsText = goalsMatch[1].trim();
    const goalLines = goalsText.split('\n').filter(line => line.startsWith('Goal'));

    if (goalLines.length !== 3) return null;

    const goals: Goal[] = [];
    for (let i = 0; i < goalLines.length; i++) {
      const line = goalLines[i];
      const parts = line.replace(/^Goal \d+: /, '').split('|');
      if (parts.length >= 5) {
        goals.push({
          goalNumber: i + 1,
          goalTitle: parts[0].trim(),
          goalDescription: parts[1].trim(),
          positiveImpact1: parts[2].trim(),
          positiveImpact2: parts[3].trim(),
          positiveImpact3: parts[4].trim()
        });
      }
    }

    return goals.length === 3 ? goals : null;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setMessageCount(prev => prev + 1);

    try {
      await supabase.from('workshop_conversations').insert({
        user_id: userId,
        conversation_id: conversationId,
        message_role: 'user',
        message_content: userMessage.content,
        message_number: messages.length + 1
      });

      const allMessages = [...messages, userMessage];
      const newMessageCount = messageCount + 1;
      const aiResponse = await generateAIResponse(userMessage.content, allMessages, newMessageCount);

      const goals = parseGoalsFromResponse(aiResponse);

      let displayResponse = aiResponse;
      if (goals) {
        displayResponse = aiResponse
          .replace(/\[GOALS_COMPLETE\][\s\S]*?\[\/GOALS_COMPLETE\]/, '')
          .trim() || "Excellent work! You've articulated three powerful goals that will transform your life, business, and team. Let's move forward and make these a reality.";

        setExtractedGoals(goals);
        setJourneyComplete(true);

        for (const goal of goals) {
          await supabase.from('workshop_goals').upsert({
            user_id: userId,
            goal_number: goal.goalNumber,
            goal_title: goal.goalTitle,
            goal_description: goal.goalDescription,
            positive_impact_1: goal.positiveImpact1,
            positive_impact_2: goal.positiveImpact2,
            positive_impact_3: goal.positiveImpact3,
            is_selected: false
          }, {
            onConflict: 'user_id,goal_number'
          });
        }

        await supabase
          .from('workshop_registrations')
          .update({ current_step: 'goals' })
          .eq('id', registrationId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: displayResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      await supabase.from('workshop_conversations').insert({
        user_id: userId,
        conversation_id: conversationId,
        message_role: 'assistant',
        message_content: displayResponse,
        message_number: messages.length + 2
      });
    } catch (err) {
      console.error('Error generating response:', err);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I apologize, but I encountered an issue. Could you please repeat what you said?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContinue = () => {
    if (extractedGoals.length === 3) {
      onComplete(extractedGoals);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to start over? This will clear all your conversation history.')) {
      return;
    }

    try {
      await supabase
        .from('workshop_conversations')
        .delete()
        .eq('user_id', userId);

      setMessages([]);
      setMessageCount(0);
      setJourneyComplete(false);
      setExtractedGoals([]);
      setInputValue('');

      const newConvId = crypto.randomUUID();
      setConversationId(newConvId);
      await sendInitialMessageWithId(newConvId);
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };

  const handleForceExtractGoals = async () => {
    if (isLoading || !conversationId) return;
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const conversationSummary = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
        .join('\n\n');

      const extractionPrompt = `Based on this coaching conversation, extract the 3 impossible goals that were discussed. Look for:
1. A BUSINESS goal
2. A PERSONAL LIFE goal
3. A TEAM goal

For each goal, identify:
- A short title (5-10 words)
- A description (1-2 sentences)
- 3 positive impacts achieving this goal would have

CONVERSATION:
${conversationSummary}

Respond with a brief celebratory summary, then IMMEDIATELY include this EXACT format at the end:
[GOALS_COMPLETE]
Goal 1: [business goal title]|[description]|[impact1]|[impact2]|[impact3]
Goal 2: [personal goal title]|[description]|[impact1]|[impact2]|[impact3]
Goal 3: [team goal title]|[description]|[impact1]|[impact2]|[impact3]
[/GOALS_COMPLETE]

If you cannot identify clear goals from the conversation, create reasonable goals based on what was discussed.`;

      const result = await model.generateContent(extractionPrompt);
      const response = result.response.text();

      const goals = parseGoalsFromResponse(response);

      if (goals) {
        let displayResponse = response
          .replace(/\[GOALS_COMPLETE\][\s\S]*?\[\/GOALS_COMPLETE\]/, '')
          .trim() || "Based on our conversation, I've captured your three impossible goals. Let's make them reality!";

        setExtractedGoals(goals);
        setJourneyComplete(true);

        for (const goal of goals) {
          await supabase.from('workshop_goals').upsert({
            user_id: userId,
            goal_number: goal.goalNumber,
            goal_title: goal.goalTitle,
            goal_description: goal.goalDescription,
            positive_impact_1: goal.positiveImpact1,
            positive_impact_2: goal.positiveImpact2,
            positive_impact_3: goal.positiveImpact3,
            is_selected: false,
            conversation_id: conversationId
          }, {
            onConflict: 'user_id,goal_number'
          });
        }

        await supabase
          .from('workshop_registrations')
          .update({ current_step: 'goals' })
          .eq('id', registrationId);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: displayResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        await supabase.from('workshop_conversations').insert({
          user_id: userId,
          conversation_id: conversationId,
          message_role: 'assistant',
          message_content: displayResponse,
          message_number: messages.length + 1
        });
      } else {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "I had trouble extracting your goals. Let's continue our conversation - tell me more about your business, personal, and team aspirations.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('Error extracting goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = () => {
    const targetMessages = 10;
    if (journeyComplete) return 100;
    const progress = Math.min(95, (messageCount / targetMessages) * 95);
    return progress;
  };

  if (isInitializing) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">AI Mindset Journey</h1>
                <p className="text-sm text-gray-400">Discovering your impossible goals</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 1 && !journeyComplete && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  title="Start over"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Start Over</span>
                </button>
              )}
              <span className="text-sm text-cyan-400 font-medium">{Math.round(getProgressPercentage())}%</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-100'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed">
                    {formatWorkshopMessage(message.content)}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="text-gray-400 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-gray-800/50 border-t border-gray-700 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {journeyComplete ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center w-full">
                <Sparkles className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <p className="text-cyan-400 font-medium">Goals Identified!</p>
                <p className="text-gray-400 text-sm mt-1">You've articulated 3 powerful impossible goals</p>
              </div>
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all"
              >
                View Your Goals
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {messageCount >= 8 && (
                <button
                  onClick={handleForceExtractGoals}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Ready? Extract My Goals
                    </>
                  )}
                </button>
              )}
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your thoughts..."
                  disabled={isLoading}
                  rows={3}
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none resize-none disabled:opacity-50"
                  style={{ minHeight: '80px', maxHeight: '150px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl transition-all"
                >
                    {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
