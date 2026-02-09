import React from 'react';
import { MessageSquareText, Sparkles, ArrowRight, Lightbulb, Clock, Target } from 'lucide-react';
import { DEMO_GUIDED_PROMPTS } from '../../data/demoData';

interface DemoGuidedPromptsSlideProps {
  onClose: () => void;
}

const promptBenefits = [
  { icon: Lightbulb, text: 'Get instant insights without complex queries', color: 'orange' },
  { icon: Clock, text: 'Save hours of manual data analysis', color: 'blue' },
  { icon: Target, text: 'Prompts tailored to your business context', color: 'emerald' },
];

export const DemoGuidedPromptsSlide: React.FC<DemoGuidedPromptsSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full mb-2">
          AI Assistance
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Astra Guided Prompts
        </h2>
        <p className="text-base text-gray-400 max-w-xl mx-auto">
          Pre-built prompts to get valuable insights from your data
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Smart Prompt Library</h3>
              <p className="text-sm text-gray-400">One-click prompts for your business</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-4">
            {DEMO_GUIDED_PROMPTS.map((category) => (
              <div key={category.category}>
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  {category.category}
                </h4>
                <div className="space-y-2">
                  {category.prompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center justify-between gap-3 p-3 bg-gray-900/50 hover:bg-gray-900 border border-gray-700 hover:border-orange-500/30 rounded-xl text-left transition-all group"
                    >
                      <span className="text-sm text-gray-300 group-hover:text-white line-clamp-2">
                        {prompt}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-sm text-gray-300">
              <span className="text-orange-400 font-medium">Pro tip:</span> Guided prompts learn from your data and improve over time
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4">
            {promptBenefits.map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <span className="text-sm text-gray-400">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
