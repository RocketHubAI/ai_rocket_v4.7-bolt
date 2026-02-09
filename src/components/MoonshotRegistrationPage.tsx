import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, CheckCircle, Mail, Loader2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type RegistrationStep = 'welcome' | 'basic_info' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'success';

interface FormData {
  name: string;
  email: string;
  teamName: string;
  industry: string;
  customIndustry: string;
  currentAiUsage: string;
  aiUseCases: string[];
  customUseCase: string;
  monthlyAiSpend: string;
  connectedData: string[];
  painPoints: string[];
  mastermindGroups: string[];
  customMastermindGroup: string;
}

interface ExistingUserInfo {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  userEmail: string;
  alreadyRegistered: boolean;
}

const INDUSTRIES = [
  'Technology / Software',
  'Finance / Banking',
  'Healthcare / Medical',
  'Real Estate',
  'E-commerce / Retail',
  'Manufacturing',
  'Professional Services',
  'Marketing / Advertising',
  'Education',
  'Construction',
  'Hospitality / Travel',
  'Energy / Utilities',
  'Non-profit',
  'Other'
];

const AI_USAGE_LEVELS = [
  { value: 'none', label: 'Not using AI yet', desc: 'Haven\'t started with AI tools' },
  { value: 'experimenting', label: 'Experimenting', desc: 'Trying out tools like ChatGPT occasionally' },
  { value: 'regular', label: 'Regular user', desc: 'Use AI tools weekly for various tasks' },
  { value: 'integrated', label: 'Integrated', desc: 'AI is part of our daily workflows' },
  { value: 'advanced', label: 'Advanced', desc: 'Building custom AI solutions' }
];

const AI_USE_CASES = [
  'Content creation & copywriting',
  'Data analysis & reporting',
  'Customer support automation',
  'Sales & lead generation',
  'Marketing & advertising',
  'Research & market intelligence',
  'Process automation',
  'Product development',
  'Financial analysis',
  'Team collaboration',
  'Strategic planning',
  'Other'
];

const MONTHLY_SPEND_RANGES = [
  { value: '0', label: '$0 / month', desc: 'Using free tools only' },
  { value: '1-100', label: '$1 - $100 / month', desc: 'Basic subscriptions' },
  { value: '100-500', label: '$100 - $500 / month', desc: 'Multiple AI tools' },
  { value: '500-1000', label: '$500 - $1,000 / month', desc: 'Team-wide AI access' },
  { value: '1000+', label: '$1,000+ / month', desc: 'Enterprise AI solutions' }
];

const CONNECTED_DATA_OPTIONS = [
  { value: 'none', label: 'None', desc: 'Not connecting any data to AI' },
  { value: 'manual', label: 'Manual uploads', desc: 'Copy/paste or upload files as needed' },
  { value: 'documents', label: 'Documents', desc: 'Connected to Google Drive, Dropbox, etc.' },
  { value: 'crm_meetings', label: 'CRM / Meetings Data', desc: 'Syncing of customer or meetings data' },
  { value: 'multiple', label: 'Multiple sources', desc: 'Connected to various business systems' }
];

const PAIN_POINTS = [
  'AI doesn\'t understand my business context',
  'Responses are too generic or unhelpful',
  'Hard to share AI insights with team members',
  'No way to automate recurring reports',
  'Can\'t connect my business data to AI',
  'Too many AI tools to manage',
  'Difficult to get consistent results',
  'Concerns about data privacy/security',
  'AI outputs need too much editing',
  'Can\'t track ROI of AI investments',
  'Team adoption is slow or inconsistent',
  'Integration with existing workflows is hard'
];

const MASTERMIND_GROUPS = [
  'Gobundance',
  'Entrepreneurs Organization',
  'YPO',
  'Strategic Coach',
  'Genius Network',
  'BMI',
  'Other',
  'None'
];

const CompactHeader: React.FC = () => (
  <div className="flex items-center justify-center gap-2 py-3 border-b border-white/10">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'linear-gradient(145deg, #5BA4E6, #3B82C4)' }}>
      <span role="img" aria-label="rocket">🚀</span>
    </div>
    <span className="text-xl font-bold text-white">AI Rocket</span>
  </div>
);

export const MoonshotRegistrationPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('welcome');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    teamName: '',
    industry: '',
    customIndustry: '',
    currentAiUsage: '',
    aiUseCases: [],
    customUseCase: '',
    monthlyAiSpend: '',
    connectedData: [],
    painPoints: [],
    mastermindGroups: [],
    customMastermindGroup: ''
  });
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingUserInfo, setExistingUserInfo] = useState<ExistingUserInfo | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const [submittedAsExistingUser, setSubmittedAsExistingUser] = useState<ExistingUserInfo | null>(null);

  useEffect(() => {
    const fetchExistingUserInfo = async () => {
      if (!user) {
        setExistingUserInfo(null);
        return;
      }

      setLoadingUserInfo(true);
      try {
        const teamId = user.user_metadata?.team_id;
        if (!teamId) {
          setExistingUserInfo(null);
          return;
        }

        const { data: teamData } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', teamId)
          .maybeSingle();

        if (!teamData) {
          setExistingUserInfo(null);
          return;
        }

        const { data: existingReg } = await supabase
          .from('moonshot_registrations')
          .select('id')
          .eq('team_id', teamId)
          .maybeSingle();

        const userName = user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] || '';

        setExistingUserInfo({
          teamId: teamData.id,
          teamName: teamData.name,
          userId: user.id,
          userName,
          userEmail: user.email || '',
          alreadyRegistered: !!existingReg
        });

        setFormData(prev => ({
          ...prev,
          name: userName,
          email: user.email || '',
          teamName: teamData.name
        }));
      } catch (err) {
        console.error('Error fetching user info:', err);
      } finally {
        setLoadingUserInfo(false);
      }
    };

    if (!authLoading) {
      fetchExistingUserInfo();
    }
  }, [user, authLoading]);

  const steps: RegistrationStep[] = ['welcome', 'basic_info', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'success'];

  const generateInviteCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `MOON-${part1}-${part2}`;
  };

  const handleNext = () => {
    const stepIndex = steps.indexOf(currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepIndex = steps.indexOf(currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const finalIndustry = formData.industry === 'Other' ? formData.customIndustry : formData.industry;
      const finalUseCases = formData.aiUseCases.includes('Other') && formData.customUseCase
        ? [...formData.aiUseCases.filter(u => u !== 'Other'), formData.customUseCase]
        : formData.aiUseCases;

      let registrationId: string;
      let code: string;

      let existingReg: { id: string; team_name: string; user_id: string | null; team_id: string | null } | null = null;

      if (user) {
        const { data, error: regCheckError } = await supabase
          .from('moonshot_registrations')
          .select('id, team_name, user_id, team_id')
          .eq('email', formData.email.toLowerCase())
          .maybeSingle();
        if (regCheckError) {
          console.error('Error checking existing registration:', regCheckError);
        }
        existingReg = data;
      } else {
        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-preflight-check`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'check-moonshot-registration', email: formData.email.toLowerCase() }),
          });
          const result = await response.json();
          existingReg = result.registration || null;
        } catch (err) {
          console.error('Error checking existing registration:', err);
        }
      }

      const hasRealAccount = existingReg?.user_id != null;

      if (existingReg && hasRealAccount) {
        setSubmittedAsExistingUser({
          teamId: existingReg.team_id || '',
          teamName: existingReg.team_name,
          userId: existingReg.user_id || '',
          userName: formData.name,
          userEmail: formData.email,
          alreadyRegistered: true
        });

        registrationId = existingReg.id;
        code = '';

        const { error: updateError } = await supabase
          .from('moonshot_registrations')
          .update({
            name: formData.name,
            industry: finalIndustry,
            source: 'registration',
            converted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', registrationId);

        if (updateError) {
          console.error('Error updating registration:', updateError);
        }
      } else if (existingReg && !hasRealAccount) {
        registrationId = existingReg.id;

        const { data: existingCode } = await supabase
          .from('moonshot_invite_codes')
          .select('code')
          .eq('registration_id', registrationId)
          .maybeSingle();

        code = existingCode?.code || generateInviteCode();

        if (!existingCode?.code) {
          await supabase
            .from('moonshot_invite_codes')
            .insert({
              registration_id: registrationId,
              code: code,
              valid_from: '2026-01-15T00:00:00+00:00',
              expires_at: '2026-04-15T23:59:59+00:00'
            });
        }

        await supabase
          .from('moonshot_registrations')
          .update({
            name: formData.name,
            industry: finalIndustry,
            updated_at: new Date().toISOString()
          })
          .eq('id', registrationId);
      } else {
        code = generateInviteCode();

        const registrationData = {
          name: formData.name,
          email: formData.email,
          team_name: formData.teamName,
          industry: finalIndustry,
          source: 'new'
        };

        const { data: regData, error: regError } = await supabase
          .from('moonshot_registrations')
          .insert(registrationData)
          .select('id')
          .single();

        if (regError) throw regError;

        registrationId = regData.id;

        const { error: codeError } = await supabase
          .from('moonshot_invite_codes')
          .insert({
            registration_id: registrationId,
            code: code,
            valid_from: '2026-01-15T00:00:00+00:00',
            expires_at: '2026-04-15T23:59:59+00:00'
          });

        if (codeError) throw codeError;
      }

      const finalMastermindGroups = formData.mastermindGroups.includes('Other') && formData.customMastermindGroup
        ? [...formData.mastermindGroups.filter(g => g !== 'Other'), formData.customMastermindGroup]
        : formData.mastermindGroups;

      const { error: surveyError } = await supabase
        .from('moonshot_survey_responses')
        .insert({
          registration_id: registrationId,
          email: formData.email.toLowerCase(),
          industry: finalIndustry,
          current_ai_usage: formData.currentAiUsage,
          ai_use_cases: finalUseCases,
          monthly_ai_spend: formData.monthlyAiSpend,
          connected_data: formData.connectedData.join('; '),
          biggest_pain_points: formData.painPoints.join('; '),
          mastermind_groups: finalMastermindGroups
        });

      if (surveyError) throw surveyError;

      if (!existingReg) {
        const LAUNCH_DATE = new Date('2026-01-15T09:00:00.000Z');
        const DAY_MS = 24 * 60 * 60 * 1000;

        const featureEmailTypes = [
          'feature_connected_data',
          'feature_visualizations',
          'feature_collaboration',
          'feature_reports',
          'feature_guided_prompts'
        ];

        const countdownEmails = [
          { type: 'countdown_4_weeks', daysBeforeLaunch: 13 },
          { type: 'countdown_3_weeks', daysBeforeLaunch: 10 },
          { type: 'countdown_2_weeks', daysBeforeLaunch: 7 },
          { type: 'countdown_1_week', daysBeforeLaunch: 4 },
          { type: 'countdown_tomorrow', daysBeforeLaunch: 1 },
          { type: 'launch_day', daysBeforeLaunch: 0 }
        ];

        const now = new Date();

        const emailSequence: { registration_id: string; email_type: string; scheduled_for: string }[] = [];

        emailSequence.push({
          registration_id: registrationId,
          email_type: 'confirmation',
          scheduled_for: now.toISOString()
        });

        const featureEndDate = new Date(LAUNCH_DATE.getTime() - 14 * DAY_MS);
        const featureStartDate = new Date(now.getTime() + DAY_MS);
        const availableTimeMs = Math.max(0, featureEndDate.getTime() - featureStartDate.getTime());
        const numFeatureEmails = featureEmailTypes.length;
        const intervalMs = numFeatureEmails > 1 ? availableTimeMs / (numFeatureEmails - 1) : DAY_MS;
        const minIntervalMs = 2 * DAY_MS;

        for (let i = 0; i < featureEmailTypes.length; i++) {
          let scheduledDate: Date;
          if (availableTimeMs > 0 && intervalMs >= minIntervalMs) {
            scheduledDate = new Date(featureStartDate.getTime() + i * intervalMs);
          } else {
            scheduledDate = new Date(featureStartDate.getTime() + i * minIntervalMs);
          }
          if (scheduledDate < LAUNCH_DATE) {
            emailSequence.push({
              registration_id: registrationId,
              email_type: featureEmailTypes[i],
              scheduled_for: scheduledDate.toISOString()
            });
          }
        }

        for (const { type, daysBeforeLaunch } of countdownEmails) {
          const scheduledDate = new Date(LAUNCH_DATE.getTime() - daysBeforeLaunch * DAY_MS);
          if (scheduledDate >= now) {
            emailSequence.push({
              registration_id: registrationId,
              email_type: type,
              scheduled_for: scheduledDate.toISOString()
            });
          }
        }

        await supabase
          .from('moonshot_email_sequence')
          .insert(emailSequence);
      }

      try {
        const isActualExistingUser = !!existingUserInfo || (existingReg && hasRealAccount);
        await supabase.functions.invoke('moonshot-send-confirmation', {
          body: {
            registrationId,
            email: formData.email,
            name: formData.name,
            inviteCode: code,
            isExistingUser: isActualExistingUser
          }
        });
      } catch {
        console.warn('Could not send confirmation email, but registration succeeded');
      }

      setInviteCode(code);
      setCurrentStep('success');
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const toggleUseCase = (useCase: string) => {
    setFormData(prev => ({
      ...prev,
      aiUseCases: prev.aiUseCases.includes(useCase)
        ? prev.aiUseCases.filter(u => u !== useCase)
        : [...prev.aiUseCases, useCase]
    }));
  };

  const togglePainPoint = (painPoint: string) => {
    setFormData(prev => ({
      ...prev,
      painPoints: prev.painPoints.includes(painPoint)
        ? prev.painPoints.filter(p => p !== painPoint)
        : [...prev.painPoints, painPoint]
    }));
  };

  const toggleMastermindGroup = (group: string) => {
    setFormData(prev => {
      if (group === 'None') {
        return {
          ...prev,
          mastermindGroups: ['None'],
          customMastermindGroup: ''
        };
      }

      const updatedGroups = prev.mastermindGroups.includes(group)
        ? prev.mastermindGroups.filter(g => g !== group)
        : [...prev.mastermindGroups.filter(g => g !== 'None'), group];

      return {
        ...prev,
        mastermindGroups: updatedGroups,
        customMastermindGroup: group === 'Other' && !updatedGroups.includes('Other') ? '' : prev.customMastermindGroup
      };
    });
  };

  const toggleConnectedData = (option: string) => {
    setFormData(prev => ({
      ...prev,
      connectedData: prev.connectedData.includes(option)
        ? prev.connectedData.filter(d => d !== option)
        : [...prev.connectedData, option]
    }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'basic_info':
        const industryValid = formData.industry !== '' &&
          (formData.industry !== 'Other' || formData.customIndustry.trim() !== '');
        return formData.name.trim() !== '' &&
               formData.email.trim() !== '' &&
               formData.teamName.trim() !== '' &&
               industryValid;
      case 'q1':
        return formData.currentAiUsage !== '';
      case 'q2':
        const useCasesValid = formData.aiUseCases.length > 0 &&
          (!formData.aiUseCases.includes('Other') || formData.customUseCase.trim() !== '');
        return useCasesValid;
      case 'q3':
        return formData.monthlyAiSpend !== '';
      case 'q4':
        return formData.connectedData.length > 0;
      case 'q5':
        return formData.painPoints.length > 0;
      case 'q6':
        return formData.mastermindGroups.length > 0 &&
               (!formData.mastermindGroups.includes('Other') || formData.customMastermindGroup.trim() !== '');
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center flex flex-col justify-center min-h-[70vh]">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-emerald-500 px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider mb-6 mx-auto">
              Registration Opens Jan 5 | Challenge Starts Jan 15
            </div>

            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl md:text-4xl" style={{ background: 'linear-gradient(145deg, #5BA4E6, #3B82C4)', boxShadow: '0 8px 32px rgba(59, 130, 196, 0.4)' }}>
                <span role="img" aria-label="rocket">🚀</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white">AI Rocket</h1>
            </div>
            <p className="text-gray-500 mb-6 tracking-wider text-sm">AI Built for Entrepreneurs and Their Teams</p>

            <h2 className="text-3xl md:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">$5M AI Moonshot Challenge</span>
            </h2>
            <div className="mb-6 max-w-2xl mx-auto">
              <p className="text-base md:text-lg text-gray-300">
                Transform your Team to AI-Powered
              </p>
              <p className="text-base md:text-lg text-gray-300">
                Free & Unlimited Access to the Most Powerful AI-Suite for Work
              </p>
            </div>

            {existingUserInfo && (
              <div className="max-w-md mx-auto mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-3 justify-center mb-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">Welcome back, {existingUserInfo.userName}!</span>
                </div>
                {existingUserInfo.alreadyRegistered ? (
                  <p className="text-sm text-gray-300">
                    Your team <span className="font-semibold text-white">{existingUserInfo.teamName}</span> is already entered in the Moonshot Challenge! Complete this survey to share your feedback.
                  </p>
                ) : (
                  <p className="text-sm text-gray-300">
                    Your team <span className="font-semibold text-white">{existingUserInfo.teamName}</span> will automatically be entered in the Moonshot Challenge.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 max-w-xl mx-auto mb-6">
              {[
                { value: '$5M', label: 'Prize Pool' },
                { value: '300', label: 'Team Slots' },
                { value: '90', label: 'Days Free' },
                { value: '10', label: 'Winners' }
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              {existingUserInfo
                ? 'Complete this quick survey to share your feedback and help us improve'
                : 'Complete this quick survey to receive your unique launch code'}
            </p>
          </div>
        );

      case 'basic_info':
        return (
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Tell Us About You</h2>
            <p className="text-gray-400 mb-6 text-center text-base">Basic information to set up your registration</p>

            {existingUserInfo && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your information has been pre-filled from your account</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Smith"
                  className={`w-full px-4 py-3.5 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-base ${
                    existingUserInfo ? 'border-blue-500/30' : 'border-gray-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@company.com"
                  className={`w-full px-4 py-3.5 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-base ${
                    existingUserInfo ? 'border-blue-500/30' : 'border-gray-700'
                  }`}
                  readOnly={!!existingUserInfo}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Team / Company Name</label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={e => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                  placeholder="Acme Inc"
                  className={`w-full px-4 py-3.5 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-base ${
                    existingUserInfo ? 'border-blue-500/30 bg-gray-800/50' : 'border-gray-700'
                  }`}
                  readOnly={!!existingUserInfo}
                />
                {existingUserInfo && (
                  <p className="mt-1 text-xs text-gray-500">This is your existing team name and cannot be changed here</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Industry</label>
                <select
                  value={formData.industry}
                  onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value, customIndustry: '' }))}
                  className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors text-base"
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              {formData.industry === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Please specify your industry</label>
                  <input
                    type="text"
                    value={formData.customIndustry}
                    onChange={e => setFormData(prev => ({ ...prev, customIndustry: e.target.value }))}
                    placeholder="Enter your industry"
                    className="w-full px-4 py-3.5 bg-gray-800 border border-orange-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-base"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'q1':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-3">
                Question 1 of 6
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">How are you currently using AI?</h2>
              <p className="text-gray-400 text-base">Select the option that best describes your team's AI adoption</p>
            </div>

            <div className="space-y-2.5">
              {AI_USAGE_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData(prev => ({ ...prev, currentAiUsage: level.value }))}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    formData.currentAiUsage === level.value
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-base">{level.label}</div>
                      <div className="text-sm text-gray-400">{level.desc}</div>
                    </div>
                    {formData.currentAiUsage === level.value && (
                      <Check className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'q2':
        return (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-3">
                Question 2 of 6
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What do you use AI for?</h2>
              <p className="text-gray-400 text-base">Select all that apply</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {AI_USE_CASES.map(useCase => (
                <button
                  key={useCase}
                  onClick={() => toggleUseCase(useCase)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.aiUseCases.includes(useCase)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-base">{useCase}</span>
                    {formData.aiUseCases.includes(useCase) && (
                      <Check className="w-5 h-5 text-orange-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {formData.aiUseCases.includes('Other') && (
              <div className="mt-3">
                <input
                  type="text"
                  value={formData.customUseCase}
                  onChange={e => setFormData(prev => ({ ...prev, customUseCase: e.target.value }))}
                  placeholder="Please specify your use case"
                  className="w-full px-4 py-3 bg-gray-800 border border-orange-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-base"
                  autoFocus
                />
              </div>
            )}
          </div>
        );

      case 'q3':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-3">
                Question 3 of 6
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What's your monthly AI spend?</h2>
              <p className="text-gray-400 text-base">Approximate total across all AI tools and services</p>
            </div>

            <div className="space-y-2.5">
              {MONTHLY_SPEND_RANGES.map(range => (
                <button
                  key={range.value}
                  onClick={() => setFormData(prev => ({ ...prev, monthlyAiSpend: range.value }))}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    formData.monthlyAiSpend === range.value
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-base">{range.label}</div>
                      <div className="text-sm text-gray-400">{range.desc}</div>
                    </div>
                    {formData.monthlyAiSpend === range.value && (
                      <Check className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'q4':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-3">
                Question 4 of 6
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What data do you connect to AI?</h2>
              <p className="text-gray-400 text-base">Select all that apply</p>
            </div>

            <div className="space-y-2.5">
              {CONNECTED_DATA_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleConnectedData(option.value)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    formData.connectedData.includes(option.value)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-base">{option.label}</div>
                      <div className="text-sm text-gray-400">{option.desc}</div>
                    </div>
                    {formData.connectedData.includes(option.value) && (
                      <Check className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'q5':
        return (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-3">
                Question 5 of 6
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What are your biggest AI pain points?</h2>
              <p className="text-gray-400 text-base">Select all that apply</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PAIN_POINTS.map(painPoint => (
                <button
                  key={painPoint}
                  onClick={() => togglePainPoint(painPoint)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.painPoints.includes(painPoint)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-base">{painPoint}</span>
                    {formData.painPoints.includes(painPoint) && (
                      <Check className="w-5 h-5 text-orange-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'q6':
        return (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-3">
                Question 6 of 6
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Are you a member of any business or mastermind groups?</h2>
              <p className="text-gray-400 text-base">Select all that apply</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {MASTERMIND_GROUPS.map(group => (
                <button
                  key={group}
                  onClick={() => toggleMastermindGroup(group)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.mastermindGroups.includes(group)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-base">{group}</span>
                    {formData.mastermindGroups.includes(group) && (
                      <Check className="w-5 h-5 text-orange-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {formData.mastermindGroups.includes('Other') && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Please specify the group name..."
                  value={formData.customMastermindGroup}
                  onChange={(e) => setFormData(prev => ({ ...prev, customMastermindGroup: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        );

      case 'success':
        const effectiveExistingUser = existingUserInfo || submittedAsExistingUser;
        if (effectiveExistingUser) {
          return (
            <div className="text-center max-w-lg mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">You're Already Registered!</h2>
              <p className="text-gray-400 mb-6">Your feedback has been recorded</p>

              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <span className="text-xl font-bold text-white">{effectiveExistingUser.teamName}</span>
                </div>
                <p className="text-emerald-400 font-medium">
                  Your team is entered in the Moonshot Challenge!
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  The challenge begins January 15, 2026
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <p className="text-blue-400 font-medium text-sm">
                  You already have an AI Rocket account - no invite code needed!
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Simply log in with your existing credentials to continue.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-bold text-white mb-4 flex items-center gap-3 text-xl">
                  <Mail className="w-6 h-6 text-orange-400" />
                  What happens next?
                </h3>
                <ul className="space-y-3 text-gray-200 text-base">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-semibold text-lg">1.</span>
                    Log in to AI Rocket with your existing account
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-semibold text-lg">2.</span>
                    We'll send challenge updates to your email
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-semibold text-lg">3.</span>
                    On January 15, the 90-day challenge officially begins
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-semibold text-lg">4.</span>
                    Compete for the $5M prize pool!
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/"
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all hover:scale-105 inline-flex items-center justify-center gap-2 text-base"
                >
                  Log In to AI Rocket
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/moonshot"
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors inline-flex items-center justify-center gap-2 text-base"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Challenge Details
                </Link>
              </div>
            </div>
          );
        }

        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-6">Registration Complete!</h2>

            <div className="bg-gray-800/80 border-2 border-orange-500 rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-400 mb-2">Your Unique Launch Code</p>
              <div className="flex items-center justify-center gap-3 mb-3">
                <code className="text-2xl md:text-3xl font-mono font-bold text-orange-400 tracking-wider">
                  {inviteCode}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-400 text-sm font-medium">
                Valid starting January 15, 2026
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-bold text-white mb-4 flex items-center gap-3 text-xl">
                <Mail className="w-6 h-6 text-orange-400" />
                What happens next?
              </h3>
              <ul className="space-y-3 text-gray-200 text-base">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold text-lg">1.</span>
                  Check your email for a confirmation with your launch code
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold text-lg">2.</span>
                  We'll send you updates leading up to launch day
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold text-lg">3.</span>
                  On January 15, 2026, use your code to create your account
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-semibold text-lg">4.</span>
                  Be one of the first 300 teams to launch and enter!
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/moonshot"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors inline-flex items-center justify-center gap-2 text-base"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Challenge Details
              </Link>
              <a
                href="https://www.airocket.app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-emerald-500 hover:from-orange-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all hover:scale-105 inline-flex items-center justify-center gap-2 text-base"
              >
                Proceed to AI Rocket
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-[Outfit,sans-serif]" style={{ background: '#0A0F1C', color: '#F9FAFB' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {currentStep !== 'welcome' && currentStep !== 'success' && <CompactHeader />}

        <main className="flex-1 flex items-center justify-center px-4 py-4">
          <div className="w-full max-w-4xl">
            {renderStepContent()}
          </div>
        </main>

        {currentStep !== 'success' && (
          <footer className="px-4 py-4 border-t border-white/10">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              {currentStep !== 'welcome' ? (
                <button
                  onClick={handleBack}
                  className="px-5 py-3 text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 text-base"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
              ) : (
                <Link
                  to="/moonshot"
                  className="px-5 py-3 text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 text-base"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Challenge Details
                </Link>
              )}

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              {currentStep === 'q6' ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 inline-flex items-center gap-2 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 inline-flex items-center gap-2 text-base"
                >
                  {currentStep === 'welcome' ? 'Get Started' : 'Continue'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
