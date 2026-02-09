import { X, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  userName: string;
  teamName: string;
  onStartTour: () => void;
  onDismiss: () => void;
}

export function WelcomeModal({ userName, teamName, onStartTour, onDismiss }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-orange-500 via-green-500 to-blue-500 p-1 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in duration-300">
        <div className="bg-gray-900 rounded-xl p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Welcome to Astra!
                </h2>
                <p className="text-sm text-gray-400">
                  Hi {userName}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8 space-y-4">
            {teamName && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 mb-4">
                <p className="text-sm text-blue-400 font-medium">
                  Team: <span className="text-blue-300">{teamName}</span>
                </p>
              </div>
            )}
            <p className="text-gray-300 text-lg">
              I'm Astra, your AI assistant connected to all your team's data.
            </p>
            <p className="text-gray-400">
              I can help you find insights, create visualizations, search documents, and collaborate with your team.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onStartTour}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start Interactive Tour
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            You can restart this tour anytime from the Help menu
          </p>
        </div>
      </div>
    </div>
  );
}
