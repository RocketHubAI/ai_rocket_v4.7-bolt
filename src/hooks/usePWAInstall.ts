import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect iOS devices (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    console.log('[PWA Install] User Agent:', userAgent);
    console.log('[PWA Install] iOS detected:', ios);
    setIsIOS(ios);

    // Detect Safari browser (both iOS and macOS)
    // Safari is identified by having 'safari' in UA but NOT 'chrome' or 'chromium'
    const safari = /safari/.test(userAgent) && !/chrome|chromium|edg/.test(userAgent);
    console.log('[PWA Install] Safari detected:', safari);
    setIsSafari(safari);

    // Detect mobile
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(mobile);

    // Check if already installed (running in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    if (isStandalone || isFullscreen || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    // Note: We removed the localStorage check for 'pwa-installed'
    // The button should always show in browser mode, even if app was previously installed
    // Chrome's beforeinstallprompt will determine if installation is available

    // For Safari (iOS or macOS), always show install button if not in standalone mode
    if (safari && !isIOSStandalone) {
      setIsInstallable(true);
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log('PWA: Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App installed event fired');
      setIsInstalled(true);
      setIsInstallable(true);
      localStorage.setItem('pwa-installed', 'true');
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }

      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isMobile,
    isSafari,
    install,
  };
};
