import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Rocket, MessageSquare, BarChart3, Calendar, FileText, Users, Sparkles, Mail, Building2, Zap, Settings, BookOpen, TrendingUp, Globe, Bell, Brain, RefreshCw, Lock, Bot, UserCircle, UserPlus, Loader, AlertCircle, CheckCircle, LayoutDashboard, Trophy, Target, Gift } from 'lucide-react';
import { LaunchPreparationHeader } from './LaunchPreparationHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LaunchOnboardingScreensProps {
  onComplete: () => void;
  onClose: () => void;
  userName?: string;
  isLegacyUser?: boolean;
  teamName?: string;
  userRole?: string;
  hasTeam?: boolean;
  isTeamCreator?: boolean;
}

type SetupChoice = 'none' | 'self' | 'delegate';

const onboardingScreens = [
  {
    id: 'welcome',
    title: 'Welcome to',
    subtitle: 'AI that Works for Work',
    icon: Rocket,
    content: (
      <div className="space-y-6 text-center">
        {/* Logo and Title - Matching header style */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-400 shadow-lg">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-blue-400">AI Rocket</span>
            <span className="text-white font-normal">+</span>
            <span className="text-emerald-400">Astra Intelligence</span>
          </h1>
        </div>

        {/* Tagline */}
        <div className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            AI that Works for Work
          </h2>
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
            <p className="text-lg text-white">
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Astra</span> is your Guide to an AI-Powered Business
            </p>
          </div>
        </div>

        <p className="text-gray-300 text-base max-w-2xl mx-auto">
          Let's take a quick tour of what you can do once you launch your AI Rocket
        </p>
      </div>
    )
  },
  {
    id: 'features-1',
    title: 'Core Features',
    subtitle: 'Everything you need to work smarter',
    icon: Brain,
    content: (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-orange-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-white">All Your Data Connected</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Connect Documents, Financials, and more. AI analyzes all your data for comprehensive insights.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-purple-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Visualizations</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Turn conversations into actionable insights with AI-generated charts, graphs, and visual reports.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Private AI Assistant</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Have confidential conversations with AI that understands your business context and provides personalized insights.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'features-2',
    title: 'Collaboration & Security',
    subtitle: 'Work together, stay secure',
    icon: Users,
    content: (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Team Collaboration</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Work together with your team and AI in shared conversations. @mention team members and AI for instant insights.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-yellow-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Automated Reports</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Schedule automated reports delivered to your inbox. Stay informed with daily, weekly, or monthly insights.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Secure & Private</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Your data is encrypted and secure. Control who sees what with team-based permissions and private conversations.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'features-3',
    title: 'Advanced AI Features',
    subtitle: 'Powerful capabilities to supercharge your team',
    icon: Bot,
    content: (
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-pink-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Agent Builder</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Design and deploy custom AI Agents to complete tasks autonomously.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Team Dashboard</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Real-time AI updated team info & insights on the metrics that matter most.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-teal-500/50 transition-all">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Specialists</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Create specialized AI team members like Business Coach, Finance Director, Marketing Manager and more.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'moonshot-challenge',
    title: '$5M Moonshot Challenge',
    subtitle: 'You\'re Automatically Entered!',
    icon: Trophy,
    content: (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white">$5M Prize Pool</h3>
              <p className="text-orange-300">90 Days to Transform Your Business</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { value: '$5M', label: 'Prize Pool' },
              { value: '300', label: 'Teams' },
              { value: '90', label: 'Days' },
              { value: '10', label: 'Winners' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">How It Works</h4>
                <p className="text-gray-400 text-xs">Simply use AI Rocket during the challenge. Your activity is automatically tracked by Astra Intelligence.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Top Prizes</h4>
                <p className="text-gray-400 text-xs">1st: $2M, 2nd: $1M, 3rd: $600K + 7 more equity prizes for top 10 teams.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Everyone Wins</h4>
                <p className="text-gray-400 text-xs">All valid applicants receive a free 1-year unlimited subscription.</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
            <p className="text-sm text-orange-300">
              No extra signup needed - you're already in! View full details in Mission Control.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'launch-prep',
    title: 'Ready to Launch?',
    subtitle: 'Let\'s prepare your AI Rocket for takeoff',
    icon: Sparkles,
    content: (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-white mb-4 text-center">
            Launch Preparation System
          </h3>
          <p className="text-gray-300 text-center mb-6">
            Before you can unlock all these powerful features, we need to set up three key systems:
          </p>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Fuel - Connect Your Data</h4>
                <p className="text-gray-400 text-sm">
                  Link your cloud storage (Google Drive or Microsoft OneDrive/SharePoint) so Astra can access your documents
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Boosters - Enable Features</h4>
                <p className="text-gray-400 text-sm">
                  Set up reports, team settings, and other features to power your workflow
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Rocket className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Guidance - Set Mission Parameters</h4>
                <p className="text-gray-400 text-sm">
                  Configure your preferences and customize how Astra works for you
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    ctaText: 'Initiate Launch Preparation',
    ctaAction: true
  }
];

export const LaunchOnboardingScreens: React.FC<LaunchOnboardingScreensProps> = ({
  onComplete,
  onClose,
  userName,
  isLegacyUser = false,
  teamName,
  userRole = 'member',
  hasTeam = false,
  isTeamCreator = true
}) => {
  const { user } = useAuth();
  const isInvitedUser = hasTeam && !isTeamCreator;
  const [currentScreen, setCurrentScreen] = useState(0);
  const [setupChoice, setSetupChoice] = useState<SetupChoice>('none');
  const [delegateEmail, setDelegateEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else if (setupChoice === 'none') {
      return;
    } else if (setupChoice === 'self') {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleSelectChoice = (choice: SetupChoice) => {
    setSetupChoice(choice);
    setInviteError(null);
    setDelegateEmail('');
  };

  const handleBackToChoices = () => {
    setSetupChoice('none');
    setInviteError(null);
    setDelegateEmail('');
  };

  const handleDelegateInvite = async () => {
    if (!delegateEmail.trim()) {
      setInviteError('Please enter an email address');
      return;
    }

    if (!delegateEmail.includes('@')) {
      setInviteError('Please enter a valid email address');
      return;
    }

    if (delegateEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setInviteError('You cannot invite yourself');
      return;
    }

    setIsSendingInvite(true);
    setInviteError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', delegateEmail.trim().toLowerCase())
        .maybeSingle();

      if (existingUser) {
        setInviteError('This email belongs to an existing user. Setup admins must be new users who will create an account through the invitation.');
        setIsSendingInvite(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!userData?.team_id) throw new Error('Team not found');

      const { data: existingDelegation } = await supabase
        .from('setup_delegation')
        .select('*')
        .eq('team_id', userData.team_id)
        .maybeSingle();

      if (existingDelegation && !['cancelled', 'completed'].includes(existingDelegation.status)) {
        throw new Error('A setup delegation already exists. Cancel it first to invite someone new.');
      }

      if (existingDelegation) {
        await supabase
          .from('setup_delegation')
          .delete()
          .eq('team_id', userData.team_id);
      }

      const { error: delegationError } = await supabase
        .from('setup_delegation')
        .insert({
          team_id: userData.team_id,
          delegating_user_id: user?.id,
          delegated_to_email: delegateEmail.trim().toLowerCase(),
          status: 'pending_invite',
        });

      if (delegationError) throw delegationError;

      await supabase
        .from('user_launch_status')
        .update({ awaiting_team_setup: true })
        .eq('user_id', user?.id);

      await supabase
        .from('launch_preparation_progress')
        .update({ level: 0, points_earned: 0, achievements: '[]' })
        .eq('user_id', user?.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-setup-admin-invite`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: delegateEmail.trim().toLowerCase(),
          teamName: teamName || 'Your Team',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send invitation');

      setInviteSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error delegating setup:', err);
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const screen = onboardingScreens[currentScreen];
  const ScreenIcon = screen.icon;
  const isLastScreen = currentScreen === onboardingScreens.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <LaunchPreparationHeader onClose={onClose} />

      <div className="pt-16 px-4 pb-4 h-screen overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full py-8">
          {/* Page Title - Only on first screen */}
          {currentScreen === 0 && (
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
                Mission Control
              </h2>
              <p className="text-gray-400 text-base md:text-lg">
                Welcome aboard!
              </p>
            </div>
          )}

          {/* Screen Icon - Skip on welcome screen */}
          {currentScreen !== 0 && (
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <ScreenIcon className="w-10 h-10 text-white" />
              </div>
            </div>
          )}

          {/* Screen Title - Skip on welcome screen */}
          {currentScreen !== 0 && (
            <div className="text-center mb-8 max-w-3xl">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {isLastScreen && isInvitedUser
                  ? 'You\'re All Set!'
                  : isLastScreen && setupChoice === 'self'
                  ? 'Setup Your Team'
                  : isLastScreen && setupChoice === 'delegate'
                  ? 'Invite an Admin'
                  : screen.title}
              </h1>
              <p className="text-gray-400 text-base md:text-lg">
                {isLastScreen && isInvitedUser
                  ? 'Your team is ready for you to start using Astra'
                  : isLastScreen && setupChoice === 'self'
                  ? 'You\'ll be guiding your team through Launch Preparation'
                  : isLastScreen && setupChoice === 'delegate'
                  ? 'Have someone else complete the setup for you'
                  : screen.subtitle}
              </p>
            </div>
          )}

          {/* Legacy User Message - Only on first screen */}
          {currentScreen === 0 && isLegacyUser && (
            <div className="w-full max-w-3xl mx-auto mb-6">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">Welcome Back!</h3>
                    <p className="text-gray-300 text-sm mb-3">
                      We've upgraded your experience with our new <span className="font-semibold text-amber-400">Launch Preparation System</span>. This is a one-time setup guide that will help you:
                    </p>
                    <ul className="space-y-1 text-gray-300 text-sm ml-4">
                      <li className="flex items-start">
                        <span className="text-amber-400 mr-2">•</span>
                        <span>Earn <span className="font-semibold text-amber-400">Launch Points</span> for actions you complete</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-amber-400 mr-2">•</span>
                        <span>Unlock <span className="font-semibold text-amber-400">Mission Control</span> to track your progress</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-amber-400 mr-2">•</span>
                        <span>Get credit for features you've already set up</span>
                      </li>
                    </ul>
                    <p className="text-gray-400 text-xs mt-3 italic">
                      This replaces the previous onboarding flow with a gamified experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Screen Content */}
          <div className="w-full mb-8">
            {isLastScreen && isInvitedUser ? (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Welcome to {teamName || 'Your Team'}!</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    You've been invited to join an existing team. Your team admin has already configured the system.
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-medium mb-2">What you can do:</h4>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span>Chat with Astra, your AI assistant</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <span>Create reports and visualizations</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Collaborate with your team</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Click Proceed to start using Astra!
                  </p>
                </div>
              </div>
            ) : isLastScreen && setupChoice !== 'none' ? (
              setupChoice === 'self' ? (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <Rocket className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Setup Your Team</h3>
                    </div>
                    <p className="text-gray-300 mb-4">
                      You'll complete the Launch Preparation yourself. This includes:
                    </p>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-3 h-3 text-blue-400" />
                        </div>
                        <div>
                          <span className="text-white font-medium">Connecting Your Cloud Drive</span>
                          <p className="text-gray-400 text-sm">Link your cloud storage so Astra can access your documents</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BarChart3 className="w-3 h-3 text-purple-400" />
                        </div>
                        <div>
                          <span className="text-white font-medium">Enabling Features</span>
                          <p className="text-gray-400 text-sm">Set up reports, visualizations, and AI capabilities</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Settings className="w-3 h-3 text-orange-400" />
                        </div>
                        <div>
                          <span className="text-white font-medium">Configuring Settings</span>
                          <p className="text-gray-400 text-sm">Customize team preferences and invite members</p>
                        </div>
                      </li>
                    </ul>
                    <p className="text-gray-400 text-sm">
                      You can complete this at your own pace and earn Launch Points along the way!
                    </p>
                  </div>
                </div>
              ) : inviteSuccess ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-green-400 mb-2">Invitation Sent!</h3>
                    <p className="text-gray-300">Redirecting to waiting screen...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Invite an Admin</h3>
                    </div>
                    <p className="text-gray-300 mb-4">
                      Invite someone else to complete the Launch Preparation for your team. This is ideal when:
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-start space-x-3">
                        <span className="text-blue-400">-</span>
                        <span className="text-gray-300">An IT admin manages your company's cloud storage</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="text-blue-400">-</span>
                        <span className="text-gray-300">Someone else should configure team settings</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="text-blue-400">-</span>
                        <span className="text-gray-300">You don't have access to the required documents</span>
                      </li>
                    </ul>

                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Admin Email Address
                      </label>
                      <input
                        type="email"
                        value={delegateEmail}
                        onChange={(e) => setDelegateEmail(e.target.value)}
                        placeholder="admin@yourcompany.com"
                        disabled={isSendingInvite}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>

                    {inviteError && (
                      <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{inviteError}</p>
                      </div>
                    )}

                    <p className="text-amber-400/80 text-sm">
                      Note: You'll wait for the invited admin to complete setup before you can use Astra.
                    </p>
                  </div>
                </div>
              )
            ) : (
              screen.content
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between w-full max-w-2xl mt-8">
            {/* Progress Dots */}
            <div className="flex items-center space-x-2">
              {onboardingScreens.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentScreen(index);
                    if (index !== onboardingScreens.length - 1) {
                      setSetupChoice('none');
                    }
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentScreen
                      ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {isLastScreen && setupChoice === 'none' && isInvitedUser ? (
                <button
                  onClick={onComplete}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <span>Proceed</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : isLastScreen && setupChoice === 'none' ? (
                <>
                  <button
                    onClick={() => handleSelectChoice('self')}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <Rocket className="w-5 h-5" />
                    <span>I Will Setup My Team</span>
                  </button>
                  <button
                    onClick={() => handleSelectChoice('delegate')}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Invite Admin to Setup My Team</span>
                  </button>
                </>
              ) : isLastScreen && setupChoice === 'self' ? (
                <>
                  <button
                    onClick={handleBackToChoices}
                    className="flex items-center space-x-2 px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Go Back</span>
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <span>Proceed to Setup</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : isLastScreen && setupChoice === 'delegate' && !inviteSuccess ? (
                <>
                  <button
                    onClick={handleBackToChoices}
                    disabled={isSendingInvite}
                    className="flex items-center space-x-2 px-5 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Go Back</span>
                  </button>
                  <button
                    onClick={handleDelegateInvite}
                    disabled={isSendingInvite || !delegateEmail.trim()}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        <span>Send Invitation</span>
                      </>
                    )}
                  </button>
                </>
              ) : !isLastScreen ? (
                <button
                  onClick={handleNext}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <span>{screen.ctaText || 'Continue'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
