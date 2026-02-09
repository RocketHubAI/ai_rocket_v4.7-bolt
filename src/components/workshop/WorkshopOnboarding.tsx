import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WorkshopOnboardingProps {
  userId: string;
  registrationId: string;
  onComplete: () => void;
  onLogout?: () => void;
}

interface FormData {
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

type OnboardingStep = 'industry' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6';

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

export const WorkshopOnboarding: React.FC<WorkshopOnboardingProps> = ({
  userId,
  registrationId,
  onComplete,
  onLogout
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('industry');
  const [formData, setFormData] = useState<FormData>({
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: OnboardingStep[] = ['industry', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

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
      const finalMastermindGroups = formData.mastermindGroups.includes('Other') && formData.customMastermindGroup
        ? [...formData.mastermindGroups.filter(g => g !== 'Other'), formData.customMastermindGroup]
        : formData.mastermindGroups;

      const { error: surveyError } = await supabase
        .from('workshop_survey_responses')
        .insert({
          registration_id: registrationId,
          user_id: userId,
          current_ai_usage: formData.currentAiUsage,
          ai_use_cases: finalUseCases,
          monthly_ai_spend: formData.monthlyAiSpend,
          connected_data: formData.connectedData.join('; '),
          biggest_pain_points: formData.painPoints.join('; '),
          mastermind_groups: finalMastermindGroups
        });

      if (surveyError) throw surveyError;

      await supabase
        .from('workshop_registrations')
        .update({
          industry: finalIndustry,
          current_step: 'journey',
          status: 'in_progress'
        })
        .eq('id', registrationId);

      onComplete();
    } catch (err) {
      console.error('Error saving survey:', err);
      setError('Failed to save your responses. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        return { ...prev, mastermindGroups: ['None'], customMastermindGroup: '' };
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
      case 'industry':
        return formData.industry !== '' && (formData.industry !== 'Other' || formData.customIndustry.trim() !== '');
      case 'q1':
        return formData.currentAiUsage !== '';
      case 'q2':
        return formData.aiUseCases.length > 0 && (!formData.aiUseCases.includes('Other') || formData.customUseCase.trim() !== '');
      case 'q3':
        return formData.monthlyAiSpend !== '';
      case 'q4':
        return formData.connectedData.length > 0;
      case 'q5':
        return formData.painPoints.length > 0;
      case 'q6':
        return formData.mastermindGroups.length > 0 && (!formData.mastermindGroups.includes('Other') || formData.customMastermindGroup.trim() !== '');
      default:
        return true;
    }
  };

  const getStepNumber = () => steps.indexOf(currentStep) + 1;
  const getTotalSteps = () => steps.length;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'industry':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">What industry are you in?</h2>
              <p className="text-gray-400">This helps us personalize your experience</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry}
                  onClick={() => setFormData(prev => ({ ...prev, industry, customIndustry: '' }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.industry === industry
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <span className="font-medium text-white text-sm">{industry}</span>
                  {formData.industry === industry && <Check className="w-4 h-4 text-cyan-400 inline ml-2" />}
                </button>
              ))}
            </div>
            {formData.industry === 'Other' && (
              <input
                type="text"
                value={formData.customIndustry}
                onChange={e => setFormData(prev => ({ ...prev, customIndustry: e.target.value }))}
                placeholder="Please specify your industry"
                className="w-full mt-3 px-4 py-3 bg-gray-800 border border-cyan-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            )}
          </div>
        );

      case 'q1':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-3">
                Question 1 of 6
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">How are you currently using AI?</h2>
              <p className="text-gray-400">Select the option that best describes your team's AI adoption</p>
            </div>
            <div className="space-y-2.5">
              {AI_USAGE_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData(prev => ({ ...prev, currentAiUsage: level.value }))}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    formData.currentAiUsage === level.value
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{level.label}</div>
                      <div className="text-sm text-gray-400">{level.desc}</div>
                    </div>
                    {formData.currentAiUsage === level.value && <Check className="w-5 h-5 text-cyan-400" />}
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-3">
                Question 2 of 6
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">What do you use AI for?</h2>
              <p className="text-gray-400">Select all that apply</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {AI_USE_CASES.map(useCase => (
                <button
                  key={useCase}
                  onClick={() => toggleUseCase(useCase)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.aiUseCases.includes(useCase)
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-sm">{useCase}</span>
                    {formData.aiUseCases.includes(useCase) && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 ml-2" />}
                  </div>
                </button>
              ))}
            </div>
            {formData.aiUseCases.includes('Other') && (
              <input
                type="text"
                value={formData.customUseCase}
                onChange={e => setFormData(prev => ({ ...prev, customUseCase: e.target.value }))}
                placeholder="Please specify your use case"
                className="w-full mt-3 px-4 py-3 bg-gray-800 border border-cyan-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            )}
          </div>
        );

      case 'q3':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-3">
                Question 3 of 6
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">What's your monthly AI spend?</h2>
              <p className="text-gray-400">Approximate total across all AI tools and services</p>
            </div>
            <div className="space-y-2.5">
              {MONTHLY_SPEND_RANGES.map(range => (
                <button
                  key={range.value}
                  onClick={() => setFormData(prev => ({ ...prev, monthlyAiSpend: range.value }))}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    formData.monthlyAiSpend === range.value
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{range.label}</div>
                      <div className="text-sm text-gray-400">{range.desc}</div>
                    </div>
                    {formData.monthlyAiSpend === range.value && <Check className="w-5 h-5 text-cyan-400" />}
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-3">
                Question 4 of 6
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">What data do you connect to AI?</h2>
              <p className="text-gray-400">Select all that apply</p>
            </div>
            <div className="space-y-2.5">
              {CONNECTED_DATA_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleConnectedData(option.value)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    formData.connectedData.includes(option.value)
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{option.label}</div>
                      <div className="text-sm text-gray-400">{option.desc}</div>
                    </div>
                    {formData.connectedData.includes(option.value) && <Check className="w-5 h-5 text-cyan-400" />}
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-3">
                Question 5 of 6
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">What are your biggest AI pain points?</h2>
              <p className="text-gray-400">Select all that apply</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PAIN_POINTS.map(painPoint => (
                <button
                  key={painPoint}
                  onClick={() => togglePainPoint(painPoint)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.painPoints.includes(painPoint)
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-sm">{painPoint}</span>
                    {formData.painPoints.includes(painPoint) && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 ml-2" />}
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-3">
                Question 6 of 6
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Are you a member of any business or mastermind groups?</h2>
              <p className="text-gray-400">Select all that apply</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {MASTERMIND_GROUPS.map(group => (
                <button
                  key={group}
                  onClick={() => toggleMastermindGroup(group)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.mastermindGroups.includes(group)
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{group}</span>
                    {formData.mastermindGroups.includes(group) && <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 ml-2" />}
                  </div>
                </button>
              ))}
            </div>
            {formData.mastermindGroups.includes('Other') && (
              <input
                type="text"
                placeholder="Please specify the group name..."
                value={formData.customMastermindGroup}
                onChange={(e) => setFormData(prev => ({ ...prev, customMastermindGroup: e.target.value }))}
                className="w-full mt-4 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {onLogout && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center px-4 py-6 overflow-auto">
        <div className="w-full max-w-4xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Step {getStepNumber()} of {getTotalSteps()}</span>
              <span className="text-sm text-cyan-400 font-medium">Quick Survey</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getStepNumber() / getTotalSteps()) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            {renderStepContent()}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 'industry'}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep === 'q6' ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Begin AI Journey
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
