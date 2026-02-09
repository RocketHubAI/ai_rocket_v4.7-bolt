import { useState } from 'react';
import { Image, Presentation, Trash2, Eye, Calendar, Loader2, FolderOpen, Download, FileDown } from 'lucide-react';
import type { SavedVisualization } from '../AstraCreateView';
import { getStyle } from './StyleOptions';
import { getContentType } from './ContentTypes';
import jsPDF from 'jspdf';

interface VisualizationGalleryProps {
  visualizations: SavedVisualization[];
  loading: boolean;
  onView: (visualization: SavedVisualization) => void;
  onDelete: (id: string) => void;
}

export function VisualizationGallery({
  visualizations,
  loading,
  onView,
  onDelete
}: VisualizationGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'single_image' | 'slide_presentation'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const filtered = visualizations.filter(v => {
    if (filter === 'all') return true;
    return v.type === filter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownloadImage = async (viz: SavedVisualization) => {
    const slide = viz.slides[0];
    if (!slide) return;

    const imageSource = slide.imageUrl || slide.imageBase64;
    if (!imageSource) return;

    try {
      setExportingId(viz.id);
      let blob: Blob;

      if (imageSource.startsWith('data:')) {
        const response = await fetch(imageSource);
        blob = await response.blob();
      } else {
        const response = await fetch(imageSource);
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${viz.title || 'astra-image'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    } finally {
      setExportingId(null);
    }
  };

  const handleExportPDF = async (viz: SavedVisualization) => {
    if (viz.slides.length === 0) return;

    setExportingId(viz.id);
    try {
      const isLandscape = viz.layout === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: isLandscape ? [1920, 1080] : [1080, 1920]
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < viz.slides.length; i++) {
        const slide = viz.slides[i];

        if (i > 0) {
          pdf.addPage();
        }

        pdf.setFillColor(17, 24, 39);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        const imageSource = slide.imageUrl || slide.imageBase64;
        if (imageSource) {
          try {
            let imgData = imageSource;

            if (!imageSource.startsWith('data:')) {
              const response = await fetch(imageSource);
              const blob = await response.blob();
              imgData = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }

            const padding = 40;
            const maxWidth = pageWidth - (padding * 2);
            const maxHeight = pageHeight - (padding * 2);

            pdf.addImage(imgData, 'PNG', padding, padding, maxWidth, maxHeight, undefined, 'FAST');
          } catch (imgError) {
            console.error('Error adding image to PDF:', imgError);
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(32);
            pdf.text(slide.title || `Slide ${i + 1}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
          }
        } else {
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(48);
          pdf.text(slide.title || `Slide ${i + 1}`, 60, 100);

          if (slide.bulletPoints && slide.bulletPoints.length > 0) {
            pdf.setFontSize(24);
            let yPos = 180;
            slide.bulletPoints.forEach((point) => {
              pdf.text(`- ${point}`, 80, yPos);
              yPos += 40;
            });
          }

          if (slide.content) {
            pdf.setFontSize(20);
            const lines = pdf.splitTextToSize(slide.content, pageWidth - 120);
            pdf.text(lines, 60, 300);
          }
        }
      }

      pdf.save(`${viz.title || 'astra-presentation'}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <p className="text-gray-400">Loading your visualizations...</p>
      </div>
    );
  }

  if (visualizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
          <FolderOpen className="w-10 h-10 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Visualizations Yet</h3>
        <p className="text-gray-400 max-w-sm">
          Create your first visualization and save it to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('single_image')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'single_image'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Image className="w-4 h-4" />
          Images
        </button>
        <button
          onClick={() => setFilter('slide_presentation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'slide_presentation'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Presentation className="w-4 h-4" />
          Presentations
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((viz) => {
          const style = getStyle(viz.style);
          const TypeIcon = viz.type === 'single_image' ? Image : Presentation;
          const isDeleting = deleteConfirm === viz.id;
          const isExporting = exportingId === viz.id;
          const isImage = viz.type === 'single_image';
          const hasImageContent = viz.slides.some(s => s.imageUrl || s.imageBase64);

          return (
            <div
              key={viz.id}
              className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
            >
              <div
                onClick={() => onView(viz)}
                className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative cursor-pointer group"
              >
                {viz.slides[0]?.imageUrl || viz.slides[0]?.imageBase64 ? (
                  <img
                    src={viz.slides[0].imageUrl || viz.slides[0].imageBase64}
                    alt={viz.title}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="text-center p-4 group-hover:opacity-80 transition-opacity">
                    <TypeIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">
                      {viz.slideCount} slide{viz.slideCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    viz.type === 'single_image'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {viz.type === 'single_image' ? 'Image' : `${viz.slideCount} Slides`}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-white font-medium truncate mb-1">{viz.title}</h3>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Calendar className="w-3 h-3" />
                  {formatDate(viz.generatedAt)}
                  <span className="text-gray-600">-</span>
                  <span className="text-gray-400">{style?.name || viz.style}</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {viz.contentTypes.slice(0, 3).map((ct) => {
                    const contentType = getContentType(ct);
                    return (
                      <span key={ct} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                        {contentType?.name || ct}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onView(viz)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>

                  {hasImageContent && (
                    <button
                      onClick={() => isImage ? handleDownloadImage(viz) : handleExportPDF(viz)}
                      disabled={isExporting}
                      className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 disabled:text-gray-600 rounded-lg transition-colors"
                      title={isImage ? 'Download Image' : 'Export PDF'}
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isImage ? (
                        <Download className="w-4 h-4" />
                      ) : (
                        <FileDown className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {isDeleting ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDelete(viz.id);
                          setDeleteConfirm(null);
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Confirm
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
                      onClick={() => setDeleteConfirm(viz.id)}
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
    </div>
  );
}
