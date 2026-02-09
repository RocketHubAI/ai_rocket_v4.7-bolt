import React, { KeyboardEvent, useState, useRef, useEffect } from 'react';
import { Send, Bookmark, X, Reply, Sparkles, AlertTriangle } from 'lucide-react';
import { FavoritesDropdown } from './FavoritesDropdown';
import { SuggestedPromptsModal } from './SuggestedPromptsModal';
import { AstraGuidedChatModal } from './AstraGuidedChatModal';
import { FollowUpSuggestion } from './FollowUpSuggestion';
import { FavoriteMessage, ReplyState, FollowUpSuggestionState } from '../types';
import { FinancialAccessWarning } from '../hooks/useChat';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  favorites?: FavoriteMessage[];
  onRemoveFavorite?: (messageId: string) => void;
  replyState?: ReplyState;
  onCancelReply?: () => void;
  teamId?: string;
  onGuidedPromptSelected?: (prompt: string) => void;
  guidedPromptToSubmit?: string | null;
  onGuidedPromptSubmitted?: () => void;
  financialAccessWarning?: FinancialAccessWarning | null;
  followUpSuggestion?: FollowUpSuggestionState;
  onAcceptFollowUp?: () => void;
  onDismissFollowUp?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  favorites = [],
  onRemoveFavorite,
  replyState,
  onCancelReply,
  teamId,
  onGuidedPromptSelected,
  guidedPromptToSubmit,
  onGuidedPromptSubmitted,
  financialAccessWarning,
  followUpSuggestion,
  onAcceptFollowUp,
  onDismissFollowUp
}) => {
  const isSubmittingRef = useRef(false);
  const lastSubmittedGuidedPromptRef = useRef<string | null>(null);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmittingRef.current && value.trim() && !disabled) {
        isSubmittingRef.current = true;
        onSend(value);
        // Reset after a short delay to prevent rapid duplicate submissions
        setTimeout(() => {
          isSubmittingRef.current = false;
        }, 1000);
      }
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      onSend(value);
      // Reset after a short delay to prevent rapid duplicate submissions
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  const [showSuggestedPrompts, setShowSuggestedPrompts] = useState(false);
  const [showGuidedChat, setShowGuidedChat] = useState(false);

  // Auto-submit guided prompt from Launch Prep
  useEffect(() => {
    if (guidedPromptToSubmit && !disabled && guidedPromptToSubmit !== lastSubmittedGuidedPromptRef.current) {
      lastSubmittedGuidedPromptRef.current = guidedPromptToSubmit;
      onChange(guidedPromptToSubmit);
      setTimeout(() => {
        onSend(guidedPromptToSubmit);
        if (onGuidedPromptSubmitted) {
          onGuidedPromptSubmitted();
        }
      }, 100);
    }
  }, [guidedPromptToSubmit, disabled, onChange, onSend, onGuidedPromptSubmitted]);

  useEffect(() => {
    if (!guidedPromptToSubmit) {
      lastSubmittedGuidedPromptRef.current = null;
    }
  }, [guidedPromptToSubmit]);

  const handleSelectFavorite = (text: string) => {
    onChange(text);
  };

  const handleSelectSuggestedPrompt = (prompt: string) => {
    onChange(prompt);
  };

  const handleGuidedPromptSelected = (prompt: string) => {
    if (onGuidedPromptSelected) {
      onGuidedPromptSelected(prompt);
    } else {
      onChange(prompt);
    }
  };

  return (
    <div className="bg-gray-900 border-t border-gray-700 p-3 md:p-4 safe-area-padding-bottom">
      {/* Reply Preview */}
      {replyState?.isReplying && (
        <div className="mb-3 bg-gray-800 border border-gray-600 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Reply className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Replying to:</span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">
                {replyState.messageSnippet}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-gray-700 rounded transition-colors ml-2"
              title="Cancel reply"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Follow-up Suggestion */}
      {followUpSuggestion && onAcceptFollowUp && onDismissFollowUp && (
        <FollowUpSuggestion
          suggestion={followUpSuggestion}
          onAccept={onAcceptFollowUp}
          onDismiss={onDismissFollowUp}
        />
      )}

      {/* Financial Access Warning Banner */}
      {financialAccessWarning && financialAccessWarning.confidence !== 'low' && (
        <div className="mb-3 bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">
                Financial access required
              </p>
              <p className="text-xs text-amber-200/70 mt-1">
                Your question appears to be about financial data, but you don't have financial access enabled.
                Contact your team administrator to request access.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end space-x-2 md:space-x-3 max-w-4xl mx-auto">
        {/* AI Suggestions and Bookmark buttons */}
        <div className="flex-shrink-0 mb-2 flex flex-col space-y-2">
          {/* AI Suggestions button */}
          <button
            onClick={() => setShowSuggestedPrompts(true)}
            className="group relative p-3 bg-gray-800/50 border-2 border-blue-500 rounded-xl hover:bg-gray-700/50 transition-all duration-300 animate-border-shimmer"
            title="View suggested prompts"
            data-tour="suggested-prompts"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative">
              <Sparkles className="w-5 h-5 text-blue-400 relative z-10 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              <Sparkles className="w-5 h-5 text-purple-400 absolute top-0 left-0 opacity-50 blur-sm" />
            </div>
          </button>

          {/* Bookmark button */}
          {onRemoveFavorite && (
            <FavoritesDropdown
              favorites={favorites}
              onSelectFavorite={handleSelectFavorite}
              onRemoveFavorite={onRemoveFavorite}
            />
          )}
        </div>
        
        <div className="flex-1 relative" data-tour="chat-input">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message to your team agent....."
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-gray-600 bg-gray-800 text-white px-3 py-2 md:px-4 md:py-3 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-700 disabled:cursor-not-allowed max-h-32 min-h-[72px] md:min-h-[72px] text-sm md:text-base leading-relaxed placeholder-gray-400"
            rows={3}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #374151'
            }}
          />
          
          {/* Send button inside input */}
          <div className="absolute right-3 bottom-3">
            <button
              onClick={handleSubmit}
              disabled={disabled || !value.trim()}
              className="text-blue-500 hover:text-blue-400 disabled:text-gray-500 transition-colors disabled:cursor-not-allowed p-1"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <SuggestedPromptsModal
        isOpen={showSuggestedPrompts}
        onClose={() => setShowSuggestedPrompts(false)}
        onSelectPrompt={handleSelectSuggestedPrompt}
        onOpenGuidedChat={() => {
          setShowSuggestedPrompts(false);
          setShowGuidedChat(true);
        }}
      />

      {teamId && (
        <AstraGuidedChatModal
          isOpen={showGuidedChat}
          onClose={() => setShowGuidedChat(false)}
          onSelectPrompt={handleGuidedPromptSelected}
          teamId={teamId}
        />
      )}
    </div>
  );
};