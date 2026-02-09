import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, RefreshCw, Clock, AlertCircle, Loader2, Calendar, Sparkles, Download, X, Beaker, Info } from 'lucide-react';
import { useTeamDashboard } from '../hooks/useTeamDashboard';
import { GoalsProgressSection } from './team-dashboard/GoalsProgressSection';
import { AlignmentMetricSection } from './team-dashboard/AlignmentMetricSection';
import { HealthOverviewSection } from './team-dashboard/HealthOverviewSection';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { trackFeatureUsage } from '../hooks/useFeatureTracking';

interface TeamDashboardViewProps {
  onClose?: () => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}


function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-4" />
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="bg-slate-800/50 border border-sky-500/30 rounded-xl p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-sky-500/30 animate-ping" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-1">Generating Team Dashboard</h3>
          <p className="text-sm text-slate-400">
            Analyzing team data and generating your AI-powered insights...
          </p>
          <p className="text-xs text-slate-500 mt-2">
            This may take 30-60 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

function ExperimentalTag() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs text-amber-300 hover:bg-amber-500/20 transition-colors"
      >
        <Beaker className="w-3.5 h-3.5" />
        <span className="font-medium">Experimental</span>
      </button>
      {showTooltip && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTooltip(false)}
          />
          <div className="absolute top-full left-0 mt-2 z-50 w-64 p-3 bg-gray-900 border border-amber-500/30 rounded-lg shadow-xl">
            <p className="text-xs text-amber-200">
              This AI-generated dashboard may contain inaccuracies. If results seem off, try regenerating.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

function GenerateModal({ isOpen, onClose, onGenerate }: GenerateModalProps) {
  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-white">Generate Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            Generate a new AI-powered dashboard with the latest team data. This typically takes 30-60 seconds.
          </p>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">
              The Team Dashboard provides a consistent view of your team's goals, alignment, and health metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyDashboard({ onGenerate, isGenerating, canGenerate, isAdmin }: {
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center">
          <LayoutDashboard className="w-10 h-10 text-sky-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2 text-center">Welcome to Team Dashboard</h2>
      <p className="text-gray-400 text-center max-w-md mb-6">
        Get AI-powered daily insights on your team's goals, mission alignment, and overall health.
        Generate your first dashboard to get started.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center max-w-lg mb-6">
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-2xl mb-1">Goals</div>
          <div className="text-xs text-slate-400">Progress Tracking</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-2xl mb-1">Alignment</div>
          <div className="text-xs text-slate-400">Mission & Values</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-2xl mb-1">Health</div>
          <div className="text-xs text-slate-400">Team Score</div>
        </div>
      </div>

      {isAdmin && canGenerate ? (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${isGenerating
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:from-sky-600 hover:to-blue-600 shadow-lg hover:shadow-sky-500/20'
            }
          `}
        >
          <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate Dashboard'}
        </button>
      ) : !isAdmin ? (
        <p className="text-sm text-slate-500">
          Ask your team admin to generate the first Team Dashboard
        </p>
      ) : null}

      <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-800/30 border border-slate-700/50 rounded-lg max-w-md">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          Dashboards are automatically updated daily at midnight EST
        </p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Unable to Load Dashboard</h3>
      <p className="text-gray-400 text-center mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

export const TeamDashboardView: React.FC<TeamDashboardViewProps> = () => {
  const { user } = useAuth();
  const {
    currentSnapshot,
    loading,
    error,
    regenerate,
    isRegenerating,
    canRegenerate,
    isAdmin,
    teamName
  } = useTeamDashboard();

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (user?.id && currentSnapshot && !hasTrackedRef.current) {
      trackFeatureUsage(user.id, 'team_dashboard');
      hasTrackedRef.current = true;
    }
  }, [user?.id, currentSnapshot]);

  const handleExportPDF = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const targetElement = dashboardRef.current;

      if (!targetElement) {
        console.error('No target element found for PDF export');
        setIsExporting(false);
        return;
      }

      const canvas = await html2canvas(targetElement, {
        scale: 3,
        backgroundColor: '#0f172a',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        windowWidth: 1440,
        windowHeight: 900
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);

      const imgRatio = canvas.width / canvas.height;

      let finalWidth = availableWidth;
      let finalHeight = availableWidth / imgRatio;

      if (finalHeight > availableHeight) {
        finalHeight = availableHeight;
        finalWidth = availableHeight * imgRatio;
      }

      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;

      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');

      const safeTeamName = (teamName || 'Team').replace(/[^a-zA-Z0-9]/g, '-');
      const date = new Date().toISOString().split('T')[0];
      pdf.save(`${safeTeamName}-Dashboard-${date}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-gray-900 overflow-auto">
        <LoadingState />
      </div>
    );
  }

  if (error && !currentSnapshot) {
    return (
      <div className="h-full bg-gray-900 overflow-auto">
        <ErrorState error={error} onRetry={() => regenerate()} />
      </div>
    );
  }

  if (!currentSnapshot && !isRegenerating) {
    return (
      <div className="h-full bg-gray-900 overflow-auto">
        <EmptyDashboard
          onGenerate={() => setShowGenerateModal(true)}
          isGenerating={isRegenerating}
          canGenerate={canRegenerate}
          isAdmin={isAdmin}
        />
        <GenerateModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={regenerate}
        />
      </div>
    );
  }

  const generatedAt = currentSnapshot ? new Date(currentSnapshot.generated_at) : null;

  return (
    <div className="h-full bg-gray-900 overflow-auto flex flex-col">
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4 flex flex-col">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-white">Team Dashboard</h1>
                  <ExperimentalTag />
                </div>
                <p className="text-sm text-slate-400">
                  Daily AI-Powered Goals, Alignment & Health Insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end text-xs text-slate-500 gap-0.5">
                {generatedAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Updated {formatRelativeTime(generatedAt)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Daily at Midnight EST</span>
                </div>
              </div>

              {currentSnapshot && (
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white rounded-lg text-sm transition-colors"
                  title="Export as PDF"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  disabled={isRegenerating || !canRegenerate}
                  className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all text-sm
                    ${isRegenerating || !canRegenerate
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:from-sky-600 hover:to-blue-600'
                    }
                  `}
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Generating...' : 'Generate'}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium">Generation Error</p>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
          </div>
        )}

        {isRegenerating && (
          <div className="mt-4">
            <GeneratingState />
          </div>
        )}

        {!isRegenerating && currentSnapshot && (
          <div className="flex-1 mt-4 rounded-xl overflow-hidden bg-gray-900" style={{ minHeight: '600px' }}>
            <div
              ref={dashboardRef}
              className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4"
              style={{ maxWidth: '1400px', margin: '0 auto' }}
            >
              <div className="lg:col-span-1 flex flex-col min-h-[580px]">
                <AlignmentMetricSection data={currentSnapshot.alignment_metrics} />
              </div>
              <div className="lg:col-span-1 flex flex-col min-h-[580px]">
                <GoalsProgressSection data={currentSnapshot.goals_progress} />
              </div>
              <div className="lg:col-span-1 flex flex-col min-h-[580px]">
                <HealthOverviewSection data={currentSnapshot.health_overview} />
              </div>
            </div>
          </div>
        )}

      </div>

      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={regenerate}
      />
    </div>
  );
};

export default TeamDashboardView;
