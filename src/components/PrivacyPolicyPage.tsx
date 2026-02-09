import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { PRIVACY_POLICY } from '../data/legalDocuments';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to App</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{PRIVACY_POLICY.title}</h1>
                <p className="text-sm text-gray-400">Last Updated: {PRIVACY_POLICY.lastUpdated}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sm:p-8">
          <div className="prose prose-invert prose-blue max-w-none">
            <div className="legal-content text-gray-300 leading-relaxed">
              {PRIVACY_POLICY.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('# ')) {
                  return (
                    <h1 key={index} className="text-3xl font-bold text-white mt-8 mb-4 first:mt-0">
                      {paragraph.replace('# ', '')}
                    </h1>
                  );
                }
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-white mt-6 mb-3">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-xl font-semibold text-blue-300 mt-5 mb-2">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }

                const formattedParagraph = paragraph.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i} className="font-semibold text-white">{part}</strong> : part
                );

                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={index} className="list-disc list-inside ml-4 mb-3 space-y-1">
                      <li className="text-gray-300">{paragraph.replace('- ', '')}</li>
                    </ul>
                  );
                }

                return (
                  <p key={index} className="mb-4 text-gray-300">
                    {formattedParagraph}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-4">
            Questions? Contact us at support@rockethub.ai
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
        </div>
      </div>
    </div>
  );
};
