import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { TourNavigation } from '../data/tourSteps';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  navigation?: TourNavigation;
}

interface InteractiveTourProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  onNavigate?: (navigation: TourNavigation) => void;
}

export function InteractiveTour({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
  onNavigate
}: InteractiveTourProps) {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Handle navigation when step changes
  useEffect(() => {
    if (step.navigation && onNavigate) {
      onNavigate(step.navigation);
    }
  }, [currentStep, step.navigation, onNavigate]);

  useEffect(() => {
    if (!step.targetSelector) {
      setHighlightRect(null);
      if (popoverRef.current) {
        const popoverRect = popoverRef.current.getBoundingClientRect();
        const topPosition = step.position === 'top' ? 120 : (window.innerHeight - popoverRect.height) / 2;
        setPopoverPosition({
          top: topPosition,
          left: (window.innerWidth - popoverRect.width) / 2
        });
      }
      return;
    }

    const updatePosition = () => {
      if (!step.targetSelector) return;

      const targetElement = document.querySelector(step.targetSelector) as HTMLElement;
      if (!targetElement) {
        console.warn(`Tour target not found: ${step.targetSelector}`);
        return;
      }

      const isVisible = targetElement.offsetParent !== null;
      if (!isVisible) {
        console.warn(`Tour target not visible: ${step.targetSelector}`, targetElement);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);

      if (popoverRef.current) {
        const popoverRect = popoverRef.current.getBoundingClientRect();
        const position = calculatePopoverPosition(rect, popoverRect, step.position || 'bottom');
        setPopoverPosition(position);
      }
    };

    const scrollTimeoutId = setTimeout(() => {
      if (!step.targetSelector) return;

      const targetElement = document.querySelector(step.targetSelector) as HTMLElement;
      if (targetElement) {
        const isVisible = targetElement.offsetParent !== null;
        if (!isVisible) {
          console.warn(`Tour target not visible for scrolling: ${step.targetSelector}`, targetElement);
          return;
        }

        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(updatePosition, 300);
      } else {
        console.warn(`Tour target not found for scrolling: ${step.targetSelector}`);
      }
    }, 150);

    window.addEventListener('resize', updatePosition);

    const modalElement = document.querySelector('[role="dialog"]');
    if (modalElement) {
      modalElement.addEventListener('scroll', updatePosition);
    }

    return () => {
      clearTimeout(scrollTimeoutId);
      window.removeEventListener('resize', updatePosition);
      if (modalElement) {
        modalElement.removeEventListener('scroll', updatePosition);
      }
    };
  }, [step, currentStep]);

  const calculatePopoverPosition = (
    targetRect: DOMRect,
    popoverRect: DOMRect,
    preferredPosition: string
  ) => {
    const padding = 16;
    const arrowSize = 12;
    let top = 0;
    let left = 0;

    switch (preferredPosition) {
      case 'bottom':
        top = targetRect.bottom + padding + arrowSize;
        left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
        break;
      case 'top':
        top = targetRect.top - popoverRect.height - padding - arrowSize;
        left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
        left = targetRect.left - popoverRect.width - padding - arrowSize;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
        left = targetRect.right + padding + arrowSize;
        break;
      default:
        top = targetRect.bottom + padding + arrowSize;
        left = targetRect.left + targetRect.width / 2 - popoverRect.width / 2;
    }

    left = Math.max(padding, Math.min(left, window.innerWidth - popoverRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - popoverRect.height - padding));

    return { top, left };
  };

  const handleNext = () => {
    if (isLastStep) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {highlightRect && (
        <>
          <div
            className="absolute border-4 border-orange-500 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)'
            }}
          />

          <div
            className="absolute bg-transparent pointer-events-auto"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height
            }}
          />
        </>
      )}

      <div
        ref={popoverRef}
        className="absolute bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6 max-w-sm w-full mx-4 animate-in fade-in duration-300"
        style={{
          top: popoverPosition.top,
          left: popoverPosition.left
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-white">{step.title}</h3>
        </div>

        <p className="text-gray-300 mb-6">{step.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-orange-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrevious}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
