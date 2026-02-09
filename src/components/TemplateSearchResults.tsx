import React, { useState } from 'react';
import { Download, Eye, ExternalLink, Loader, ChevronRight } from 'lucide-react';
import { N8NTemplate } from '../lib/n8n-templates';
import { useNavigate } from 'react-router-dom';

interface TemplateSearchResultsProps {
  templates: N8NTemplate[];
  totalResults: number;
  searchQuery: string;
  onImport: (template: N8NTemplate) => Promise<string | undefined>;
  onShowMore?: () => void;
}

export const TemplateSearchResults: React.FC<TemplateSearchResultsProps> = ({
  templates,
  totalResults,
  searchQuery,
  onImport,
  onShowMore
}) => {
  const navigate = useNavigate();
  const [importing, setImporting] = useState<number | null>(null);

  const handleImport = async (template: N8NTemplate) => {
    setImporting(template.id);
    const workflowId = await onImport(template);
    setImporting(null);

    if (workflowId) {
      setTimeout(() => {
        const shouldNavigate = window.confirm(
          `✅ "${template.name}" imported successfully!\n\nWould you like to view and configure it now?`
        );
        if (shouldNavigate) {
          navigate(`/build-agents/workflow/${workflowId}`);
        }
      }, 500);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-800/30 border border-gray-700 rounded-lg text-center">
        <p className="text-gray-400 mb-2">No templates found for "{searchQuery}"</p>
        <button
          onClick={() => navigate('/build-agents')}
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          Browse all templates →
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {totalResults === 1 ? '1 template' : `${totalResults} templates`} found
        </div>
        <button
          onClick={() => navigate('/build-agents')}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
        >
          <span>Browse all</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-orange-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-white text-sm line-clamp-2 flex-1 pr-2">
                {template.name}
              </h4>
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Eye className="w-3 h-3" />
                <span>{template.views.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 line-clamp-2 mb-3">
              {template.description}
            </p>

            <div className="flex flex-wrap gap-1 mb-3">
              {template.nodes.slice(0, 3).map((node, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-gray-700 text-xs text-gray-300 rounded"
                  title={node.displayName}
                >
                  {node.displayName.length > 15
                    ? node.displayName.substring(0, 15) + '...'
                    : node.displayName}
                </span>
              ))}
              {template.nodes.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-700 text-xs text-gray-400 rounded">
                  +{template.nodes.length - 3}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleImport(template)}
                disabled={importing === template.id}
                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {importing === template.id ? (
                  <>
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Import</span>
                  </>
                )}
              </button>
              <a
                href={`https://n8n.io/workflows/${template.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
                title="View on n8n.io"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              by {template.user.username}
            </div>
          </div>
        ))}
      </div>

      {templates.length < totalResults && onShowMore && (
        <button
          onClick={onShowMore}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-gray-700 hover:border-gray-600"
        >
          Show More ({(totalResults - templates.length).toLocaleString()} remaining)
        </button>
      )}
    </div>
  );
};
