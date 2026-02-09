import React from 'react';
import { Brain, Users, BarChart3, RefreshCw, FileText, Bot, LayoutDashboard, UserCircle } from 'lucide-react';

export const MarketingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-[1600px] w-full space-y-10 py-8">
        {/* Header with Branding - Using actual branding images */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-6 mb-8">
            {/* AI Rocket Logo */}
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-cyan-400 flex items-center justify-center">
                <span className="text-6xl">🚀</span>
              </div>
              <h1 className="text-6xl font-bold text-cyan-400">
                AI Rocket
              </h1>
            </div>
          </div>
        </div>

        {/* Main Tagline */}
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-white mb-3">
            AI that Works for Work
          </h3>
          <p className="text-xl text-gray-400">
            Built for Entrepreneurs and their Teams
          </p>
        </div>

        {/* Features Grid - 8 boxes in 2 rows of 4 - 25% bigger proportionally with thicker borders and larger text */}
        <div className="grid grid-cols-4 gap-7 mb-10">
            {/* 1. All Your Data Connected */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-orange-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-orange-500/10 flex items-center justify-center mb-5">
                <RefreshCw className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">All Your Data Connected</h3>
              <p className="text-gray-400 text-base">
                Connect Documents, Financials, and more. AI analyzes all your data for comprehensive insights.
              </p>
            </div>

            {/* 2. Smart Visualizations */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-purple-500/10 flex items-center justify-center mb-5">
                <BarChart3 className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Smart Visualizations</h3>
              <p className="text-gray-400 text-base">
                Turn conversations into actionable insights with AI-generated charts, graphs, and visual reports.
              </p>
            </div>

            {/* 3. Private AI Assistant */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-blue-500/10 flex items-center justify-center mb-5">
                <Brain className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Private AI Assistant</h3>
              <p className="text-gray-400 text-base">
                Have confidential conversations with AI that understands your business context and provides personalized insights.
              </p>
            </div>

            {/* 4. Team Collaboration */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-emerald-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-5">
                <Users className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Team Collaboration</h3>
              <p className="text-gray-400 text-base">
                Work together with your team and AI in shared conversations. @mention team members and AI for instant insights.
              </p>
            </div>

            {/* 5. Automated Reports */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-yellow-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-5">
                <FileText className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Automated Reports</h3>
              <p className="text-gray-400 text-base">
                Schedule automated reports delivered to your inbox. Stay informed with daily, weekly, or monthly insights.
              </p>
            </div>

            {/* 6. Agent Builder */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-pink-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-pink-500/10 flex items-center justify-center mb-5">
                <Bot className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Agent Builder</h3>
              <p className="text-gray-400 text-base">
                Design and deploy custom AI Agents to complete tasks autonomously.
              </p>
            </div>

            {/* 7. Team Dashboard */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-5">
                <LayoutDashboard className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">Team Dashboard</h3>
              <p className="text-gray-400 text-base">
                Real-time AI updated team info & insights on the metrics that matter most.
              </p>
            </div>

            {/* 8. AI Specialists */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-gray-700 rounded-xl p-7 hover:border-teal-500/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-lg bg-teal-500/10 flex items-center justify-center mb-5">
                <UserCircle className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">AI Specialists</h3>
              <p className="text-gray-400 text-base">
                Create specialized AI team members like Business Coach, Finance Director, Marketing Manager and more.
              </p>
            </div>
          </div>

        {/* Powered By Section */}
        <div className="text-center mb-8">
          <p className="text-lg text-gray-400 mb-6">Powered by</p>
          <div className="flex items-center justify-center gap-12">
            {/* Claude Logo */}
            <div className="flex flex-col items-center gap-3">
              <img src="/claude_logo.png" alt="Claude" className="w-16 h-16 rounded-xl" />
              <span className="text-white text-lg font-semibold">Claude</span>
            </div>
            {/* Gemini Logo */}
            <div className="flex flex-col items-center gap-3">
              <img src="/gemini_app_logo.jpeg" alt="Gemini" className="w-16 h-16 rounded-xl" />
              <span className="text-white text-lg font-semibold">Gemini</span>
            </div>
            {/* OpenAI Logo */}
            <div className="flex flex-col items-center gap-3">
              <img src="/gpt_app_logo.png" alt="OpenAI" className="w-16 h-16 rounded-xl bg-white p-2" />
              <span className="text-white text-lg font-semibold">OpenAI</span>
            </div>
          </div>
        </div>

        {/* Closing Block Section */}
        <div className="max-w-[1200px] mx-auto bg-gradient-to-br from-blue-500/10 via-emerald-500/10 to-purple-500/10 border border-gray-700 rounded-2xl p-10 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            AI That Works For Work
          </h3>
          <p className="text-gray-300 text-xl mb-6 mx-auto">
            Stop switching between apps. Get instant answers from your business data, collaborate with your team in real-time, and make data-driven decisions with AI-powered insights—all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-base">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span>Built for Entrepreneurs and their Teams</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>&copy; 2025 RocketHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
