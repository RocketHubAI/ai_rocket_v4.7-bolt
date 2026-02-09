import React from 'react';

export const MarketingLogo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-32 h-32 rounded-full bg-cyan-400 flex items-center justify-center">
            <span className="text-6xl">🚀</span>
          </div>
          <h1 className="text-6xl font-bold text-cyan-400">
            AI Rocket
          </h1>
        </div>
        <p className="text-2xl text-gray-400">
          AI that Works for Work
        </p>
      </div>
    </div>
  );
};
