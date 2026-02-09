import React from 'react';
import { FileText, Clock, Calendar, Mail, CheckCircle2 } from 'lucide-react';
import { DEMO_GUIDED_REPORTS, DEMO_REPORT_DATA } from '../../data/demoData';

interface DemoGuidedReportsSlideProps {
  onClose: () => void;
}

export const DemoGuidedReportsSlide: React.FC<DemoGuidedReportsSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 flex flex-col h-full">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-teal-500/20 text-teal-400 rounded-full mb-2">
          Automated Insights
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Agent Guided Reports
        </h2>
        <p className="text-sm text-gray-400 max-w-xl mx-auto">
          AI-generated reports delivered on your schedule
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4 flex-1">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Scheduled Reports</h3>
              <p className="text-sm text-gray-400">Set it and forget it</p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {DEMO_GUIDED_REPORTS.map((report, index) => (
              <div
                key={index}
                className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium text-white">{report.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                  </div>
                  <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-teal-400">
                  <Clock className="w-3 h-3" />
                  <span>{report.schedule}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-teal-400" />
              <h3 className="text-lg font-semibold text-white">{DEMO_REPORT_DATA.title}</h3>
            </div>
            <span className="text-xs text-gray-500">{DEMO_REPORT_DATA.date}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {DEMO_REPORT_DATA.metrics.map((metric) => (
              <div key={metric.label} className="bg-gray-900/50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-white">{metric.value}</span>
                  <span className={`text-xs ${metric.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Highlights</h4>
            <div className="space-y-2">
              {DEMO_REPORT_DATA.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
