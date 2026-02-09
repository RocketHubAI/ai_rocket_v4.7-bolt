import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, FileText, Trash2, AlertTriangle, Loader, ChevronDown, ArrowUpDown, File, FileSpreadsheet, FileImage, Presentation, ExternalLink, HardDrive, Upload, Cloud } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Document {
  google_file_id: string;
  file_name: string;
  category: string;
  file_size: number;
  mime_type: string;
  synced_at: string;
  file_modified_at: string | null;
  chunk_count: number;
  source_type: 'google_drive' | 'local_upload' | 'microsoft_graph';
}

interface DocumentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentDeleted: () => void;
  initialCategory?: string | null;
}

type SortField = 'file_name' | 'category' | 'synced_at' | 'file_modified_at';
type SortDirection = 'asc' | 'desc';

const MIME_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'application/pdf': File,
  'application/vnd.google-apps.document': FileText,
  'application/vnd.google-apps.spreadsheet': FileSpreadsheet,
  'application/vnd.google-apps.presentation': Presentation,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': Presentation,
  'text/plain': FileText,
  'image/png': FileImage,
  'image/jpeg': FileImage,
};

const CATEGORY_COLORS: Record<string, string> = {
  strategy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  meetings: 'bg-green-500/20 text-green-400 border-green-500/30',
  financial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  sales: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  marketing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  product: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  people: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  operations: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  customer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  legal: 'bg-red-500/20 text-red-400 border-red-500/30',
  industry: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  reference: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const DocumentsListModal: React.FC<DocumentsListModalProps> = ({
  isOpen,
  onClose,
  onDocumentDeleted,
  initialCategory
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory || 'all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('file_modified_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Document | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const teamId = user?.user_metadata?.team_id;
  const userRole = user?.user_metadata?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const fetchDocuments = useCallback(async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_team_documents_list', {
        p_team_id: teamId
      });

      if (error) throw error;

      setDocuments(data || []);

      const uniqueCategories = [...new Set((data || []).map((d: Document) => d.category).filter(Boolean))];
      setCategories(uniqueCategories.sort());
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  useEffect(() => {
    if (initialCategory) {
      setCategoryFilter(initialCategory);
    }
  }, [initialCategory]);

  const handleDelete = async (doc: Document) => {
    if (!teamId) return;

    setDeletingId(doc.google_file_id);
    try {
      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .eq('team_id', teamId)
        .eq('google_file_id', doc.google_file_id);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.google_file_id !== doc.google_file_id));
      setShowDeleteConfirm(null);
      onDocumentDeleted();
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      const isDateField = field === 'synced_at' || field === 'file_modified_at';
      setSortDirection(isDateField ? 'desc' : 'asc');
    }
  };

  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(query) ||
        doc.category?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(doc => doc.source_type === sourceFilter);
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'file_name':
          comparison = a.file_name.localeCompare(b.file_name);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'synced_at':
          comparison = new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime();
          break;
        case 'file_modified_at':
          const aDate = a.file_modified_at ? new Date(a.file_modified_at).getTime() : 0;
          const bDate = b.file_modified_at ? new Date(b.file_modified_at).getTime() : 0;
          comparison = aDate - bDate;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [documents, searchQuery, categoryFilter, sourceFilter, sortField, sortDirection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Synced Documents</h2>
            <p className="text-sm text-gray-400">{filteredAndSortedDocuments.length} documents</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="google_drive">Google Drive</option>
                <option value="microsoft_graph">Microsoft OneDrive</option>
                <option value="local_upload">Local Upload</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              <button
                onClick={() => handleSort('file_modified_at')}
                className={`px-2 py-1 text-xs rounded ${sortField === 'file_modified_at' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                File Date
              </button>
              <button
                onClick={() => handleSort('synced_at')}
                className={`px-2 py-1 text-xs rounded ${sortField === 'synced_at' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                Sync Date
              </button>
              <button
                onClick={() => handleSort('file_name')}
                className={`px-2 py-1 text-xs rounded ${sortField === 'file_name' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                Name
              </button>
              <button
                onClick={() => handleSort('category')}
                className={`px-2 py-1 text-xs rounded ${sortField === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                Category
              </button>
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-gray-700 rounded"
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className={`w-4 h-4 text-gray-400 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : filteredAndSortedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No documents found</p>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedDocuments.map((doc) => {
                const IconComponent = MIME_TYPE_ICONS[doc.mime_type] || FileText;
                const categoryColor = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other;

                return (
                  <div
                    key={`${doc.google_file_id}_${doc.category || 'uncategorized'}`}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-white truncate" title={doc.file_name}>
                                {doc.file_name}
                              </h3>
                              {doc.source_type === 'google_drive' ? (
                                <HardDrive className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" title="Google Drive" />
                              ) : doc.source_type === 'microsoft_graph' ? (
                                <Cloud className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" title="Microsoft OneDrive" />
                              ) : (
                                <Upload className="w-3.5 h-3.5 text-green-400 flex-shrink-0" title="Local Upload" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {doc.category && (
                                <span className={`text-xs px-2 py-0.5 rounded border ${categoryColor}`}>
                                  {doc.category}
                                </span>
                              )}
                              {doc.file_modified_at && (
                                <span className="text-xs text-gray-500">File: {formatDate(doc.file_modified_at)}</span>
                              )}
                              <span className="text-xs text-gray-500">Synced: {formatDate(doc.synced_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {doc.source_type === 'google_drive' && (
                              <a
                                href={`https://drive.google.com/file/d/${doc.google_file_id}/view`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                              </a>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setShowDeleteConfirm(doc)}
                                disabled={deletingId === doc.google_file_id}
                                className="p-2 hover:bg-red-600/20 rounded-lg transition-colors group"
                                title="Delete from Astra"
                              >
                                {deletingId === doc.google_file_id ? (
                                  <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 rounded-xl">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Document?</h3>
              </div>

              <p className="text-sm text-gray-300 mb-2">
                This will remove <strong className="text-white">"{showDeleteConfirm.file_name}"</strong> from Astra.
              </p>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-300">
                  <strong>Important: For Google or Microsoft Synced files -</strong> To prevent this file from syncing again, you should also remove it from your connected folder or move it to a folder that isn't synced.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deletingId !== null}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingId ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
