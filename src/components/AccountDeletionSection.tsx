import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2, X, FileText, BarChart3, MessageSquare, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface AccountDeletionSectionProps {
  onClose: () => void;
}

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

export const AccountDeletionSection: React.FC<AccountDeletionSectionProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const teamId = user?.user_metadata?.team_id;

  const handleExportData = async () => {
    if (!user?.id) return;

    setExporting(true);

    try {
      const { data: chatMessages } = await supabase
        .from('astra_chats')
        .select('id, conversation_id, message, astra_prompt, visualization, visualization_data, message_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

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

      const { data: savedViz } = await supabase
        .from('saved_visualizations')
        .select('id, title, original_prompt, visualization_data, saved_at')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      const { data: reports } = await supabase
        .from('astra_reports')
        .select('id, prompt, schedule_frequency, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
    } catch (err) {
      console.error('Error exporting data:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    if (!user?.id) return;

    setDeleting(true);
    setDeleteError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { error } = await supabase.rpc('delete_user_completely', {
        target_user_id: user.id
      });

      if (error) throw error;

      await supabase.auth.signOut();
      onClose();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setDeleteError(err.message || 'Failed to delete account. Please contact support@rockethub.ai');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-red-900/20 rounded-lg p-6 border border-red-800/50">
      <div className="flex items-center space-x-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-semibold text-white">Delete Account</h3>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>

      <button
        onClick={() => setShowDeleteModal(true)}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2 min-h-[44px]"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete My Account</span>
      </button>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Delete Account</h3>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                    setDeleteError('');
                    setExportComplete(false);
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6">
                <p className="text-red-200 text-sm font-medium mb-2">
                  This will permanently delete:
                </p>
                <ul className="text-red-200/80 text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    All your chat conversations with Astra
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 flex-shrink-0" />
                    All saved visualizations and reports
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    All synced document data
                  </li>
                </ul>
              </div>

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6">
                <p className="text-blue-200 text-sm font-medium mb-3">
                  Want to save your data first?
                </p>
                <p className="text-blue-200/70 text-xs mb-3">
                  Export your chat history, visualizations, and reports before deleting your account.
                  Your synced documents remain in your Google Drive.
                </p>
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {exporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : exportComplete ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-300" />
                      <span>Export Complete - Download Again</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Export Chat & Visualization Data</span>
                    </>
                  )}
                </button>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <p className="text-gray-300 text-sm mb-4">
                  To confirm deletion, type <span className="font-mono font-bold text-red-400">DELETE</span> below:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none mb-4 font-mono"
                />

                {deleteError && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{deleteError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setConfirmText('');
                      setDeleteError('');
                      setExportComplete(false);
                    }}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== 'DELETE' || deleting}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        <span>Delete Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
