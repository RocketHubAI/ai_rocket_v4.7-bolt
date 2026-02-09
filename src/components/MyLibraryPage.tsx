import { useState } from 'react';
import {
  ChevronLeft, Search, FileText, Image, Presentation, Trash2, Eye,
  Loader2, FolderOpen, Calendar, Grid3X3, List, LayoutGrid, Maximize2, Minimize2
} from 'lucide-react';
import { useUnifiedLibrary, UnifiedLibraryItem, LibraryItemType } from '../hooks/useUnifiedLibrary';
import { VisualizationView } from './VisualizationView';
import { SlideViewer } from './astra-create/SlideViewer';
import type { GeneratedSlide, LayoutType } from './AstraCreateView';

interface MyLibraryPageProps {
  onBack: () => void;
  onViewAstraVisualization?: (item: UnifiedLibraryItem) => void;
}

type FilterType = 'all' | LibraryItemType;
type ViewType = 'grid' | 'list';

export function MyLibraryPage({ onBack, onViewAstraVisualization }: MyLibraryPageProps) {
  const { items, loading, deleteItem, counts, loadItemSlides, hasMore, loadMore } = useUnifiedLibrary();
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<UnifiedLibraryItem | null>(null);
  const [viewingAstraViz, setViewingAstraViz] = useState<UnifiedLibraryItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const getTypeIcon = (type: LibraryItemType) => {
    switch (type) {
      case 'report': return FileText;
      case 'image': return Image;
      case 'presentation': return Presentation;
    }
  };

  const getTypeColor = (type: LibraryItemType) => {
    switch (type) {
      case 'report': return 'text-blue-400 bg-blue-500/20';
      case 'image': return 'text-amber-400 bg-amber-500/20';
      case 'presentation': return 'text-cyan-400 bg-cyan-500/20';
    }
  };

  const getTypeLabel = (type: LibraryItemType) => {
    switch (type) {
      case 'report': return 'Report';
      case 'image': return 'Image';
      case 'presentation': return 'Presentation';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredItems = items
    .filter(item => filter === 'all' || item.type === filter)
    .filter(item =>
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.originalPrompt?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleDelete = async (item: UnifiedLibraryItem) => {
    const success = await deleteItem(item.id, item.type);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const handleView = async (item: UnifiedLibraryItem) => {
    setLoadingItem(item.id);
    try {
      const loadedItem = await loadItemSlides(item.id);
      if (!loadedItem) {
        setLoadingItem(null);
        return;
      }

      if (loadedItem.type === 'report') {
        setViewingReport(loadedItem);
      } else {
        setViewingAstraViz(loadedItem);
      }
    } catch (err) {
      console.error('Error loading item:', err);
    } finally {
      setLoadingItem(null);
    }
  };

  if (viewingReport) {
    return (
      <VisualizationView
        content={viewingReport.content || ''}
        onBack={() => setViewingReport(null)}
        title={viewingReport.title}
      />
    );
  }

  if (viewingAstraViz && viewingAstraViz.slides) {
    const slides: GeneratedSlide[] = viewingAstraViz.slides.map(s => ({
      id: s.id,
      slideNumber: s.slideNumber,
      title: s.title,
      content: s.content || '',
      imageUrl: s.imageUrl,
      imageBase64: s.imageBase64,
      bulletPoints: s.bulletPoints,
      metrics: s.metrics?.map(m => ({
        label: m.label,
        value: m.value,
        trend: m.trend as 'up' | 'down' | 'neutral' | undefined
      }))
    }));

    return (
      <div className={`bg-gray-900 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewingAstraViz(null);
                setIsFullscreen(false);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{viewingAstraViz.title}</h1>
              <p className="text-xs text-gray-400">
                {slides.length} slide{slides.length !== 1 ? 's' : ''} - {viewingAstraViz.style}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>

        <SlideViewer
          slides={slides}
          layout={(viewingAstraViz.layout || 'landscape') as LayoutType}
          isFullscreen={isFullscreen}
          visualizationType={viewingAstraViz.type === 'image' ? 'single_image' : 'slide_presentation'}
          title={viewingAstraViz.title}
        />
      </div>
    );
  }

  const filterButtons: { type: FilterType; label: string; count: number; icon: typeof FileText }[] = [
    { type: 'all', label: 'All', count: counts.all, icon: LayoutGrid },
    { type: 'report', label: 'Reports', count: counts.reports, icon: FileText },
    { type: 'image', label: 'Images', count: counts.images, icon: Image },
    { type: 'presentation', label: 'Presentations', count: counts.presentations, icon: Presentation }
  ];

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">My Library</h1>
              <p className="text-sm text-gray-400">{counts.all} saved items</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewType === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.type}
                  onClick={() => setFilter(btn.type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === btn.type
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {btn.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                    filter === btn.type ? 'bg-cyan-500/30' : 'bg-gray-700'
                  }`}>
                    {btn.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading your library...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No Results Found' : 'No Items Yet'}
            </h3>
            <p className="text-gray-400 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search or filter'
                : 'Save reports from Astra chats or create visualizations to see them here.'
              }
            </p>
          </div>
        ) : viewType === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              const typeColor = getTypeColor(item.type);
              const isDeleting = deleteConfirm === item.id;
              const hasThumbnail = item.thumbnailUrl || item.thumbnailBase64;
              const isLoadingThisItem = loadingItem === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
                >
                  <div
                    onClick={() => handleView(item)}
                    className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden cursor-pointer group"
                  >
                    {hasThumbnail ? (
                      <img
                        src={item.thumbnailUrl || item.thumbnailBase64}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : item.type === 'report' ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-cyan-900/40 flex flex-col items-center justify-center p-4 relative">
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-3 left-3 right-3 h-2 bg-white/20 rounded" />
                          <div className="absolute top-7 left-3 right-8 h-1.5 bg-white/15 rounded" />
                          <div className="absolute top-10 left-3 right-12 h-1.5 bg-white/10 rounded" />
                          <div className="absolute top-16 left-3 w-16 h-12 bg-white/10 rounded" />
                          <div className="absolute top-16 right-3 w-16 h-12 bg-white/10 rounded" />
                          <div className="absolute bottom-8 left-3 right-3 h-1.5 bg-white/10 rounded" />
                          <div className="absolute bottom-5 left-3 right-6 h-1.5 bg-white/10 rounded" />
                        </div>
                        <TypeIcon className="w-10 h-10 text-blue-400/80 mb-2 relative z-10" />
                        <p className="text-xs text-blue-300/70 font-medium text-center line-clamp-2 px-2 relative z-10">
                          {item.title.length > 40 ? item.title.substring(0, 40) + '...' : item.title}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <TypeIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        {item.type === 'presentation' && item.slideCount && (
                          <p className="text-xs text-gray-500">
                            {item.slideCount} slide{item.slideCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                      {isLoadingThisItem ? (
                        <Loader2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity animate-spin" />
                      ) : (
                        <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-white font-medium truncate mb-1">{item.title}</h3>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.createdAt)}
                      {item.style && (
                        <>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-400">{item.style}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(item)}
                        disabled={isLoadingThisItem}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {isLoadingThisItem ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        {isLoadingThisItem ? 'Loading...' : 'View'}
                      </button>

                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              const typeColor = getTypeColor(item.type);
              const isDeleting = deleteConfirm === item.id;
              const isLoadingThisItem = loadingItem === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors"
                >
                  <div
                    onClick={() => handleView(item)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${typeColor}`}
                  >
                    <TypeIcon className="w-6 h-6" />
                  </div>

                  <div
                    onClick={() => handleView(item)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h3 className="text-white font-medium truncate hover:text-cyan-400 transition-colors">{item.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className={`px-1.5 py-0.5 rounded ${typeColor}`}>
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </span>
                      {item.style && <span>{item.style}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(item)}
                      disabled={isLoadingThisItem}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {isLoadingThisItem ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      {isLoadingThisItem ? 'Loading...' : 'View'}
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !loading && filteredItems.length > 0 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
