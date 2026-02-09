import { useState, useEffect, useCallback } from 'react';

declare const __APP_VERSION__: string;

const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const VERSION_CHECK_INTERVAL = 10 * 60 * 1000;

interface VersionState {
  currentVersion: string;
  serverVersion: string | null;
  newVersionAvailable: boolean;
  isRefreshing: boolean;
  lastChecked: Date | null;
}

let globalState: VersionState = {
  currentVersion: CURRENT_VERSION,
  serverVersion: null,
  newVersionAvailable: false,
  isRefreshing: false,
  lastChecked: null
};

const listeners = new Set<(state: VersionState) => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener({ ...globalState }));
};

const updateState = (updates: Partial<VersionState>) => {
  globalState = { ...globalState, ...updates };
  notifyListeners();
};

const checkVersion = async (): Promise<boolean> => {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const serverVersion = data.version;
      const hasNewVersion = serverVersion && serverVersion !== CURRENT_VERSION;

      updateState({
        serverVersion,
        newVersionAvailable: hasNewVersion,
        lastChecked: new Date()
      });

      return hasNewVersion;
    }
  } catch (error) {
    console.error('[Version] Check failed:', error);
  }
  return false;
};

let pendingRegistration: ServiceWorkerRegistration | null = null;

const performUpdate = async (): Promise<void> => {
  updateState({ isRefreshing: true });

  try {
    if ('serviceWorker' in navigator && pendingRegistration?.waiting) {
      pendingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    window.location.reload();
  } catch (error) {
    console.error('[Version] Update failed:', error);
    updateState({ isRefreshing: false });
    throw error;
  }
};

let initialized = false;
let intervalId: number | null = null;

const initialize = () => {
  if (initialized) return;
  initialized = true;

  checkVersion();

  intervalId = window.setInterval(checkVersion, VERSION_CHECK_INTERVAL);

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      checkVersion();
    }
  };

  const handleSWUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<{ registration?: ServiceWorkerRegistration }>;
    if (customEvent.detail?.registration) {
      pendingRegistration = customEvent.detail.registration;
    }
    updateState({ newVersionAvailable: true });
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('sw-update-available', handleSWUpdate);
};

export const useVersionCheck = () => {
  const [state, setState] = useState<VersionState>({ ...globalState });

  useEffect(() => {
    initialize();

    const listener = (newState: VersionState) => {
      setState(newState);
    };

    listeners.add(listener);
    setState({ ...globalState });

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!state.newVersionAvailable) return;
    await performUpdate();
  }, [state.newVersionAvailable]);

  const forceRefresh = useCallback(async () => {
    await performUpdate();
  }, []);

  return {
    ...state,
    refresh,
    forceRefresh,
    checkVersion
  };
};
