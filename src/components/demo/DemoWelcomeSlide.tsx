import React from 'react';
import { Rocket, Brain, BarChart3, Users, Shield, Zap, Clock, CheckCircle } from 'lucide-react';

interface DemoWelcomeSlideProps {
  onClose: () => void;
}

const features = [
  { icon: Brain, label: 'AI Intelligence', color: 'blue' },
  { icon: BarChart3, label: 'Smart Reports', color: 'emerald' },
  { icon: Users, label: 'Team Collaboration', color: 'orange' },
  { icon: Rocket, label: 'Launch Ready', color: 'pink' },
];

const benefits = [
  { icon: Zap, text: 'Get answers from your data in seconds' },
  { icon: Shield, text: 'Your data stays private and secure' },
  { icon: Clock, text: 'Save hours every week on reporting' },
  { icon: CheckCircle, text: 'Built for teams of all sizes' },
];

export const DemoWelcomeSlide: React.FC<DemoWelcomeSlideProps> = () => {
  return (
    <div className="flex flex-col items-center justify-between p-5 lg:p-6 h-full text-center">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative mb-5">
          <div className="text-7xl lg:text-8xl">🚀</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-orange-500/20 rounded-full blur-lg" />
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
          Welcome to AI Rocket
        </h1>

        <p className="text-xl text-blue-400 font-medium mb-4">
          AI for Work: Solved
        </p>

        <p className="text-base text-gray-400 max-w-xl mb-6">
          Experience how AI Rocket + Astra Intelligence helps teams like yours harness the power of AI with your own data.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mb-8">
          {features.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-${color}-500/10 border border-${color}-500/20 hover:border-${color}-500/40 transition-colors`}
            >
              <Icon className={`w-6 h-6 text-${color}-400`} />
              <span className="text-sm text-gray-300 font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-xl">
          {benefits.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-left">
              <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Swipe or use arrows to explore</span>
      </div>
    </div>
  );
};
