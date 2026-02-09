import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, TrendingUp, Database, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getMetricsResponse } from '../lib/metrics-assistant';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MetricsData {
  overview?: {
    totalUsers: number;
    activeUsersToday: number;
    activeUsers7Days: number;
    activeUsers30Days: number;
    totalMessages: number;
    totalReports: number;
    totalVisualizations: number;
    avgResponseTime: number;
    errorRate: number;
  };
  dailyMetrics?: Array<{
    metric_date: string;
    daily_active_users: number;
    total_messages: number;
    total_reports: number;
    total_visualizations: number;
  }>;
  milestones?: Array<{
    milestone_type: string;
    users_achieved: number;
    achievement_rate_pct: number;
  }>;
  performance?: Array<{
    date: string;
    mode: string;
    avg_response_ms: number;
    success_rate: number;
    total_requests: number;
  }>;
  timeRange?: 7 | 30 | 90;
}

interface MetricsAskAstraProps {
  metricsData?: MetricsData;
}

export const MetricsAskAstra: React.FC<MetricsAskAstraProps> = ({ metricsData }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `Hi! I'm Astra, your metrics assistant with access to real-time data. I can analyze:\n\n• User engagement (${metricsData?.overview?.totalUsers || 'N/A'} total users)\n• Activity trends (${metricsData?.dailyMetrics?.length || 0} days of data)\n• Performance metrics (${metricsData?.overview?.avgResponseTime?.toFixed(0) || 'N/A'}ms avg response)\n• Milestone achievements (${metricsData?.milestones?.length || 0} tracked)\n\nAsk me anything about patterns, trends, or specific metrics!`,
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    "What's the user growth trend over the last 30 days?",
    "Compare message volume vs report generation",
    "Which day had the highest activity?",
    "What's the success rate for AI responses?",
    "Show me milestone completion rates"
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      if (!metricsData) {
        throw new Error('Metrics data not available. Please refresh the page.');
      }

      const responseText = await getMetricsResponse(question, metricsData);

      const astraMessage: Message = {
        id: `astra-${Date.now()}`,
        text: responseText || "I apologize, but I couldn't generate a response. Please try rephrasing your question.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, astraMessage]);
    } catch (error: any) {
      console.error('Error getting metrics response:', error);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: error?.message || "I'm having trouble processing your request. Please try again in a moment.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 via-green-500/10 to-blue-500/10 rounded-xl p-6 border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-blue-500 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Ask Astra About Metrics</h2>
            <p className="text-gray-400 text-sm">
              Powered by Gemini AI. Query your metrics using natural language - Astra analyzes all engagement data,
              performance logs, trends, and milestone achievements to provide intelligent insights.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Suggested Questions
        </h3>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((question, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestedQuestion(question)}
              className="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-sm text-gray-300 rounded-lg transition-colors border border-gray-700 hover:border-orange-500"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.isUser
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'bg-gray-900 text-gray-200 border border-gray-700'
                }`}
              >
                {!message.isUser && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-blue-500 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-orange-500">Astra</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                <div className={`text-xs mt-2 ${message.isUser ? 'text-orange-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  <span className="text-sm text-gray-400">Astra is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about metrics, trends, or performance..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <h4 className="font-semibold text-sm mb-1">Real-Time Data</h4>
              <p className="text-xs text-gray-400">
                Powered by Gemini AI with instant access to all metrics
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-semibold text-sm mb-1">Trend Analysis</h4>
              <p className="text-xs text-gray-400">
                Calculate growth rates and identify patterns
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-500 mt-1" />
            <div>
              <h4 className="font-semibold text-sm mb-1">Intelligent Insights</h4>
              <p className="text-xs text-gray-400">
                Get actionable recommendations based on data
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
