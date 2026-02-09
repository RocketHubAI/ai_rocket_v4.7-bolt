import { useRef, useEffect } from 'react';
import { Check, Palette, Image, Type } from 'lucide-react';
import { PRESENTATION_STYLES, IMAGE_STYLES, TEXT_INTEGRATION_OPTIONS } from './StyleOptions';
import type { VisualizationType } from '../AstraCreateView';

interface StyleSelectionStepProps {
  visualizationType: VisualizationType;
  selectedStyle: string | null;
  onSelect: (styleId: string) => void;
  textIntegration?: string;
  onTextIntegrationChange?: (id: string) => void;
}

function isImageStyle(styleId: string | null): boolean {
  if (!styleId) return false;
  return IMAGE_STYLES.some(s => s.id === styleId);
}

export function StyleSelectionStep({
  visualizationType,
  selectedStyle,
  onSelect,
  textIntegration = 'integrated',
  onTextIntegrationChange
}: StyleSelectionStepProps) {
  const showTextIntegrationOptions = isImageStyle(selectedStyle);
  const textIntegrationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTextIntegrationOptions && textIntegrationRef.current) {
      setTimeout(() => {
        textIntegrationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showTextIntegrationOptions]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Users can mix presentation styles with image styles for unique creations
      </p>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
            Presentation Styles
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRESENTATION_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onSelect(style.id)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-gray-900" />
                  </div>
                )}
                <p className={`text-sm font-medium mb-1 pr-6 ${
                  isSelected ? 'text-cyan-400' : 'text-white'
                }`}>
                  {style.name}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {style.shortDescription}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Image Styles
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {IMAGE_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onSelect(style.id)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-gray-900" />
                  </div>
                )}
                <p className={`text-sm font-medium mb-1 pr-6 ${
                  isSelected ? 'text-amber-400' : 'text-white'
                }`}>
                  {style.name}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {style.shortDescription}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {showTextIntegrationOptions && onTextIntegrationChange && (
        <div ref={textIntegrationRef} className="border-t border-gray-700 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              Text Integration Style
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Choose how text content appears with your image
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEXT_INTEGRATION_OPTIONS.map((option) => {
              const isSelected = textIntegration === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onTextIntegrationChange(option.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-gray-900" />
                    </div>
                  )}
                  <p className={`text-sm font-medium mb-1 pr-5 ${
                    isSelected ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {option.name}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
