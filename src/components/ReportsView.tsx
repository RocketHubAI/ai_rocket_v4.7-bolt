import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Settings, Trash2, Eye, FileText, Maximize2, RotateCcw, Copy, Check, FileBarChart, Users, Sparkles } from 'lucide-react';
import { useVisualization } from '../hooks/useVisualization';
import { useReportsContext } from '../contexts/ReportsContext';
import { ManageReportsModal } from './ManageReportsModal';
import { VisualizationView } from './VisualizationView';
import { formatAstraMessage } from '../utils/formatAstraMessage';
import { ManualReportBoosterModal } from './launch-stages/ManualReportBoosterModal';

export const ReportsView: React.FC = () => {
  const {
    reportMessages,
    loading,
    error,
    deleteReportMessage,
    setError,
    runReportNow,
    runningReports
  } = useReportsContext();

  const { generateVisualization } = useVisualization();

  const [showManageModal, setShowManageModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGuidedReports, setShowGuidedReports] = useState(false);
  const [selectedVisualization, setSelectedVisualization] = useState<{
    messageId: string;
    content: string;
    title: string;
  } | null>(null);
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null);
  const [retryingReportId, setRetryingReportId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const processedVisualizationsRef = useRef<Set<string>>(new Set());

  // Auto-generate visualizations for new reports - with safeguards for mobile
  useEffect(() => {
    if (!reportMessages || !Array.isArray(reportMessages)) return;

    const pendingMessages = reportMessages.filter(
      (message) => message && !message.visualization_data && !processedVisualizationsRef.current.has(message.id)
    );

    if (pendingMessages.length === 0) return;

    const processNext = async (index: number) => {
      if (index >= pendingMessages.length) return;

      const message = pendingMessages[index];
      if (!message?.id || !message?.text) return;

      console.log('🎨 [ReportsView] Auto-generating visualization for report:', message.id);
      processedVisualizationsRef.current.add(message.id);

      try {
        await generateVisualization(message.id, message.text);
        setTimeout(() => processNext(index + 1), 500);
      } catch (err) {
        console.error('❌ [ReportsView] Failed to auto-generate visualization:', err);
        processedVisualizationsRef.current.delete(message.id);
        setTimeout(() => processNext(index + 1), 500);
      }
    };

    processNext(0);
  }, [reportMessages, generateVisualization]);

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm('Delete this report result?')) {
      await deleteReportMessage(messageId);
    }
  };

  const handleViewVisualization = (messageId: string, visualizationData: string, reportTitle?: string) => {
    setSelectedVisualization({
      messageId,
      content: visualizationData,
      title: reportTitle || 'Report Visualization'
    });
  };

  const handleViewText = (messageId: string) => {
    setExpandedTextId(expandedTextId === messageId ? null : messageId);
  };

  const handleRetry = useCallback(async (messageId: string) => {
    if (!reportMessages || !Array.isArray(reportMessages)) return;

    const message = reportMessages.find(m => m.id === messageId);
    console.log('🔄 Retry visualization clicked for message:', messageId);

    if (!message?.text) {
      console.error('❌ Cannot retry: message not found or has no text');
      return;
    }

    console.log('✅ Starting visualization retry for messageId:', messageId);
    setRetryingReportId(messageId);
    try {
      await generateVisualization(messageId, message.text);
      console.log('✅ Retry visualization completed successfully');
    } catch (err) {
      console.error('❌ Failed to retry visualization:', err);
    } finally {
      setRetryingReportId(null);
    }
  }, [reportMessages, generateVisualization]);

  const handleCopyText = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTextId(messageId);
      setTimeout(() => setCopiedTextId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (selectedVisualization) {
    return (
      <VisualizationView
        content={selectedVisualization.content}
        onBack={() => setSelectedVisualization(null)}
        title={selectedVisualization.title}
        backButtonText="Go Back to Reports"
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-[#1e293b] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Reports</h2>
              <p className="text-xs text-gray-400">
                AI insights, delivered on schedule
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowGuidedReports(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg transition-colors min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Agent Guided Reports</span>
              <span className="sm:hidden">Guided</span>
            </button>
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors min-h-[44px]"
            >
              <Settings className="w-4 h-4" />
              <span>Manage</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>New Report</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content - Single Column Stack */}
      <div className="flex-1 overflow-y-auto p-4 overflow-x-hidden">
        {reportMessages.length > 0 ? (
          <div className="max-w-7xl mx-auto space-y-6 w-full">
            {reportMessages.map((message) => (
              <div
                key={message.id}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Header with title and timestamp */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      🚀
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {message.reportMetadata?.title || message.reportMetadata?.report_title || 'Report'}
                        </h3>
                        {message.reportMetadata?.is_team_report && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-300 bg-orange-500/20 border border-orange-500/40 rounded-full whitespace-nowrap">
                            <Users className="w-3 h-3" />
                            Team Report
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {message.timestamp.toLocaleDateString()} at{' '}
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.reportMetadata?.is_team_report && message.reportMetadata?.created_by_name && (
                          <> • Created by {message.reportMetadata.created_by_name}</>
                        )}
                      </p>
                    </div>
                    {message.reportMetadata?.reportId && (
                      <button
                        onClick={() => runReportNow(message.reportMetadata.reportId)}
                        disabled={runningReports.has(message.reportMetadata.reportId)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm min-h-[44px]"
                        title="Run this report again"
                      >
                        {runningReports.has(message.reportMetadata.reportId) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            <span>Retry</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Visualization Preview (scrollable) */}
                {retryingReportId === message.id ? (
                  <div className="h-96 bg-gray-900 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="mb-6">
                        <div className="relative inline-block">
                          <div className="w-16 h-16 mx-auto">
                            <svg className="w-full h-full text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 rounded-lg animate-ping"></div>
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Generating Visualization</h3>
                      <p className="text-gray-400 text-sm mb-6">Astra is creating your interactive visualization...</p>
                      <div className="flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                ) : message.visualization && message.visualization_data ? (
                  <div className="relative overflow-hidden">
                    <div className="h-96 overflow-y-auto overflow-x-hidden bg-gray-900">
                      <iframe
                        srcDoc={message.visualization_data}
                        className="w-full h-full"
                        sandbox="allow-scripts"
                        style={{
                          border: 'none',
                          display: 'block',
                          minHeight: '384px'
                        }}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                  </div>
                ) : (
                  <div className="h-96 bg-gray-900 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="mb-6">
                        <div className="relative inline-block">
                          <div className="w-16 h-16 mx-auto">
                            <svg className="w-full h-full text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 rounded-lg animate-ping"></div>
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Generating Visualization</h3>
                      <p className="text-gray-400 text-sm mb-6">Astra is creating your interactive visualization...</p>
                      <div className="flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-700 flex flex-wrap gap-2">
                  {message.visualization && message.visualization_data && (
                    <button
                      onClick={() => handleViewVisualization(
                        message.id,
                        message.visualization_data!,
                        message.reportMetadata?.title || message.reportMetadata?.report_title
                      )}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm min-h-[44px]"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Full View</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleViewText(message.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm min-h-[44px]"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{expandedTextId === message.id ? 'Hide Text' : 'View Text'}</span>
                  </button>
                  {expandedTextId === message.id && (
                    <button
                      onClick={() => handleCopyText(message.id, message.text)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm min-h-[44px]"
                    >
                      {copiedTextId === message.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleRetry(message.id)}
                    disabled={retryingReportId === message.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm min-h-[44px]"
                    title="Refresh visualization"
                  >
                    {retryingReportId === message.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm min-h-[44px]"
                    title="Delete report"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Expanded Text View */}
                {expandedTextId === message.id && (
                  <div className="px-4 pb-4">
                    <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="text-sm">
                        {formatAstraMessage(message.text)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Reports Yet
            </h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Create your first report to get AI-powered insights and visualizations delivered automatically.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Report</span>
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Manage Reports Modal - shows active reports for edit/delete/run */}
      {showManageModal && (
        <ManageReportsModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
        />
      )}

      {/* Create New Report Modal - shows templates and custom option */}
      {showCreateModal && (
        <ManageReportsModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          startInCreateMode={true}
        />
      )}

      {/* Agent Guided Reports Modal */}
      {showGuidedReports && (
        <ManualReportBoosterModal
          onClose={() => setShowGuidedReports(false)}
          onComplete={() => setShowGuidedReports(false)}
        />
      )}
    </div>
  );
};
