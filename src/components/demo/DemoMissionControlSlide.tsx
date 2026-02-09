import React from 'react';
import { Rocket, Users, FileText, Fuel, Target, TrendingUp, Zap, Calendar, MessageSquare, BarChart3 } from 'lucide-react';
import { DEMO_COMPANY, DEMO_MISSION_CONTROL } from '../../data/demoData';

interface DemoMissionControlSlideProps {
  onClose: () => void;
}

const quickActions = [
  { icon: MessageSquare, label: 'Ask Astra', color: 'blue' },
  { icon: BarChart3, label: 'New Report', color: 'emerald' },
  { icon: Calendar, label: 'Schedule', color: 'orange' },
  { icon: Zap, label: 'Quick Insights', color: 'pink' },
];

export const DemoMissionControlSlide: React.FC<DemoMissionControlSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full mb-2">
          Demo Data
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Mission Control
        </h2>
        <p className="text-base text-gray-400">
          Your command center for AI-powered business intelligence
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            <div className="lg:w-2/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{DEMO_COMPANY.name}</h3>
                  <p className="text-sm text-gray-400">{DEMO_COMPANY.tagline}</p>
                </div>
              </div>

              <div className="text-center py-4 bg-gray-900/50 rounded-xl mb-4">
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
                  {DEMO_MISSION_CONTROL.launchPoints.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Launch Points</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-xl font-semibold text-white">{DEMO_MISSION_CONTROL.teamMembers}</div>
                  <div className="text-xs text-gray-500">Members</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <FileText className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <div className="text-xl font-semibold text-white">{DEMO_MISSION_CONTROL.documentsConnected}</div>
                  <div className="text-xs text-gray-500">Docs</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                  <Fuel className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-xl font-semibold text-white">{DEMO_MISSION_CONTROL.fuelLevel}%</div>
                  <div className="text-xs text-gray-500">Fuel</div>
                </div>
              </div>
            </div>

            <div className="lg:flex-1 lg:border-l lg:border-gray-700 lg:pl-5">
              <h4 className="text-base font-medium text-gray-300 flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-gray-400" />
                Launch Stages Progress
              </h4>

              <div className="space-y-4">
                {Object.entries(DEMO_MISSION_CONTROL.stageProgress).map(([key, stage]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 font-medium">{stage.label}</span>
                      <span className="text-gray-400">{stage.current}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          key === 'fuel' ? 'bg-orange-500' :
                          key === 'guidance' ? 'bg-blue-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${stage.current}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                <TrendingUp className="w-5 h-5" />
                <span>Team progress is ahead of schedule</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(({ icon: Icon, label, color }) => (
              <button
                key={label}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 hover:border-${color}-500/40 transition-colors`}
              >
                <Icon className={`w-5 h-5 text-${color}-400`} />
                <span className="text-xs text-gray-300">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
