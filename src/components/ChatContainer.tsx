import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Menu, SquarePen } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import { ChatInput } from './ChatInput';
import { VisualizationView } from './VisualizationView';
import { extractVisualizationTitle } from '../utils/extractVisualizationTitle';
import { useChat } from '../hooks/useChat';
import { useFavorites } from '../hooks/useFavorites';
import { useVisualization } from '../hooks/useVisualization';
import { useAuth } from '../contexts/AuthContext';
import { useSavedVisualizations } from '../hooks/useSavedVisualizations';
import { supabase } from '../lib/supabase';

interface ChatContainerProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onOpenSidebar: () => void;
  conversationToLoad: string | null;
  shouldStartNewChat: boolean;
  onConversationLoaded: () => void;
  onNewChatStarted: () => void;
  onConversationChange: (conversationId: string | null) => void;
  guidedPromptToSubmit?: string | null;
  onGuidedPromptSubmitted?: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  sidebarOpen,
  onCloseSidebar,
  onOpenSidebar,
  conversationToLoad,
  shouldStartNewChat,
  onConversationLoaded,
  onNewChatStarted,
  onConversationChange,
  guidedPromptToSubmit,
  onGuidedPromptSubmitted
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCreatingVisualization, setIsCreatingVisualization] = useState(false);
  const savingVisualizationRef = useRef<string | null>(null);
  const hasScrolledInitiallyRef = useRef(false);
  const isTogglingExpansionRef = useRef(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  const {
    saveVisualization,
    isVisualizationSaved,
    savedVisualizations
  } = useSavedVisualizations(user?.id);

  useEffect(() => {
    const fetchTeamId = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.team_id) {
        setTeamId(data.team_id);
      }
    };

    fetchTeamId();
  }, [user]);

  const {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    toggleMessageExpansion: originalToggleExpansion,
    loadConversation,
    startNewConversation,
    currentConversationId,
    updateVisualizationStatus,
    getVisualizationState,
    updateVisualizationState,
    updateVisualizationData,
    replyState,
    startReply,
    cancelReply,
    handleTemplateImportFromChat,
    financialAccessWarning,
    followUpSuggestion,
    acceptFollowUpSuggestion,
    dismissFollowUpSuggestion
  } = useChat();

  // Wrapper to prevent auto-scroll when expanding/collapsing messages
  const toggleMessageExpansion = useCallback((messageId: string) => {
    isTogglingExpansionRef.current = true;
    originalToggleExpansion(messageId);
    // Clear the flag after a short delay to allow re-render
    setTimeout(() => {
      isTogglingExpansionRef.current = false;
    }, 100);
  }, [originalToggleExpansion]);

  // Notify parent component when conversation changes
  useEffect(() => {
    console.log('📍 ChatContainer: currentConversationId changed to:', currentConversationId);
    onConversationChange(currentConversationId);
  }, [currentConversationId, onConversationChange]);
  
  const {
    favorites,
    toggleFavorite,
    isFavorited,
    removeFromFavorites
  } = useFavorites();

  const {
    generateVisualization,
    showVisualization,
    setVisualizationContent,
    hideVisualization,
    getVisualization: getHookVisualization,
    currentVisualization,
    messageToHighlight,
    clearHighlight
  } = useVisualization(
    updateVisualizationStatus,
    getVisualizationState, // Pass the persistent states
    updateVisualizationState // Pass the update function
  );

  // Get visualization state - check local state first, then hook state
  const getLocalVisualizationState = useCallback((messageId: string) => {
    const localState = getVisualizationState(messageId);
    console.log('🔍 ChatContainer: Getting visualization state for messageId:', messageId, 'localState:', localState);
    
    // Find the message to check for stored visualization
    const message = messages.find(m => m.chatId === messageId || m.id === messageId);
    console.log('🔍 ChatContainer: Found message for messageId:', messageId, 'message:', message);
    console.log('🔍 ChatContainer: Message visualization_data exists:', !!message?.visualization_data);
    console.log('🔍 ChatContainer: Message visualization flag:', message?.visualization);
    console.log('🔍 ChatContainer: Message hasStoredVisualization:', message?.hasStoredVisualization);
    
    // If we have local state, use it
    if (localState) {
      console.log('🔍 ChatContainer: Using local state for messageId:', messageId);
      return localState;
    }
    
    // Check if visualization is currently being generated (from database metadata)
    if (message?.metadata?.visualization_generating) {
      console.log('🔍 ChatContainer: Visualization is generating (from database) for messageId:', messageId);
      return {
        isGenerating: true,
        content: null,
        hasVisualization: false,
      };
    }
    
    // Check if the message has stored visualization in database - EXACTLY LIKE TEAM CHAT
    if (message?.visualization_data) {
      console.log('🔍 ChatContainer: Message has stored visualization_data, returning database state for messageId:', messageId);
      return {
        isGenerating: false,
        content: message.visualization_data,
        hasVisualization: true,
      };
    }
    
    // Check if message has visualization flag but no data yet (might be generating)
    if (message?.visualization && !message?.visualization_data) {
      console.log('🔍 ChatContainer: Message has visualization flag but no data, might be generating for messageId:', messageId);
      return {
        isGenerating: true,
        content: null,
        hasVisualization: false,
      };
    }
    
    console.log('🔍 ChatContainer: No visualization state found for messageId:', messageId);
    return null;
  }, [getVisualizationState, messages]);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  // Reset scroll flag whenever conversation changes
  useEffect(() => {
    console.log('ChatContainer: Conversation changed, resetting scroll flag. ConversationId:', currentConversationId);
    hasScrolledInitiallyRef.current = false;
  }, [currentConversationId]);

  // Handle conversation loading from sidebar
  useEffect(() => {
    if (conversationToLoad) {
      console.log('ChatContainer: Loading conversation from sidebar:', conversationToLoad);
      loadConversation(conversationToLoad);
      onConversationLoaded();
    }
  }, [conversationToLoad, loadConversation, onConversationLoaded]);

  // Handle new chat from sidebar
  useEffect(() => {
    if (shouldStartNewChat) {
      console.log('ChatContainer: Starting new chat from sidebar');
      startNewConversation();
      onNewChatStarted();
    }
  }, [shouldStartNewChat, startNewConversation, onNewChatStarted]);

  // Handle visualization creation for private chat
  const handleCreateVisualization = useCallback(async (messageId: string, messageContent: string) => {
    console.log('🎯 Private chat: Starting visualization generation for chatId:', messageId);
    console.log('🎯 Private chat: Message content length:', messageContent.length);
    
    setIsCreatingVisualization(true);
    
    // Set generating state immediately with proper structure
    updateVisualizationState(messageId, { 
      messageId,
      isGenerating: true, 
      content: null,
      isVisible: false
    });
    const actualChatId = messageId;
    console.log('🎯 Private chat: Using chatId:', actualChatId);
    
    // Set generating state immediately
    updateVisualizationState(actualChatId, { isGenerating: true, content: null });

    try {
      await generateVisualization(actualChatId, messageContent);
      
      console.log('✅ Private chat: Visualization generation completed for message:', actualChatId);
      
      // Set completion state
      setTimeout(() => {
        updateVisualizationState(messageId, {
          messageId,
          isGenerating: false, 
          content: 'generated', 
          hasVisualization: true,
          isVisible: false
        });
        console.log('✅ Private chat: Updated visualization state for message:', actualChatId);
      }, 100);
      
    } catch (error) {
      console.error('❌ Private chat: Error during visualization generation:', error);
      updateVisualizationState(messageId, {
        messageId,
        isGenerating: false, 
        content: null, 
        hasVisualization: false,
        isVisible: false
      });
    }
    finally {
      setIsCreatingVisualization(false);
    }
  }, [generateVisualization, updateVisualizationState]);

  // Handle viewing visualization for private chat
  const handleViewVisualization = useCallback((messageId: string) => {
    console.log('👁️ Private chat: handleViewVisualization called for messageId:', messageId);
    
    console.log('👁️ Private chat: Viewing visualization for chatId:', messageId);
    
    // Find the message object
    const message = messages.find(m => m.chatId === messageId || m.id === messageId);
    console.log('👁️ Private chat: Found message for viewing:', message);
    console.log('👁️ Private chat: Message visualization_data length:', message?.visualization_data?.length || 0);
    
    // Check if we have visualization data directly in the message
    if (message?.visualization_data) {
      console.log('📊 Private chat: Using message visualization_data directly');
      
      // Set the visualization content in the hook first
      const hookVisualization = getHookVisualization(messageId);
      if (!hookVisualization?.content) {
        console.log('📊 Private chat: Setting visualization content in hook');
        setVisualizationContent(messageId, message.visualization_data);
      }
      
      showVisualization(messageId);
      return;
    }
    
    // Check local state for the visualization content
    const localState = getLocalVisualizationState(messageId);
    console.log('👁️ Private chat: Local state for messageId:', messageId, 'exists:', !!localState, 'hasContent:', !!localState?.content);
    
    if (localState?.content && localState.content !== 'generated') {
      console.log('📊 Private chat: Using local state visualization data');
      showVisualization(messageId);
      return;
    }
    
    // Check hook state for visualization content
    const hookVisualization = getHookVisualization(messageId);
    console.log('👁️ Private chat: Hook visualization:', hookVisualization);
    if (hookVisualization?.content) {
      console.log('📊 Private chat: Using hook visualization data');
      showVisualization(messageId);
      return;
    }
    
    console.log('❌ Private chat: No visualization data found for message:', messageId);
  }, [messages, getLocalVisualizationState, getHookVisualization, setVisualizationContent, showVisualization]);

  // Handle viewport adjustments for mobile keyboards
  useEffect(() => {
    // Only auto-scroll to bottom if we're not highlighting a specific message or toggling expansion
    if (!messageToHighlight && !isCreatingVisualization && !isTogglingExpansionRef.current) {
      if (!hasScrolledInitiallyRef.current) {
        // First scroll: jump to bottom immediately without any animation
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
        hasScrolledInitiallyRef.current = true;
      } else {
        // Subsequent scrolls: use smooth animation
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    const handleResize = () => {
      // Force scroll to bottom when keyboard appears/disappears
      if (!messageToHighlight && !isCreatingVisualization && !isTogglingExpansionRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messagesEndRef, messages, messageToHighlight, isCreatingVisualization]);

  // Handle save visualization
  const handleSaveVisualization = useCallback(async () => {
    if (!currentVisualization || !user) return;

    const visualization = getHookVisualization(currentVisualization);
    if (!visualization?.content) return;

    const message = messages.find(m => m.chatId === currentVisualization || m.id === currentVisualization);
    if (!message) return;

    const messageIdToCheck = message.chatId || message.id;

    // Check if already saved to prevent duplicates
    if (isVisualizationSaved(messageIdToCheck)) {
      console.log('⚠️ Visualization already saved, skipping duplicate save');
      return;
    }

    // Check if currently saving this visualization
    if (savingVisualizationRef.current === messageIdToCheck) {
      console.log('⚠️ Already saving this visualization, skipping duplicate request');
      return;
    }

    // Mark as currently saving
    savingVisualizationRef.current = messageIdToCheck;

    const title = extractVisualizationTitle(visualization.content);
    const originalPrompt = message.message;

    console.log('💾 Attempting to save visualization for messageId:', messageIdToCheck);
    try {
      const result = await saveVisualization(
        messageIdToCheck,
        title,
        visualization.content,
        originalPrompt
      );

      if (result.success) {
        console.log('✅ Visualization saved successfully');
      } else {
        console.error('❌ Failed to save visualization:', result.error);
      }
    } finally {
      // Clear the saving flag
      savingVisualizationRef.current = null;
    }
  }, [currentVisualization, user, getHookVisualization, messages, saveVisualization, isVisualizationSaved]);

  // Show visualization view if one is currently active
  if (currentVisualization) {
    const visualization = getHookVisualization(currentVisualization);
    if (visualization?.content) {
      const message = messages.find(m => m.chatId === currentVisualization || m.id === currentVisualization);
      const messageId = message?.chatId || message?.id;
      const isSaved = message ? isVisualizationSaved(messageId!) : false;

      console.log('🎨 Rendering VisualizationView:', {
        currentVisualization,
        messageId,
        isSaved,
        savedVisualizationsCount: savedVisualizations.length
      });

      return (
        <VisualizationView
          key={`viz-${messageId}-${isSaved}-${savedVisualizations.length}`}
          content={visualization.content}
          onBack={hideVisualization}
          onSave={handleSaveVisualization}
          isSaved={isSaved}
          title={extractVisualizationTitle(visualization.content)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <button
          onClick={onOpenSidebar}
          className="w-10 h-10 bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors shadow-lg"
          aria-label="Open chat history"
        >
          <Menu className="w-5 h-5 text-slate-300" />
        </button>
        <button
          onClick={() => startNewConversation()}
          className="w-10 h-10 bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors shadow-lg"
          aria-label="Start new chat"
        >
          <SquarePen className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 md:px-4 chat-messages-container" style={{ paddingBottom: '120px' }}>
        <div className="w-full lg:w-[80%] max-w-6xl mx-auto space-y-3 md:space-y-4 pt-4">
          {messages.map((message) => (
            <div key={message.id} id={`message-${message.id}`}>
              <MessageBubble
                message={message}
                onToggleExpansion={toggleMessageExpansion}
                onCreateVisualization={handleCreateVisualization}
                onViewVisualization={handleViewVisualization}
                onToggleFavorite={toggleFavorite}
                isFavorited={isFavorited(message.id)}
                visualizationState={getLocalVisualizationState(message.chatId || message.id)}
                onReply={startReply}
                onTemplateImport={handleTemplateImportFromChat}
              />
            </div>
          ))}
        
          {isLoading && <LoadingIndicator />}
        
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          disabled={isLoading}
          favorites={favorites}
          onRemoveFavorite={removeFromFavorites}
          replyState={replyState}
          onCancelReply={cancelReply}
          teamId={teamId || undefined}
          guidedPromptToSubmit={guidedPromptToSubmit}
          onGuidedPromptSubmitted={onGuidedPromptSubmitted}
          onGuidedPromptSelected={async (prompt) => {
            await startNewConversation();
            setInputValue(prompt);
            setTimeout(() => {
              sendMessage(prompt);
            }, 100);
          }}
          financialAccessWarning={financialAccessWarning}
          followUpSuggestion={followUpSuggestion}
          onAcceptFollowUp={acceptFollowUpSuggestion}
          onDismissFollowUp={dismissFollowUpSuggestion}
        />
      </div>
    </div>
  );
};