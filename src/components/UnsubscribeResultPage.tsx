import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export const UnsubscribeResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const status = searchParams.get('status') || 'error';
  const title = searchParams.get('title') || 'Unknown Status';
  const message = searchParams.get('message') || 'An error occurred.';

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-emerald-500" />;
      case 'info':
        return <Info className="w-16 h-16 text-blue-500" />;
      default:
        return <XCircle className="w-16 h-16 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-5">
      <div className="bg-gray-800 rounded-2xl p-12 max-w-md w-full text-center shadow-2xl border border-gray-700">
        <div className="mb-6 flex justify-center">
          {getIcon()}
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
        <p className="text-gray-400 text-base leading-relaxed mb-8">{message}</p>
        <a
          href="https://airocket.app"
          className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:from-blue-600 hover:to-cyan-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25"
        >
          Visit AI Rocket
        </a>
        <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-gray-700">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-400 rounded-full flex items-center justify-center text-base">
            🚀
          </div>
          <span className="text-white font-semibold">AI Rocket + Astra Intelligence</span>
        </div>
      </div>
    </div>
  );
};
