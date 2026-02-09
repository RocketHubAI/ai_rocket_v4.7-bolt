import React, { useState } from 'react';
import {
  ArrowLeft,
  Database,
  Folder,
  FolderTree,
  Search,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
  Layers,
  ArrowRight,
  FileText,
  Settings,
  Workflow,
  Lock,
  Unlock,
  BarChart3,
  Target,
  Lightbulb,
  Building2,
  Briefcase,
  GraduationCap,
  Heart,
  MessageSquareWarning,
  TrendingUp,
  Link2,
  Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TabId = 'overview' | 'comparison' | 'use-cases' | 'benefits';

interface ComparisonRow {
  feature: string;
  current: {
    value: string;
    status: 'good' | 'warning' | 'poor';
  };
  proposed: {
    value: string;
    status: 'good' | 'warning' | 'poor';
  };
  impact: string;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: 'Folder Configuration',
    current: { value: '4 separate folders required', status: 'warning' },
    proposed: { value: '1 main + up to 10 additional folders', status: 'good' },
    impact: 'Dramatically simplified onboarding with flexibility'
  },
  {
    feature: 'Database Tables',
    current: { value: '4 tables (strategy, financial, meetings, projects)', status: 'warning' },
    proposed: { value: '1 unified table with doc_type column', status: 'good' },
    impact: 'Simplified queries and maintenance'
  },
  {
    feature: 'N8N Sync Workflows',
    current: { value: '4 separate workflows', status: 'warning' },
    proposed: { value: '1 unified workflow', status: 'good' },
    impact: '75% reduction in workflow maintenance'
  },
  {
    feature: 'Vector Store Nodes (Astra Agent)',
    current: { value: '4 Vector Store nodes', status: 'warning' },
    proposed: { value: '1 Vector Store node', status: 'good' },
    impact: 'Faster queries, simpler agent logic'
  },
  {
    feature: 'Subfolder Support',
    current: { value: 'Flat sync only (no subfolders)', status: 'poor' },
    proposed: { value: 'Recursive traversal (all subfolders)', status: 'good' },
    impact: 'Users can organize files naturally'
  },
  {
    feature: 'Document Classification',
    current: { value: 'Manual (folder-based)', status: 'warning' },
    proposed: { value: 'LLM-powered automatic classification', status: 'good' },
    impact: 'Intelligent categorization without user effort'
  },
  {
    feature: 'Document Categories',
    current: { value: '4 fixed categories', status: 'warning' },
    proposed: { value: '14 intelligent categories + flexible doc_type', status: 'good' },
    impact: 'Better organization and search relevance'
  },
  {
    feature: 'Access Control',
    current: { value: 'Implicit (skip tables)', status: 'warning' },
    proposed: { value: 'Explicit sensitivity_level + RLS', status: 'good' },
    impact: 'Auditable, granular permissions'
  },
  {
    feature: 'Search Metadata',
    current: { value: 'Basic (file name, date)', status: 'warning' },
    proposed: { value: 'Rich (topics, entities, summary, keywords)', status: 'good' },
    impact: 'Significantly improved search accuracy'
  },
  {
    feature: 'Query Performance',
    current: { value: 'Multiple parallel queries', status: 'warning' },
    proposed: { value: 'Single optimized query', status: 'good' },
    impact: 'Faster response times'
  },
  {
    feature: 'User Onboarding Time',
    current: { value: '10-15 minutes (4 folders)', status: 'poor' },
    proposed: { value: '2-3 minutes (1 folder)', status: 'good' },
    impact: '80% reduction in setup time'
  },
  {
    feature: 'Maintenance Burden',
    current: { value: 'High (4x everything)', status: 'poor' },
    proposed: { value: 'Low (single unified system)', status: 'good' },
    impact: 'Reduced engineering overhead'
  }
];

const benefits = [
  {
    icon: Users,
    title: 'Simplified User Onboarding',
    description: 'Users select one main folder and can optionally add up to 10 more individual folders as needed. Setup time drops from 10-15 minutes to 2-3 minutes with full flexibility.',
    impact: 'High'
  },
  {
    icon: Sparkles,
    title: 'Intelligent Document Classification',
    description: 'AI automatically categorizes documents based on content, not folder location. No manual sorting required.',
    impact: 'High'
  },
  {
    icon: FolderTree,
    title: 'Natural File Organization',
    description: 'Recursive folder traversal means users can organize files in subfolders however they prefer. No flat-folder limitations.',
    impact: 'High'
  },
  {
    icon: Zap,
    title: 'Faster Search Performance',
    description: 'Single unified query instead of four parallel queries. Improved response times and reduced database load.',
    impact: 'Medium'
  },
  {
    icon: Shield,
    title: 'Enhanced Access Control',
    description: 'Explicit sensitivity_level column with RLS policies. Auditable, granular permissions for financial and HR data.',
    impact: 'Medium'
  },
  {
    icon: Settings,
    title: 'Reduced Maintenance',
    description: 'One workflow, one table, one vector store. 75% reduction in maintenance overhead and potential failure points.',
    impact: 'High'
  },
  {
    icon: Search,
    title: 'Improved Search Relevance',
    description: 'Rich metadata (topics, entities, summaries) enables semantic + metadata hybrid search for better results.',
    impact: 'Medium'
  },
  {
    icon: Layers,
    title: 'Unlimited Document Types',
    description: 'Flexible doc_type field allows any classification. No rigid 4-category limitation.',
    impact: 'Medium'
  }
];

const useCases = [
  {
    icon: Building2,
    title: 'Sarah - Church Administrator',
    role: 'Operations Manager',
    color: 'blue',
    scenario: 'Sarah manages all church documents across multiple departments: finance, worship, outreach, and facilities.',
    before: 'Had to create 4 separate folders and manually sort every document into the right category. New volunteers got confused about where to save files.',
    after: 'Just points Astra to one "Church Documents" folder. AI automatically categorizes budget reports, volunteer schedules, and event plans. New team members save files anywhere and everything stays searchable.',
    quote: 'Setup went from a 15-minute training session to "just save it in the shared folder."'
  },
  {
    icon: Briefcase,
    title: 'Marcus - Startup Founder',
    role: 'CEO',
    color: 'emerald',
    scenario: 'Marcus runs a growing tech startup with investor decks, product roadmaps, HR documents, and customer contracts.',
    before: 'Worried about employees accidentally accessing salary data or investor term sheets. Had to manually manage folder permissions for sensitive documents.',
    after: 'AI automatically flags financial and HR-sensitive documents with appropriate access levels. Only CFO and HR lead can query salary information. Everyone else gets full access to strategy and product docs.',
    quote: 'I finally stopped worrying about who can see what.'
  },
  {
    icon: GraduationCap,
    title: 'Dr. Chen - Research Director',
    role: 'Academic Institution',
    color: 'amber',
    scenario: 'Manages research papers, grant proposals, lab protocols, and student records across multiple research groups.',
    before: 'Research teams organized files their own way. Finding documents required knowing which team created them and where they stored files.',
    after: 'All teams dump files into one research folder. AI understands that a "Western Blot Protocol" is a lab procedure and a "NIH R01 Draft" is a grant proposal. Cross-team searches finally work.',
    quote: 'Our postdocs stopped asking me where to find things.'
  },
  {
    icon: Heart,
    title: 'Linda - Nonprofit Director',
    role: 'Executive Director',
    color: 'rose',
    scenario: 'Oversees donor relations, program reports, volunteer coordination, and board communications.',
    before: 'Different program managers used different folder structures. Board reports required manually gathering information from multiple locations.',
    after: 'One unified folder for the entire organization. Asking "What did we accomplish in Q3?" searches across all programs automatically. Donor-sensitive information stays protected.',
    quote: 'Board prep went from a full day to an hour.'
  }
];

interface ExpandableSectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultExpanded = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-semibold text-white">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View more</span>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-700 pt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export const DataStrategyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'comparison', label: 'Feature Comparison', icon: BarChart3 },
    { id: 'use-cases', label: 'Use Cases', icon: Users },
    { id: 'benefits', label: 'Benefits & Impact', icon: Target }
  ];

  const getStatusIcon = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'poor':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBg = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good':
        return 'bg-emerald-500/10 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'poor':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  const getUseCaseColors = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
      rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', iconBg: 'bg-rose-500/20' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 mt-1 sm:mt-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-white leading-tight">Unified Document Sync Strategy</h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Simplified data management for your team</p>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className="px-2 sm:px-3 py-1 bg-amber-500/20 text-amber-400 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap">
                Draft Proposal
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl border border-gray-700 p-8 mb-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                Smarter Document Management
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Flexible Folders. Zero Sorting.
                <br />
                <span className="text-blue-400">AI Does the Rest.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-6">
                Stop organizing documents manually. Select one main folder and add up to 10 more as needed.
                Our AI automatically understands, categorizes, and secures all your content.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>80% faster setup</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Auto-classification</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Smart security</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-gray-400 font-medium">Before</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium">After</span>
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <Folder className="w-4 h-4" />
                      <span>4 Folders</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <Database className="w-4 h-4" />
                      <span>4 Tables</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <Workflow className="w-4 h-4" />
                      <span>4 Workflows</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <Users className="w-4 h-4" />
                      <span>Manual sorting</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <FolderTree className="w-4 h-4" />
                      <span>1 Main + 10 More</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Database className="w-4 h-4" />
                      <span>1 Table</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Workflow className="w-4 h-4" />
                      <span>1 Workflow</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <Brain className="w-4 h-4" />
                      <span>AI classification</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/30 p-6 mb-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-4">
                <MessageSquareWarning className="w-4 h-4" />
                Key Beta Tester Finding
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                The #1 Challenge: Understanding How to Connect Data
              </h3>
              <p className="text-gray-300 mb-4">
                Beta testers consistently reported a steep learning curve when trying to organize and sync their data in AI Rocket.
                This creates friction that delays the value users receive.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">Data Connection = Maximum ROI</span>
                    <p className="text-sm text-gray-400">The more data Astra can access, the smarter and more valuable it becomes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">Current Barrier</span>
                    <p className="text-sm text-gray-400">Users struggle with 4-folder setup and manual sorting requirements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">New Strategy: Let AI Do the Work</span>
                    <p className="text-sm text-gray-400">Users just point to their data. Our AI handles understanding and sorting.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gray-900/80 rounded-xl p-6 border border-amber-500/20">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl mb-3">
                    <TrendingUp className="w-8 h-8 text-amber-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Unlocking Astra's Full Potential</h4>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-red-400 font-bold text-sm">25%</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-400">Limited Data Connected</div>
                        <div className="text-xs text-gray-500">Astra provides basic assistance</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <span className="text-emerald-400 font-bold text-sm">100%</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-emerald-400">Full Data Connected</div>
                        <div className="text-xs text-gray-500">Astra delivers Massive ROI</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-medium">Our Goal</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Remove every barrier between users and connected data so Astra can deliver maximum value from day one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">1+10</div>
            <div className="text-sm text-gray-400">Flexible Folders</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
            <div className="text-4xl font-bold text-emerald-400 mb-2">80%</div>
            <div className="text-sm text-gray-400">Faster Setup</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
            <div className="text-4xl font-bold text-cyan-400 mb-2">14</div>
            <div className="text-sm text-gray-400">Auto Categories</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
            <div className="text-4xl font-bold text-amber-400 mb-2">0</div>
            <div className="text-sm text-gray-400">Manual Sorting</div>
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-4 sm:p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h3 className="text-base sm:text-lg font-semibold text-white">Explore This Proposal</h3>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                      : 'bg-gray-700/70 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span className="text-sm sm:text-base">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3">Select a section above to view detailed information</p>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ExpandableSection
              title="How It Works"
              icon={Lightbulb}
              iconColor="text-amber-400"
              defaultExpanded={true}
            >
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FolderTree className="w-8 h-8 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">1. Connect Your Folders</h4>
                  <p className="text-sm text-gray-400">
                    Select one main folder, then add up to 10 more individual folders as needed. Subfolders are automatically included.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">2. AI Analyzes Content</h4>
                  <p className="text-sm text-gray-400">
                    Our AI reads each document and automatically assigns category, type, and sensitivity level.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">3. Smart Search Ready</h4>
                  <p className="text-sm text-gray-400">
                    Search across everything with intelligent filtering. Sensitive docs stay protected.
                  </p>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection
              title="Current vs Target Architecture"
              icon={Layers}
              iconColor="text-blue-400"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 rounded-lg p-5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <h3 className="font-semibold text-white">Current State</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">-</span>
                      <span>4 separate user folders required (Strategy, Financials, Meetings, Projects)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">-</span>
                      <span>4 separate database tables for document chunks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">-</span>
                      <span>4 separate sync workflows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">-</span>
                      <span>Flat folder sync (no subfolder traversal)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">-</span>
                      <span>Manual document sorting by users</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-5 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-white">Target State</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">+</span>
                      <span>1 main folder + up to 10 additional folders (any user-selected folders)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">+</span>
                      <span>1 unified database table with smart columns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">+</span>
                      <span>1 unified sync workflow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">+</span>
                      <span>Recursive folder sync (all subfolders included)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">+</span>
                      <span>AI-powered automatic classification</span>
                    </li>
                  </ul>
                </div>
              </div>
            </ExpandableSection>

            <ExpandableSection
              title="AI Classification System"
              icon={Brain}
              iconColor="text-emerald-400"
              defaultExpanded={true}
            >
              <p className="text-gray-300 mb-6">
                Instead of requiring users to manually sort documents into specific folders, the new system uses our AI models to automatically
                classify documents during ingestion. This provides intelligent categorization without user effort.
              </p>

              <div className="mb-6 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-xl p-6 border border-blue-500/20">
                <h4 className="font-semibold text-white text-lg mb-5 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  14 Intelligent Document Categories
                </h4>
                <p className="text-sm text-gray-400 mb-4">
                  Our AI automatically analyzes document content and assigns one of these categories, along with relevant metadata and sensitivity levels.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-colors">
                    <div className="font-semibold text-blue-400 mb-1.5 text-sm">Strategy</div>
                    <div className="text-xs text-gray-300">Vision, strategic plans, roadmaps, OKRs, goals</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-emerald-500/50 transition-colors">
                    <div className="font-semibold text-emerald-400 mb-1.5 text-sm">Financial</div>
                    <div className="text-xs text-gray-300">Budgets, P&L, invoices, forecasts, expenses, salaries</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/50 transition-colors">
                    <div className="font-semibold text-cyan-400 mb-1.5 text-sm">Meetings</div>
                    <div className="text-xs text-gray-300">Meeting notes, agendas, minutes, 1:1s, L10s</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-amber-500/50 transition-colors">
                    <div className="font-semibold text-amber-400 mb-1.5 text-sm">Operations</div>
                    <div className="text-xs text-gray-300">Processes, procedures, SOPs, workflows</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-pink-500/50 transition-colors">
                    <div className="font-semibold text-pink-400 mb-1.5 text-sm">People</div>
                    <div className="text-xs text-gray-300">HR, personnel, org charts, hiring, reviews</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors">
                    <div className="font-semibold text-purple-400 mb-1.5 text-sm">Sales</div>
                    <div className="text-xs text-gray-300">Sales pipelines, deals, proposals, sales forecasts</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-teal-500/50 transition-colors">
                    <div className="font-semibold text-teal-400 mb-1.5 text-sm">Customer</div>
                    <div className="text-xs text-gray-300">Current customer info, account details, success plans</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors">
                    <div className="font-semibold text-orange-400 mb-1.5 text-sm">Industry</div>
                    <div className="text-xs text-gray-300">Market research, competitor analysis, industry trends</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-lime-500/50 transition-colors">
                    <div className="font-semibold text-lime-400 mb-1.5 text-sm">Product</div>
                    <div className="text-xs text-gray-300">PRDs, specs, features, product roadmaps</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-red-500/50 transition-colors">
                    <div className="font-semibold text-red-400 mb-1.5 text-sm">Legal</div>
                    <div className="text-xs text-gray-300">Contracts, agreements, compliance, terms</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-indigo-500/50 transition-colors">
                    <div className="font-semibold text-indigo-400 mb-1.5 text-sm">Marketing</div>
                    <div className="text-xs text-gray-300">Campaigns, brand, content, marketing plans</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-yellow-500/50 transition-colors">
                    <div className="font-semibold text-yellow-400 mb-1.5 text-sm">Support</div>
                    <div className="text-xs text-gray-300">Customer issues, tickets, support cases</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-sky-500/50 transition-colors">
                    <div className="font-semibold text-sky-400 mb-1.5 text-sm">Reference</div>
                    <div className="text-xs text-gray-300">Policies, handbooks, templates, guides</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700 hover:border-gray-500/50 transition-colors">
                    <div className="font-semibold text-gray-400 mb-1.5 text-sm">Other</div>
                    <div className="text-xs text-gray-300">Does not fit above categories</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-6 border border-amber-500/20">
                <h4 className="font-semibold text-white text-lg mb-5 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Automatic Sensitivity Classification
                </h4>
                <p className="text-sm text-gray-400 mb-4">
                  AI automatically assigns appropriate security levels to protect sensitive data while keeping general information accessible.
                </p>
                <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
                      <Unlock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-emerald-400 mb-1">General</div>
                        <div className="text-xs text-gray-300">Anyone on team can access. Ideal for strategy docs, meeting notes, and general business information.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 hover:border-amber-500/50 transition-colors">
                      <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-amber-400 mb-1">Financial</div>
                        <div className="text-xs text-gray-300">Requires view_financial permission. Protects budgets, P&L statements, invoices, and financial forecasts.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/30 hover:border-orange-500/50 transition-colors">
                      <Lock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-orange-400 mb-1">HR Sensitive</div>
                        <div className="text-xs text-gray-300">Requires view_hr permission. Secures salary info, performance reviews, and personnel records.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-colors">
                      <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-red-400 mb-1">Confidential</div>
                        <div className="text-xs text-gray-300">Elevated access required. Reserved for highly sensitive legal, executive, and strategic documents.</div>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="font-medium text-blue-400 mb-3">What AI Extracts From Each Document</h4>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                    <Layers className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-sm text-white font-medium">Category</div>
                    <div className="text-xs text-gray-400">e.g., Financial, Strategy</div>
                  </div>
                  <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                    <FileText className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <div className="text-sm text-white font-medium">Document Type</div>
                    <div className="text-xs text-gray-400">e.g., Budget, Report</div>
                  </div>
                  <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                    <Shield className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-sm text-white font-medium">Sensitivity</div>
                    <div className="text-xs text-gray-400">e.g., General, Financial</div>
                  </div>
                  <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                    <Search className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <div className="text-sm text-white font-medium">Keywords</div>
                    <div className="text-xs text-gray-400">For better search</div>
                  </div>
                </div>
              </div>
            </ExpandableSection>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Feature-by-Feature Comparison</h2>
                <p className="text-sm text-gray-400 mt-1">Detailed analysis of current vs proposed architecture</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 w-1/4">Feature</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 w-1/4">Current System</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 w-1/4">Proposed System</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 w-1/4">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {comparisonData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-medium text-white">{row.feature}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusBg(row.current.status)}`}>
                            {getStatusIcon(row.current.status)}
                            <span className="text-sm text-gray-300">{row.current.value}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusBg(row.proposed.status)}`}>
                            {getStatusIcon(row.proposed.status)}
                            <span className="text-sm text-gray-300">{row.proposed.value}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-400">{row.impact}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="text-4xl font-bold text-emerald-400 mb-2">75%</div>
                <div className="text-white font-medium">Reduction in Workflows</div>
                <div className="text-sm text-gray-400 mt-1">From 4 sync workflows to 1</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="text-4xl font-bold text-blue-400 mb-2">80%</div>
                <div className="text-white font-medium">Faster Onboarding</div>
                <div className="text-sm text-gray-400 mt-1">2-3 min vs 10-15 min setup</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="text-4xl font-bold text-cyan-400 mb-2">1</div>
                <div className="text-white font-medium">Unified Vector Store</div>
                <div className="text-sm text-gray-400 mt-1">Consolidated from 4 stores</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Architecture Diagram</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-4 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Current Architecture
                  </h4>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-2">
                        {['Strategy', 'Financial', 'Meetings', 'Projects'].map((folder) => (
                          <div key={folder} className="px-2 py-1 bg-red-500/20 rounded text-xs text-red-400 border border-red-500/30">
                            <Folder className="w-3 h-3 inline mr-1" />
                            {folder}
                          </div>
                        ))}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
                      <div className="flex gap-2">
                        {['Workflow 1', 'Workflow 2', 'Workflow 3', 'Workflow 4'].map((wf) => (
                          <div key={wf} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                            {wf}
                          </div>
                        ))}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
                      <div className="flex gap-2">
                        {['Table 1', 'Table 2', 'Table 3', 'Table 4'].map((tbl) => (
                          <div key={tbl} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                            <Database className="w-3 h-3 inline mr-1" />
                            {tbl}
                          </div>
                        ))}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
                      <div className="flex gap-2">
                        {['VS 1', 'VS 2', 'VS 3', 'VS 4'].map((vs) => (
                          <div key={vs} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                            <Search className="w-3 h-3 inline mr-1" />
                            {vs}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-emerald-400 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Proposed Architecture
                  </h4>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex flex-col items-center gap-3">
                      <div className="px-4 py-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
                        <FolderTree className="w-4 h-4 inline mr-2" />
                        1 Main + Up to 10 Additional Folders
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
                      <div className="px-4 py-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                        <Workflow className="w-4 h-4 inline mr-2" />
                        Unified Workflow + AI Classification
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
                      <div className="px-4 py-2 bg-cyan-500/20 rounded-lg text-cyan-400 border border-cyan-500/30">
                        <Database className="w-4 h-4 inline mr-2" />
                        Single Table (document_chunks)
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
                      <div className="px-4 py-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                        <Search className="w-4 h-4 inline mr-2" />
                        Single Vector Store
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'use-cases' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Real-World Use Cases</h2>
              <p className="text-gray-400">
                See how different organizations benefit from unified document management with AI classification.
              </p>
            </div>

            <div className="grid gap-6">
              {useCases.map((useCase, index) => {
                const Icon = useCase.icon;
                const colors = getUseCaseColors(useCase.color);

                return (
                  <div key={index} className={`bg-gray-800 rounded-xl border ${colors.border} overflow-hidden`}>
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className={`w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-7 h-7 ${colors.text}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{useCase.title}</h3>
                          <p className={`text-sm ${colors.text}`}>{useCase.role}</p>
                          <p className="text-gray-400 mt-2">{useCase.scenario}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-red-400" />
                            <span className="font-medium text-red-400">Before</span>
                          </div>
                          <p className="text-sm text-gray-300">{useCase.before}</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium text-emerald-400">After</span>
                          </div>
                          <p className="text-sm text-gray-300">{useCase.after}</p>
                        </div>
                      </div>

                      <div className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}>
                        <p className={`text-sm italic ${colors.text}`}>"{useCase.quote}"</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        benefit.impact === 'High' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          benefit.impact === 'High' ? 'text-emerald-400' : 'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">{benefit.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            benefit.impact === 'High'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {benefit.impact} Impact
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-blue-500/30">
              <h3 className="text-xl font-semibold text-white mb-4">Summary of Key Improvements</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400 mb-2">1+10</div>
                  <div className="text-sm text-gray-300">Flexible Folders</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400 mb-2">4 → 1</div>
                  <div className="text-sm text-gray-300">Database Tables</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-cyan-400 mb-2">4 → 1</div>
                  <div className="text-sm text-gray-300">Sync Workflows</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-400 mb-2">14</div>
                  <div className="text-sm text-gray-300">Document Categories</div>
                </div>
              </div>
            </div>

            <ExpandableSection
              title="Rollback & Safety Plan"
              icon={AlertCircle}
              iconColor="text-amber-400"
            >
              <p className="text-gray-300 mb-4">
                A comprehensive rollback plan is included to handle any migration issues:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-amber-400 font-medium mb-2">Rollback Triggers</div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>- Data loss detected</li>
                    <li>- Search quality degraded</li>
                    <li>- Sync failures &gt; 10%</li>
                    <li>- Performance issues</li>
                  </ul>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-amber-400 font-medium mb-2">Immediate Actions</div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>- Disable unified workflow</li>
                    <li>- Re-enable old workflows</li>
                    <li>- Revert Astra Agent</li>
                    <li>- Notify affected users</li>
                  </ul>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-amber-400 font-medium mb-2">Data Protection</div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>- Backup tables created</li>
                    <li>- 30-day retention period</li>
                    <li>- Validation checkpoints</li>
                    <li>- Restore procedures ready</li>
                  </ul>
                </div>
              </div>
            </ExpandableSection>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataStrategyPage;
