import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { DemoWelcomeSlide } from '../components/demo/DemoWelcomeSlide';
import { DemoMissionControlSlide } from '../components/demo/DemoMissionControlSlide';
import { DemoSmartDataSlide } from '../components/demo/DemoSmartDataSlide';
import { DemoChatSlide } from '../components/demo/DemoChatSlide';
import { DemoGuidedPromptsSlide } from '../components/demo/DemoGuidedPromptsSlide';
import { DemoGuidedReportsSlide } from '../components/demo/DemoGuidedReportsSlide';
import { DemoVisualizationsSlide } from '../components/demo/DemoVisualizationsSlide';
import { DemoTeamChatSlide } from '../components/demo/DemoTeamChatSlide';
import { DemoComingSoonSlide } from '../components/demo/DemoComingSoonSlide';
import { DemoFinalSlide } from '../components/demo/DemoFinalSlide';

const SLIDES = [
  { id: 'welcome', component: DemoWelcomeSlide, title: 'Welcome' },
  { id: 'mission-control', component: DemoMissionControlSlide, title: 'Mission Control' },
  { id: 'smart-data', component: DemoSmartDataSlide, title: 'AI Smart Data' },
  { id: 'chat', component: DemoChatSlide, title: 'Astra Chat' },
  { id: 'guided-prompts', component: DemoGuidedPromptsSlide, title: 'Guided Prompts' },
  { id: 'guided-reports', component: DemoGuidedReportsSlide, title: 'Guided Reports' },
  { id: 'visualizations', component: DemoVisualizationsSlide, title: 'Visualizations' },
  { id: 'team-chat', component: DemoTeamChatSlide, title: 'Team Chat' },
  { id: 'coming-soon', component: DemoComingSoonSlide, title: 'Coming Soon' },
  { id: 'final', component: DemoFinalSlide, title: 'Get Started' },
];

export const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const handleClose = () => {
    navigate('/');
  };

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
    if (e.key === 'Escape') handleClose();
  }, [handleNext, handlePrev]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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

  const CurrentSlideComponent = SLIDES[currentSlide].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <button
          onClick={handleClose}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign Up</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xl">🚀</span>
          <h1 className="text-lg font-semibold text-white">AI Rocket Demo</h1>
        </div>

        <div className="text-sm text-gray-500">
          {currentSlide + 1} / {SLIDES.length}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CurrentSlideComponent onClose={handleClose} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
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
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
