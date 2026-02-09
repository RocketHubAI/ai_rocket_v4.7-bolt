import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  X,
  Loader2,
  Bot,
  User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

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

interface PrototypeContext {
  title: string;
  summary?: {
    whatItDoes: string;
    howItWorks: string;
    keyBenefits: string[];
  } | null;
  claudePlan?: PlatformBuildPlan | null;
  chatgptPlan?: PlatformBuildPlan | null;
}

interface BuildLabChatProps {
  userId: string;
  prototypeId: string;
  wishNumber: number;
  wishText: string;
  prototypeContext?: PrototypeContext;
  onClose: () => void;
}

export const BuildLabChat: React.FC<BuildLabChatProps> = ({
  userId,
  prototypeId,
  wishNumber,
  wishText,
  prototypeContext,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      setGenAI(new GoogleGenerativeAI(apiKey));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const buildSystemContext = () => {
    let context = `You are a helpful AI assistant in the Build Lab, helping users refine and improve their AI tool prototype.

The user's original wish/idea: "${wishText}"`;

    if (prototypeContext) {
      context += `\n\n=== CURRENT PROTOTYPE ===`;
      if (prototypeContext.title) {
        context += `\nTitle: ${prototypeContext.title}`;
      }
      if (prototypeContext.summary) {
        context += `\n\nWhat it does: ${prototypeContext.summary.whatItDoes}`;
        context += `\nHow it works: ${prototypeContext.summary.howItWorks}`;
        if (prototypeContext.summary.keyBenefits?.length) {
          context += `\nKey benefits: ${prototypeContext.summary.keyBenefits.join(', ')}`;
        }
      }
      if (prototypeContext.claudePlan) {
        context += `\n\n=== CLAUDE PROJECTS BUILD PLAN ===`;
        context += `\nOverview: ${prototypeContext.claudePlan.overview}`;
        context += `\n\nBuild steps for Claude:`;
        prototypeContext.claudePlan.steps.forEach((step, i) => {
          context += `\n${i + 1}. ${step.title}: ${step.description}`;
        });
        if (prototypeContext.claudePlan.advancedOptions?.length) {
          context += `\n\nAdvanced options:`;
          prototypeContext.claudePlan.advancedOptions.forEach(opt => {
            context += `\n- ${opt.tool}: ${opt.description}`;
          });
        }
      }
      if (prototypeContext.chatgptPlan) {
        context += `\n\n=== CUSTOM GPT BUILD PLAN ===`;
        context += `\nOverview: ${prototypeContext.chatgptPlan.overview}`;
        context += `\n\nBuild steps for ChatGPT:`;
        prototypeContext.chatgptPlan.steps.forEach((step, i) => {
          context += `\n${i + 1}. ${step.title}: ${step.description}`;
        });
        if (prototypeContext.chatgptPlan.advancedOptions?.length) {
          context += `\n\nAdvanced options:`;
          prototypeContext.chatgptPlan.advancedOptions.forEach(opt => {
            context += `\n- ${opt.tool}: ${opt.description}`;
          });
        }
      }
    }

    context += `\n\n=== YOUR ROLE ===
1. Help the user understand their prototype better
2. Answer questions about Claude Projects or Custom GPT build steps
3. Compare the two platforms and help choose which is best for their needs
4. Suggest modifications or improvements when asked
5. Help them think through implementation details
6. Be encouraging, practical, and specific

Keep responses concise and actionable. Focus on making their AI tool better.`;

    return context;
  };

  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('build_lab_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('wish_number', wishNumber)
        .order('message_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.message_role as 'user' | 'assistant' | 'system',
          content: m.message_content,
          createdAt: m.created_at
        })));
      } else {
        const prototypeTitle = prototypeContext?.title || 'your AI tool';
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `Hi! I'm here to help you with "${prototypeTitle}".\n\nYou can ask me to:\n- Explain how something works\n- Suggest different tools or approaches\n- Help with implementation details\n- Modify the build steps\n\nWhat would you like to know or change?`,
          createdAt: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, wishNumber, prototypeContext?.title]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    const tempUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const nextMessageNumber = messages.length;

      await supabase.from('build_lab_conversations').insert({
        user_id: userId,
        prototype_id: prototypeId,
        wish_number: wishNumber,
        message_role: 'user',
        message_content: userMessage,
        message_number: nextMessageNumber
      });

      if (!genAI) {
        throw new Error('Gemini API not initialized. Please check your API key.');
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const contextMessages = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      const systemContext = buildSystemContext();

      let responseText: string;

      if (contextMessages.length > 0) {
        const chat = model.startChat({
          history: contextMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        });

        const result = await chat.sendMessage(`${systemContext}\n\nUser message: ${userMessage}`);
        responseText = result.response.text();
      } else {
        const result = await model.generateContent(`${systemContext}\n\nUser message: ${userMessage}`);
        responseText = result.response.text();
      }

      await supabase.from('build_lab_conversations').insert({
        user_id: userId,
        prototype_id: prototypeId,
        wish_number: wishNumber,
        message_role: 'assistant',
        message_content: responseText,
        message_number: nextMessageNumber + 1
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Please try again.'}`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">Chat with AI</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
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
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-700 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your prototype..."
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
