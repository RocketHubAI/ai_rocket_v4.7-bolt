import React from 'react';
import { ArrowLeft, FileText, Sparkles, CheckCircle, Cloud, Brain, FolderSync, Grid, Zap, Shield, RefreshCw } from 'lucide-react';

interface FolderSetupGuideProps {
  onBack: () => void;
}

const DATA_CATEGORIES = [
  { name: 'Strategy', color: 'blue', description: 'Strategic plans, vision, goals' },
  { name: 'Meetings', color: 'green', description: 'Notes, transcripts, minutes' },
  { name: 'Financial', color: 'yellow', description: 'Reports, budgets, forecasts' },
  { name: 'Sales', color: 'orange', description: 'Proposals, deals, pipelines' },
  { name: 'Marketing', color: 'pink', description: 'Campaigns, content, analytics' },
  { name: 'Product', color: 'cyan', description: 'Roadmaps, specs, releases' },
  { name: 'People', color: 'teal', description: 'HR, hiring, team docs' },
  { name: 'Operations', color: 'gray', description: 'SOPs, processes, guides' },
  { name: 'Customer', color: 'emerald', description: 'Feedback, support, success' },
  { name: 'Legal', color: 'red', description: 'Contracts, compliance, policies' },
  { name: 'Industry', color: 'slate', description: 'Market research, competitors' },
  { name: 'Reference', color: 'amber', description: 'Resources, templates, tools' }
];

const SUPPORTED_FILE_TYPES = [
  { name: 'Google Docs', icon: '📄' },
  { name: 'Google Sheets', icon: '📊' },
  { name: 'Google Slides', icon: '📽️' },
  { name: 'PDF', icon: '📕' },
  { name: 'Word (.docx)', icon: '📄' },
  { name: 'Excel (.xlsx)', icon: '📊' },
  { name: 'PowerPoint (.pptx)', icon: '📽️' },
  { name: 'Text (.txt)', icon: '📝' },
  { name: 'Markdown (.md)', icon: '📋' },
  { name: 'CSV (.csv)', icon: '📊' }
];

const HOW_IT_WORKS = [
  {
    icon: Cloud,
    title: 'Connect Your Data',
    description: 'Link your Google Drive or Microsoft OneDrive/SharePoint folders, or upload files directly.'
  },
  {
    icon: FolderSync,
    title: 'We Sync Your Files',
    description: 'Our system securely syncs and processes all supported file types from any source.'
  },
  {
    icon: Brain,
    title: 'AI Classifies Content',
    description: 'Advanced AI automatically categorizes your documents into the right business categories.'
  },
  {
    icon: Sparkles,
    title: 'Ask Astra Anything',
    description: 'Query your entire knowledge base naturally. Astra finds relevant context across all your data.'
  }
];

export const FolderSetupGuide: React.FC<FolderSetupGuideProps> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-blue-500/20 mb-4">
          <Sparkles className="w-8 h-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">How Data Sync Works</h2>
        <p className="text-gray-300 text-sm">
          Sync folders from Google Drive or Microsoft OneDrive/SharePoint, upload local files, and let AI organize your knowledge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {HOW_IT_WORKS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-400">Step {index + 1}</span>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Grid className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">AI-Powered Categories</h3>
        </div>
        <p className="text-xs text-gray-300 mb-3">
          Documents are automatically classified into business categories. The more diverse your data, the smarter Astra becomes:
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {DATA_CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="px-2 py-1.5 bg-gray-800/50 rounded text-center"
            >
              <p className="text-xs font-medium text-white">{cat.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{cat.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Supported File Types</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUPPORTED_FILE_TYPES.map((fileType, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2 py-1.5 bg-gray-900/50 rounded text-xs text-gray-300"
            >
              <span>{fileType.icon}</span>
              <span>{fileType.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-green-400" />
          <h3 className="text-sm font-semibold text-white">Fuel Level Progress</h3>
        </div>
        <div className="space-y-2 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span><strong className="text-white">Level 1:</strong> Sync your first document (from Drive or local)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span><strong className="text-white">Level 2:</strong> 5+ documents, 2+ categories</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span><strong className="text-white">Level 3:</strong> 50+ documents, 5+ categories</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span><strong className="text-white">Level 4:</strong> 200+ documents, 8+ categories</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span><strong className="text-white">Level 5:</strong> 1000+ documents, 12+ categories</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">Auto-Sync</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Changes to your cloud drive files are automatically synced to keep Astra up-to-date.
          </p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-white">Secure & Private</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Your data stays private. Only your team can access your synced documents.
          </p>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Tip:</strong> Sync folders with diverse business documents or upload local files - meeting notes, financial reports, project plans, and more. The more categories represented, the more powerful Astra's insights become!
        </p>
      </div>

      <button
        onClick={onBack}
        className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 min-h-[44px]"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
    </div>
  );
};
