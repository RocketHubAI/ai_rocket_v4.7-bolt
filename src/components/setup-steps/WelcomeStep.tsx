import React from 'react';
import { Rocket } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';

interface WelcomeStepProps {
  onComplete: () => void;
  progress: SetupGuideProgress | null;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onComplete }) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">
          Welcome to Astra Intelligence
        </h2>
        <p className="text-sm text-gray-400">
          Your AI-powered business intelligence platform
        </p>
      </div>

      {/* Visual Journey Map */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Row 1 */}
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3 text-center group hover:bg-blue-600/20 transition-all">
            <div className="text-3xl mb-1">🔗</div>
            <div className="text-xs text-blue-300 font-medium">Connect Drive</div>
          </div>
          <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-3 text-center group hover:bg-purple-600/20 transition-all">
            <div className="text-3xl mb-1">📁</div>
            <div className="text-xs text-purple-300 font-medium">Add Files</div>
          </div>
          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3 text-center group hover:bg-green-600/20 transition-all">
            <div className="text-3xl mb-1">⚙️</div>
            <div className="text-xs text-green-300 font-medium">Configure</div>
          </div>

          {/* Row 2 */}
          <div className="bg-orange-600/10 border border-orange-600/30 rounded-lg p-3 text-center group hover:bg-orange-600/20 transition-all">
            <div className="text-3xl mb-1">💬</div>
            <div className="text-xs text-orange-300 font-medium">Ask Astra</div>
          </div>
          <div className="bg-cyan-600/10 border border-cyan-600/30 rounded-lg p-3 text-center group hover:bg-cyan-600/20 transition-all">
            <div className="text-3xl mb-1">📊</div>
            <div className="text-xs text-cyan-300 font-medium">Visualize</div>
          </div>
          <div className="bg-pink-600/10 border border-pink-600/30 rounded-lg p-3 text-center group hover:bg-pink-600/20 transition-all">
            <div className="text-3xl mb-1">📅</div>
            <div className="text-xs text-pink-300 font-medium">Automate</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-around pt-3 border-t border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-white">3-7</div>
            <div className="text-xs text-gray-400">minutes</div>
          </div>
          <div className="w-px h-8 bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">6</div>
            <div className="text-xs text-gray-400">key steps</div>
          </div>
          <div className="w-px h-8 bg-gray-700"></div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">✓</div>
            <div className="text-xs text-gray-400">auto-saved</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onComplete}
          className="px-10 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-base transition-all transform hover:scale-105 shadow-lg hover:shadow-xl min-h-[44px]"
        >
          Let's Get Started →
        </button>
      </div>
    </div>
  );
};
