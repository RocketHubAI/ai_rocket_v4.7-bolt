import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Sparkles, Shield, Zap, Calendar, Tag, ChevronRight } from 'lucide-react';

interface Update {
  id: string;
  date: string;
  version?: string;
  type: 'feature' | 'improvement' | 'fix' | 'announcement';
  title: string;
  description: string;
  details?: string[];
}

const updates: Update[] = [
  {
    id: '2024-12-14-oauth-modal',
    date: 'December 14, 2024',
    type: 'improvement',
    title: 'Google Drive Connection Guide',
    description: 'Added an informational screen when connecting Google Drive that explains the Google verification process and guides users through the authorization flow.',
    details: [
      'New modal appears before Google OAuth to prepare users',
      'Step-by-step instructions for the Google consent screen',
      'Clear explanation of security and privacy practices'
    ]
  },
  {
    id: '2024-12-12-report-email',
    date: 'December 12, 2024',
    type: 'feature',
    title: 'Report Email Delivery',
    description: 'Scheduled reports can now be automatically delivered to your email inbox.',
    details: [
      'Configure email delivery in report settings',
      'Receive reports directly in your inbox',
      'Customize delivery schedule and recipients'
    ]
  },
  {
    id: '2024-12-08-team-points',
    date: 'December 8, 2024',
    type: 'feature',
    title: 'Team Launch Points',
    description: 'Launch points from all team members now contribute to your team\'s total score.',
    details: [
      'Points automatically aggregate across team members',
      'View team progress in Launch Preparation',
      'Multiple admins can contribute to team achievements'
    ]
  },
  {
    id: '2024-12-01-launch-prep',
    date: 'December 1, 2024',
    version: 'v1.0.0',
    type: 'feature',
    title: 'Launch Preparation System',
    description: 'Introducing a new gamified onboarding experience to help teams get the most out of Astra Intelligence.',
    details: [
      'Three stages: Fuel (data), Guidance (configuration), Boosters (advanced features)',
      'Progress tracking with levels and achievements',
      'Launch points reward system',
      'Interactive tutorials and guided setup'
    ]
  },
  {
    id: '2024-11-15-visualizations',
    date: 'November 15, 2024',
    type: 'feature',
    title: 'AI-Powered Visualizations',
    description: 'Generate charts and graphs from your data with natural language requests.',
    details: [
      'Ask Astra to create charts from your documents',
      'Export visualizations as images or PDF',
      'Save visualizations for future reference'
    ]
  },
  {
    id: '2024-11-01-scheduled-reports',
    date: 'November 1, 2024',
    type: 'feature',
    title: 'Scheduled Reports',
    description: 'Set up recurring reports to automatically run daily or weekly.',
    details: [
      'Configure report frequency and timing',
      'Choose from report templates',
      'View report history and results'
    ]
  },
  {
    id: '2024-10-15-whats-new',
    date: 'October 15, 2024',
    type: 'feature',
    title: 'What\'s New in Help Center',
    description: 'Added a What\'s New section to the Help Center to keep you informed about the latest updates.',
    details: [
      'Version-based announcements',
      'Feature highlights and tips',
      'Easy access from the Help menu'
    ]
  }
];

const typeConfig = {
  feature: { label: 'New Feature', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Sparkles },
  improvement: { label: 'Improvement', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Zap },
  fix: { label: 'Bug Fix', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Shield },
  announcement: { label: 'Announcement', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Rocket }
};

export const UpdatesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Product Updates</h1>
              <p className="text-sm text-gray-400">What's new in Astra Intelligence</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-gray-300">
            Stay up to date with the latest features, improvements, and fixes. We're constantly working to make Astra Intelligence better for you.
          </p>
        </div>

        <div className="space-y-6">
          {updates.map((update, index) => {
            const TypeIcon = typeConfig[update.type].icon;
            const isLatest = index === 0;

            return (
              <article
                key={update.id}
                className={`bg-gray-800 rounded-xl border ${isLatest ? 'border-orange-500/50' : 'border-gray-700'} overflow-hidden`}
              >
                {isLatest && (
                  <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2">
                    <span className="text-white text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Latest Update
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${typeConfig[update.type].color} flex items-center gap-1.5`}>
                      <TypeIcon className="w-3 h-3" />
                      {typeConfig[update.type].label}
                    </span>

                    <span className="text-gray-500 text-sm flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {update.date}
                    </span>

                    {update.version && (
                      <span className="text-gray-500 text-sm flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        {update.version}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-white mb-2">
                    {update.title}
                  </h2>

                  <p className="text-gray-300 mb-4">
                    {update.description}
                  </p>

                  {update.details && update.details.length > 0 && (
                    <ul className="space-y-2">
                      {update.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full border border-gray-700">
            <Rocket className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400 text-sm">More updates coming soon</span>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-500 text-sm">
            Have feedback or feature requests?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Let us know
            </button>
          </p>
        </div>
      </footer>
    </div>
  );
};
