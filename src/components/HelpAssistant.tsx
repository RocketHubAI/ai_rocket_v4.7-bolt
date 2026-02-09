import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getHelpResponse, saveHelpConversation, getHelpConversations } from '../lib/help-assistant';

interface Message {
  id: string;
  question: string;
  response: string;
  created_at: string;
}

const formatMessageText = (text: string): JSX.Element => {
  // Split text into lines and process each line
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines but add spacing
    if (!trimmedLine) {
      elements.push(<br key={`br-${index}`} />);
      return;
    }

    // Handle numbered lists (1. 2. 3. etc.)
    const numberedListMatch = trimmedLine.match(/^(\d+)\.\s*\*\*(.*?)\*\*:\s*(.*)$/);
    if (numberedListMatch) {
      const [, number, title, content] = numberedListMatch;
      elements.push(
        <div key={index} className="mb-4">
          <div className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {number}
            </span>
            <div className="flex-1">
              <div className="font-bold text-purple-300 mb-1">{title}</div>
              <div className="text-gray-300 leading-relaxed">{content}</div>
            </div>
          </div>
        </div>
      );
      return;
    }

    // Handle regular bold text
    const boldRegex = /\*\*(.*?)\*\*/g;
    if (boldRegex.test(trimmedLine)) {
      const parts = trimmedLine.split(boldRegex);
      const formattedParts = parts.map((part, partIndex) => {
        if (partIndex % 2 === 1) {
          return <strong key={partIndex} className="font-bold text-purple-300">{part}</strong>;
        }
        return part;
      });
      elements.push(<div key={index} className="mb-2">{formattedParts}</div>);
      return;
    }

    // Handle bullet points
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
      elements.push(
        <div key={index} className="flex items-start space-x-2 mb-2 ml-4">
          <span className="text-purple-400 mt-1">•</span>
          <span className="text-gray-300">{trimmedLine.substring(1).trim()}</span>
        </div>
      );
      return;
    }

    // Regular text
    elements.push(<div key={index} className="mb-2 text-gray-300">{trimmedLine}</div>);
  });

  return <div>{elements}</div>;
};

export function HelpAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCloseThread = () => {
    setMessages([]);
    // Scroll back to top when closing thread
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (user) {
      loadConversationHistory();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadConversationHistory = async () => {
    if (!user) return;

    try {
      setIsLoadingHistory(true);
      const history = await getHelpConversations(user.id);
      setMessages(history);
    } catch (error) {
      console.error('Error loading help conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isLoading) return;

    const question = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const response = await getHelpResponse(question);

      await saveHelpConversation(user.id, question, response);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        question,
        response,
        created_at: new Date().toISOString()
      }]);
    } catch (error: any) {
      console.error('Error getting help response:', error);
      const errorMessage = error?.message || 'Sorry, I encountered an error. Please try again or check the FAQ section for common questions.';

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        question,
        response: errorMessage,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">
              AI Help
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              I can help you learn how to use AI Rocket. Ask me anything about features, settings, or how to get started!
            </p>
            <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
              <button
                onClick={() => setInput('What kind of questions can I ask to get the best responses?')}
                className="w-full text-left px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                What kind of questions can I ask to get the best responses?
              </button>
              <button
                onClick={() => setInput('What\'s the difference between Private and Team chat?')}
                className="w-full text-left px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                What's the difference between Private and Team chat?
              </button>
              <button
                onClick={() => setInput('What are Reports and how can I use them?')}
                className="w-full text-left px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                What are Reports and how can I use them?
              </button>
              <button
                onClick={() => setInput('How do I create, save and export visualizations?')}
                className="w-full text-left px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                How do I create, save and export visualizations?
              </button>
              <button
                onClick={() => setInput('How does AI Rocket understand me, our team, and our data?')}
                className="w-full text-left px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                How does AI Rocket understand me, our team, and our data?
              </button>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%]">
                <p className="text-sm">{message.question}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <div className="text-sm leading-relaxed">
                    {formatMessageText(message.response)}
                  </div>
                </div>
                {index === messages.length - 1 && !isLoading && (
                  <button
                    onClick={handleCloseThread}
                    className="mt-2 ml-1 text-xs text-gray-400 hover:text-purple-400 transition-colors underline"
                  >
                    Close this thread
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about AI Rocket..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
