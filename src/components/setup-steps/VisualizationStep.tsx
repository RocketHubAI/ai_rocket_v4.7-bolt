import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BarChart3, CheckCircle, X, Download, Save, Loader } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { useVisualization } from '../../hooks/useVisualization';
import { useSavedVisualizations } from '../../hooks/useSavedVisualizations';
import { exportVisualizationToPDF } from '../../utils/exportVisualizationToPDF';
import { extractVisualizationTitle } from '../../utils/extractVisualizationTitle';
import { supabase } from '../../lib/supabase';
import { LoadingCarousel } from './LoadingCarousel';

interface VisualizationStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

export const VisualizationStep: React.FC<VisualizationStepProps> = ({ onComplete, progress }) => {
  const { generateVisualization } = useVisualization();
  const { saveVisualization } = useSavedVisualizations();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationContent, setVisualizationContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const hasCreatedVisualization = progress?.step_8_visualization_created || showVisualization;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const pollForVisualization = useCallback(async (messageId: string) => {
    console.log('🔍 Polling for visualization:', messageId);

    try {
      const { data, error } = await supabase
        .from('astra_chats')
        .select('visualization_data, metadata')
        .eq('id', messageId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error polling for visualization:', error);
        return false;
      }

      console.log('📊 Poll result:', {
        hasData: !!data,
        hasVizData: !!data?.visualization_data,
        metadata: data?.metadata
      });

      if (data?.visualization_data) {
        console.log('✅ Visualization found! Length:', data.visualization_data.length);
        setVisualizationContent(data.visualization_data);
        setShowVisualization(true);
        setIsGenerating(false);

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        return true;
      }

      return false;
    } catch (err) {
      console.error('❌ Error in pollForVisualization:', err);
      return false;
    }
  }, []);

  const handleGenerateVisualization = useCallback(async () => {
    console.log('🚀 Starting visualization generation...');
    setIsGenerating(true);

    try {
      // First, get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('👤 Current user:', user.id);

      // Find the most recent AI message from the first prompt step
      const { data: recentMessages, error: fetchError } = await supabase
        .from('astra_chats')
        .select('id, message')
        .eq('user_id', user.id)
        .eq('message_type', 'astra')
        .eq('mode', 'private')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('❌ Error fetching recent messages:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      let messageId: string;
      let messageText: string;

      // If no AI message exists, create a demo message
      if (!recentMessages || recentMessages.length === 0) {
        console.log('⚠️ No AI messages found, creating demo message...');

        const demoMessage = `Based on your team's data, here are some insights:

### Key Areas
1. **Strategic Planning**: Your team is focused on growth and innovation
2. **Team Collaboration**: Regular meetings and communication are priorities
3. **Goal Setting**: Clear objectives drive your team's success

### Next Steps
- Continue building your data foundation
- Regular check-ins with Astra for insights
- Use visualizations to track progress`;

        // Create a new message in the database
        const { data: newMessage, error: insertError } = await supabase
          .from('astra_chats')
          .insert({
            user_id: user.id,
            user_email: user.email || '',
            user_name: 'Astra',
            message: demoMessage,
            message_type: 'astra',
            mode: 'private',
            visualization: false
          })
          .select()
          .single();

        if (insertError || !newMessage) {
          console.error('❌ Error creating demo message:', insertError);
          throw new Error(`Failed to create message: ${insertError?.message || 'Unknown error'}`);
        }

        messageId = newMessage.id;
        messageText = demoMessage;
        console.log('✅ Created demo message with ID:', messageId);
      } else {
        const messageData = recentMessages[0];
        messageId = messageData.id;
        messageText = messageData.message;
        console.log('✅ Using existing message with ID:', messageId);
      }

      setCurrentMessageId(messageId);
      console.log('📄 Message preview:', messageText.substring(0, 100) + '...');

      // Now generate the visualization
      console.log('📝 Calling generateVisualization with messageId:', messageId);
      console.log('📝 Message text length:', messageText.length);

      try {
        await generateVisualization(messageId, messageText);
        console.log('✅ generateVisualization call completed');
      } catch (vizError: any) {
        console.error('❌ Error in generateVisualization:', vizError);
        throw new Error(`Visualization generation failed: ${vizError?.message || 'Unknown error'}`);
      }

      // Start polling the database for the visualization
      let pollCount = 0;
      const maxPolls = 120; // 60 seconds at 500ms intervals

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;
        console.log(`🔄 Poll attempt ${pollCount}/${maxPolls}`);

        const found = await pollForVisualization(messageId);

        if (found) {
          console.log('✅ Visualization found and displayed!');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (pollCount >= maxPolls) {
          console.error('❌ Polling timeout reached');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          alert('Visualization generation timed out. Please try again.');
        }
      }, 500);

    } catch (error: any) {
      console.error('❌ Error generating visualization:', error);
      setIsGenerating(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to generate visualization: ${errorMessage}\n\nPlease try again or check the console for details.`);
    }
  }, [generateVisualization, pollForVisualization]);

  const handleSaveVisualization = useCallback(async () => {
    if (!visualizationContent) return;

    setIsSaving(true);
    try {
      const title = extractVisualizationTitle(visualizationContent) || 'My First Visualization';
      await saveVisualization(title, visualizationContent, 'Guided Setup Demo');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving visualization:', error);
      alert('Failed to save visualization');
    } finally {
      setIsSaving(false);
    }
  }, [visualizationContent, saveVisualization]);

  const handleExportPDF = useCallback(async () => {
    if (!visualizationContent) return;

    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const title = extractVisualizationTitle(visualizationContent) || 'Visualization';

      // Create a temporary container element for PDF export
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '1200px';
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = '#1f2937';
      tempContainer.innerHTML = visualizationContent;
      document.body.appendChild(tempContainer);

      // Wait for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 300));

      await exportVisualizationToPDF(tempContainer, {
        filename: title,
        title: title,
        userName: user?.user_metadata?.name || user?.email || 'User'
      });

      // Clean up
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF');
    } finally {
      setIsExporting(false);
    }
  }, [visualizationContent]);

  const handleCloseVisualization = () => {
    setShowVisualization(false);
    setVisualizationContent(null);
  };

  if (showVisualization && visualizationContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Your Visualization</h2>
          <button
            onClick={handleCloseVisualization}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-white">Interactive Visualization</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveVisualization}
                disabled={isSaving || saveSuccess}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm transition-all min-h-[36px]"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm transition-all min-h-[36px]"
              >
                {isExporting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div
            className="p-6 overflow-auto max-h-[400px] bg-gray-900"
            dangerouslySetInnerHTML={{ __html: visualizationContent }}
          />
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <p className="text-xs text-green-300">
            <span className="font-medium">✅ Great!</span> You can save or export this visualization, then continue to the next step.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Next: Run an Astra Report →
          </button>
        </div>
      </div>
    );
  }

  if (hasCreatedVisualization) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/20 mb-3">
            <CheckCircle className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Visualization Created!</h2>
          <p className="text-sm text-gray-300">You've successfully generated an AI-powered visualization.</p>
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <p className="text-xs text-green-300">
            <span className="font-medium">✅ Excellent!</span> You can create unlimited visualizations to explore your data.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Next: Run an Astra Report →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/20 mb-3">
          <BarChart3 className="w-7 h-7 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Create a Visualization</h2>
        <p className="text-sm text-gray-300">Turn data into visual insights</p>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">📊</span>
          Visualizations Can Show:
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-950/50 rounded-lg p-2 text-center">
            <div className="text-xl mb-1">📈</div>
            <div className="text-xs text-blue-200">Trends</div>
          </div>
          <div className="bg-purple-950/50 rounded-lg p-2 text-center">
            <div className="text-xl mb-1">🎯</div>
            <div className="text-xs text-purple-200">Goals</div>
          </div>
          <div className="bg-green-950/50 rounded-lg p-2 text-center">
            <div className="text-xl mb-1">📅</div>
            <div className="text-xs text-green-200">Timelines</div>
          </div>
        </div>
      </div>

      {isGenerating && (
        <LoadingCarousel type="visualization" />
      )}

      {!isGenerating && (
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <p className="text-xs text-purple-300 flex-1">
            Click below to generate a sample visualization from your data
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
          <p className="text-xs text-purple-300 text-center">
            <span className="font-medium">⏳ Hang tight!</span> This usually takes 10-30 seconds
          </p>
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button
          onClick={handleGenerateVisualization}
          disabled={isGenerating}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all min-h-[44px] flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Generating Visualization...</span>
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5" />
              <span>Generate Visualization</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
