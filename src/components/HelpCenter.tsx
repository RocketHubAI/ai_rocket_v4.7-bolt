import { useState, useEffect } from 'react';
import { X, BookOpen, MessageCircleQuestion, Sparkles, Zap } from 'lucide-react';
import { FAQSection } from './FAQSection';
import { HelpAssistant } from './HelpAssistant';
import { QuickStartGuide } from './QuickStartGuide';
import { WhatsNewSection } from './WhatsNewSection';

export type HelpCenterTab = 'quick-start' | 'whats-new' | 'faq' | 'ask-astra';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  isAdmin: boolean;
  initialTab?: HelpCenterTab;
}

export function HelpCenter({ isOpen, onClose, onStartTour, isAdmin, initialTab = 'quick-start' }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<HelpCenterTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-gray-900 shadow-2xl z-[100] transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Help Center</h2>
              <p className="text-sm text-purple-100">Learn how to use AI Rocket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close help center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('quick-start')}
            className={`flex-1 py-3 px-2 sm:px-4 font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[56px] sm:min-h-[44px] whitespace-nowrap ${
              activeTab === 'quick-start'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <BookOpen className="w-4 h-4 sm:w-4 sm:h-4" />
            <span>Quick Start</span>
          </button>
          <button
            onClick={() => setActiveTab('whats-new')}
            className={`flex-1 py-3 px-2 sm:px-4 font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[56px] sm:min-h-[44px] whitespace-nowrap ${
              activeTab === 'whats-new'
                ? 'text-orange-400 border-b-2 border-orange-400 bg-gray-800/50'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Zap className="w-4 h-4 sm:w-4 sm:h-4" />
            <span>What's New</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-3 px-2 sm:px-4 font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[56px] sm:min-h-[44px] whitespace-nowrap ${
              activeTab === 'faq'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <MessageCircleQuestion className="w-4 h-4 sm:w-4 sm:h-4" />
            <span>FAQ</span>
          </button>
          <button
            onClick={() => setActiveTab('ask-astra')}
            className={`flex-1 py-3 px-2 sm:px-4 font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[56px] sm:min-h-[44px] whitespace-nowrap ${
              activeTab === 'ask-astra'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-4 sm:h-4" />
            <span>AI Help</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'quick-start' && (
            <QuickStartGuide onStartTour={onStartTour} isAdmin={isAdmin} />
          )}
          {activeTab === 'whats-new' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">Latest Updates</h3>
                <p className="text-sm text-gray-400">
                  Stay up to date with the newest features and improvements to AI Rocket.
                </p>
              </div>
              <WhatsNewSection />
            </div>
          )}
          {activeTab === 'faq' && <FAQSection isAdmin={isAdmin} />}
          {activeTab === 'ask-astra' && <HelpAssistant />}
        </div>
      </div>
    </>
  );
}
