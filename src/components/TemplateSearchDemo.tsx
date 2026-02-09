import React, { useState } from 'react';
import { TemplateSearchResults } from './TemplateSearchResults';
import { n8nTemplatesService, N8NTemplate } from '../lib/n8n-templates';
import { n8nService } from '../lib/n8n-service';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TemplateSearchDemo: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<N8NTemplate[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setShowResults(true);

    try {
      const results = await n8nTemplatesService.searchTemplates({
        query: searchQuery,
        limit: 6
      });

      setTemplates(results.workflows);
      setTotalResults(results.totalWorkflows);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateImport = async (template: N8NTemplate): Promise<string | undefined> => {
    try {
      const workflow = await n8nService.createWorkflow({
        name: template.name,
        nodes: template.workflow.nodes,
        connections: template.workflow.connections,
        settings: {},
      });

      await n8nService.saveWorkflowMetadata(
        workflow.id,
        template.name,
        `${template.description}\n\nImported from n8n Templates (ID: ${template.id})\nOriginal Author: ${template.user.username}\nImported via Astra AI Demo`
      );

      return workflow.id;
    } catch (error) {
      console.error('Failed to import template:', error);
      return undefined;
    }
  };

  const exampleQueries = [
    'Slack notifications',
    'AI chatbot',
    'Email automation',
    'CRM integration',
    'Google Drive sync',
    'Social media posting'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Astra AI Template Search Demo</h2>
                <p className="text-sm text-gray-400">
                  Preview how template search will work in Astra chat
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/build-agents')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder='Try: "Slack notifications" or "AI chatbot"'
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Try:</span>
              {exampleQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => {
                    setSearchQuery(query);
                    setTimeout(() => handleSearch(), 100);
                  }}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showResults ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  This is How Astra Will Search Templates
                </h3>
                <p className="text-gray-400 max-w-md">
                  Once the n8n workflow is integrated, users can ask Astra to find templates
                  and they'll appear just like this in the chat interface.
                </p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 max-w-md">
                <p className="text-sm text-gray-300 mb-2">
                  <strong className="text-purple-400">User:</strong> "Find me Slack notification templates"
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-blue-400">Astra:</strong> "I found 12 templates for Slack notifications..."
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  [Template cards would appear below ↓]
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Searching templates...</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                <p className="text-white">
                  <strong className="text-blue-400">Astra:</strong> I found {totalResults} template
                  {totalResults === 1 ? '' : 's'} for "{searchQuery}". Here are the top results:
                </p>
              </div>

              <TemplateSearchResults
                templates={templates}
                totalResults={totalResults}
                searchQuery={searchQuery}
                onImport={handleTemplateImport}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <span className="text-yellow-400">ℹ️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300 mb-1">
                <strong>Note:</strong> This is a demo of the template search functionality.
              </p>
              <p className="text-xs text-gray-500">
                Once you integrate the n8n workflow (see N8N_TEMPLATE_SEARCH_INTEGRATION.md),
                users will be able to search templates directly through Astra chat without opening this demo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
