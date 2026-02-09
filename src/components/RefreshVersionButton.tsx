import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useVersionCheck } from '../hooks/useVersionCheck';

export const RefreshVersionButton: React.FC = () => {
  const { newVersionAvailable, isRefreshing, forceRefresh } = useVersionCheck();

  const handleClick = async () => {
    await forceRefresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing}
      className={`relative p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation hover:bg-slate-700 ${
        isRefreshing ? 'cursor-wait' : 'cursor-pointer'
      }`}
      title={
        newVersionAvailable
          ? 'New version available - Click to update'
          : 'Refresh app (clears cache and reloads)'
      }
    >
      <RefreshCw
        className={`w-5 h-5 ${
          newVersionAvailable
            ? 'text-green-400'
            : 'text-slate-400 hover:text-slate-300'
        } ${isRefreshing ? 'animate-spin' : ''}`}
      />

      {newVersionAvailable && !isRefreshing && (
        <>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
        </>
      )}
    </button>
  );
};
