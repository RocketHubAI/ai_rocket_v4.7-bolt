# PWA Update System Guide

## How Chrome PWA Updates Work

The Chrome PWA now has an improved update detection and installation system that should automatically detect when a new version is available.

## What's Been Fixed

### 1. **Aggressive Update Checking**
   - Checks for updates every **30 seconds** (service worker)
   - Checks for updates every **2 minutes** (version checker)
   - Checks when tab becomes visible after being in background
   - Never caches `version.json` or `sw.js` files

### 2. **Network-First for Critical Files**
   - `index.html` always fetched fresh from network
   - Falls back to cache only if network fails
   - Ensures latest app structure loads first

### 3. **Improved Cache Invalidation**
   - Updated cache version from v4 → v5
   - Old caches automatically deleted on service worker activation
   - Background cache updates for better performance

### 4. **Prominent Update Banner**
   - Colorful gradient banner at top of screen
   - "Update Now" button that:
     - Unregisters all service workers
     - Clears all caches
     - Performs hard reload

## When Update Banner Appears

The update banner will appear when:
1. A new version of `version.json` is detected (different version number)
2. A new service worker is installed
3. User switches back to the app tab after updates are deployed

## How to Update the App

### Automatic Update (Recommended)
1. Wait for the update banner to appear at the top of the screen
2. Click "Update Now"
3. App will clear caches and reload automatically

### Manual Update (If Banner Doesn't Appear)
1. **Option 1**: Force refresh in Chrome PWA
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Option 2**: Clear site data
   - Open Chrome PWA
   - Press `Cmd/Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"
   - Refresh the app

3. **Option 3**: Reinstall PWA (Last Resort)
   - Uninstall the PWA from your system
   - Go to the web version in Chrome
   - Click "Install" icon in address bar
   - Reinstall the app

## For Developers

### Deploying Updates

When you deploy a new version:
1. The build process automatically updates `version.json` with timestamp
2. Service worker cache name is versioned (v5, v6, etc.)
3. Users will see update banner within 30 seconds to 2 minutes

### Testing Updates Locally

```bash
# Build with new version
npm run build

# The version.json will have new timestamp
# Service worker will detect change automatically
```

### Increasing Service Worker Version

When making significant changes to caching strategy, update the version in `public/sw.js`:

```javascript
const CACHE_NAME = 'astra-intelligence-v6';  // Increment this
const RUNTIME_CACHE = 'astra-runtime-v6';    // Increment this
```

## Why Safari PWA Works But Chrome Doesn't

Safari uses a different update mechanism that's less aggressive with caching:
- Safari checks for updates more frequently
- Safari has less aggressive service worker caching
- Safari's PWA implementation is simpler

Chrome's service worker is more powerful but also more aggressive with caching, which is why we needed these improvements.

## Troubleshooting

### Update Banner Not Showing
1. Check browser console for update check logs:
   - Look for `[Version] Checking for updates...`
   - Look for `[PWA] Checking for service worker updates...`
2. Verify `version.json` has different version on server
3. Try manual refresh methods above

### App Still Shows Old Version After Update
1. Close all tabs/windows of the app
2. Completely quit Chrome
3. Reopen Chrome and launch PWA
4. The new service worker should activate

### Console Debug Commands

Open Chrome DevTools Console and run:

```javascript
// Check current version
fetch('/version.json?t=' + Date.now()).then(r => r.json()).then(console.log)

// Check service workers
navigator.serviceWorker.getRegistrations().then(console.log)

// Manually trigger update
navigator.serviceWorker.getRegistration().then(r => r.update())

// Clear all caches
caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
```

## Summary

The update system now:
- ✅ Checks for updates every 30 seconds
- ✅ Shows prominent update banner when available
- ✅ One-click update that clears everything and reloads
- ✅ Works in Chrome PWA (not just Safari)
- ✅ Automatically detects version mismatches
- ✅ Never caches critical files like version.json

Users should see updates within 2 minutes of deployment without needing to manually refresh or reinstall.
