import { Image, Presentation, Check } from 'lucide-react';
import type { VisualizationType } from '../AstraCreateView';

interface TypeSelectionStepProps {
  selectedType: VisualizationType | null;
  onSelect: (type: VisualizationType) => void;
}

const TYPE_OPTIONS = [
  {
    id: 'single_image' as VisualizationType,
    name: 'Single Image',
    description: 'Create a single, impactful visual that captures your content in one view',
    icon: Image,
    features: ['One powerful image', 'Perfect for sharing', 'Quick to create', 'Social media ready']
  },
  {
    id: 'slide_presentation' as VisualizationType,
    name: 'Slide Presentation',
    description: 'Create a multi-slide presentation with flowing narrative and visual storytelling',
    icon: Presentation,
    features: ['3, 5, or 7 slides', 'Narrative flow', 'Detailed content', 'Export as PDF']
  }
];

export function TypeSelectionStep({ selectedType, onSelect }: TypeSelectionStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400 mb-4">
        Choose the format for your visualization
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;

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

              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                isSelected ? 'bg-cyan-500/20' : 'bg-gray-700'
              }`}>
                <Icon className={`w-7 h-7 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                {option.name}
              </h3>

              <p className="text-sm text-gray-400 mb-4">
                {option.description}
              </p>

              <ul className="space-y-2">
                {option.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
