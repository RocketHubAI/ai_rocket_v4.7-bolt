import React, { useState } from 'react';
import { Bookmark, Reply, Copy, Check } from 'lucide-react';
import { VisualizationButton } from './VisualizationButton';
import { Message } from '../types';
import { formatAstraMessage } from '../utils/formatAstraMessage';
import { TemplateSearchResults } from './TemplateSearchResults';
import { N8NTemplate } from '../lib/n8n-templates';

interface MessageBubbleProps {
  message: Message;
  onToggleExpansion: (messageId: string) => void;
  onToggleFavorite?: (messageId: string, text: string) => void;
  isFavorited?: boolean;
  onCreateVisualization?: (messageId: string, messageText: string) => void;
  onViewVisualization?: (messageId: string) => void;
  visualizationState?: any;
  onReply?: (messageId: string, messageText: string) => void;
  onTemplateImport?: (template: N8NTemplate) => Promise<string | undefined>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onToggleExpansion,
  onToggleFavorite,
  isFavorited = false,
  onCreateVisualization,
  onViewVisualization,
  visualizationState,
  onReply,
  onTemplateImport
}) => {
  const [copied, setCopied] = useState(false);
  const isLongMessage = message.text.length > 800;
  const shouldTruncate = isLongMessage && !message.isExpanded;

  // Check if message has visualization data stored in database
  const hasStoredVisualization = message.visualization || message.hasStoredVisualization;
  const hasVisualization = hasStoredVisualization || visualizationState?.hasVisualization;

  // Check if this is an Astra message (can be replied to)
  const isAstraMessage = message.messageType === 'astra' || (!message.isUser && !message.isCentered);

  // Check if this is a reply message
  const isReplyMessage = message.isReply || message.text.startsWith('@reply ');

  // Extract reply content if this is a reply message
  const getReplyContent = () => {
    if (isReplyMessage && message.text.startsWith('@reply ')) {
      const parts = message.text.split(' ');
      if (parts.length >= 3) {
        return parts.slice(2).join(' '); // Remove "@reply" and messageId
      }
    }
    return message.text;
  };

  // Get the base text content (handle reply messages)
  const baseText = isReplyMessage ? getReplyContent() : message.text;

  // Apply truncation if needed
  const truncatedText = shouldTruncate
    ? baseText.substring(0, 800) + '...'
    : baseText;

  // Check for line-based truncation
  const lines = truncatedText.split('\n');
  const shouldShowMore = lines.length > 15 && !message.isExpanded;
  const finalText = shouldShowMore
    ? lines.slice(0, 15).join('\n') + '...'
    : truncatedText;

  // Handle copy text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Special styling for centered welcome message
  if (message.isCentered) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="flex items-start w-full max-w-3xl" data-tour="astra-welcome-message">
          <div className="flex-shrink-0 mr-2 md:mr-3 mt-1">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm md:text-lg">
              🚀
            </div>
          </div>

          <div className="flex-1 bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm">
            <div className="break-words text-base leading-relaxed">
              <div className="whitespace-pre-wrap text-gray-300">{finalText}</div>
            </div>

            <div className="text-xs opacity-70 mt-1 md:mt-2">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-3 md:mb-4">
      <div className="flex items-start w-full">
        {!message.isUser && (
          <div className="flex-shrink-0 mr-2 md:mr-3 mt-1">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm md:text-lg">
              🚀
            </div>
          </div>
        )}

        {message.isUser && (
          <div className="flex-shrink-0 w-6 md:w-8 mr-2 md:mr-3"></div>
        )}

        <div className={`flex-1 rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm ${
          message.isUser
            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
            : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white'
        }`}>
        <div className="break-words text-base leading-relaxed">
          {message.isUser ? (
            <>
              {isReplyMessage && (
                <div className="text-xs text-blue-300 mb-2 opacity-80">
                  💬 Reply
                </div>
              )}
              <div className="whitespace-pre-wrap">{finalText}</div>
            </>
          ) : (
            formatAstraMessage(finalText)
          )}
        </div>
        
        {(isLongMessage || shouldShowMore) && (
          <button
            onClick={() => onToggleExpansion(message.id)}
            className="text-xs underline mt-1 md:mt-2 opacity-90 hover:opacity-100 transition-opacity"
          >
            {message.isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}

        <div className="text-xs opacity-70 mt-1 md:mt-2">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
        
        {/* Favorite button for user messages */}
        {message.isUser && onToggleFavorite && (
          <div className="mt-2 md:mt-3">
            <button
              onClick={() => onToggleFavorite(message.id, message.text)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation ${
                isFavorited
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
              title={isFavorited ? 'Remove from saved prompts' : 'Save prompt'}
            >
              <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
              <span>{isFavorited ? 'Saved' : 'Save Prompt'}</span>
            </button>
          </div>
        )}

        {/* Action buttons for Astra messages: Reply, Copy, Visualization */}
        {!message.isUser && message.chatId && (
          <div className="mt-2 md:mt-3 flex flex-wrap gap-2">
            {console.log('🔍 MessageBubble: Rendering action buttons for chatId:', message.chatId, 'visualizationState:', visualizationState)}

            {/* Reply button */}
            {isAstraMessage && !message.isCentered && onReply && (
              <button
                onClick={() => onReply(message.chatId || message.id, message.text)}
                className="flex items-center justify-center space-x-1 md:space-x-2 bg-gray-600/50 hover:bg-blue-600/50 hover:text-blue-300 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation"
                title="Reply to this message"
              >
                <Reply className="w-4 h-4" />
                <span className="hidden sm:inline">Reply</span>
                <span className="sm:hidden">Reply</span>
              </button>
            )}

            {/* Copy button */}
            {onCreateVisualization && onViewVisualization && (
              <button
                onClick={handleCopyText}
                className="flex items-center justify-center space-x-1 md:space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation"
                title="Copy message text"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Copied!</span>
                    <span className="sm:hidden">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy Text</span>
                    <span className="sm:hidden">Copy</span>
                  </>
                )}
              </button>
            )}

            {/* Visualization button */}
            {onCreateVisualization && onViewVisualization && (
              <VisualizationButton
                messageId={message.chatId}
                messageText={message.text}
                onCreateVisualization={onCreateVisualization}
                onViewVisualization={onViewVisualization}
                visualizationState={visualizationState}
              />
            )}
          </div>
        )}

        {/* Template Search Results */}
        {!message.isUser &&
         message.metadata?.action_type === 'template_search' &&
         message.metadata?.templates &&
         onTemplateImport && (
          <div className="mt-3">
            <TemplateSearchResults
              templates={message.metadata.templates}
              totalResults={message.metadata.total_results || message.metadata.templates.length}
              searchQuery={message.metadata.search_query || ''}
              onImport={onTemplateImport}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};