import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, FileText, X, Maximize2, Download, FileDown, Loader2 } from 'lucide-react';
import type { GeneratedSlide, LayoutType, VisualizationType } from '../AstraCreateView';
import jsPDF from 'jspdf';

interface SlideViewerProps {
  slides: GeneratedSlide[];
  layout: LayoutType;
  isFullscreen: boolean;
  visualizationType?: VisualizationType;
  title?: string;
}

export function SlideViewer({ slides, layout, isFullscreen, visualizationType, title }: SlideViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handlePrev = () => {
    setActiveIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex(prev => Math.min(slides.length - 1, prev + 1));
  };

  const activeSlide = slides[activeIndex];

  const handleDownloadImage = async () => {
    const slide = slides[0];
    if (!slide) return;

    const imageSource = slide.imageUrl || slide.imageBase64;
    if (!imageSource) return;

    try {
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
      a.download = `${title || 'astra-image'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleExportPDF = async () => {
    if (slides.length === 0) return;

    setExporting(true);
    try {
      const isLandscape = layout === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: isLandscape ? [1920, 1080] : [1080, 1920]
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

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

      pdf.save(`${title || 'astra-presentation'}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  if (!activeSlide) return null;

  const isImage = visualizationType === 'single_image' || slides.length === 1;
  const hasImageContent = slides.some(s => s.imageUrl || s.imageBase64);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {hasImageContent && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-gray-700/50 bg-gray-800/30">
          {isImage ? (
            <button
              onClick={handleDownloadImage}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Image
            </button>
          ) : (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {slides.length > 1 && (
          <div className="w-48 border-r border-gray-700 overflow-y-auto p-3 space-y-2 flex-shrink-0 bg-gray-900/50">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Slides ({slides.length})
            </p>
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => setActiveIndex(index)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    isActive
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-cyan-500 text-gray-900' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{slide.title}</p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className={`mx-auto ${
              layout === 'landscape'
                ? 'max-w-4xl aspect-video'
                : 'max-w-md aspect-[9/16]'
            }`}>
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 sm:p-8 h-full flex flex-col">
                {activeSlide.imageUrl || activeSlide.imageBase64 ? (
                  <div className="flex-1 flex items-center justify-center relative group">
                    <img
                      src={activeSlide.imageUrl || activeSlide.imageBase64}
                      alt={activeSlide.title}
                      className="max-w-full max-h-full object-contain rounded-xl cursor-pointer transition-transform hover:scale-[1.01]"
                      onClick={() => setImageExpanded(true)}
                    />
                    <button
                      onClick={() => setImageExpanded(true)}
                      className="absolute bottom-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="View fullscreen"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white">{activeSlide.title}</h3>
                        {slides.length > 1 && (
                          <p className="text-xs text-gray-500">
                            Slide {activeIndex + 1} of {slides.length}
                          </p>
                        )}
                      </div>
                    </div>

                    {activeSlide.metrics && activeSlide.metrics.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                        {activeSlide.metrics.map((metric, idx) => (
                          <div key={idx} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                            <p className="text-xs text-gray-400 mb-1 truncate">{metric.label}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg sm:text-xl font-bold text-white">{metric.value}</p>
                              {metric.trend && (
                                <TrendingUp className={`w-4 h-4 ${
                                  metric.trend === 'up' ? 'text-emerald-400' :
                                  metric.trend === 'down' ? 'text-red-400 rotate-180' :
                                  'text-gray-400'
                                }`} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeSlide.bulletPoints && activeSlide.bulletPoints.length > 0 && (
                      <ul className="space-y-3 mb-6 flex-1">
                        {activeSlide.bulletPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{point}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeSlide.content && (
                      <div className="prose prose-invert max-w-none flex-1">
                        <p className="text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                          {activeSlide.content}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {slides.length > 1 && (
            <div className="p-4 border-t border-gray-700 flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={activeIndex === 0}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>

              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === activeIndex ? 'bg-cyan-400 scale-125' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={activeIndex === slides.length - 1}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {imageExpanded && (activeSlide.imageUrl || activeSlide.imageBase64) && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setImageExpanded(false)}
        >
          <button
            onClick={() => setImageExpanded(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {slides.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                disabled={activeIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                disabled={activeIndex === slides.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={activeSlide.imageUrl || activeSlide.imageBase64}
            alt={activeSlide.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg text-white text-sm">
            {activeSlide.title}
            {slides.length > 1 && ` (${activeIndex + 1} of ${slides.length})`}
          </div>
        </div>
      )}
    </div>
  );
}
