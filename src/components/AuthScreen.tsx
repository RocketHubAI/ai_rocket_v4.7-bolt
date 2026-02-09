import React, { useState } from 'react';
import { CustomAuth } from './CustomAuth';
import { Footer } from './Footer';
import { AppDemoModal } from './AppDemoModal';
import { Brain, Users, BarChart3, RefreshCw, FileText, Lock, Bot, LayoutDashboard, UserCircle, Play } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-8 py-6">
        <div className="max-w-md mx-auto">
          <CustomAuth />
        </div>

        {/* Preview Section */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              AI for Work: Solved
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* App Demo - Interactive Preview */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="bg-gradient-to-br from-blue-600/20 to-emerald-600/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 hover:border-blue-400/60 hover:from-blue-600/30 hover:to-emerald-600/30 transition-all duration-300 text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">App Demo</h3>
              <p className="text-gray-400 text-sm">
                Explore how AI Rocket can launch your team to AI-powered success
              </p>
            </button>

            {/* All Your Data Connected */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">All Your Data Connected</h3>
              <p className="text-gray-400 text-sm">
                Connect Documents, Financials, and more. AI analyzes all your data for comprehensive insights.
              </p>
            </div>

            {/* 2. Smart Visualizations */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Smart Visualizations</h3>
              <p className="text-gray-400 text-sm">
                Turn conversations into actionable insights with AI-generated charts, graphs, and visual reports.
              </p>
            </div>

            {/* 3. Team AI Assistant */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Team AI Assistant</h3>
              <p className="text-gray-400 text-sm">
                AI intelligence aligned with your team's data, mission, core values, and goals for truly personalized insights.
              </p>
            </div>

            {/* 4. Team Collaboration */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Team Collaboration</h3>
              <p className="text-gray-400 text-sm">
                Work together with your team and AI in shared conversations. @mention team members and AI for instant insights.
              </p>
            </div>

            {/* 5. Reports */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Automated Reports</h3>
              <p className="text-gray-400 text-sm">
                Schedule automated reports delivered to your inbox. Stay informed with daily, weekly, or monthly insights.
              </p>
            </div>

            {/* 6. Secure & Private */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
              <p className="text-gray-400 text-sm">
                Your data is encrypted and secure. Control who sees what with team-based permissions and private conversations.
              </p>
            </div>

            {/* 7. Team Dashboard */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Team Dashboard</h3>
              <p className="text-gray-400 text-sm">
                Real-time AI updated team info & insights on the metrics that matter most.
              </p>
            </div>

            {/* 8. AI Specialists */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-teal-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-4">
                <UserCircle className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Specialists</h3>
              <p className="text-gray-400 text-sm">
                Create specialized AI team members like Business Coach, Finance Director, Marketing Manager and more.
              </p>
            </div>

            {/* 9. Agent Builder */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-pink-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Agent Builder</h3>
              <p className="text-gray-400 text-sm">
                Design and deploy custom AI Agents to complete tasks autonomously.
              </p>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-gradient-to-br from-blue-500/10 via-emerald-500/10 to-teal-500/10 border border-gray-700 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              AI for Work: Solved
            </h3>
            <p className="text-gray-300 text-lg mb-6 max-w-3xl mx-auto">
              Stop struggling to make AI work for your work. Launch your team to AI-Powered with AI that understands your team, data, mission, goals and more.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span>Setup your team in 15 minutes or less</span>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <AppDemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
    </div>
  );
};
