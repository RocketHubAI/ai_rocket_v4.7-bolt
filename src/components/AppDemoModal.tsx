import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { DemoWelcomeSlide } from './demo/DemoWelcomeSlide';
import { DemoMissionControlSlide } from './demo/DemoMissionControlSlide';
import { DemoSmartDataSlide } from './demo/DemoSmartDataSlide';
import { DemoChatSlide } from './demo/DemoChatSlide';
import { DemoGuidedPromptsSlide } from './demo/DemoGuidedPromptsSlide';
import { DemoGuidedReportsSlide } from './demo/DemoGuidedReportsSlide';
import { DemoVisualizationsSlide } from './demo/DemoVisualizationsSlide';
import { DemoTeamChatSlide } from './demo/DemoTeamChatSlide';
import { DemoSecurePrivateSlide } from './demo/DemoSecurePrivateSlide';
import { DemoTeamDashboardSlide } from './demo/DemoTeamDashboardSlide';
import { DemoTeamPulseSlide } from './demo/DemoTeamPulseSlide';
import { DemoComingSoonSlide } from './demo/DemoComingSoonSlide';
import { DemoFinalSlide } from './demo/DemoFinalSlide';

interface AppDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDES = [
  { id: 'welcome', component: DemoWelcomeSlide, title: 'Welcome' },
  { id: 'mission-control', component: DemoMissionControlSlide, title: 'Mission Control' },
  { id: 'smart-data', component: DemoSmartDataSlide, title: 'AI Smart Data' },
  { id: 'chat', component: DemoChatSlide, title: 'Agent Chat' },
  { id: 'guided-prompts', component: DemoGuidedPromptsSlide, title: 'Guided Prompts' },
  { id: 'guided-reports', component: DemoGuidedReportsSlide, title: 'Guided Reports' },
  { id: 'visualizations', component: DemoVisualizationsSlide, title: 'Visualizations' },
  { id: 'team-chat', component: DemoTeamChatSlide, title: 'Team Chat' },
  { id: 'secure-private', component: DemoSecurePrivateSlide, title: 'Secure & Private' },
  { id: 'team-dashboard', component: DemoTeamDashboardSlide, title: 'Team Dashboard' },
  { id: 'team-pulse', component: DemoTeamPulseSlide, title: 'Team Pulse' },
  { id: 'coming-soon', component: DemoComingSoonSlide, title: 'Coming Soon' },
  { id: 'final', component: DemoFinalSlide, title: 'Get Started' },
];

export const AppDemoModal: React.FC<AppDemoModalProps> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'Escape') onClose();
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  const handleOpenInNewTab = () => {
    window.open('/demo', '_blank');
  };

  if (!isOpen) return null;

  const CurrentSlideComponent = SLIDES[currentSlide].component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={containerRef}
        className="relative w-full h-full max-w-5xl max-h-[90vh] mx-4 my-4 bg-gray-900 rounded-2xl overflow-hidden flex flex-col"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚀</span>
            <h2 className="text-lg font-semibold text-white">App Demo</h2>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {currentSlide + 1} / {SLIDES.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close demo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CurrentSlideComponent onClose={onClose} />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-6 bg-blue-500'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlide === SLIDES.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
