import React, { useState } from 'react';
import { DollarSign, TrendingUp, Users, Zap, Crown, CheckCircle, MessageSquare, X, Sparkles, FileText, BarChart3, Bot, Briefcase, Shield, Beaker, Rocket, Star, Layout, BookOpen } from 'lucide-react';

export const PlansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'ask-astra'>('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🚀</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-400">AI Rocket</span>
                <span className="text-lg font-bold text-white">+</span>
                <span className="text-lg font-bold text-emerald-400">Astra Intelligence</span>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <h1 className="text-base font-semibold text-gray-200">
                Plans and Subscriptions
              </h1>
              <p className="text-gray-500 text-xs">
                Dec 2025 - Tentative and Subject to Change
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto">
            {[
              { id: 'overview', label: 'Plan Overview', icon: Crown },
              { id: 'comparison', label: 'Side-by-Side', icon: TrendingUp },
              { id: 'ask-astra', label: 'Ask Astra', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {activeTab === 'overview' && <PlanOverview />}
        {activeTab === 'comparison' && <ComprehensiveComparison />}
        {activeTab === 'ask-astra' && <AskAstraPricing />}
      </div>
    </div>
  );
};

const PlanOverview: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-orange-500/20 via-cyan-500/20 to-blue-500/20 rounded-lg p-4 border border-orange-500/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-500 rounded-lg flex-shrink-0">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-orange-400">Preview Pass - First 300 Only</h2>
              <p className="text-gray-400 text-sm mb-3">
                Ultra Plan features with lifetime price protection at $79/month.
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-sm font-bold text-orange-500">$79/mo</div>
                </div>
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Features</div>
                  <div className="text-sm font-bold text-orange-500">Ultra</div>
                </div>
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Minimum</div>
                  <div className="text-sm font-bold text-orange-500">3 Months</div>
                </div>
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Lock-In</div>
                  <div className="text-sm font-bold text-orange-500">Lifetime</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-cyan-500/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-500 rounded-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">10-Day Unlimited Trial (All Plans)</h2>
              <p className="text-gray-400 text-sm mb-3">
                No credit card required. Full access to ALL features with NO limits.
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="text-sm font-bold text-cyan-500">10 Days</div>
                </div>
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Card</div>
                  <div className="text-sm font-bold text-cyan-500">None</div>
                </div>
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">Features</div>
                  <div className="text-sm font-bold text-cyan-500">Unlimited</div>
                </div>
                <div className="bg-gray-900/50 rounded px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-500">After</div>
                  <div className="text-sm font-bold text-blue-500">Choose</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-900/50">
            <h3 className="text-xl font-bold mb-2">Free Plan</h3>
            <div className="text-3xl font-bold mb-1">$0</div>
            <div className="text-sm text-gray-400">Forever free</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">Starts with 10-day trial</div>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Chat Usage</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Data Sync</span>
              </div>
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>3 Custom Visualizations Per Week</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>1 Automated Report Per Week</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500">No Financial Analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500">No Team Features</span>
              </div>
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-500">No AI Specialists</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border-2 border-blue-500 overflow-hidden flex flex-col relative">
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
          <div className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10">
            <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
            <div className="text-3xl font-bold mb-1">$99<span className="text-lg text-gray-400">/month</span></div>
            <div className="text-sm text-blue-400 font-semibold">Intro Price for First 500 Subscribers</div>
            <div className="text-xs text-blue-300 mt-1">Then $149/mo</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">Starts with 10-day trial</div>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="font-semibold">Everything in Free, Plus:</span>
              </div>
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Custom Visualizations</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Automated Reports</span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Financial Analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>1 Team (You + 2 Free Members)</span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>$29/Month Per Additional Member</span>
              </div>
              <div className="flex items-start gap-2">
                <Layout className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 Team Dashboards</span>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 Team Agents</span>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 AI Specialists</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create Up to 3 Team SOPs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border-2 border-cyan-500 overflow-hidden flex flex-col relative">
          <div className="absolute top-0 right-0 bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            ADVANCED
          </div>
          <div className="p-6 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10">
            <h3 className="text-xl font-bold mb-2">Ultra Plan</h3>
            <div className="text-3xl font-bold mb-1">$149<span className="text-lg text-gray-400">/month</span></div>
            <div className="text-sm text-cyan-400 font-semibold">Intro Price for First 500 Subscribers</div>
            <div className="text-xs text-cyan-300 mt-1">Then $249/mo</div>
            <div className="text-xs text-green-500 mt-2 font-semibold">Starts with 10-day trial</div>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                <span className="font-semibold">Everything in Pro, Plus:</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Up to 3 Teams (Each with 2 Free Members)</span>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>$19/Month Per Additional Member</span>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Custom Agents</span>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited AI Specialists</span>
              </div>
              <div className="flex items-start gap-2">
                <Layout className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Team Dashboards</span>
              </div>
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Unlimited Team SOPs</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Build with Astra (Create Custom Software)</span>
              </div>
              <div className="flex items-start gap-2">
                <Beaker className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Beta Access to New Features</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-lg font-bold mb-3">Why Unlimited Chats and Data at All Levels?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-sm">Discover Value Immediately</h3>
            </div>
            <p className="text-xs text-gray-400">
              No limits on conversations or data syncing. Explore what Astra can do for your business right away.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-sm">Your Data, Your Intelligence</h3>
            </div>
            <p className="text-xs text-gray-400">
              The more data you sync, the smarter Astra becomes. Complete context for accurate, personalized insights.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-sm">Grow Without Worry</h3>
            </div>
            <p className="text-xs text-gray-400">
              As your business grows, your usage increases. Unlimited chat and data means you'll never hit a wall.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComprehensiveComparison: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-2">Complete Plan Comparison</h2>
        <p className="text-gray-400">
          Side-by-side comparison of Free, Pro, and Ultra plans
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="p-4 text-left font-semibold border-b border-gray-700">Feature</th>
                <th className="p-4 text-center font-semibold border-b border-gray-700">
                  <div className="text-lg">Free</div>
                  <div className="text-xs text-gray-400 font-normal">$0/month</div>
                </th>
                <th className="p-4 text-center font-semibold border-b border-gray-700 bg-blue-500/10">
                  <div className="text-lg">Pro</div>
                  <div className="text-xs text-gray-400 font-normal">$99/month</div>
                  <div className="text-xs text-blue-400 font-semibold mt-1">Intro: First 500</div>
                </th>
                <th className="p-4 text-center font-semibold border-b border-gray-700 bg-cyan-500/10">
                  <div className="text-lg">Ultra</div>
                  <div className="text-xs text-gray-400 font-normal">$149/month</div>
                  <div className="text-xs text-cyan-400 font-semibold mt-1">Intro: First 500</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow feature="Chat & Usage" free="Unlimited" pro="Unlimited" ultra="Unlimited" highlight="all" />
              <ComparisonRow feature="Data Sync" free="Unlimited" pro="Unlimited" ultra="Unlimited" highlight="all" />
              <ComparisonRow feature="Custom Visualizations" free="3 Per Week" pro="Unlimited" ultra="Unlimited" highlight="pro" />
              <ComparisonRow feature="Automated Reports" free="1 Per Week" pro="Unlimited" ultra="Unlimited" highlight="pro" />
              <ComparisonRow feature="Financial Analysis" free="No" pro="Yes" ultra="Yes" highlight="pro" />
              <ComparisonRow feature="Team Members" free="None" pro="1 Team (You + 2 Free)" ultra="3 Teams (2 Free Each)" highlight="ultra" />
              <ComparisonRow feature="Additional Members" free="-" pro="$29/Month" ultra="$19/Month" highlight="ultra" />
              <ComparisonRow feature="Team Dashboards" free="None" pro="Up to 3" ultra="Unlimited" highlight="ultra" />
              <ComparisonRow feature="Team Agents" free="None" pro="Up to 3" ultra="Unlimited" highlight="ultra" />
              <ComparisonRow feature="AI Specialists" free="None" pro="Up to 3" ultra="Unlimited" highlight="ultra" />
              <ComparisonRow feature="Team SOPs" free="None" pro="Up to 3" ultra="Unlimited" highlight="ultra" />
              <ComparisonRow feature="Build with Astra" free="No" pro="No" ultra="Yes" highlight="ultra" />
              <ComparisonRow feature="Beta Access to New Features" free="No" pro="No" ultra="Yes" highlight="ultra" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ComparisonRow: React.FC<{ feature: string; free: string; pro: string; ultra: string; highlight: 'all' | 'pro' | 'ultra' }> = ({ feature, free, pro, ultra, highlight }) => (
  <tr className="border-b border-gray-700 hover:bg-gray-900/50">
    <td className="p-4 font-medium">{feature}</td>
    <td className={`p-4 text-center ${highlight === 'all' ? 'bg-gray-700/30 font-semibold' : ''}`}>
      {free}
    </td>
    <td className={`p-4 text-center ${highlight === 'pro' || highlight === 'all' ? 'bg-blue-500/10 font-semibold' : ''}`}>
      {pro}
    </td>
    <td className={`p-4 text-center ${highlight === 'ultra' || highlight === 'all' ? 'bg-cyan-500/10 font-semibold' : ''}`}>
      {ultra}
    </td>
  </tr>
);

const AskAstraPricing: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; isUser: boolean }>>([
    {
      id: '1',
      text: "Hi! I'm Astra, your AI assistant. I can help you understand our plans and find the right fit for your needs.\n\nI can answer questions about:\n- Plan features and pricing\n- AI Specialists and Team Agents\n- Team Dashboards and SOPs\n- Data sync and visualization limits\n- The Preview Pass Program\n- Build with Astra (custom software)\n\nWhat would you like to know?",
      isUser: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "What are AI Specialists?",
    "What's included in the Pro plan?",
    "Tell me about Team SOPs",
    "What is Build with Astra?",
    "How does the 10-day trial work?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('specialist') || q.includes('ai specialist')) {
      return "AI Specialists are dedicated AI team members you can create to handle specific business functions 24/7.\n\nExamples include:\n- Business Coach - Strategic guidance and goal tracking\n- Finance Director - Budget analysis and financial insights\n- Marketing Manager - Campaign ideas and content strategy\n- Operations Lead - Process optimization and efficiency\n\nFree Plan: Not available\nPro Plan: Create up to 3 AI Specialists\nUltra Plan: Unlimited AI Specialists\n\nEach Specialist learns from your synced data and provides expertise in their domain.";
    }

    if (q.includes('sop') || q.includes('standard operating')) {
      return "Team SOPs (Standard Operating Procedures) are AI-powered knowledge bases that document how your team operates.\n\nWith Team SOPs, you can:\n- Document processes and workflows\n- Create onboarding guides for new team members\n- Maintain consistent procedures across your team\n- Let Astra answer questions about 'how we do things'\n\nFree Plan: Not available\nPro Plan: Create up to 3 Team SOPs\nUltra Plan: Unlimited Team SOPs\n\nSOPs help ensure everyone on your team has access to the same knowledge and follows the same processes.";
    }

    if (q.includes('dashboard') || q.includes('team dashboard')) {
      return "Team Dashboards are real-time, AI-updated displays showing the metrics that matter most to your business.\n\nFeatures include:\n- Customizable KPI tracking\n- AI-generated insights and trends\n- Automatic data visualization\n- Team-wide visibility\n\nFree Plan: Not available\nPro Plan: Create up to 3 Team Dashboards\nUltra Plan: Unlimited Team Dashboards\n\nDashboards pull from your synced data and update automatically, giving you and your team instant visibility into performance.";
    }

    if (q.includes('agent') || q.includes('team agent')) {
      return "Team Agents are custom AI assistants you create to perform specific tasks or answer questions in particular areas.\n\nUnlike AI Specialists (which are role-based), Team Agents can be:\n- Task-specific (e.g., 'Meeting Summarizer')\n- Department-focused (e.g., 'Sales Support Agent')\n- Process-oriented (e.g., 'Report Generator')\n\nFree Plan: Not available\nPro Plan: Create up to 3 Team Agents\nUltra Plan: Unlimited Custom Agents\n\nAgents can be shared with your team and work autonomously on defined tasks.";
    }

    if (q.includes('build with astra') || q.includes('custom software')) {
      return "Build with Astra is our premium feature that lets you create custom software applications with AI assistance.\n\nWith Build with Astra, you can:\n- Describe what you want to build in plain English\n- Astra generates functional applications\n- Create internal tools, dashboards, and utilities\n- No coding experience required\n\nThis feature is exclusive to the Ultra Plan.\n\nIt's perfect for entrepreneurs who have specific tool needs but don't want to hire developers or learn to code.";
    }

    if (q.includes('pro') && (q.includes('plan') || q.includes('include') || q.includes('feature'))) {
      return "The Pro Plan ($99/month intro, then $149/month) includes:\n\nCore Features:\n- Unlimited Chat Usage\n- Unlimited Data Sync\n- Unlimited Custom Visualizations\n- Unlimited Automated Reports\n- Financial Analysis\n\nTeam Features:\n- 1 Team with You + 2 Free Members\n- $29/month for additional members\n\nPro-Level Tools:\n- Create up to 3 Team Dashboards\n- Create up to 3 Team Agents\n- Create up to 3 AI Specialists\n- Create up to 3 Team SOPs\n\nPro is ideal for individuals and small teams who need full access to visualizations, reports, and financial analysis.";
    }

    if (q.includes('ultra') && (q.includes('plan') || q.includes('include') || q.includes('feature'))) {
      return "The Ultra Plan ($149/month intro, then $249/month) includes everything in Pro, plus:\n\nExpanded Team Features:\n- Up to 3 Teams (each with 2 Free Members)\n- Only $19/month for additional members (vs $29 in Pro)\n\nUnlimited Pro Tools:\n- Unlimited Custom Agents\n- Unlimited AI Specialists\n- Unlimited Team Dashboards\n- Unlimited Team SOPs\n\nExclusive Features:\n- Build with Astra (create custom software)\n- Beta Access to New Features\n\nUltra is perfect for growing businesses that need multiple teams and unlimited AI tools.";
    }

    if (q.includes('free') && (q.includes('plan') || q.includes('include') || q.includes('feature'))) {
      return "The Free Plan ($0/month) includes:\n\nUnlimited Core Features:\n- Unlimited Chat Usage with Astra\n- Unlimited Data Sync (Google Drive + Local Files)\n\nLimited Features:\n- 3 Custom Visualizations Per Week\n- 1 Automated Report Per Week\n\nNot Included:\n- Financial Analysis\n- Team Features\n- AI Specialists\n- Team Dashboards\n- Team Agents\n- Team SOPs\n\nThe Free Plan is great for individuals who want to experience Astra's intelligence and decide if they need more advanced features.";
    }

    if (q.includes('trial') || q.includes('10-day') || q.includes('10 day')) {
      return "Every plan starts with a 10-day unlimited access trial:\n\n- No credit card required to start\n- Full access to ALL features (including Ultra-level)\n- Unlimited visualizations, reports, and AI tools\n- Complete data sync capabilities\n\nThe trial lets you experience everything Astra can do before choosing your plan. After 10 days, you simply select the plan that fits your needs. All your data and setup carries over - no disruption to your workflow.";
    }

    if (q.includes('preview pass') || q.includes('$79')) {
      return "The Preview Pass Program is our exclusive early adopter offer:\n\n- Price: $79/month (nearly 50% off Ultra's future price)\n- Features: Full Ultra Plan access\n- Limit: First 300 subscribers only\n- Commitment: 3-month minimum\n- Price Lock: Lifetime - your $79/month rate never increases\n\nPreview Pass holders get Ultra features at an incredible price, locked in forever. As prices increase for new subscribers, your rate stays the same. This is our way of rewarding early believers in Astra Intelligence.";
    }

    if (q.includes('price') || q.includes('cost') || q.includes('pricing')) {
      return "Current Pricing (Intro rates for first 500 subscribers):\n\nFree Plan: $0/month\n- Basic features with weekly limits\n\nPro Plan: $99/month (then $149/month)\n- Unlimited features + team tools\n- +$29/month per additional member\n\nUltra Plan: $149/month (then $249/month)\n- Everything unlimited + Build with Astra\n- +$19/month per additional member\n\nPreview Pass: $79/month (first 300 only)\n- Full Ultra features, lifetime price lock\n\nAll plans include a 10-day free trial with no credit card required.";
    }

    return "I'd be happy to help you understand our plans better!\n\nHere's a quick overview:\n\n- Free Plan: Unlimited chat and data sync, limited visualizations and reports\n- Pro Plan ($99/mo): Unlimited everything, team features, up to 3 of each AI tool\n- Ultra Plan ($149/mo): Everything unlimited, Build with Astra, beta access\n\nWhat specific aspect would you like to know more about? You can ask about:\n- Specific features (AI Specialists, Team SOPs, Dashboards)\n- Plan comparisons\n- The 10-day trial\n- Preview Pass Program";
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), text: input, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const responseText = getResponse(input);
      const response = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false
      };
      setMessages(prev => [...prev, response]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-2">Ask Astra About Plans</h2>
        <p className="text-gray-400 text-sm">
          Get answers about features, pricing, and which plan is right for you.
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setInput(q)}
              className="px-3 py-2 bg-gray-900 hover:bg-gray-700 text-sm rounded-lg transition-colors border border-gray-700"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="h-[350px] overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-4 ${
                msg.isUser
                  ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-white'
                  : 'bg-gray-900 text-gray-200 border border-gray-700'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about plans and features..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-cyan-500 hover:from-orange-600 hover:to-cyan-600 disabled:from-gray-700 disabled:to-gray-700 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
