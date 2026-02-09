import React, { useState, useEffect } from 'react';
import { Brain, Database, FileSearch, Target, Sparkles } from 'lucide-react';

interface LoadingStage {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const loadingStages: LoadingStage[] = [
  {
    icon: <Brain className="w-full h-full" />,
    title: "Forming a plan",
    description: "Analyzing your question to create the best approach"
  },
  {
    icon: <Database className="w-full h-full" />,
    title: "Gathering your data",
    description: "Searching through your connected documents and files"
  },
  {
    icon: <FileSearch className="w-full h-full" />,
    title: "Reviewing content",
    description: "Reading relevant information from your knowledge base"
  },
  {
    icon: <Target className="w-full h-full" />,
    title: "Aligning with your mission",
    description: "Ensuring the response reflects your team's values and goals"
  },
  {
    icon: <Sparkles className="w-full h-full" />,
    title: "Formulating a response",
    description: "Crafting a comprehensive answer tailored to your needs"
  }
];

export const LoadingIndicator: React.FC = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStage < loadingStages.length - 1) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentStage(prev => prev + 1);
          setIsTransitioning(false);
        }, 300);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStage]);

  const stage = loadingStages[currentStage];

  return (
    <div className="flex justify-start mb-3 md:mb-4">
      <div className="flex-shrink-0 mr-2 md:mr-3 mt-1">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-sm md:text-lg animate-pulse">
          🚀
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-lg max-w-sm md:max-w-md">
        <div
          className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center text-blue-400 border border-blue-500/30">
                <div className="w-6 h-6 md:w-7 md:h-7">
                  {stage.icon}
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 animate-ping opacity-30" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-sm md:text-base">{stage.title}</span>
            </div>
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-400 pl-[52px] md:pl-[60px]">
            {stage.description}
          </p>
        </div>

        <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-600/50">
          {loadingStages.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                index < currentStage
                  ? 'bg-green-500'
                  : index === currentStage
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
