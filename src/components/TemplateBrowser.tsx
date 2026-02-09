import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Eye, Download, Sparkles, ExternalLink, Loader } from 'lucide-react';
import { n8nTemplatesService, N8NTemplate, N8NCategory } from '../lib/n8n-templates';
import { n8nService } from '../lib/n8n-service';
import { useNavigate } from 'react-router-dom';

interface TemplateBrowserProps {
  onClose?: () => void;
  onTemplateImport?: (workflowId: string) => void;
}

export default function TemplateBrowser({ onClose, onTemplateImport }: TemplateBrowserProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<N8NCategory[]>([]);
  const [templates, setTemplates] = useState<N8NTemplate[]>([]);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<N8NTemplate | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [searchQuery, selectedCategory, offset]);

  const loadCategories = async () => {
    try {
      const cats = await n8nTemplatesService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await n8nTemplatesService.searchTemplates({
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
        limit,
        offset,
      });
      setTemplates(result.workflows);
      setTotalTemplates(result.totalWorkflows);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportTemplate = async (template: N8NTemplate) => {
    setImporting(template.id);
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
        `${template.description}\n\nImported from n8n Templates (ID: ${template.id})\n\nOriginal Author: ${template.user.username}`
      );

      if (onTemplateImport) {
        onTemplateImport(workflow.id);
      } else {
        navigate(`/build-agents/workflow/${workflow.id}`);
      }
    } catch (error) {
      console.error('Failed to import template:', error);
      alert('Failed to import template. Please try again.');
    } finally {
      setImporting(null);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName === selectedCategory ? '' : categoryName);
    setOffset(0);
  };

  const handleNextPage = () => {
    if (offset + limit < totalTemplates) {
      setOffset(offset + limit);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/20 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">n8n Template Library</h2>
                <p className="text-sm text-gray-400">
                  Browse {totalTemplates.toLocaleString()}+ community templates
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-orange-500'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.name)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.name
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {n8nTemplatesService.getCategoryIcon(category.name)} {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Sparkles className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400">No templates found</p>
              <p className="text-sm text-gray-500 mt-2">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white line-clamp-2 flex-1">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      <span>{template.views}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.nodes.slice(0, 3).map((node, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-800 text-xs text-gray-400 rounded"
                      >
                        {node.displayName}
                      </span>
                    ))}
                    {template.nodes.length > 3 && (
                      <span className="px-2 py-1 bg-gray-800 text-xs text-gray-400 rounded">
                        +{template.nodes.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      by {template.user.username}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImportTemplate(template);
                      }}
                      disabled={importing === template.id}
                      className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalTemplates > limit && (
          <div className="p-6 border-t border-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {offset + 1}-{Math.min(offset + limit, totalTemplates)} of{' '}
              {totalTemplates.toLocaleString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={offset === 0}
                className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={offset + limit >= totalTemplates}
                className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedTemplate.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>by {selectedTemplate.user.username}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedTemplate.views} views
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <p className="text-gray-300 mb-6">{selectedTemplate.description}</p>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Nodes Used</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.nodes.map((node, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm"
                    >
                      {node.displayName}
                    </span>
                  ))}
                </div>
              </div>

              {selectedTemplate.categories.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.categories.map((category) => (
                      <span
                        key={category.id}
                        className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-sm"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleImportTemplate(selectedTemplate)}
                  disabled={importing === selectedTemplate.id}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing === selectedTemplate.id ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Import to My Workflows</span>
                    </>
                  )}
                </button>
                <a
                  href={`https://n8n.io/workflows/${selectedTemplate.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>View on n8n.io</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
