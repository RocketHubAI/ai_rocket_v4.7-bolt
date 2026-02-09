import React, { useState } from 'react';
import { X, Fuel, Zap, Compass } from 'lucide-react';
import { SupportMenu } from '../SupportMenu';
import { StageProgress } from '../../hooks/useLaunchPreparation';
import { useAuth } from '../../contexts/AuthContext';

interface LaunchPreparationHeaderProps {
  onClose: () => void;
  fuelProgress?: StageProgress | null;
  boostersProgress?: StageProgress | null;
  guidanceProgress?: StageProgress | null;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

export const LaunchPreparationHeader: React.FC<LaunchPreparationHeaderProps> = ({
  onClose,
  fuelProgress,
  boostersProgress,
  guidanceProgress,
  onOpenHelpCenter
}) => {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const { signOut } = useAuth();

  const fuelLevel = fuelProgress?.level || 0;
  const boostersLevel = boostersProgress?.level || 0;
  const guidanceLevel = guidanceProgress?.level || 0;

  const handleClose = () => {
    setShowCloseConfirm(true);
  };

  const confirmClose = async () => {
    // Logout the user
    await signOut();
  };

  const cancelClose = () => {
    setShowCloseConfirm(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-slate-800 border-b border-slate-700 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Logo and Title - Matching main app */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* AI Rocket Logo */}
            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-blue-400 shadow-lg flex-shrink-0">
              <span className="text-lg md:text-2xl">🚀</span>
            </div>

            {/* Brand Title - Responsive */}
            <h1 className="text-sm md:text-2xl font-bold tracking-tight flex items-center gap-1 md:gap-3">
              {/* Mobile: Show shortened version */}
              <span className="md:hidden text-blue-400">AI Rocket</span>
              <span className="md:hidden text-white font-normal">+</span>
              <span className="md:hidden text-emerald-400">Astra</span>

              {/* Desktop: Show full title */}
              <span className="hidden md:inline text-blue-400">AI Rocket</span>
              <span className="hidden md:inline text-white font-normal">+</span>
              <span className="hidden md:inline text-emerald-400">Astra Intelligence</span>
            </h1>
          </div>

          {/* Progress Indicators - Hidden on mobile */}
          {(fuelProgress || boostersProgress || guidanceProgress) && (
            <div className="hidden md:flex items-center space-x-4 flex-1 justify-center px-8">
              <div className="flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">Lvl</span>
                <span className="text-sm font-bold text-orange-400">{fuelLevel}</span>
              </div>
              <div className="h-4 w-px bg-gray-600" />
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-400">Lvl</span>
                <span className="text-sm font-bold text-cyan-400">{boostersLevel}</span>
              </div>
              <div className="h-4 w-px bg-gray-600" />
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">Lvl</span>
                <span className="text-sm font-bold text-green-400">{guidanceLevel}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Support Menu - Same as main app */}
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />

            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              title="Save and Exit"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">
              Exit and Logout?
            </h3>
            <p className="text-gray-300 mb-6">
              Your progress has been saved. You will be logged out and returned to the login screen.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Continue Setup
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Exit & Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
