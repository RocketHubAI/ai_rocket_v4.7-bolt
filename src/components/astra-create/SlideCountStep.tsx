import { Check, Layers } from 'lucide-react';
import type { SlideCountType } from '../AstraCreateView';

interface SlideCountStepProps {
  selectedCount: SlideCountType;
  onSelect: (count: SlideCountType) => void;
}

const SLIDE_OPTIONS: { count: SlideCountType; description: string; structure: string[] }[] = [
  {
    count: 3,
    description: 'Concise and focused - perfect for quick overviews',
    structure: ['Overview', 'Key Points', 'Summary & Call to Action']
  },
  {
    count: 5,
    description: 'Balanced depth - ideal for most presentations',
    structure: ['Introduction', 'Context', 'Main Content', 'Insights', 'Conclusion']
  }
];

export function SlideCountStep({ selectedCount, onSelect }: SlideCountStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400 mb-4">
        Choose how many slides to include in your presentation
      </p>

      <div className="space-y-3">
        {SLIDE_OPTIONS.map((option) => {
          const isSelected = selectedCount === option.count;

          return (
            <button
              key={option.count}
              onClick={() => onSelect(option.count)}
              className={`relative w-full p-5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-cyan-500/20' : 'bg-gray-700'
                }`}>
                  <span className={`text-2xl font-bold ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`}>
                    {option.count}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-semibold ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                      {option.count} Slides
                    </h3>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-gray-900" />
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mb-3">
                    {option.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {option.structure.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-1 rounded ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {idx + 1}. {step}
                        </span>
                        {idx < option.structure.length - 1 && (
                          <span className="text-gray-600">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>
            The AI will distribute your selected content across slides following this structure
          </span>
        </div>
      </div>
    </div>
  );
}
