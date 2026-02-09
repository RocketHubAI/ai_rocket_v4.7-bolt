import React, { useState } from 'react';
import { Download, CheckCircle, FileText, BarChart3, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface ExportData {
  exportDate: string;
  userEmail: string;
  conversations: ConversationExport[];
  savedVisualizations: SavedVisualizationExport[];
  reports: ReportExport[];
}

interface ConversationExport {
  conversationId: string;
  messages: MessageExport[];
}

interface MessageExport {
  id: string;
  role: string;
  content: string;
  prompt?: string;
  hasVisualization: boolean;
  visualizationHtml?: string;
  createdAt: string;
}

interface SavedVisualizationExport {
  id: string;
  title: string;
  prompt: string;
  htmlContent: string;
  savedAt: string;
}

interface ReportExport {
  id: string;
  prompt: string;
  frequency: string;
  createdAt: string;
}

export const DataExportSection: React.FC = () => {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [error, setError] = useState('');

  const handleExportData = async () => {
    if (!user?.id) return;

    setExporting(true);
    setError('');
    setExportComplete(false);

    try {
      const { data: chatMessages, error: chatError } = await supabase
        .from('astra_chats')
        .select('id, conversation_id, message, astra_prompt, visualization, visualization_data, message_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (chatError) {
        console.error('Error fetching chats:', chatError);
      }

      const conversationsMap = new Map<string, MessageExport[]>();

      (chatMessages || []).forEach(msg => {
        const convId = msg.conversation_id || 'default';
        if (!conversationsMap.has(convId)) {
          conversationsMap.set(convId, []);
        }

        conversationsMap.get(convId)!.push({
          id: msg.id,
          role: msg.message_type === 'user' ? 'user' : 'assistant',
          content: msg.message || '',
          prompt: msg.astra_prompt || undefined,
          hasVisualization: msg.visualization || false,
          visualizationHtml: msg.visualization_data || undefined,
          createdAt: msg.created_at
        });
      });

      const conversations: ConversationExport[] = Array.from(conversationsMap.entries()).map(
        ([conversationId, messages]) => ({
          conversationId,
          messages
        })
      );

      const { data: savedViz, error: vizError } = await supabase
        .from('saved_visualizations')
        .select('id, title, original_prompt, visualization_data, saved_at')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (vizError) {
        console.error('Error fetching saved visualizations:', vizError);
      }

      const { data: reports, error: reportError } = await supabase
        .from('astra_reports')
        .select('id, prompt, schedule_frequency, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reportError) {
        console.error('Error fetching reports:', reportError);
      }

      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        userEmail: user.email || '',
        conversations,
        savedVisualizations: (savedViz || []).map(viz => ({
          id: viz.id,
          title: viz.title || 'Untitled Visualization',
          prompt: viz.original_prompt || '',
          htmlContent: viz.visualization_data || '',
          savedAt: viz.saved_at
        })),
        reports: (reports || []).map(report => ({
          id: report.id,
          prompt: report.prompt || '',
          frequency: report.schedule_frequency || 'manual',
          createdAt: report.created_at
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rockethub-data-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportComplete(true);

      setTimeout(() => {
        setExportComplete(false);
      }, 5000);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
      <div className="flex items-center space-x-3 mb-4">
        <Download className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Export Your Data</h3>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Download all your chat conversations, visualizations, and reports as a JSON file.
      </p>

      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <p className="text-xs text-gray-400 mb-3">Your export will include:</p>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
            All chat conversations with Astra (including inline visualizations)
          </li>
          <li className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-400 flex-shrink-0" />
            Saved visualizations with HTML content
          </li>
          <li className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
            Report configurations
          </li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleExportData}
        disabled={exporting}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
      >
        {exporting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Exporting...</span>
          </>
        ) : exportComplete ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-300" />
            <span>Export Complete!</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Export Chat & Visualization Data</span>
          </>
        )}
      </button>
    </div>
  );
};
