import React, { useState, useRef } from 'react';
import { X, User as UserIcon, Save, LogOut, Key, Camera, Trash2, Upload, Settings, Mail, Clock, HardDrive, Shield, FileText, Bell, Rocket, FolderOpen, Workflow, LayoutDashboard, Map, Bot, MessageSquare, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';

import { TeamMembersPanel } from './TeamMembersPanel';
import { TeamSettingsModal } from './TeamSettingsModal';
import { AccountDeletionSection } from './AccountDeletionSection';
import { DataExportSection } from './DataExportSection';
import { AssistantNotificationSettings } from './AssistantNotificationSettings';
import { FEATURES } from '../config/features';
import { HelpCenterTab } from './HelpCenter';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useAgentMode } from '../hooks/useAgentMode';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
  onOpenHelpCenter?: (tab?: HelpCenterTab) => void;
  onOpenMissionControl?: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose, onStartTour, onOpenHelpCenter, onOpenMissionControl }) => {
  const { user, refreshSession } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar, deleteAvatar } = useUserProfile();
  const hasNewMissionControl = useFeatureFlag('new_mission_control_page');
  const { isAgentModeAvailable, isAgentModeEnabled, toggleAgentMode } = useAgentMode();
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [needsSessionRefresh, setNeedsSessionRefresh] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [dbTeamId, setDbTeamId] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [teamNameError, setTeamNameError] = useState('');
  const [teamNameSuccess, setTeamNameSuccess] = useState('');
  const [savingReportEmails, setSavingReportEmails] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingConversation, setClearingConversation] = useState(false);

  const isAdmin = user?.user_metadata?.role === 'admin';
  const superAdminEmails = ['clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai'];
  const isSuperAdmin = user?.email && superAdminEmails.includes(user.email);
  const teamId = user?.user_metadata?.team_id;

  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
    }
  }, [profile]);

  React.useEffect(() => {
    if (teamId) {
      loadTeamName();
    }
  }, [teamId]);

  React.useEffect(() => {
    if (teamName) {
      setEditedTeamName(teamName);
    }
  }, [teamName]);

  React.useEffect(() => {
    checkSessionSync();
  }, [user?.id]);

  const checkSessionSync = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setDbTeamId(data.team_id);
        const sessionTeamId = user.user_metadata?.team_id;
        if (data.team_id !== sessionTeamId) {
          setNeedsSessionRefresh(true);
        }
      }
    } catch (err) {
      console.error('Error checking session sync:', err);
    }
  };

  const handleRefreshSession = async () => {
    setRefreshingSession(true);
    try {
      await refreshSession();
      setNeedsSessionRefresh(false);
      window.location.reload();
    } catch (err) {
      console.error('Error refreshing session:', err);
    } finally {
      setRefreshingSession(false);
    }
  };

  const loadTeamName = async () => {
    if (!teamId && !dbTeamId) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId || dbTeamId)
        .maybeSingle();

      if (error) {
        console.error('Error loading team name:', error);
        return;
      }

      if (data) {
        setTeamName(data.name);
      }
    } catch (err) {
      console.error('Error loading team name:', err);
    }
  };

  if (!isOpen) return null;


  const handleSaveName = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setSavingName(true);
    setError('');

    const result = await updateProfile({ name: name.trim() });
    setSavingName(false);

    if (result.success) {
      setIsEditingName(false);
    } else {
      setError(result.error || 'Failed to update name');
    }
  };

  const handleCancelEdit = () => {
    setName(profile?.name || '');
    setIsEditingName(false);
    setError('');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setUploading(true);
    setError('');

    const result = await uploadAvatar(file);
    setUploading(false);

    if (!result.success) {
      setError(result.error || 'Failed to upload avatar');
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to delete your avatar?')) return;

    setUploading(true);
    const result = await deleteAvatar();
    setUploading(false);

    if (!result.success) {
      setError(result.error || 'Failed to delete avatar');
    }
  };

  const handleClearConversation = async () => {
    if (!user?.id || !teamId) return;
    setClearingConversation(true);
    try {
      await supabase
        .from('agent_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('team_id', teamId);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error clearing conversation:', err);
    } finally {
      setClearingConversation(false);
    }
  };

  const handleEmailChange = () => {
    if (!newEmail.trim()) {
      setEmailError('Email cannot be empty');
      return;
    }

    if (!newEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (newEmail === user?.email) {
      setEmailError('New email must be different from current email');
      return;
    }

    setShowEmailConfirmation(true);
  };

  const handleConfirmEmailChange = async () => {
    setChangingEmail(true);
    setEmailError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update email');
      }

      // Sign out the user
      await supabase.auth.signOut();
      onClose();
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email');
      setShowEmailConfirmation(false);
      setChangingEmail(false);
    }
  };

  const handleSaveTeamName = async () => {
    if (!editedTeamName.trim()) {
      setTeamNameError('Team name cannot be empty');
      return;
    }

    setSavingTeamName(true);
    setTeamNameError('');
    setTeamNameSuccess('');

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: editedTeamName.trim() })
        .eq('id', teamId || dbTeamId);

      if (error) throw error;

      setTeamName(editedTeamName.trim());
      setTeamNameSuccess('Team name updated successfully');
      setIsEditingTeamName(false);
    } catch (err: any) {
      setTeamNameError(err.message || 'Failed to update team name');
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setPasswordError('Both password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleReportEmails = async () => {
    if (!profile) return;

    setSavingReportEmails(true);
    const newValue = !profile.receive_report_emails;

    const result = await updateProfile({ receive_report_emails: newValue });
    setSavingReportEmails(false);

    if (!result.success) {
      setError(result.error || 'Failed to update email preferences');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">User Settings</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {needsSessionRefresh && (
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-blue-300 font-medium text-sm mb-1">Session Update Required</p>
                  <p className="text-blue-200/80 text-xs">
                    Your account information has been updated. Please refresh your session to see the latest changes.
                  </p>
                </div>
                <button
                  onClick={handleRefreshSession}
                  disabled={refreshingSession}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors flex items-center space-x-2 flex-shrink-0"
                >
                  {refreshingSession ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Refreshing...</span>
                    </>
                  ) : (
                    <span>Refresh Now</span>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
            <div className="flex items-center space-x-3 mb-6">
              <UserIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Profile Information</h3>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 self-center sm:self-start">
                  <div className="relative group">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-12 h-12 text-white" />
                      </div>
                    )}

                    <button
                      onClick={handleAvatarClick}
                      disabled={uploading || loading}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploading || loading}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                    {profile?.avatar_url && (
                      <button
                        onClick={handleDeleteAvatar}
                        disabled={uploading || loading}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                    {isEditingName ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveName}
                            disabled={savingName}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            {savingName ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingName}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-white">{profile?.name || 'Not set'}</p>
                        <button
                          onClick={() => setIsEditingName(true)}
                          disabled={loading}
                          className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Email</label>
                    {isEditingEmail ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter new email address"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        />
                        {emailError && (
                          <p className="text-red-400 text-xs">{emailError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleEmailChange}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            <Save className="w-4 h-4" />
                            <span>Update Email</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingEmail(false);
                              setNewEmail('');
                              setEmailError('');
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-white">{user?.email}</p>
                        <button
                          onClick={() => {
                            setIsEditingEmail(true);
                            setNewEmail('');
                            setEmailError('');
                          }}
                          disabled={loading}
                          className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {teamName && (
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Team</label>
                      {isAdmin && isEditingTeamName ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editedTeamName}
                            onChange={(e) => setEditedTeamName(e.target.value)}
                            placeholder="Enter team name"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          />
                          {teamNameError && (
                            <p className="text-red-400 text-xs">{teamNameError}</p>
                          )}
                          {teamNameSuccess && (
                            <p className="text-green-400 text-xs">{teamNameSuccess}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveTeamName}
                              disabled={savingTeamName}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                            >
                              {savingTeamName ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingTeamName(false);
                                setEditedTeamName(teamName);
                                setTeamNameError('');
                                setTeamNameSuccess('');
                              }}
                              disabled={savingTeamName}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-white">{teamName}</p>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setIsEditingTeamName(true);
                                setTeamNameError('');
                                setTeamNameSuccess('');
                              }}
                              disabled={loading}
                              className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-600">
                    {!isChangingPassword ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => {
                            setIsChangingPassword(true);
                            setPasswordError('');
                            setPasswordSuccess('');
                          }}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
                        >
                          <Key className="w-4 h-4" />
                          <span>Change Password</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to log out?')) {
                              await supabase.auth.signOut();
                              onClose();
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {passwordSuccess && (
                          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
                            <p className="text-green-400 text-sm">{passwordSuccess}</p>
                          </div>
                        )}

                        {passwordError && (
                          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                            <p className="text-red-400 text-sm">{passwordError}</p>
                          </div>
                        )}

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password (min 6 characters)"
                            disabled={changingPassword}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            disabled={changingPassword}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleChangePassword}
                            disabled={changingPassword || !newPassword || !confirmPassword}
                            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                          >
                            {changingPassword ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>Update Password</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setIsChangingPassword(false);
                              setNewPassword('');
                              setConfirmPassword('');
                              setPasswordError('');
                              setPasswordSuccess('');
                            }}
                            disabled={changingPassword}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!hasNewMissionControl && (
            FEATURES.GOOGLE_DRIVE_SYNC_ENABLED ? (
              <>
                <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600" data-tour="google-drive-sync">
                  <div className="flex items-center space-x-3 mb-4">
                    <FolderOpen className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Folder Configuration</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Connect and configure your cloud storage folders for Strategy, Meetings, Financial, and Projects documents.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMissionControl?.();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 min-h-[44px]"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Open Mission Control</span>
                  </button>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
                  <div className="flex items-center space-x-3 mb-4">
                    <FileText className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Synced Documents</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    View and manage your synced documents, trigger manual syncs, and monitor your data fuel level.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMissionControl?.();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 min-h-[44px]"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Open Mission Control</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600" data-tour="google-drive-sync">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <HardDrive className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">Cloud Drive Sync</h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                      Coming Soon
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Connect your cloud storage (Google Drive or Microsoft OneDrive/SharePoint) to automatically sync and analyze your documents.
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>This feature is currently being enhanced and will be available soon.</span>
                </div>
              </div>
            )
          )}

          {!hasNewMissionControl && (
            <div data-tour="team-panel">
              {isAdmin && teamId && (
                <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Team Settings</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Configure meeting types and news preferences for your team.
                  </p>
                  <button
                    onClick={() => setShowTeamSettings(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage Team Settings</span>
                  </button>
                </div>
              )}

              {teamId && <TeamMembersPanel />}
            </div>
          )}

          {isAgentModeAvailable && (
            <div className="bg-gradient-to-r from-cyan-900/30 to-teal-900/30 rounded-lg p-6 border border-cyan-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Assistant Mode</h3>
                    <p className="text-sm text-gray-400">
                      {isAgentModeEnabled
                        ? 'AI assistant with split-screen interface'
                        : 'Try the new AI assistant experience'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleAgentMode}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    isAgentModeEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      isAgentModeEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {isAgentModeEnabled && (
                <p className="mt-3 text-xs text-cyan-300/70">
                  Assistant Mode is active. The app will use the split-screen AI assistant interface.
                  Toggle off to return to Classic Mode.
                </p>
              )}
            </div>
          )}


          {isSuperAdmin && onStartTour && (
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-6 border border-cyan-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Map className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Interactive Tour</h3>
                    <p className="text-sm text-gray-400">Test the guided tour experience</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onStartTour();
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center space-x-2 min-h-[44px]"
                >
                  <span>Take Tour</span>
                </button>
              </div>
            </div>
          )}

          {isSuperAdmin && hasNewMissionControl && (
            <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Super Admin Tools</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Access admin-only tools and dashboards.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/admin"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </a>
                <a
                  href="/build-agents"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  <Workflow className="w-4 h-4" />
                  <span>Build Agents</span>
                </a>
              </div>
            </div>
          )}

          <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Report Notifications</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div className="flex-1 pr-4">
                  <p className="text-white font-medium">Report Email Notifications</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Receive email summaries when your scheduled or manual reports are generated
                  </p>
                </div>
                <button
                  onClick={handleToggleReportEmails}
                  disabled={savingReportEmails || loading}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                    profile?.receive_report_emails ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      profile?.receive_report_emails ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {isAgentModeAvailable && (
          <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
            <div className="flex items-center space-x-3 mb-4">
              <Bot className="w-5 h-5 text-teal-400" />
              <h3 className="text-lg font-semibold text-white">Proactive Assistant Notifications</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Configure how Astra can proactively reach out to you with updates, insights, and reminders via multiple channels.
            </p>
            <AssistantNotificationSettings />
          </div>
          )}

          <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">Legal Information</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors min-h-[44px]"
              >
                <Shield className="w-4 h-4" />
                <span>Privacy Policy</span>
              </a>
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors min-h-[44px]"
              >
                <FileText className="w-4 h-4" />
                <span>Terms of Service</span>
              </a>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-white font-medium">Assistant Conversation</h3>
            </div>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear conversation history
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">Are you sure?</p>
                    <p className="text-xs text-gray-300">
                      This will permanently delete your entire assistant conversation history. Your assistant will need to re-learn your name, preferences, and priorities through a fresh onboarding. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <button
                    onClick={handleClearConversation}
                    disabled={clearingConversation}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    {clearingConversation ? 'Clearing...' : 'Yes, clear everything'}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <DataExportSection />

          <AccountDeletionSection onClose={onClose} />
        </div>
      </div>

      {isAdmin && teamId && (
        <TeamSettingsModal
          isOpen={showTeamSettings}
          onClose={() => setShowTeamSettings(false)}
          teamId={teamId}
          isOnboarding={false}
        />
      )}

      {showEmailConfirmation && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Confirm Email Change</h3>
              <p className="text-gray-300 text-center mb-4">
                You are about to change your email to:
              </p>
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-600">
                <p className="text-white font-semibold text-center break-all">{newEmail}</p>
              </div>
              <p className="text-gray-400 text-sm text-center mb-6">
                After confirming, you will be logged out and need to log back in with your new email address.
              </p>
              {emailError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm text-center">{emailError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailConfirmation(false);
                    setEmailError('');
                  }}
                  disabled={changingEmail}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEmailChange}
                  disabled={changingEmail}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {changingEmail ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>Confirm & Log Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
