import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Building2, ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LegalDocumentModal } from '../LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../data/legalDocuments';

interface WorkshopAuthProps {
  workshopCode?: string;
  onComplete: (
    userId: string,
    registrationId: string,
    teamId: string,
    teamName: string,
    userName: string,
    userEmail: string
  ) => void;
}

type AuthStep = 'email' | 'login' | 'register' | 'existing_user_code';

export const WorkshopAuth: React.FC<WorkshopAuthProps> = ({ workshopCode: initialCode, onComplete }) => {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [workshopCode, setWorkshopCode] = useState(initialCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    id: string;
    email: string;
    teamId: string;
    teamName: string;
    fullName: string;
  } | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (error) {
        console.error('Error checking user:', error);
        return false;
      }

      return users && users.length > 0;
    } catch (err) {
      console.error('Error checking user:', err);
      return false;
    }
  };

  useEffect(() => {
    const validateCode = async () => {
      if (workshopCode.length >= 6) {
        const { data, error } = await supabase.rpc('validate_workshop_code', {
          p_code: workshopCode.toUpperCase()
        });

        if (!error && data && data[0]?.is_valid) {
          setCodeValidated(true);
          if (error && error.includes('Invalid workshop code')) {
            setError('');
          }
        } else {
          setCodeValidated(false);
        }
      } else {
        setCodeValidated(false);
      }
    };

    validateCode();
  }, [workshopCode]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const userExists = await checkUserExists(email.trim().toLowerCase());

      if (userExists) {
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;

      if (data.user) {
        const { data: registration } = await supabase
          .from('workshop_registrations')
          .select('id, team_name')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (registration) {
          const teamId = data.user.user_metadata?.team_id || '';
          onComplete(
            data.user.id,
            registration.id,
            teamId,
            registration.team_name || '',
            data.user.user_metadata?.full_name || '',
            data.user.email || ''
          );
        } else {
          const { data: teamData } = await supabase
            .from('teams')
            .select('id, name')
            .eq('id', data.user.user_metadata?.team_id)
            .maybeSingle();

          setExistingUser({
            id: data.user.id,
            email: data.user.email || '',
            teamId: data.user.user_metadata?.team_id || '',
            teamName: teamData?.name || '',
            fullName: data.user.user_metadata?.full_name || ''
          });
          setStep('existing_user_code');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password || !confirmPassword || !fullName || !teamName || !workshopCode) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      if (!acceptedTerms) {
        setError('You must accept the Privacy Policy and Terms of Service');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const { data: codeValidation, error: codeError } = await supabase.rpc('validate_workshop_code', {
        p_code: workshopCode.toUpperCase()
      });

      if (codeError || !codeValidation?.[0]?.is_valid) {
        setError(codeValidation?.[0]?.error_message || 'Invalid workshop code');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            workshop_user: true,
            workshop_code: workshopCode.toUpperCase(),
            pending_team_setup: true
          }
        }
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('User created but no user data returned');
      }

      const { data: teamResult, error: teamError } = await supabase.rpc('setup_workshop_team', {
        p_user_id: data.user.id,
        p_email: email.trim().toLowerCase(),
        p_team_name: teamName,
        p_full_name: fullName
      });

      if (teamError || !teamResult?.success) {
        console.error('Team creation error:', teamError || teamResult?.error);
        throw new Error(teamResult?.error || 'Failed to create team');
      }

      const teamId = teamResult.team_id;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          team_id: teamId,
          role: 'admin',
          pending_team_setup: false
        }
      });

      if (metadataError) {
        console.error('Metadata update error:', metadataError);
      }

      await supabase.rpc('increment_workshop_code_usage', {
        p_code: workshopCode.toUpperCase()
      });

      const accessExpiresAt = new Date();
      accessExpiresAt.setDate(accessExpiresAt.getDate() + 5);

      const { error: regError } = await supabase
        .from('workshop_registrations')
        .insert({
          user_id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName,
          team_name: teamName,
          registration_code: workshopCode.toUpperCase(),
          status: 'registered',
          current_step: 'onboarding',
          access_expires_at: accessExpiresAt.toISOString()
        });

      if (regError) {
        console.error('Registration error:', regError);
      }

      try {
        const userAgent = navigator.userAgent;
        await supabase.from('legal_acceptance').insert([
          {
            user_id: data.user.id,
            document_type: 'privacy_policy',
            version: PRIVACY_POLICY.lastUpdated,
            user_agent: userAgent
          },
          {
            user_id: data.user.id,
            document_type: 'terms_of_service',
            version: TERMS_OF_SERVICE.lastUpdated,
            user_agent: userAgent
          }
        ]);
      } catch (legalError) {
        console.error('Failed to record legal acceptance:', legalError);
      }

      const { data: reg } = await supabase
        .from('workshop_registrations')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      onComplete(
        data.user.id,
        reg?.id || '',
        teamId,
        teamName,
        fullName,
        email.trim().toLowerCase()
      );
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUserCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!workshopCode) {
        setError('Workshop code is required');
        setLoading(false);
        return;
      }

      if (!existingUser) {
        setError('Session expired. Please log in again.');
        setStep('email');
        setLoading(false);
        return;
      }

      const { data: codeValidation, error: codeError } = await supabase.rpc('validate_workshop_code', {
        p_code: workshopCode.toUpperCase()
      });

      if (codeError || !codeValidation?.[0]?.is_valid) {
        setError(codeValidation?.[0]?.error_message || 'Invalid workshop code');
        setLoading(false);
        return;
      }

      await supabase.rpc('increment_workshop_code_usage', {
        p_code: workshopCode.toUpperCase()
      });

      const accessExpiresAt = new Date();
      accessExpiresAt.setDate(accessExpiresAt.getDate() + 5);

      const { error: regError } = await supabase
        .from('workshop_registrations')
        .insert({
          user_id: existingUser.id,
          email: existingUser.email.toLowerCase(),
          full_name: existingUser.fullName,
          team_name: existingUser.teamName,
          registration_code: workshopCode.toUpperCase(),
          status: 'registered',
          current_step: 'onboarding',
          access_expires_at: accessExpiresAt.toISOString()
        });

      if (regError) {
        console.error('Registration error:', regError);
        throw new Error('Failed to create workshop registration');
      }

      const { data: reg } = await supabase
        .from('workshop_registrations')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      onComplete(
        existingUser.id,
        reg?.id || '',
        existingUser.teamId,
        existingUser.teamName,
        existingUser.fullName,
        existingUser.email
      );
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register for workshop');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setExistingUser(null);
  };

  if (step === 'email') {
    return (
      <>
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">AI-preneur Workshop</h1>
            <div className="flex items-center justify-center gap-2">
              <img src="/gobundance-mark-white.png" alt="Gobundance" className="h-6 w-auto" />
              <p className="text-gray-400">Gobundance 2026 Breckenridge Mastermind</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="w-full pl-10 pr-14 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none disabled:opacity-50"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-sm text-gray-400">
                  Login or Create Workshop Account
                </p>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="bg-gradient-to-r from-cyan-900/30 to-teal-900/30 border border-cyan-700/30 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">What you'll experience:</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">1.</span>
                    AI-guided mindset transformation journey
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">2.</span>
                    Identify your 3 "impossible" goals
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">3.</span>
                    AI-powered strategic planning tools
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            Powered by AI Rocket + Astra Intelligence
          </p>
        </div>
      </>
    );
  }

  if (step === 'login') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 text-sm mt-1">Continue your AI-preneur journey</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
          <button
            onClick={handleBack}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Change email
          </button>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging In...
                </>
              ) : (
                'Continue to Workshop'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'existing_user_code') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join the Workshop</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your workshop code to continue</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
          <button
            onClick={handleBack}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Start over
          </button>

          {existingUser && (
            <div className="mb-4 bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="font-medium text-white">{existingUser.email}</p>
              {existingUser.teamName && (
                <p className="text-sm text-gray-400 mt-1">Team: {existingUser.teamName}</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleExistingUserCodeSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Workshop Code</label>
              <input
                type="text"
                value={workshopCode}
                onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
                placeholder="Enter your workshop code"
                disabled={loading}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:outline-none uppercase ${
                  codeValidated ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' : 'border-gray-600 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
                required
              />
              {codeValidated && (
                <p className="text-green-400 text-xs mt-1">Valid workshop code</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !codeValidated}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining Workshop...
                </>
              ) : (
                'Join Workshop'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gradient-to-r from-cyan-900/30 to-teal-900/30 border border-cyan-700/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">What you'll experience:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">1.</span>
                  AI-guided mindset transformation journey
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">2.</span>
                  Identify your 3 "impossible" goals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">3.</span>
                  AI-powered strategic planning tools
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <LegalDocumentModal
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
        document={PRIVACY_POLICY}
      />
      <LegalDocumentModal
        isOpen={showTermsOfService}
        onClose={() => setShowTermsOfService(false)}
        document={TERMS_OF_SERVICE}
      />

      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Workshop Account</h1>
          <p className="text-gray-400 text-sm mt-1">Begin your AI-preneur transformation</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
          <button
            onClick={handleBack}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Change email
          </button>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Team / Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Acme Inc"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Workshop Code</label>
              <input
                type="text"
                value={workshopCode}
                onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
                placeholder="Enter your workshop code"
                disabled={loading}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:outline-none uppercase ${
                  codeValidated ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' : 'border-gray-600 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
                required
              />
              {codeValidated && (
                <p className="text-green-400 text-xs mt-1">Valid workshop code</p>
              )}
            </div>

            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  required
                />
                <span className="text-sm text-gray-300">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyPolicy(true)}
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Privacy Policy
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsOfService(true)}
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Terms of Service
                  </button>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !codeValidated}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Start Workshop'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
