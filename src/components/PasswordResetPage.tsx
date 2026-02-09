import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken) {
        try {
          // Exchange the recovery token for a session
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: accessToken,
            type: 'recovery'
          });

          if (error || !data.session) {
            console.error('Token verification error:', error);
            await supabase.auth.signOut();
            setTokenValid(false);
            setError('Invalid or expired password reset link');
          } else {
            // Token is valid and session is established
            setTokenValid(true);
          }
        } catch (err) {
          console.error('Error verifying token:', err);
          await supabase.auth.signOut();
          setTokenValid(false);
          setError('Invalid or expired password reset link');
        }
      } else {
        // No recovery token, sign out any existing session
        await supabase.auth.signOut();
        setTokenValid(false);
        setError('Invalid or expired password reset link');
      }
    };

    checkToken();
  }, []);

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 6) return { strength: 'Weak', color: 'text-red-400' };
    if (password.length < 10) return { strength: 'Medium', color: 'text-yellow-400' };
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 'Strong', color: 'text-emerald-400' };
    }
    return { strength: 'Medium', color: 'text-yellow-400' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!password || !confirmPassword) {
        setError('Both password fields are required');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Sign out after successful password update to ensure user logs in with new password
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-500 shadow-lg">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              This password reset link is invalid or has expired. Reset links expire after 1 hour.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-400 shadow-lg">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Updated</h1>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
              <p className="text-emerald-400 text-sm">
                Your password has been successfully updated!
              </p>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Redirecting you to the login page in 3 seconds...
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-blue-400 shadow-lg">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-gray-400 text-sm">Enter your new password below</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <p className={`mt-1 text-xs ${passwordStrength.color}`}>
                  Password strength: {passwordStrength.strength}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-xs text-emerald-400">Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
