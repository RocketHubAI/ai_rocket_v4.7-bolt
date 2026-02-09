import React, { useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useVersionCheck } from '../hooks/useVersionCheck';

export const VersionChecker: React.FC = () => {
  const { newVersionAvailable, isRefreshing, refresh } = useVersionCheck();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!newVersionAvailable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-4 max-w-md">
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm">New Version Available!</p>
          <p className="text-xs opacity-90">A newer version of AI Rocket is ready.</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Update Now'}
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
