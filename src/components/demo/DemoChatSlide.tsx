import React from 'react';
import { Brain, Sparkles, Send } from 'lucide-react';
import { DEMO_CHAT_CONVERSATION } from '../../data/demoData';

interface DemoChatSlideProps {
  onClose: () => void;
}

export const DemoChatSlide: React.FC<DemoChatSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 flex flex-col h-full">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full mb-2">
          Demo Conversation
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Chat with Astra
        </h2>
        <p className="text-sm text-gray-400">
          Ask questions about your data and get intelligent answers
        </p>
      </div>

      <div className="max-w-3xl w-full mx-auto bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 bg-gray-800/80">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-medium text-white">Astra Intelligence</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Online
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {DEMO_CHAT_CONVERSATION.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Astra</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-4 py-3">
            <input
              type="text"
              placeholder="Ask Astra anything..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              disabled
            />
            <button
              disabled
              className="p-2 rounded-lg bg-blue-600 text-white opacity-50 cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Create an account to start chatting
          </p>
        </div>
      </div>
    </div>
  );
};
