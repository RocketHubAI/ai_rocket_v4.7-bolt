import React, { useState, useEffect } from 'react';
import { X, Rocket, Fuel, Zap, Compass, Trophy, Star, TrendingUp, Award, CheckCircle, Users, ChevronRight, HelpCircle, Info, FileText, Grid, RefreshCw } from 'lucide-react';
import { useLaunchPreparation } from '../hooks/useLaunchPreparation';
import { useFuelLevel } from '../hooks/useFuelLevel';
import { useDataSyncProgress } from '../hooks/useDataSyncProgress';
import { calculateStageProgress, formatPoints, FUEL_LEVELS, BOOSTERS_LEVELS, GUIDANCE_LEVELS } from '../lib/launch-preparation-utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { triggerSyncNow } from '../lib/manual-folder-sync';
import { DocumentsListModal } from './launch-stages/DocumentsListModal';
import { CategoriesDetailModal } from './launch-stages/CategoriesDetailModal';
import { GoogleDriveTroubleshootGuide } from './GoogleDriveTroubleshootGuide';

interface MissionControlProps {
  onClose: () => void;
  onNavigateToStage?: (stage: 'fuel' | 'boosters' | 'guidance') => void;
}

interface TeamMemberPoints {
  user_id: string;
  name: string;
  email: string;
  total_points: number;
  avatar_url: string | null;
}

interface UserPointsDetail {
  reason: string;
  reason_display: string;
  points: number;
  stage: string;
  created_at: string;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onClose, onNavigateToStage }) => {
  const { user } = useAuth();
  const { launchStatus, stageProgress, recentPoints, achievements, loading } = useLaunchPreparation();
  const { fuelData, loading: fuelLoading, refresh: refreshFuelLevel } = useFuelLevel();
  const { getSyncProgress, currentSession } = useDataSyncProgress();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'points-log'>('overview');
  const [teamPoints, setTeamPoints] = useState<number>(0);
  const [teamMembers, setTeamMembers] = useState<TeamMemberPoints[]>([]);
  const [loadingTeamData, setLoadingTeamData] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMemberPoints | null>(null);
  const [memberPointsDetail, setMemberPointsDetail] = useState<UserPointsDetail[]>([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [showHowToEarn, setShowHowToEarn] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [documentsFilterCategory, setDocumentsFilterCategory] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch team points and member data
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user) return;

      try {
        setLoadingTeamData(true);
        const teamId = user.user_metadata?.team_id;

        if (!teamId) {
          setLoadingTeamData(false);
          return;
        }

        // Fetch team total points
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('total_launch_points')
          .eq('id', teamId)
          .maybeSingle();

        if (teamError) throw teamError;
        setTeamPoints(teamData?.total_launch_points || 0);

        // Fetch team members' launch points
        const { data: membersData, error: membersError } = await supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            avatar_url
          `)
          .eq('team_id', teamId);

        if (membersError) throw membersError;

        // For each member, fetch their launch points
        const membersWithPoints: TeamMemberPoints[] = await Promise.all(
          (membersData || []).map(async (member) => {
            const { data: statusData } = await supabase
              .from('user_launch_status')
              .select('total_points')
              .eq('user_id', member.id)
              .maybeSingle();

            return {
              user_id: member.id,
              name: member.name || member.email?.split('@')[0] || 'Unknown',
              email: member.email || '',
              total_points: statusData?.total_points || 0,
              avatar_url: member.avatar_url
            };
          })
        );

        // Sort by points descending
        membersWithPoints.sort((a, b) => b.total_points - a.total_points);
        setTeamMembers(membersWithPoints);
      } catch (err) {
        console.error('Error fetching team data:', err);
      } finally {
        setLoadingTeamData(false);
      }
    };

    fetchTeamData();
  }, [user]);

  // Fetch individual member's points breakdown
  const fetchMemberPointsDetail = async (userId: string) => {
    setLoadingMemberDetails(true);
    try {
      const { data, error } = await supabase
        .from('launch_points_ledger')
        .select('reason, reason_display, points, stage, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemberPointsDetail(data || []);
    } catch (err) {
      console.error('Error fetching member points detail:', err);
      setMemberPointsDetail([]);
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const handleMemberClick = async (member: TeamMemberPoints) => {
    setSelectedMember(member);
    await fetchMemberPointsDetail(member.user_id);
  };

  const closeMemberDetail = () => {
    setSelectedMember(null);
    setMemberPointsDetail([]);
  };

  const handleSyncDocuments = async () => {
    if (!user || syncing) return;

    setSyncing(true);
    setSyncMessage(null);
    const initialTotal = fuelData?.fully_synced_documents ?? 0;

    try {
      const teamId = user?.user_metadata?.team_id;
      if (!teamId) {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: 'Team ID not found' });
        return;
      }

      const result = await triggerSyncNow({
        team_id: teamId,
        user_id: user.id,
        source: 'manual_sync_now'
      });

      if (result.success) {
        setSyncMessage({ type: 'success', text: 'Syncing new documents...' });

        let attemptCount = 0;
        const maxAttempts = 30;

        const pollForUpdates = setInterval(async () => {
          attemptCount++;
          await refreshFuelLevel();

          const teamId = user?.user_metadata?.team_id;
          if (teamId) {
            const { count } = await supabase
              .from('documents')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', teamId);

            const currentTotal = count || 0;

            if (currentTotal > initialTotal) {
              clearInterval(pollForUpdates);
              setSyncing(false);
              setSyncMessage({ type: 'success', text: `Sync complete! ${currentTotal - initialTotal} new documents added.` });
              setTimeout(() => setSyncMessage(null), 3000);
              return;
            }
          }

          if (attemptCount >= maxAttempts) {
            clearInterval(pollForUpdates);
            setSyncing(false);
            setSyncMessage({ type: 'success', text: 'Sync complete!' });
            setTimeout(() => setSyncMessage(null), 3000);
          }
        }, 2000);
      } else {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: result.message || 'Failed to start sync.' });
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncing(false);
      setSyncMessage({ type: 'error', text: 'Failed to sync. Please try again.' });
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-8">
          <p className="text-white">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  const fuelProgress = stageProgress.find(p => p.stage === 'fuel') || null;
  const boostersProgress = stageProgress.find(p => p.stage === 'boosters') || null;
  const guidanceProgress = stageProgress.find(p => p.stage === 'guidance') || null;

  const fuelLevel = fuelProgress?.level || 0;
  const boostersLevel = boostersProgress?.level || 0;
  const guidanceLevel = guidanceProgress?.level || 0;

  const fuelPercent = calculateStageProgress(fuelProgress);
  const boostersPercent = calculateStageProgress(boostersProgress);
  const guidancePercent = calculateStageProgress(guidanceProgress);

  const stages = [
    {
      id: 'fuel' as const,
      name: 'Fuel',
      description: 'Connect your data sources',
      icon: Fuel,
      color: 'orange',
      level: fuelLevel,
      progress: fuelPercent,
      points: fuelProgress?.points_earned || 0,
      bgGradient: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      buttonText: 'text-orange-400',
      progressBar: 'from-orange-500 to-orange-400'
    },
    {
      id: 'boosters' as const,
      name: 'Boosters',
      description: 'Accelerate with automation',
      icon: Zap,
      color: 'cyan',
      level: boostersLevel,
      progress: boostersPercent,
      points: boostersProgress?.points_earned || 0,
      bgGradient: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      buttonText: 'text-cyan-400',
      progressBar: 'from-cyan-500 to-cyan-400'
    },
    {
      id: 'guidance' as const,
      name: 'Guidance',
      description: 'Navigate with intelligence',
      icon: Compass,
      color: 'purple',
      level: guidanceLevel,
      progress: guidancePercent,
      points: guidanceProgress?.points_earned || 0,
      bgGradient: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      buttonText: 'text-purple-400',
      progressBar: 'from-purple-500 to-purple-400'
    }
  ];

  const earnedAchievements = achievements.filter(a =>
    fuelProgress?.achievements.includes(a.achievement_key) ||
    boostersProgress?.achievements.includes(a.achievement_key) ||
    guidanceProgress?.achievements.includes(a.achievement_key)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500/20 via-green-500/20 to-blue-500/20 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Mission Control</h2>
                <p className="text-gray-400 text-sm">Track your progress and level up</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Team Launch Points - Prominent Display - Clickable */}
              <button
                onClick={() => setSelectedTab('points-log')}
                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl px-5 py-2.5 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all cursor-pointer group"
                title="Click to view Points Log"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/20 rounded-lg p-2 group-hover:bg-yellow-500/30 transition-colors">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Launch Points</p>
                    <p className="text-xl font-bold text-yellow-400 leading-tight">{formatPoints(teamPoints)}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">Team Total • Click to view</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`
                py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${selectedTab === 'overview'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('points-log')}
              className={`
                py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${selectedTab === 'points-log'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
                }
              `}
            >
              Points Log
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Google Drive Troubleshoot Guide - Show when Fuel level is 0 */}
              {fuelLevel === 0 && (
                <div className="mb-4">
                  <GoogleDriveTroubleshootGuide />
                </div>
              )}

              {/* Stage Cards Grid - Prominent display */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-gray-400" />
                  Your Stages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stages.map((stage) => {
                    const Icon = stage.icon;

                    return (
                      <button
                        key={stage.id}
                        onClick={() => {
                          // If there's a navigation handler, use it
                          // Otherwise just show a message
                          if (onNavigateToStage) {
                            onNavigateToStage(stage.id);
                            onClose();
                          } else {
                            alert('Stage navigation not available in this view');
                          }
                        }}
                        className={`
                          relative group text-left
                          bg-gradient-to-br ${stage.bgGradient}
                          border-2 ${stage.borderColor}
                          rounded-xl p-4
                          transition-all hover:scale-105 hover:shadow-lg
                          cursor-pointer
                        `}
                      >
                        {/* Level Badge */}
                        <div className="absolute top-3 right-3">
                          {stage.level >= 5 ? (
                            <div className="flex items-center space-x-1 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-1">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="text-xs font-semibold text-green-400">Max</span>
                            </div>
                          ) : (
                            <div className="bg-gray-800/50 rounded-full px-2 py-1">
                              <span className="text-xs font-semibold text-white">
                                {stage.level}/5
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Icon */}
                        <div className={`w-14 h-14 mx-auto mb-3 ${stage.iconBg} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-7 h-7 ${stage.iconColor}`} />
                        </div>

                        {/* Stage Info */}
                        <h4 className="text-lg font-bold text-white text-center mb-1">{stage.name}</h4>
                        <p className="text-xs text-gray-400 text-center mb-3">{stage.description}</p>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden mb-3">
                          <div
                            className={`h-full bg-gradient-to-r ${stage.progressBar} transition-all duration-500`}
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>

                        {/* Points */}
                        <p className="text-xs text-gray-400 text-center mb-1">
                          {formatPoints(stage.points)} pts
                        </p>

                        {/* Enter to Level Up text */}
                        <p className="text-xs text-gray-500 text-center">
                          Enter to Level Up
                        </p>

                        {/* Hover hint */}
                        <div className={`mt-3 pt-2 border-t ${stage.borderColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <p className={`text-xs font-medium ${stage.buttonText} text-center`}>
                            {stage.level >= 5 ? '✓ Maxed' : 'Click to Continue →'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data Sync Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Fuel className="w-5 h-5 mr-2 text-orange-400" />
                    Your Data
                  </h3>
                  <button
                    onClick={handleSyncDocuments}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 min-h-[36px]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>

                {syncMessage && (
                  <p className={`text-xs mb-2 ${
                    syncMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {syncMessage.text}
                  </p>
                )}

                {/* Sync Progress Indicator */}
                {currentSession && (
                  <div className="mb-3 bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      <span className="text-xs font-medium text-blue-300">
                        {getSyncProgress().statusMessage}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {getSyncProgress().overallProgress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${getSyncProgress().overallProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Documents Card */}
                  <button
                    onClick={() => {
                      setDocumentsFilterCategory(null);
                      setShowDocumentsModal(true);
                    }}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-800 hover:border-orange-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500/30 transition-colors flex-shrink-0">
                        <FileText className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold text-white">{fuelData?.fully_synced_documents ?? 0}</p>
                        <p className="text-xs text-gray-400 group-hover:text-orange-400 transition-colors">Documents Synced</p>
                      </div>
                    </div>
                    {(fuelData?.pending_classification ?? 0) > 0 && (
                      <p className="text-[10px] text-yellow-400 mt-2">
                        +{fuelData?.pending_classification} processing
                      </p>
                    )}
                  </button>

                  {/* Categories Card */}
                  <button
                    onClick={() => setShowCategoriesModal(true)}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-800 hover:border-blue-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
                        <Grid className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold text-white">{fuelData?.category_count ?? 0}</p>
                        <p className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors">Categories</p>
                      </div>
                    </div>
                    {fuelData?.categories && fuelData.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {fuelData.categories.slice(0, 3).map((cat: string) => (
                          <span key={cat} className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                            {cat}
                          </span>
                        ))}
                        {fuelData.categories.length > 3 && (
                          <span className="text-[9px] text-gray-400">+{fuelData.categories.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  Click to view details or sync new documents from your connected folders
                </p>
              </div>

            </div>
          )}

          {selectedTab === 'points-log' && (
            <div className="space-y-6">
              {/* How to Earn Points Guide */}
              <button
                onClick={() => setShowHowToEarn(true)}
                className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center justify-between hover:bg-blue-500/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 rounded-lg p-2 group-hover:bg-blue-500/30 transition-colors">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">How to Earn Launch Points</p>
                    <p className="text-gray-400 text-xs">Learn about achievements, levels, and rewards</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </button>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-gray-400" />
                  Team Members Points
                </h3>
                {loadingTeamData ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400">Loading team data...</p>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member, index) => (
                      <button
                        key={member.user_id}
                        onClick={() => handleMemberClick(member)}
                        className="w-full bg-gray-900/50 hover:bg-gray-900/70 rounded-lg p-4 flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 relative">
                            {index === 0 && <Trophy className="w-5 h-5 text-yellow-400 absolute -left-6 top-2" />}
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <span className="text-blue-400 font-semibold text-sm">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-white text-sm font-medium">{member.name}</p>
                            <p className="text-gray-500 text-xs">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-green-400 font-semibold text-lg">
                              {formatPoints(member.total_points)}
                            </p>
                            <p className="text-gray-500 text-xs">points</p>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 group-hover:text-gray-300 transition-colors">
                            <span className="text-xs font-medium">View Detail</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-900/50">
          <p className="text-center text-gray-400 text-sm">
            Keep leveling up to unlock more insights and capabilities! 🚀
          </p>
        </div>
      </div>

      {/* Member Points Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border-b border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedMember.avatar_url ? (
                    <img
                      src={selectedMember.avatar_url}
                      alt={selectedMember.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 font-semibold text-lg">
                        {selectedMember.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedMember.name}</h3>
                    <p className="text-gray-400 text-sm">{selectedMember.email}</p>
                  </div>
                </div>
                <button
                  onClick={closeMemberDetail}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm mb-1">Total Launch Points</p>
                <p className="text-4xl font-bold text-green-400">{formatPoints(selectedMember.total_points)}</p>
              </div>

              <h4 className="text-lg font-semibold text-white mb-4">Points History</h4>

              {loadingMemberDetails ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400">Loading points history...</p>
                </div>
              ) : memberPointsDetail.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No points earned yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memberPointsDetail.map((entry, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{entry.reason_display}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${entry.stage === 'fuel' ? 'bg-orange-500/20 text-orange-400' : ''}
                            ${entry.stage === 'boosters' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                            ${entry.stage === 'guidance' ? 'bg-purple-500/20 text-purple-400' : ''}
                            ${entry.stage === 'ongoing' ? 'bg-green-500/20 text-green-400' : ''}
                          `}>
                            {entry.stage}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(entry.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-lg">+{entry.points}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How to Earn Points Guide Modal */}
      {showHowToEarn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">How to Earn Launch Points</h3>
                    <p className="text-gray-400 text-sm">Complete tasks and level up to earn rewards</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHowToEarn(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Fuel Stage */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Fuel className="w-5 h-5 text-orange-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Fuel Stage - Add Your Data</h4>
                </div>
                <div className="space-y-3 ml-13">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 1: Ignition</span>
                      <span className="text-orange-400 font-bold">10 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Add 1 document to any folder</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 2: Foundation</span>
                      <span className="text-orange-400 font-bold">20 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Add 1 document to each folder category</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Bonus Achievements</span>
                      <span className="text-green-400 font-bold">100-300 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">First Document (100), Complete All Categories (300)</p>
                  </div>
                </div>
              </div>

              {/* Boosters Stage */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Boosters Stage - Use AI Features</h4>
                </div>
                <div className="space-y-3 ml-13">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 1: First Contact</span>
                      <span className="text-cyan-400 font-bold">10 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Use Guided Chat or send 5 prompts</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 2: Visualization</span>
                      <span className="text-cyan-400 font-bold">20 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Create your first visualization</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 3: Reporting</span>
                      <span className="text-cyan-400 font-bold">30 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Generate your first manual report</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 4: Automation</span>
                      <span className="text-cyan-400 font-bold">40 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Schedule a recurring report</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Bonus: Guided Chat</span>
                      <span className="text-green-400 font-bold">50 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Use the Guided Chat feature</p>
                  </div>
                </div>
              </div>

              {/* Guidance Stage */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Compass className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Guidance Stage - Configure Your Team</h4>
                </div>
                <div className="space-y-3 ml-13">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 1: Configuration</span>
                      <span className="text-purple-400 font-bold">10 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Configure team settings</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 2: Information</span>
                      <span className="text-purple-400 font-bold">20 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Enable news preferences</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Level 3: Collaboration</span>
                      <span className="text-purple-400 font-bold">30 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Invite a team member</p>
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Milestones - Usage Goals</h4>
                </div>
                <div className="space-y-3 ml-13">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Chatty Day</span>
                      <span className="text-amber-400 font-bold">25 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Send 10 messages in a single day</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Message Milestones</span>
                      <span className="text-amber-400 font-bold">100 / 250 / 500 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Send 100 / 500 / 1000 total messages</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Team Chat Milestones</span>
                      <span className="text-amber-400 font-bold">100 / 200 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Send 50 / 200 team chat messages</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Visualization Milestones</span>
                      <span className="text-amber-400 font-bold">150 / 300 / 500 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Save 5 / 25 / 100 visualizations</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">Report Milestones</span>
                      <span className="text-amber-400 font-bold">100 / 250 / 500 pts</span>
                    </div>
                    <p className="text-gray-400 text-xs">Create 3 / 10 / 25 scheduled reports</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-300 text-sm font-medium mb-1">Remember</p>
                  <p className="text-gray-400 text-xs">Launch Points never expire! Complete achievements at your own pace and continue earning points even after launching.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents List Modal */}
      <DocumentsListModal
        isOpen={showDocumentsModal}
        onClose={() => {
          setShowDocumentsModal(false);
          setDocumentsFilterCategory(null);
        }}
        onDocumentDeleted={() => {
          refreshFuelLevel();
        }}
        initialCategory={documentsFilterCategory}
      />

      {/* Categories Detail Modal */}
      <CategoriesDetailModal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoryClick={(category) => {
          setShowCategoriesModal(false);
          setDocumentsFilterCategory(category);
          setShowDocumentsModal(true);
        }}
        categories={fuelData?.categories}
      />
    </div>
  );
};
