import React from 'react';
import { X, FileText, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    title: string;
    lastUpdated: string;
    content: string;
  };
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  isOpen,
  onClose,
  document
}) => {
  if (!isOpen) return null;

  const icon = document.title.includes('Privacy') ? Shield : FileText;
  const Icon = icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Icon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{document.title}</h2>
              <p className="text-sm text-gray-400">Last Updated: {document.lastUpdated}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert prose-blue max-w-none">
            <div className="legal-content text-gray-300 leading-relaxed">
              {document.content.split('\n\n').map((paragraph, index) => {
                // Handle headers
                if (paragraph.startsWith('# ')) {
                  return (
                    <h1 key={index} className="text-3xl font-bold text-white mt-8 mb-4">
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

                // Handle bold text
                const formattedParagraph = paragraph.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i} className="font-semibold text-white">{part}</strong> : part
                );

                // Handle list items
                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={index} className="list-disc list-inside ml-4 mb-3 space-y-1">
                      <li className="text-gray-300">{paragraph.replace('- ', '')}</li>
                    </ul>
                  );
                }

                // Regular paragraphs
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
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Please contact support@rockethub.ai with any questions
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
