import React, { useState } from 'react';
import { ExternalLink, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const InstallAppButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isMobile, isSafari, install } = usePWAInstall();
  const [showSafariInstructions, setShowSafariInstructions] = useState(false);

  const isRunningInApp = window.matchMedia('(display-mode: standalone)').matches ||
                         window.matchMedia('(display-mode: fullscreen)').matches ||
                         (window.navigator as any).standalone === true;

  console.log('PWA Button render:', {
    isRunningInApp,
    isInstallable,
    isInstalled,
    isIOS,
    isMobile,
    isSafari,
    userAgent: window.navigator.userAgent
  });

  // Only hide if running in installed app mode (standalone/fullscreen)
  // Always show button when in browser mode, regardless of whether app was previously installed
  if (isRunningInApp) {
    console.log('Hiding button - already in app mode');
    return null;
  }

  const handleClick = async () => {
    console.log('PWA Button clicked:', { isInstalled, isIOS, isSafari, isInstallable });

    // Safari (iOS or macOS) always shows instructions
    if (isSafari) {
      console.log('Safari detected - showing instructions');
      setShowSafariInstructions(true);
      return;
    }

    // Chrome/Edge: If installable, prompt to install
    if (isInstallable) {
      console.log('Chrome: Prompting to install');
      const installed = await install();
      console.log('Install result:', installed);
      if (installed) {
        // After install, reload to open in app
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      return;
    }

    // For Chrome/Edge when install prompt not available (app already installed)
    // Chrome provides a native "Open in app" button in the address bar
    console.log('Chrome: Install prompt not available');
    alert('Good news! This app is already installed on your device.\n\n' +
          'Look for the "Open in app" button (📱) in your browser\'s address bar to launch the installed app.\n\n' +
          'Or find "AI Rocket" in your Applications folder.');
  };

  const buttonText = 'Install App';

  return (
    <>
      <button
        onClick={handleClick}
        className="p-2 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] px-3 flex items-center gap-2 touch-manipulation bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        aria-label={buttonText}
        title={buttonText}
      >
        <ExternalLink className="w-5 h-5 text-white" />
        <span className="hidden md:inline text-white text-sm font-medium whitespace-nowrap">{buttonText}</span>
      </button>

      {showSafariInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Install AI Rocket</h3>
                <button
                  onClick={() => setShowSafariInstructions(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  {isInstalled
                    ? `Once installed, open the AI Rocket app from your home screen to use it in app mode.`
                    : `To install this app on your ${isMobile ? 'iPhone or iPad' : 'device'}:`
                  }
                </p>

                {!isInstalled && (
                <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Tap the Share button</p>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Share className="w-4 h-4" />
                        <span>Look for the share icon in Safari</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Select "Add to Dock" or "Add to Home Screen"</p>
                      <p className="text-gray-400 text-sm">On Mac, select "Add to Dock". On mobile, select "Add to Home Screen"</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Tap "Add"</p>
                      <p className="text-gray-400 text-sm">The app will appear on your home screen</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    <strong>Note:</strong> This feature only works in Safari browser on iOS devices.
                  </p>
                </div>
                </>
                )}
              </div>

              <button
                onClick={() => setShowSafariInstructions(false)}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
