import React from 'react';
import { FileText, DollarSign, FolderKanban, Database, Sparkles, CheckCircle2, Upload, HardDrive, RefreshCw, Shield, Zap } from 'lucide-react';
import { DEMO_SMART_DATA } from '../../data/demoData';

interface DemoSmartDataSlideProps {
  onClose: () => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  FileText,
  DollarSign,
  FolderKanban,
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
};

const dataFeatures = [
  { icon: RefreshCw, text: 'Automatic sync keeps data current', color: 'blue' },
  { icon: Shield, text: 'Enterprise-grade data security', color: 'emerald' },
  { icon: Zap, text: 'Lightning-fast AI indexing', color: 'orange' },
];

export const DemoSmartDataSlide: React.FC<DemoSmartDataSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full mb-2">
          Core Feature
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          AI Smart Data
        </h2>
        <p className="text-base text-gray-400 max-w-xl mx-auto">
          Connect and utilize your team's data with AI that understands your business
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-4 flex-1">
          <div className="lg:w-1/2 bg-gray-800/50 border border-gray-700 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Connected Data Sources</h3>
                <p className="text-sm text-gray-400">
                  {DEMO_SMART_DATA.totalDocuments} documents indexed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {DEMO_SMART_DATA.categories.map((category) => {
                const Icon = iconMap[category.icon];
                const colors = colorMap[category.color];
                return (
                  <div
                    key={category.name}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-3 text-center`}
                  >
                    <Icon className={`w-6 h-6 ${colors.text} mx-auto mb-1`} />
                    <div className="text-2xl font-semibold text-white">{category.count}</div>
                    <div className="text-xs text-gray-400">{category.name}</div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-gray-300">Google Drive Folders</span>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-medium">Synced</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
                <Upload className="w-5 h-5 text-orange-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-gray-300">Local File Uploads</span>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-medium">Ready</span>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-gray-700 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white">Powerful Use Cases</h3>
            </div>

            <div className="space-y-3 flex-1">
              {DEMO_SMART_DATA.useCases.map((useCase, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{useCase}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4">
            {dataFeatures.map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <span className="text-sm text-gray-400">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
