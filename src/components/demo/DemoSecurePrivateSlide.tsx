import React from 'react';
import { Shield, Lock, Eye, Users, Server, CheckCircle2, Award, Globe } from 'lucide-react';

interface DemoSecurePrivateSlideProps {
  onClose: () => void;
}

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data is encrypted in transit and at rest using industry-standard encryption',
    color: 'blue',
  },
  {
    icon: Eye,
    title: 'Private by Default',
    description: 'Your conversations and data are visible only to you and your team members',
    color: 'emerald',
  },
  {
    icon: Users,
    title: 'Team-Based Permissions',
    description: 'Control who can access what with role-based access controls',
    color: 'orange',
  },
  {
    icon: Server,
    title: 'Secure Infrastructure',
    description: 'Hosted on enterprise-grade cloud infrastructure with 99.9% uptime',
    color: 'cyan',
  },
];

const privacyPromises = [
  'Data never shared with third parties',
  'AI does not train on your data',
  'Full ownership of your content',
  'Delete data anytime with one click',
  'GDPR and SOC 2 compliant',
  'Regular security audits',
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
};

export const DemoSecurePrivateSlide: React.FC<DemoSecurePrivateSlideProps> = () => {
  return (
    <div className="p-5 lg:p-6 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full mb-2">
          Your Data, Protected
        </span>
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Secure & Private
        </h2>
        <p className="text-base text-gray-400 max-w-xl mx-auto">
          Enterprise-grade security for your business data
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-4 flex-1">
          <div className="lg:w-3/5 bg-gray-800/50 border border-gray-700 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Enterprise-Grade Security</h3>
                <p className="text-sm text-gray-400">Built with security in mind</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {securityFeatures.map((feature) => {
                const Icon = feature.icon;
                const colors = colorMap[feature.color];
                return (
                  <div
                    key={feature.title}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-3`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                      <div>
                        <h4 className="text-sm font-medium text-white mb-1">{feature.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:w-2/5 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-gray-700 rounded-2xl p-5 flex flex-col">
            <h3 className="text-base font-semibold text-white mb-4">Our Privacy Promise</h3>
            <div className="space-y-3 flex-1">
              {privacyPromises.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-gray-400">
              <Award className="w-5 h-5 text-cyan-400" />
              <span className="text-sm">SOC 2 Type II Certified</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Globe className="w-5 h-5 text-emerald-400" />
              <span className="text-sm">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-sm">256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
