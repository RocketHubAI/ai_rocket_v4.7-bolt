import { Check, Monitor, Smartphone } from 'lucide-react';
import type { LayoutType } from '../AstraCreateView';

interface LayoutSelectionStepProps {
  selectedLayout: LayoutType;
  onSelect: (layout: LayoutType) => void;
}

const LAYOUT_OPTIONS = [
  {
    id: 'landscape' as LayoutType,
    name: 'Landscape',
    description: 'Wide format perfect for presentations, screens, and traditional slides',
    icon: Monitor,
    dimensions: '1920 x 1080 (16:9)',
    bestFor: 'Presentations, desktop screens, traditional slides'
  },
  {
    id: 'portrait' as LayoutType,
    name: 'Portrait',
    description: 'Tall format ideal for mobile, social media stories, and posters',
    icon: Smartphone,
    dimensions: '1080 x 1920 (9:16)',
    bestFor: 'Social media, mobile viewing, stories, posters'
  }
];

export function LayoutSelectionStep({ selectedLayout, onSelect }: LayoutSelectionStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400 mb-4">
        Choose the orientation for your visualization
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LAYOUT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedLayout === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-gray-900" />
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-cyan-500/20' : 'bg-gray-700'
                }`}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                </div>

                <div className={`${option.id === 'landscape' ? 'w-16 h-10' : 'w-8 h-14'} border-2 rounded ${
                  isSelected ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-600 bg-gray-700/50'
                }`} />
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                {option.name}
              </h3>

              <p className="text-sm text-gray-400 mb-3">
                {option.description}
              </p>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  <span className="text-gray-400">Dimensions:</span> {option.dimensions}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="text-gray-400">Best for:</span> {option.bestFor}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
