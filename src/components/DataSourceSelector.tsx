import React from 'react';
import { HardDrive, Cloud, Upload, CheckCircle } from 'lucide-react';

export type DataSourceProvider = 'google' | 'microsoft' | 'local';

interface DataSourceSelectorProps {
  onSelect: (provider: DataSourceProvider) => void;
  googleConnected?: boolean;
  microsoftConnected?: boolean;
  disabled?: boolean;
  showMicrosoft?: boolean;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  onSelect,
  googleConnected = false,
  microsoftConnected = false,
  disabled = false,
  showMicrosoft = false
}) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">Choose Your Data Source</h3>
        <p className="text-sm text-gray-400">Connect cloud storage or upload files directly</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => onSelect('google')}
          disabled={disabled}
          className={`relative bg-gradient-to-br from-blue-900/30 to-blue-800/20 hover:from-blue-800/40 hover:to-blue-700/30 border-2 ${googleConnected ? 'border-green-600' : 'border-blue-600'} hover:border-blue-500 rounded-xl p-4 transition-all group min-h-[100px] flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className={`w-14 h-14 rounded-full ${googleConnected ? 'bg-green-600/20' : 'bg-blue-600/20'} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
            {googleConnected ? (
              <CheckCircle className="w-7 h-7 text-green-400" />
            ) : (
              <HardDrive className="w-7 h-7 text-blue-400" />
            )}
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
              Google Drive
              {googleConnected && (
                <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">Connected</span>
              )}
            </h4>
            <p className="text-xs text-gray-400">
              {googleConnected
                ? 'Manage folders or add more connections'
                : 'Connect your Google Drive to sync documents automatically'
              }
            </p>
          </div>
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {showMicrosoft && (
          <button
            onClick={() => onSelect('microsoft')}
            disabled={disabled}
            className={`relative bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 hover:from-cyan-800/40 hover:to-cyan-700/30 border-2 ${microsoftConnected ? 'border-green-600' : 'border-cyan-600'} hover:border-cyan-500 rounded-xl p-4 transition-all group min-h-[100px] flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`w-14 h-14 rounded-full ${microsoftConnected ? 'bg-green-600/20' : 'bg-cyan-600/20'} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
              {microsoftConnected ? (
                <CheckCircle className="w-7 h-7 text-green-400" />
              ) : (
                <Cloud className="w-7 h-7 text-cyan-400" />
              )}
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
                Microsoft OneDrive / SharePoint
                {microsoftConnected && (
                  <span className="text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">Connected</span>
                )}
              </h4>
              <p className="text-xs text-gray-400">
                {microsoftConnected
                  ? 'Manage folders or add more connections'
                  : 'Connect OneDrive or SharePoint to sync documents'
                }
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        <button
          onClick={() => onSelect('local')}
          disabled={disabled}
          className="relative bg-gradient-to-br from-orange-900/30 to-orange-800/20 hover:from-orange-800/40 hover:to-orange-700/30 border-2 border-orange-600 hover:border-orange-500 rounded-xl p-4 transition-all group min-h-[100px] flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-14 h-14 rounded-full bg-orange-600/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Upload className="w-7 h-7 text-orange-400" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-base font-semibold text-white mb-0.5">
              Local File Upload
            </h4>
            <p className="text-xs text-gray-400">
              Upload files directly from your computer (no cloud required)
            </p>
          </div>
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mt-4">
        <p className="text-xs text-gray-400 text-center">
          You can connect multiple data sources. Your documents will be securely synced and available to Astra.
        </p>
      </div>
    </div>
  );
};
