import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader, Sparkles, BarChart3 } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatAstraMessage } from '../../utils/formatAstraMessage';

interface FirstPromptStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

interface AvailableDataTypes {
  categories: string[];
  totalDocuments: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const getContextualQuestions = (dataTypes: AvailableDataTypes): string[] => {
  const { categories, totalDocuments } = dataTypes;
  const questions: string[] = [];

  if (categories.includes('strategy')) {
    questions.push('What is our team\'s mission and core values?');
    questions.push('What are our current strategic goals?');
  }

  if (categories.includes('meetings')) {
    questions.push('What were the key decisions from recent meetings?');
    questions.push('What are the main action items from our meetings?');
  }

  if (categories.includes('financial')) {
    questions.push('Summarize our financial performance');
    questions.push('What are our main revenue streams?');
  }

  if (categories.includes('sales')) {
    questions.push('What is our current sales pipeline status?');
  }

  if (categories.includes('marketing')) {
    questions.push('What marketing campaigns are currently active?');
  }

  if (categories.includes('product')) {
    questions.push('What is our product roadmap?');
  }

  if (questions.length === 0 && totalDocuments > 0) {
    questions.push('Tell me about the documents you have access to');
    questions.push('What information can you help me with?');
    questions.push('Give me a summary of our synced data');
  }

  if (questions.length === 0) {
    questions.push('What information can you help me with?');
  }

  return questions.slice(0, 3);
};

export const FirstPromptStep: React.FC<FirstPromptStepProps> = ({ onComplete, progress }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [dataTypes, setDataTypes] = useState<AvailableDataTypes>({
    categories: [],
    totalDocuments: 0,
  });
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [showVisualizationHint, setShowVisualizationHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasAskedQuestion = progress?.step_7_first_prompt_sent || messages.some(m => m.role === 'assistant' && m.content);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkAvailableData = async () => {
      if (!user) return;

      const teamId = user.user_metadata?.team_id;
      if (!teamId) return;

      try {
        const { data: categoryData, error } = await supabase.rpc('get_team_category_counts', {
          p_team_id: teamId
        });

        if (error) throw error;

        const categories = categoryData?.map((c: { category: string }) => c.category) || [];
        const totalDocuments = categoryData?.reduce((sum: number, c: { count: number }) => sum + c.count, 0) || 0;

        const types: AvailableDataTypes = {
          categories,
          totalDocuments,
        };

        setDataTypes(types);
        setExampleQuestions(getContextualQuestions(types));
      } catch (error) {
        console.error('Error checking available data:', error);
        setExampleQuestions(getContextualQuestions({
          categories: [],
          totalDocuments: 0,
        }));
      }
    };

    checkAvailableData();
  }, [user]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || !user) return;

    const userMessageContent = message.trim();
    let userMessageId: string | null = null;

    // Save user message to database first
    try {
      const { data: savedMessage, error: saveError } = await supabase
        .from('astra_chats')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          message: userMessageContent,
          message_type: 'user',
          mode: 'private',
          visualization: false
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving user message:', saveError);
      } else {
        userMessageId = savedMessage.id;
        console.log('✅ Saved user message with ID:', userMessageId);
      }
    } catch (err) {
      console.error('❌ Error in message save:', err);
    }

    const userMessage: Message = {
      id: userMessageId || `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsSending(true);

    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      const teamId = user.user_metadata?.team_id;
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

      let teamName = '';
      let role = user.user_metadata?.role || 'member';
      let viewFinancial = user.user_metadata?.view_financial !== false;

      try {
        const { data: userData } = await supabase
          .rpc('get_user_team_info', { p_user_id: user.id });

        if (userData && userData.length > 0) {
          const userInfo = userData[0];
          teamName = userInfo.team_name || '';
          role = userInfo.role || role;
          viewFinancial = userInfo.view_financial !== false;
        }
      } catch (err) {
        console.error('Error fetching user team info:', err);
      }

      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

      const requestBody = {
        chatInput: userMessage.content,
        user_id: user.id,
        user_email: user.email,
        user_name: userName,
        conversation_id: null,
        team_id: teamId,
        team_name: teamName,
        role: role,
        view_financial: viewFinancial,
        mode: 'private'
      };

      console.log('📤 Sending request:', requestBody);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500) {
          throw new Error('The request was too large to process. Try asking for "recent meetings" or "a sampling of documents" instead of all documents at once.');
        } else if (response.status === 504 || response.status === 408) {
          throw new Error('The request timed out. Try narrowing your question to focus on specific documents or recent data.');
        }
        throw new Error(`Webhook request failed: ${response.status}`);
      }

      const data = await response.json();

      let messageText = data.output || data.response || 'I received your message! Let me help you with that.';

      // Save AI response to database
      let aiMessageId: string | null = null;
      try {
        const { data: savedAiMessage, error: aiSaveError } = await supabase
          .from('astra_chats')
          .insert({
            user_id: user.id,
            user_email: user.email || '',
            user_name: 'Astra',
            message: messageText,
            message_type: 'astra',
            mode: 'private',
            visualization: false
          })
          .select()
          .single();

        if (aiSaveError) {
          console.error('❌ Error saving AI message:', aiSaveError);
        } else {
          aiMessageId = savedAiMessage.id;
          console.log('✅ Saved AI message with ID:', aiMessageId);
        }
      } catch (err) {
        console.error('❌ Error in AI message save:', err);
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingMessage.id);
        const assistantMessage: Message = {
          id: aiMessageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: messageText,
          timestamp: new Date(),
        };
        return [...filtered, assistantMessage];
      });

      setShowVisualizationHint(true);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorText = error.message || 'I apologize, but I encountered an issue processing your request. Please try again.';

      let errorContent = errorText;
      if (errorText.includes('too large')) {
        errorContent = `${errorText}\n\nTips for better results:\n• Request "recent meetings" instead of "all meetings"\n• Ask for "a sampling of documents" rather than everything\n• Be specific: "latest 5 meetings" or "this month's data"\n• Focus your question on specific topics or time periods`;
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingMessage.id);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleExampleClick = (question: string) => {
    setMessage(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (hasAskedQuestion && showVisualizationHint) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4 max-h-[280px] overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                    : msg.content
                    ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-600/40 text-gray-100'
                    : 'bg-gray-700/50 text-gray-400'
                }`}
              >
                {msg.content ? (
                  msg.role === 'assistant' ? formatAstraMessage(msg.content) : msg.content
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm italic">Astra is thinking...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-600/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600/30 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1 text-sm">Next: Try a Visualization!</h3>
              <p className="text-xs text-green-300 mb-2">
                Turn text responses into charts, graphs, and visual insights
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-950/50 rounded px-2 py-1 text-center">
                  <span className="text-lg">📊</span>
                  <p className="text-xs text-green-200">Charts</p>
                </div>
                <div className="bg-green-950/50 rounded px-2 py-1 text-center">
                  <span className="text-lg">📈</span>
                  <p className="text-xs text-green-200">Graphs</p>
                </div>
                <div className="bg-green-950/50 rounded px-2 py-1 text-center">
                  <span className="text-lg">🗓️</span>
                  <p className="text-xs text-green-200">Timelines</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px] flex items-center gap-2 shadow-lg"
          >
            Create Visualization
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 mb-3">
          <MessageSquare className="w-7 h-7 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Ask Your First Question</h2>
        <p className="text-sm text-gray-400">Experience Astra's AI intelligence</p>
      </div>

      {messages.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 max-h-[240px] overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                    : msg.content
                    ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-600/40 text-gray-100'
                    : 'bg-gray-700/50 text-gray-400'
                }`}
              >
                {msg.content ? (
                  msg.role === 'assistant' ? formatAstraMessage(msg.content) : msg.content
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm italic">Astra is thinking...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {messages.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Try these questions:</h3>
          </div>
          <div className="space-y-2">
            {exampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(q)}
                className="w-full text-left p-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 hover:from-purple-900/30 hover:to-blue-900/30 border border-gray-700 hover:border-purple-600/50 rounded-lg text-sm text-gray-300 transition-all flex items-start gap-2 group"
              >
                <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-3">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question or click an example above..."
            className="w-full bg-gray-900 text-white rounded-lg p-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-700"
            rows={3}
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {isSending ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
