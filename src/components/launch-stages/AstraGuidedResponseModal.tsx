import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { formatAstraMessage } from '../../utils/formatAstraMessage';
import { LoadingCarousel } from '../setup-steps/LoadingCarousel';
import { SupportMenu } from '../SupportMenu';

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

interface AstraGuidedResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (response: string) => void;
  selectedPrompt: string;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

export const AstraGuidedResponseModal: React.FC<AstraGuidedResponseModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  selectedPrompt,
  onOpenHelpCenter
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [astraResponse, setAstraResponse] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Restore response state from sessionStorage
  useEffect(() => {
    const savedResponse = sessionStorage.getItem('boosters_astra_response');
    const savedLoadingState = sessionStorage.getItem('boosters_astra_loading');
    const savedError = sessionStorage.getItem('boosters_astra_error');

    if (savedResponse) {
      console.log('🔄 Restoring Astra response from sessionStorage');
      setAstraResponse(savedResponse);
      setIsLoading(false);
      setHasInitialized(true);
    } else if (savedError) {
      setError(savedError);
      setIsLoading(false);
      setHasInitialized(true);
    } else if (savedLoadingState === 'true') {
      setIsLoading(true);
      setHasInitialized(true);
    }
  }, []);

  useEffect(() => {
    // Only send prompt if we haven't initialized from saved state
    if (isOpen && selectedPrompt && !hasInitialized && !astraResponse) {
      sendPromptToAstra();
      setHasInitialized(true);
    }
  }, [isOpen, selectedPrompt, hasInitialized, astraResponse]);

  const sendPromptToAstra = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    sessionStorage.setItem('boosters_astra_loading', 'true');
    sessionStorage.removeItem('boosters_astra_response');
    sessionStorage.removeItem('boosters_astra_error');

    try {
      // Fetch user data
      const userId = user.id;
      const userEmail = user.email || '';
      let teamId = '';
      let teamName = '';
      let role = 'member';
      let viewFinancial = true;
      let userName = user.email?.split('@')[0] || 'User';

      try {
        const { data: userData, error: userError } = await supabase
          .rpc('get_user_team_info', { p_user_id: userId });

        if (!userError && userData && userData.length > 0) {
          const userInfo = userData[0];
          teamId = userInfo.team_id || '';
          teamName = userInfo.team_name || '';
          role = userInfo.role || 'member';
          viewFinancial = userInfo.view_financial !== false;
          userName = userInfo.user_name || userName;
        } else {
          teamId = user.user_metadata?.team_id || '';
          role = user.user_metadata?.role || 'member';
          viewFinancial = user.user_metadata?.view_financial !== false;
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        teamId = user.user_metadata?.team_id || '';
        role = user.user_metadata?.role || 'member';
        viewFinancial = user.user_metadata?.view_financial !== false;
      }

      // Send to webhook with 5-minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          chatInput: selectedPrompt,
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          conversation_id: null, // New conversation
          team_id: teamId,
          team_name: teamName,
          role: role,
          view_financial: viewFinancial,
          mode: 'private'
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500) {
          throw new Error('The request was too large to process. Try asking for "recent meetings" or "a sampling of documents" instead of all documents at once.');
        } else if (response.status === 504 || response.status === 408) {
          throw new Error('The request timed out. Try narrowing your question to focus on specific documents or recent data.');
        }
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract response text
      let responseText = '';
      if (data.output) {
        responseText = data.output;
      } else if (data.response) {
        responseText = data.response;
      } else if (data.message) {
        responseText = data.message;
      } else {
        responseText = JSON.stringify(data);
      }

      // Save both user prompt and Astra response to astra_chats table
      try {
        console.log('📝 Attempting to save to astra_chats. teamId:', teamId, 'userId:', userId);

        // Generate a conversation_id for this user+astra pair
        const conversationId = uuidv4();
        console.log('🔗 Generated conversation_id:', conversationId);

        // Save user's prompt first
        const { error: userError } = await supabase.from('astra_chats').insert({
          id: uuidv4(),
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          message_type: 'user',
          message: selectedPrompt,
          mode: 'private',
          conversation_id: conversationId
        });

        if (userError) {
          console.error('❌ Error saving user prompt to astra_chats:', userError);
          throw userError;
        }

        // Then save Astra's response
        const { error: astraError } = await supabase.from('astra_chats').insert({
          id: uuidv4(),
          user_id: userId,
          user_email: userEmail,
          user_name: 'Astra',
          message_type: 'astra',
          message: responseText,
          astra_prompt: selectedPrompt,
          mode: 'private',
          conversation_id: conversationId
        });

        if (astraError) {
          console.error('❌ Error saving Astra response to astra_chats:', astraError);
          throw astraError;
        }

        console.log('✅ Successfully saved Level 1 prompt and response to astra_chats table');
      } catch (saveError: any) {
        console.error('❌ Failed to save to astra_chats:', saveError);
        console.error('Error details:', JSON.stringify(saveError, null, 2));
        // Don't fail the whole operation if saving fails
      }

      setAstraResponse(responseText);
      setIsLoading(false);
      // Save response to sessionStorage
      sessionStorage.setItem('boosters_astra_response', responseText);
      sessionStorage.removeItem('boosters_astra_loading');
    } catch (err: any) {
      console.error('Error sending prompt to Astra:', err);
      let errorMessage = err.message || 'Failed to get response from Astra';

      if (err.name === 'AbortError') {
        errorMessage = 'The request timed out after 5 minutes. Try narrowing your question to focus on specific documents or recent data.';
      }

      setError(errorMessage);
      setIsLoading(false);
      sessionStorage.setItem('boosters_astra_error', errorMessage);
      sessionStorage.removeItem('boosters_astra_loading');
    }
  };

  const handleProceed = () => {
    // Clear sessionStorage when proceeding
    sessionStorage.removeItem('boosters_astra_response');
    sessionStorage.removeItem('boosters_astra_loading');
    sessionStorage.removeItem('boosters_astra_error');
    onComplete(astraResponse);
  };

  const handleClose = () => {
    // Clear sessionStorage when closing
    sessionStorage.removeItem('boosters_astra_response');
    sessionStorage.removeItem('boosters_astra_loading');
    sessionStorage.removeItem('boosters_astra_error');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Astra's Response</h2>
              <p className="text-sm text-gray-300">Analyzing your data...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* User's prompt - compact */}
          <div className="mb-4">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Your Question:</p>
              <p className="text-white text-sm">{selectedPrompt}</p>
            </div>
          </div>

          {/* Loading state - compact */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Spinner with inline warning */}
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-3" />
                <p className="text-white text-base font-medium mb-1">Astra is thinking...</p>
                <p className="text-gray-400 text-sm mb-2">Analyzing your data to provide insights</p>
                <div className="flex items-center gap-2 text-orange-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Please keep this window open</span>
                </div>
              </div>

              {/* Compact carousel - horizontal layout */}
              <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <LoadingCarousel type="sync" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-400 font-semibold text-lg mb-2">Request Failed</h3>
                  <p className="text-red-300">{error}</p>
                </div>
              </div>

              {error.includes('too large') && (
                <div className="mt-4 p-4 bg-red-900/30 rounded-lg border border-red-700/50">
                  <p className="text-sm text-red-200 font-medium mb-2">Tips for better results:</p>
                  <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
                    <li>Request "recent meetings" instead of "all meetings"</li>
                    <li>Ask for "a sampling of documents" rather than everything</li>
                    <li>Be specific: "latest 5 meetings" or "this month's data"</li>
                    <li>Focus your question on specific topics or time periods</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={sendPromptToAstra}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                >
                  Modify Prompt
                </button>
              </div>
            </div>
          )}

          {/* Response */}
          {!isLoading && !error && astraResponse && (
            <div className="bg-purple-900/10 border border-purple-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <p className="text-sm text-gray-400">Astra's Insights:</p>
              </div>
              <div className="text-white prose prose-invert max-w-none">
                {formatAstraMessage(astraResponse)}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Proceed button */}
        {!isLoading && !error && astraResponse && (
          <div className="border-t border-gray-700 p-4 bg-gray-800/50 flex justify-end items-center flex-shrink-0">
            <button
              onClick={handleProceed}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl font-medium min-h-[44px]"
            >
              <CheckCircle className="w-5 h-5" />
              Proceed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
