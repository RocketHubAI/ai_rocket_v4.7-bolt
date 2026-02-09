import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Key, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PasswordResetModal } from './PasswordResetModal';
import { LegalDocumentModal } from './LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../data/legalDocuments';

type AuthStep = 'email' | 'signup' | 'login' | 'preview-confirmation';

export const CustomAuth: React.FC = () => {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isNewTeam, setIsNewTeam] = useState(false);
  const [invitedTeamName, setInvitedTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [moonshotNotYetValid, setMoonshotNotYetValid] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-preflight-check`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check-email', email: email.toLowerCase() }),
      });
      const result = await response.json();
      return result.exists === true;
    } catch (err) {
      console.error('Error checking user:', err);
      return false;
    }
  };

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
      console.log('[Auth] User exists check:', { email: email.trim().toLowerCase(), userExists });

      if (userExists) {
        console.log('[Auth] User exists, going to login');
        setStep('login');
        setInvitedTeamName(null);
      } else {
        console.log('[Auth] User does not exist, checking for team invite...');
        const { data: inviteData, error: inviteError } = await supabase
          .from('invite_codes')
          .select('team_id')
          .eq('invited_email', email.trim().toLowerCase())
          .eq('is_active', true)
          .not('team_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[Auth] Invite check result:', { inviteData, inviteError });

        if (inviteData?.team_id) {
          try {
            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-preflight-check`;
            const teamResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'lookup-team-name', teamId: inviteData.team_id }),
            });
            const teamResult = await teamResponse.json();
            console.log('[Auth] Team lookup result:', teamResult);

            if (teamResult?.name) {
              console.log('[Auth] Found team invite:', teamResult.name);
              setInvitedTeamName(teamResult.name);
            } else {
              setInvitedTeamName(null);
            }
          } catch {
            setInvitedTeamName(null);
          }
        } else {
          console.log('[Auth] No team invite found');
          setInvitedTeamName(null);
        }

        setStep('signup');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateInviteCode = async (code: string, email: string): Promise<{ valid: boolean; inviteData?: any; isMoonshotCode?: boolean }> => {
    try {
      const upperCode = code.toUpperCase();

      if (upperCode.startsWith('MOON-')) {
        const { data: validation, error: validationError } = await supabase
          .rpc('validate_moonshot_invite_code', { invite_code: upperCode });

        if (validationError) {
          console.error('Error validating moonshot code:', validationError);
          setError('Failed to validate launch code');
          return { valid: false };
        }

        const result = validation?.[0];
        if (!result?.is_valid) {
          setError(result?.error_message || 'Invalid launch code');
          return { valid: false };
        }

        setIsNewTeam(true);
        return {
          valid: true,
          inviteData: {
            code: upperCode,
            registration_id: result.registration_id,
            registrant_email: result.registrant_email,
            is_moonshot: true
          },
          isMoonshotCode: true
        };
      }

      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', upperCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error validating invite code:', error);
        return { valid: false };
      }

      if (!data) {
        setError('Invalid launch code');
        return { valid: false };
      }

      if (data.invited_email && data.invited_email.toLowerCase() !== email.toLowerCase()) {
        setError('This launch code is for a different email address');
        return { valid: false };
      }

      if (data.current_uses >= data.max_uses) {
        setError('This launch code has reached its maximum uses');
        return { valid: false };
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This launch code has expired');
        return { valid: false };
      }

      setIsNewTeam(!data.team_id);

      return { valid: true, inviteData: data };
    } catch (err) {
      console.error('Error validating invite code:', err);
      setError('Failed to validate launch code');
      return { valid: false };
    }
  };

  React.useEffect(() => {
    const checkInviteEmailMatch = async () => {
      if (inviteCode && email && inviteCode.length >= 6) {
        const upperCode = inviteCode.toUpperCase();

        if (upperCode.startsWith('MOON-')) {
          setInvitedTeamName(null);
          if (error && error.includes('Email does not match')) {
            setError('');
          }

          const { data: validation } = await supabase
            .rpc('validate_moonshot_invite_code', { invite_code: upperCode });

          const result = validation?.[0];
          if (result?.is_valid) {
            setIsNewTeam(true);
            setMoonshotNotYetValid(false);
          } else if (result?.error_message?.includes('not yet valid')) {
            setIsNewTeam(true);
            setMoonshotNotYetValid(true);
          } else {
            setIsNewTeam(false);
            setMoonshotNotYetValid(false);
          }
          return;
        }

        const { data } = await supabase
          .from('invite_codes')
          .select('invited_email, team_id')
          .eq('code', upperCode)
          .maybeSingle();

        if (data?.invited_email && data.invited_email.toLowerCase() !== email.toLowerCase()) {
          setError('Email does not match the invited email for this code');
        } else if (error && error.includes('Email does not match')) {
          setError('');
        }

        if (data) {
          setIsNewTeam(!data.team_id);
        }
      }
    };

    checkInviteEmailMatch();
  }, [inviteCode, email]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !confirmEmail || !password || !confirmPassword || !inviteCode) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      if (!acceptedTerms) {
        setError('You must accept the Privacy Policy and Terms of Service to create an account');
        setLoading(false);
        return;
      }

      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setError('Email addresses do not match');
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

      const { valid, inviteData, isMoonshotCode } = await validateInviteCode(inviteCode, email);
      if (!valid || !inviteData) {
        setLoading(false);
        return;
      }

      const isCreatingNewTeam = isMoonshotCode || !inviteData.team_id;

      console.log('Attempting signup for:', email);

      // Step 1: Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            invite_code: inviteCode.toUpperCase(),
            is_new_team: isCreatingNewTeam,
            pending_team_setup: isCreatingNewTeam // Flag that team name is needed
          }
        }
      });

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('User created but no user data returned');
      }

      console.log('Auth user created successfully:', data.user.id);

      // Step 2: For existing team joins, the trigger has already assigned the team
      // We just need to wait a moment for the trigger to complete and then verify
      if (!isCreatingNewTeam) {
        console.log('Joining existing team - trigger should have assigned team');

        // Wait a moment for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify the user was assigned to the team
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (userError || !userData?.team_id) {
          console.error('Team assignment failed:', userError);
          throw new Error('Failed to assign team. Please try again.');
        }

        console.log('User successfully assigned to team:', userData.team_id);

        // Update auth metadata to include team_id so App.tsx knows user is onboarded
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            team_id: userData.team_id,
            pending_team_setup: false
          }
        });

        if (metadataError) {
          console.error('Failed to update auth metadata:', metadataError);
          // Don't throw - user is still setup, just log the error
        } else {
          // Force refresh the session to get updated metadata
          console.log('Refreshing session to get updated metadata');
          await supabase.auth.refreshSession();
        }
      } else {
        console.log('New team signup - will complete setup during onboarding');
      }

      if (isMoonshotCode) {
        console.log('Redeeming moonshot invite code...');
        const { error: redeemError } = await supabase
          .rpc('redeem_moonshot_invite_code', {
            invite_code: inviteCode.toUpperCase(),
            user_id: data.user.id
          });

        if (redeemError) {
          console.error('Failed to redeem moonshot code:', redeemError);
        } else {
          console.log('Moonshot invite code redeemed successfully');
        }
      }

      // Record legal acceptance for both Privacy Policy and Terms of Service
      try {
        const userAgent = navigator.userAgent;
        // Note: We can't get the real IP address from client-side, so we'll record null

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

        console.log('Legal acceptance recorded successfully');
      } catch (legalError) {
        console.error('Failed to record legal acceptance:', legalError);
        // Don't block signup if legal recording fails, but log it
      }
    } catch (err: any) {
      console.error('Signup error details:', {
        message: err.message,
        status: err.status,
        details: err.details,
        hint: err.hint,
        code: err.code
      });

      // Show the actual error message from the database
      let errorMessage = err.message || 'Failed to create account';

      // If it's a database error with more details, include them
      if (err.details) {
        errorMessage += ` (${err.details})`;
      }
      if (err.hint) {
        errorMessage += ` Hint: ${err.hint}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewRequest = async () => {
    setError('');

    // Validate both email fields are filled and match BEFORE setting loading state
    if (!email || !confirmEmail) {
      setError('Please enter your email in both fields before requesting preview access');
      // Scroll to error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      setError('Email addresses do not match');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPreviewLoading(true);

    try {
      // Submit preview request to database
      const { error: insertError } = await supabase
        .from('preview_requests')
        .insert({
          email: email.toLowerCase()
        });

      if (insertError) {
        console.error('Error submitting preview request:', insertError);
        setError('Failed to submit preview request. Please try again.');
        setPreviewLoading(false);
        return;
      }

      // Show confirmation screen
      setStep('preview-confirmation');
    } catch (err: any) {
      console.error('Preview request error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setPreviewLoading(false);
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

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setInviteCode('');
  };

  // Preview Confirmation Screen
  if (step === 'preview-confirmation') {
    return (
      <div className="w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-400 shadow-lg">
            <span className="text-6xl">✓</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-3 flex-wrap">
            <span className="text-emerald-400">Preview Access Requested</span>
          </h1>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-6">
            <p className="text-white text-lg mb-4 text-center">
              You have signed up for Free Preview Access!
            </p>
            <p className="text-gray-300 text-sm text-center leading-relaxed">
              We estimate invitations being sent out in early December from{' '}
              <span className="text-blue-400 font-medium">Invite@RocketHub.ai</span>.
              We look forward to you joining then!
            </p>
          </div>

          <button
            onClick={() => {
              setStep('email');
              setEmail('');
              setConfirmEmail('');
              setError('');
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Email Entry
  if (step === 'email') {
    return (
      <div className="w-full">
        <div className="text-center mb-6 px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold flex items-center justify-center gap-2 lg:gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-cyan-400 shadow-lg flex-shrink-0">
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">🚀</span>
            </div>
            <span className="text-cyan-400 whitespace-nowrap">AI Rocket</span>
          </h1>
          <p className="text-base md:text-lg text-gray-400 mt-4">
            AI for Entrepreneurs and their Teams
          </p>
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
                  className="w-full pl-10 pr-14 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-center text-sm text-gray-400">
                Login or Create Free Account
              </p>
            </div>
          </form>

          {/* Powered By Section */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-400 text-xs mb-3">Powered by</p>
            <div className="flex justify-center items-center gap-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 mb-1 flex items-center justify-center">
                  <img
                    src="/claude_logo.png"
                    alt="Claude"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <p className="text-white text-xs font-medium">Claude</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 mb-1 flex items-center justify-center">
                  <img
                    src="/gemini_app_logo.jpeg"
                    alt="Gemini"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <p className="text-white text-xs font-medium">Gemini</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 mb-1 flex items-center justify-center">
                  <img
                    src="/gpt_app_logo.png"
                    alt="OpenAI"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <p className="text-white text-xs font-medium">OpenAI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Moonshot Challenge Promotional Box */}
        <Link
          to="/moonshot"
          className="mt-4 block relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(245, 158, 11, 0.1) 50%, rgba(16, 185, 129, 0.1) 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col items-center text-center gap-3">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-emerald-500 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white">
              Registration Open Now | Challenge Starts Jan 15
            </div>
            <h3 className="text-2xl sm:text-3xl font-black">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">$5M AI Moonshot Challenge</span>
            </h3>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 text-sm">Transform your Team to AI-Powered</span>
              <span className="text-gray-400 text-xs">Free & Unlimited Access to the Most Powerful AI-Suite for Work</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Step 2: Sign Up or Login
  return (
    <>
      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        defaultEmail={email}
      />

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

      <div className="w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-400 shadow-lg">
            <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-3">
            <span className="text-cyan-400">AI Rocket</span>
          </h1>
          <p className="text-base md:text-lg text-gray-400 mt-3 whitespace-nowrap">
            AI for Entrepreneurs and their Teams
          </p>
        </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            {step === 'signup' ? (invitedTeamName ? 'Join Team' : 'Create Free Account') : 'Welcome Back'}
          </h2>
          <button
            onClick={handleBack}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Change email
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {invitedTeamName && step === 'signup' && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <p className="text-emerald-400 text-sm">
              You have been invited to join the "<span className="font-semibold">{invitedTeamName}</span>" team on AI Rocket. Complete the info below to create your account.
            </p>
          </div>
        )}

        <form onSubmit={step === 'signup' ? handleSignUp : handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {step === 'signup' && (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirm Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Confirm your email"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={step === 'signup' ? 'Choose a password (min 8 characters)' : 'Your password'}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>
            {step === 'login' && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {step === 'signup' && (
            <>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Launch Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter your launch code"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                    required
                  />
                </div>
              </div>

              {isNewTeam && moonshotNotYetValid && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-amber-400 text-sm">
                    Your Moonshot Challenge code will be valid starting January 15, 2026. Please return to create your account then.
                  </p>
                </div>
              )}

              {isNewTeam && !moonshotNotYetValid && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    <strong>New Team Signup</strong> - You'll set your team name in the next step
                  </p>
                </div>
              )}

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    required
                  />
                  <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyPolicy(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      Privacy Policy
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsOfService(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      Terms of Service
                    </button>
                  </span>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || (step === 'signup' && moonshotNotYetValid)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 mt-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{step === 'signup' ? 'Creating Account...' : 'Logging In...'}</span>
              </>
            ) : (
              <span>{step === 'signup' ? 'Create Account' : 'Log In'}</span>
            )}
          </button>
        </form>

        {step === 'signup' && (
          <Link
            to="/moonshot"
            className="mt-6 block relative overflow-hidden rounded-lg p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(245, 158, 11, 0.08) 50%, rgba(16, 185, 129, 0.08) 100%)' }}
          >
            <p className="text-orange-400 text-sm font-medium mb-2">No Launch Code? Early Access available through the $5M AI Moonshot Challenge</p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• Registration now open for the first 300 teams</li>
              <li>• Transform your Team to AI-Powered</li>
              <li>• Free & Unlimited Access to the Most Powerful AI-Suite for Work</li>
            </ul>
          </Link>
        )}
      </div>
    </div>
    </>
  );
};
