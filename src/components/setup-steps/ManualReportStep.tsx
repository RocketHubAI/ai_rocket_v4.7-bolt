import React, { useState, useEffect, useCallback } from 'react';
import { FileText, CheckCircle, Loader, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { supabase } from '../../lib/supabase';
import { useVisualization } from '../../hooks/useVisualization';
import { VisualizationView } from '../VisualizationView';
import { LoadingCarousel } from './LoadingCarousel';

interface ManualReportStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

interface ReportSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  requiredData: string[];
}

const REPORT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for report generation

export const ManualReportStep: React.FC<ManualReportStepProps> = ({ onComplete, progress }) => {
  const { generateVisualization } = useVisualization();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ReportSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [visualizationContent, setVisualizationContent] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  const hasCreatedReport = progress?.step_9_manual_report_run || reportGenerated;

  // Detect available data types
  useEffect(() => {
    const detectAvailableData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const teamId = user.user_metadata?.team_id;
        if (!teamId) {
          setIsLoading(false);
          return;
        }

        // Check what types of documents exist for this team
        const { data: docs, error } = await supabase
          .from('documents')
          .select('document_type')
          .eq('team_id', teamId)
          .limit(100);

        if (error) {
          console.error('Error checking documents:', error);
          setIsLoading(false);
          return;
        }

        // Count document types
        const typeCounts: Record<string, number> = {};
        docs?.forEach(doc => {
          const baseType = doc.document_type?.split('_')[0] || 'other';
          typeCounts[baseType] = (typeCounts[baseType] || 0) + 1;
        });

        console.log('📊 Document type counts:', typeCounts);

        // Generate suggestions based on available data
        const availableSuggestions: ReportSuggestion[] = [];

        // Meeting-based suggestions
        if (typeCounts['meetings'] || typeCounts['misc']) {
          availableSuggestions.push({
            id: 'weekly-action-items',
            title: 'Weekly Action Items',
            description: 'Get action items from your recent meetings',
            icon: <CheckCircle className="w-5 h-5" />,
            prompt: 'From our most recent leadership meeting, please provide a detailed list of action items that I need to complete or focus on this week. Include priorities, deadlines, and any dependencies.',
            requiredData: ['meetings']
          });
        }

        // Strategy-based suggestions
        if (typeCounts['strategy']) {
          availableSuggestions.push({
            id: 'strategy-review',
            title: 'Strategic Progress Review',
            description: 'Review strategic priorities and progress',
            icon: <Target className="w-5 h-5" />,
            prompt: 'Provide a summary of our strategic priorities, recent progress, and recommended focus areas based on our strategy documents.',
            requiredData: ['strategy']
          });
        }

        // Financial-based suggestions
        if (typeCounts['financial']) {
          availableSuggestions.push({
            id: 'financial-summary',
            title: 'Financial Summary',
            description: 'Summarize financial health and metrics',
            icon: <DollarSign className="w-5 h-5" />,
            prompt: 'Summarize the company financials and provide a cash-flow analysis with key insights.',
            requiredData: ['financial']
          });
        }

        // Multi-type suggestions
        if ((typeCounts['meetings'] || typeCounts['misc']) && typeCounts['strategy']) {
          availableSuggestions.push({
            id: 'strategic-execution',
            title: 'Strategic Execution Review',
            description: 'How well meetings align with strategy',
            icon: <TrendingUp className="w-5 h-5" />,
            prompt: 'Analyze how our recent meetings and discussions align with our strategic priorities. Highlight areas of strong alignment and gaps that need attention.',
            requiredData: ['meetings', 'strategy']
          });
        }

        // If we have all data types, offer comprehensive review
        if (typeCounts['meetings'] && typeCounts['strategy'] && typeCounts['financial']) {
          availableSuggestions.push({
            id: 'comprehensive-review',
            title: 'Comprehensive Business Review',
            description: 'Full overview: strategy, execution, and finances',
            icon: <BarChart3 className="w-5 h-5" />,
            prompt: 'Generate a comprehensive business review covering: 1) Strategic priorities and goals, 2) Execution progress from recent meetings, 3) Financial health and alignment. Provide recommendations for improvement.',
            requiredData: ['meetings', 'strategy', 'financial']
          });
        }

        // Default suggestion if no specific data
        if (availableSuggestions.length === 0) {
          availableSuggestions.push({
            id: 'general-overview',
            title: 'Business Overview',
            description: 'General overview of available business data',
            icon: <FileText className="w-5 h-5" />,
            prompt: 'Provide a general overview of the available business data and insights you can offer based on what information is available.',
            requiredData: []
          });
        }

        // Limit to top 3 suggestions
        setSuggestions(availableSuggestions.slice(0, 3));
        setIsLoading(false);
      } catch (err) {
        console.error('Error detecting data:', err);
        setIsLoading(false);
      }
    };

    detectAvailableData();
  }, []);

  const handleRunReport = useCallback(async (suggestion: ReportSuggestion) => {
    try {
      setIsGenerating(true);
      setSelectedSuggestion(suggestion.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('🚀 Running manual report:', suggestion.title);

      // Step 1: Create the report configuration in astra_reports table
      const { data: newReport, error: reportError } = await supabase
        .from('astra_reports')
        .insert({
          user_id: user.id,
          title: suggestion.title,
          prompt: suggestion.prompt,
          schedule_type: 'manual',
          is_active: false // Manual reports don't need to be active
        })
        .select()
        .single();

      if (reportError || !newReport) {
        throw new Error(`Failed to create report: ${reportError?.message}`);
      }

      console.log('✅ Created report configuration:', newReport.id);
      setCurrentReportId(newReport.id);

      // Step 2: Call the generate-report edge function with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Report generation timeout - aborting request');
        abortController.abort();
      }, REPORT_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`, {
          method: 'POST',
          signal: abortController.signal,
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            reportId: newReport.id,
            prompt: suggestion.prompt
          })
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate report' }));
        throw new Error(errorData.error || 'Failed to generate report');
      }

      console.log('✅ Report generated successfully');

      // Step 3: Fetch the generated report message from astra_chats
      const { data: reportMessages, error: fetchError } = await supabase
        .from('astra_chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('mode', 'reports')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError || !reportMessages || reportMessages.length === 0) {
        throw new Error('Report generated but message not found');
      }

      const reportMessage = reportMessages[0];
      console.log('✅ Found report message:', reportMessage.id);

      // Step 4: Generate visualization for the report
      console.log('🎨 Generating visualization...');
      await generateVisualization(reportMessage.id, reportMessage.message);

      // Step 5: Poll for the visualization data
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds at 500ms intervals

      const pollForVisualization = async (): Promise<string | null> => {
        while (attempts < maxAttempts) {
          attempts++;

          const { data: messageData, error: pollError } = await supabase
            .from('astra_chats')
            .select('visualization_data, metadata')
            .eq('id', reportMessage.id)
            .maybeSingle();

          if (pollError) {
            console.error('❌ Error polling for visualization:', pollError);
            return null;
          }

          if (messageData?.visualization_data) {
            console.log('✅ Visualization found!');
            return messageData.visualization_data;
          }

          // Check if still generating
          const isGenerating = messageData?.metadata?.visualization_generating === true;
          console.log(`⏳ Polling attempt ${attempts}/${maxAttempts}, generating: ${isGenerating}`);

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.warn('⏰ Visualization polling timed out');
        return null;
      };

      const vizData = await pollForVisualization();

      if (vizData) {
        setVisualizationContent(vizData);
      }

      // Mark step as complete
      setReportGenerated(true);

      // Update setup guide progress
      await supabase
        .from('setup_guide_progress')
        .update({
          step_9_manual_report_run: true,
          last_updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      console.log('✅ Manual report step completed!');
    } catch (err: any) {
      console.error('❌ Error running report:', err);
      let errorMessage = err.message || 'Unknown error';
      if (err.name === 'AbortError') {
        errorMessage = 'Report generation timed out after 5 minutes. Please try again.';
      }
      alert(`Failed to generate report: ${errorMessage}\n\nPlease try again.`);
    } finally {
      setIsGenerating(false);
      setSelectedSuggestion(null);
    }
  }, [generateVisualization]);

  const handleCloseVisualization = () => {
    setVisualizationContent(null);
  };

  if (hasCreatedReport) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-600/20 mb-3">
            <CheckCircle className="w-7 h-7 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Report Generated!</h2>
          <p className="text-sm text-gray-300">You've successfully created a custom report.</p>
        </div>

        {visualizationContent && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Your Report Visualization:</h3>
            <div className="bg-gray-900 rounded border border-gray-700 overflow-y-auto max-h-96">
              <div
                className="w-full p-4"
                dangerouslySetInnerHTML={{ __html: visualizationContent }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Scroll to view the full report • Access anytime from the Reports section
            </p>
          </div>
        )}

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <p className="text-xs text-green-300">
            <span className="font-medium">✅ Perfect!</span> You can create custom reports anytime from the Reports view.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={onComplete} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px]">
            Next: Schedule Reports →
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-600/20 mb-3">
            <Loader className="w-7 h-7 text-orange-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Analyzing Your Data...</h2>
          <p className="text-sm text-gray-300">Finding the best report suggestions for you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-600/20 mb-3">
          <FileText className="w-7 h-7 text-orange-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Run an Astra Report</h2>
        <p className="text-sm text-gray-300">Generate insights from your data</p>
      </div>

      {!isGenerating && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Suggested Reports:</h3>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleRunReport(suggestion)}
                disabled={isGenerating}
                className="w-full text-left p-3 rounded-lg border transition-all min-h-[44px] bg-gray-900 border-gray-700 hover:border-orange-500 cursor-pointer"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 text-orange-400">
                    {suggestion.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{suggestion.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{suggestion.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isGenerating && (
        <>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3 py-4">
              <Loader className="w-6 h-6 text-orange-400 animate-spin" />
              <div>
                <div className="text-sm font-medium text-white">Generating Report...</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {suggestions.find(s => s.id === selectedSuggestion)?.title}
                </div>
              </div>
            </div>
          </div>
          <LoadingCarousel type="report" />
        </>
      )}

      {!isGenerating && (
        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
          <p className="text-xs text-orange-300">
            <span className="font-medium">💡 Tip:</span> Reports analyze your data to provide actionable insights. Select one above to see it in action!
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
          <p className="text-xs text-orange-300 text-center">
            <span className="font-medium">⏳ Hang tight!</span> Report generation usually takes 1-3 minutes
          </p>
        </div>
      )}

      {/* Visualization Modal */}
      {visualizationContent && currentReportId && (
        <VisualizationView
          messageId={currentReportId}
          content={visualizationContent}
          title="Report Visualization"
          onClose={handleCloseVisualization}
        />
      )}
    </div>
  );
};
