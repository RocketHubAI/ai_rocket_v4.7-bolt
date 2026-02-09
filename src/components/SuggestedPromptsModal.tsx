import React from 'react';
import { X, Sparkles, Send, Star, Target } from 'lucide-react';

interface SuggestedPrompt {
  title: string;
  prompt: string;
  description: string;
}

interface SuggestedPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
  onOpenGuidedChat: () => void;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    title: "Get Expert Prompts",
    prompt: "Acting as an expert prompt engineer, please provide a list of 10 useful prompts that I can submit in order to gain the most value from AI Rocket",
    description: "Unlock AI Rocket's full potential by getting expert-crafted prompts that leverage all data sources and capabilities."
  },
  {
    title: "Mission Alignment Analysis",
    prompt: "Summarize our mission, core values, and goals, then analyze how well our recent activities align with them",
    description: "Gets foundational company direction and immediately provides an alignment check against current work."
  },
  {
    title: "Leadership Meeting Insights",
    prompt: "Summarize my last 4 leadership meetings and identify key trends, insights, and recommendations for improvement",
    description: "Goes beyond basic summaries to extract patterns and actionable intelligence from meeting history."
  },
  {
    title: "Team Alignment Assessment",
    prompt: "Analyze our recent meetings and assess how well the team is staying aligned with our mission, core values, and goals",
    description: "Provides strategic oversight by connecting day-to-day discussions to long-term company direction."
  },
  {
    title: "Financial Analysis",
    prompt: "Summarize our financials, then generate a cash flow and burn rate analysis with projections",
    description: "Delivers comprehensive financial intelligence in one query - current state plus forward-looking analysis."
  },
  {
    title: "Strategic Financial Alignment",
    prompt: "Review our financial data and evaluate how our spending and resource allocation aligns with our mission, core values, and strategic goals",
    description: "Connects financial decisions to strategic priorities, ensuring money flows toward what matters most."
  }
];

export const SuggestedPromptsModal: React.FC<SuggestedPromptsModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  onOpenGuidedChat
}) => {
  if (!isOpen) return null;

  const handleSelectPrompt = (prompt: string) => {
    onSelectPrompt(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 via-green-500 to-blue-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Suggested Prompts</h2>
              <p className="text-sm text-gray-400">Optimize your Agent Chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="space-y-3">
            {/* Agent Guided Chat - Featured Option */}
            <button
              onClick={() => {
                onClose();
                onOpenGuidedChat();
              }}
              className="w-full text-left p-4 rounded-lg border transition-all group relative bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border-blue-500/50 hover:border-blue-400 shadow-lg"
            >
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Star className="w-3 h-3 fill-white" />
                START HERE
              </div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-300 group-hover:text-blue-200 transition-colors">
                    Agent Guided Chat
                  </h3>
                </div>
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
              <p className="text-sm text-gray-200 ml-12 mb-2">
                Get AI-powered prompts tailored to YOUR data. AI Rocket will analyze your documents, meetings, and files to suggest the most valuable questions you can ask.
              </p>
              <p className="text-xs text-gray-300 ml-12 italic">
                <span className="font-medium text-blue-300">Why start here:</span> Skip the guesswork. Let the AI recommend prompts based on what data you actually have available.
              </p>
            </button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-gray-800 text-gray-400">OR CHOOSE A GENERAL PROMPT</span>
              </div>
            </div>

            {SUGGESTED_PROMPTS.map((item, index) => {
              return (
                <button
                  key={index}
                  onClick={() => handleSelectPrompt(item.prompt)}
                  className="w-full text-left p-3 rounded-lg border transition-all group relative bg-gray-700/50 hover:bg-gray-700 border-gray-600 hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-base font-semibold transition-colors text-white group-hover:text-blue-400">
                      {item.title}
                    </h3>
                    <Send className="w-4 h-4 flex-shrink-0 ml-2 mt-0.5 text-blue-400" />
                  </div>
                  <p className="text-xs mb-2 italic line-clamp-2 text-gray-300">
                    "{item.prompt}"
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    <span className="font-medium text-gray-300">Why it's valuable:</span> {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
