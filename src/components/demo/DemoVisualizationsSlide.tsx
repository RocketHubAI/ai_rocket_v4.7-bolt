import React from 'react';
import { BarChart3, TrendingUp, PieChart, Download, Share2, RefreshCw } from 'lucide-react';
import { DEMO_VISUALIZATIONS } from '../../data/demoData';

interface DemoVisualizationsSlideProps {
  onClose: () => void;
}

const chartActions = [
  { icon: Download, label: 'Export to PDF' },
  { icon: Share2, label: 'Share with team' },
  { icon: RefreshCw, label: 'Auto-update' },
];

export const DemoVisualizationsSlide: React.FC<DemoVisualizationsSlideProps> = () => {
  const lineData = DEMO_VISUALIZATIONS[0];
  const pieData = DEMO_VISUALIZATIONS[1];
  const barData = DEMO_VISUALIZATIONS[2];

  const maxLineValue = Math.max(...(lineData.data as number[]));

  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full mb-2">
          Demo Data
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          AI Visualizations
        </h2>
        <p className="text-base text-gray-400">
          Transform conversations into beautiful, actionable charts
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-4 flex-1">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-white">{lineData.title}</h3>
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex-1 min-h-[120px] flex items-end justify-between gap-2 mb-2">
                {(lineData.data as number[]).map((value, index) => {
                  const heightPercent = Math.max((value / maxLineValue) * 100, 5);
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between gap-1">
                {(lineData.labels as string[]).map((label, index) => (
                  <span key={index} className="flex-1 text-xs text-gray-500 text-center">{label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-medium text-white">{pieData.title}</h3>
            </div>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let accumulatedPercent = 0;
                    return (pieData.data as { label: string; value: number; color: string }[]).map((segment) => {
                      const dashArray = `${segment.value} ${100 - segment.value}`;
                      const dashOffset = -accumulatedPercent;
                      accumulatedPercent += segment.value;
                      return (
                        <circle
                          key={segment.label}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="20"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          className="transition-all"
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                {(pieData.data as { label: string; value: number; color: string }[]).map((segment) => (
                  <div key={segment.label} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="text-gray-400 flex-1">{segment.label}</span>
                    <span className="text-white font-medium">{segment.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-medium text-white">{barData.title}</h3>
          </div>
          <div className="space-y-3">
            {(barData.data as { label: string; current: number; target: number }[]).map((item) => {
              const percentage = Math.round((item.current / item.target) * 100);
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-medium">
                      {item.label === 'Revenue' ? `$${item.current.toLocaleString()}` : item.current} / {item.label === 'Revenue' ? `$${item.target.toLocaleString()}` : item.target}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          {chartActions.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-gray-500">
              <Icon className="w-4 h-4" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
