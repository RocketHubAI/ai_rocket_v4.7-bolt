import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker for PWA functionality with update detection
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[PWA] New service worker installing...');

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker installed, update available');
                window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { registration } }));
              }
            });
          }
        });

        // Check for updates every 10 minutes (not aggressively)
        setInterval(() => {
          console.log('[PWA] Checking for service worker updates...');
          registration.update();
        }, 10 * 60 * 1000);
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });

    // Only reload when user explicitly triggers an update (via VersionChecker button)
    // No automatic reload on controllerchange to avoid interrupting active sessions
  });
}
