import React from 'react';
import { Compass, CheckCircle, AlertTriangle, Quote, Star, Lightbulb } from 'lucide-react';
import type { AlignmentMetrics } from '../../hooks/useTeamDashboard';

interface AlignmentMetricSectionProps {
  data: AlignmentMetrics;
}

function AlignmentGauge({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return { stroke: '#22c55e', text: 'text-green-400', label: 'Strong' };
    if (score >= 60) return { stroke: '#3b82f6', text: 'text-blue-400', label: 'Good' };
    if (score >= 40) return { stroke: '#f59e0b', text: 'text-yellow-400', label: 'Moderate' };
    return { stroke: '#ef4444', text: 'text-red-400', label: 'Needs Work' };
  };

  const colorConfig = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="8"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke={colorConfig.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colorConfig.text}`}>{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-medium ${colorConfig.text}`}>{colorConfig.label}</span>
    </div>
  );
}

function EmptyState({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/10 flex items-center justify-center">
        <Compass className="w-8 h-8 text-teal-400" />
      </div>
      <h4 className="text-lg font-medium text-white mb-2">
        Mission & Values Not Found
      </h4>
      <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
        Define your Mission and Core Values so Astra can track how well your team activities align with them.
      </p>
      <div className="bg-gray-800/50 rounded-lg p-4 text-left max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">Suggestions</span>
        </div>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-teal-400 mt-1">-</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const AlignmentMetricSection: React.FC<AlignmentMetricSectionProps> = ({ data }) => {
  if (!data.has_data) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Mission Alignment</h3>
        </div>
        <EmptyState suggestions={data.suggestions || [
          'Add a document containing your company or team mission statement',
          'Include your Core Values in strategy documents',
          'Discuss mission alignment in team meetings for Astra to track'
        ]} />
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-teal-400" />
        <h3 className="text-lg font-semibold text-white">Mission Alignment</h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-auto">
        {data.alignment_score !== null && (
          <div className="flex-shrink-0">
            <AlignmentGauge score={data.alignment_score} />
          </div>
        )}

        <div className="flex-1 space-y-4">
          {data.mission_statement && (
            <div className="bg-gray-900/50 rounded-lg p-4 border-l-4 border-teal-500">
              <div className="flex items-start gap-2">
                <Quote className="w-4 h-4 text-teal-400 flex-shrink-0 mt-1" />
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Mission</span>
                  <p className="text-white mt-1">{data.mission_statement}</p>
                </div>
              </div>
            </div>
          )}

          {data.core_values.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                <Star className="w-3 h-3" />
                Core Values
              </span>
              <div className="flex flex-wrap gap-2">
                {data.core_values.map((value, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-teal-500/10 text-teal-300 text-sm rounded-full border border-teal-500/30"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {data.alignment_examples.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Alignment Examples</h4>
          <div className="space-y-2">
            {data.alignment_examples.slice(0, 4).map((example, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                  example.type === 'aligned'
                    ? 'bg-green-500/10 text-green-300'
                    : 'bg-yellow-500/10 text-yellow-300'
                }`}
              >
                {example.type === 'aligned' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{example.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {data.recommendations.slice(0, 3).map((rec, index) => (
              <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-teal-400">-</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
