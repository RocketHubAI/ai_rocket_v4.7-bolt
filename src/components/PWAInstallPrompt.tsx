import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only run in production and if not already installed
    if (!import.meta.env.PROD) return;

    try {
      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return;
      }

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);

        // Check if user has previously dismissed the prompt
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          // Wait a few seconds before showing the prompt
          setTimeout(() => setShowPrompt(true), 5000);
        }
      };

      window.addEventListener('beforeinstallprompt', handler);

      return () => window.removeEventListener('beforeinstallprompt', handler);
    } catch (error) {
      console.warn('PWA Install Prompt setup failed:', error);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-2xl p-4 border border-blue-400/30">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🚀</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Install AI Rocket</h3>
              <p className="text-blue-100 text-xs">Get quick access from your home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors min-h-[44px]"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
