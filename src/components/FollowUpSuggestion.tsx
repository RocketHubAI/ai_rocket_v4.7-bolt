import React, { useEffect, useState } from 'react';
import { Reply, X, Check } from 'lucide-react';
import { FollowUpSuggestionState } from '../types';

interface FollowUpSuggestionProps {
  suggestion: FollowUpSuggestionState;
  onAccept: () => void;
  onDismiss: () => void;
}

export const FollowUpSuggestion: React.FC<FollowUpSuggestionProps> = ({
  suggestion,
  onAccept,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (suggestion.isVisible) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [suggestion.isVisible]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
      setIsExiting(false);
    }, 200);
  };

  const handleAccept = () => {
    setIsExiting(true);
    setTimeout(() => {
      onAccept();
      setIsExiting(false);
    }, 200);
  };

  if (!suggestion.isVisible) {
    return null;
  }

  return (
    <div
      className={`mb-3 transition-all duration-200 ease-out ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-3 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-200 truncate">
              {suggestion.suggestionText}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
              title="Yes, include context"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Yes</span>
            </button>
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-md transition-colors"
              title="No, new topic"
            >
              <X className="w-3.5 h-3.5" />
              <span>No</span>
            </button>
          </div>
        </div>

        {suggestion.selectedOption && (
          <div className="mt-2 pt-2 border-t border-blue-500/20">
            <p className="text-xs text-blue-300/70">
              <span className="font-medium">Selected: </span>
              Option {suggestion.selectedOption.optionNumber} - {suggestion.selectedOption.optionText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
