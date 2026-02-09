import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface LaunchStatus {
  user_id: string;
  current_stage: 'fuel' | 'boosters' | 'guidance' | 'ready' | 'launched';
  total_points: number;
  is_launched: boolean;
  launched_at: string | null;
  daily_streak: number;
  last_active_date: string | null;
}

export interface StageProgress {
  id: string;
  user_id: string;
  stage: 'fuel' | 'boosters' | 'guidance';
  level: number;
  points_earned: number;
  achievements: string[];
  stage_started_at: string;
  level_completed_at: string | null;
}

export interface PointsEntry {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  reason_display: string;
  stage: string;
  metadata: any;
  created_at: string;
}

export interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  stage: string;
  level: number;
  points_value: number;
  icon: string;
  display_order: number;
}

export function useLaunchPreparation() {
  const { user } = useAuth();
  const [launchStatus, setLaunchStatus] = useState<LaunchStatus | null>(null);
  const [stageProgress, setStageProgress] = useState<StageProgress[]>([]);
  const [recentPoints, setRecentPoints] = useState<PointsEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is eligible for launch preparation
  const checkEligibility = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('launch_preparation_eligible_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('Error checking eligibility:', err);
      return false;
    }
  }, []);

  // Check if user is a legacy user (existed before Launch Prep rollout)
  const checkIsLegacyUser = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('launch_preparation_eligible_users')
        .select('is_legacy_user')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data?.is_legacy_user || false;
    } catch (err) {
      console.error('Error checking legacy user status:', err);
      return false;
    }
  }, []);

  // Initialize launch status for new user
  const initializeLaunchStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Check if status already exists
      const { data: existingStatus } = await supabase
        .from('user_launch_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingStatus) {
        setLaunchStatus(existingStatus);
        return;
      }

      // Create new launch status
      const { data: newStatus, error: statusError } = await supabase
        .from('user_launch_status')
        .insert({
          user_id: user.id,
          current_stage: 'fuel',
          total_points: 0,
          is_launched: false,
          daily_streak: 0
        })
        .select()
        .single();

      if (statusError) throw statusError;

      // Initialize all three stage progress records
      const stages: ('fuel' | 'boosters' | 'guidance')[] = ['fuel', 'boosters', 'guidance'];
      const { error: progressError } = await supabase
        .from('launch_preparation_progress')
        .insert(
          stages.map(stage => ({
            user_id: user.id,
            stage,
            level: 0,
            points_earned: 0,
            achievements: []
          }))
        );

      if (progressError) throw progressError;

      setLaunchStatus(newStatus);
      await fetchStageProgress();
    } catch (err) {
      console.error('Error initializing launch status:', err);
      setError('Failed to initialize launch preparation');
    }
  }, [user]);

  // Fetch user's launch status
  const fetchLaunchStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_launch_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await initializeLaunchStatus();
      } else {
        setLaunchStatus(data);
      }
    } catch (err) {
      console.error('Error fetching launch status:', err);
      setError('Failed to load launch status');
    }
  }, [user, initializeLaunchStatus]);

  // Fetch stage progress for all stages
  const fetchStageProgress = useCallback(async (): Promise<StageProgress[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('launch_preparation_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('stage');

      if (error) throw error;
      const progressData = data || [];

      // Ensure all three stages exist (self-healing)
      const stages: ('fuel' | 'boosters' | 'guidance')[] = ['fuel', 'boosters', 'guidance'];
      const existingStages = progressData.map(p => p.stage);
      const missingStages = stages.filter(s => !existingStages.includes(s));

      if (missingStages.length > 0) {
        console.log('🔧 Creating missing stage records:', missingStages);
        const { error: insertError } = await supabase
          .from('launch_preparation_progress')
          .insert(
            missingStages.map(stage => ({
              user_id: user.id,
              stage,
              level: 0,
              points_earned: 0,
              achievements: []
            }))
          );

        if (insertError) {
          console.error('Error creating missing stages:', insertError);
        } else {
          // Re-fetch to get the complete data
          const { data: refreshedData } = await supabase
            .from('launch_preparation_progress')
            .select('*')
            .eq('user_id', user.id)
            .order('stage');

          if (refreshedData) {
            setStageProgress(refreshedData);
            return refreshedData;
          }
        }
      }

      setStageProgress(progressData);
      return progressData;
    } catch (err) {
      console.error('Error fetching stage progress:', err);
      return [];
    }
  }, [user]);

  // Fetch recent points
  const fetchRecentPoints = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('launch_points_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentPoints(data || []);
    } catch (err) {
      console.error('Error fetching recent points:', err);
    }
  }, [user]);

  // Fetch all achievements
  const fetchAchievements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('launch_achievements')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setAchievements(data || []);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    }
  }, []);

  // Get progress for specific stage
  const getStageProgress = useCallback((stage: 'fuel' | 'boosters' | 'guidance'): StageProgress | null => {
    return stageProgress.find(p => p.stage === stage) || null;
  }, [stageProgress]);

  // Award points to user
  const awardPoints = useCallback(async (
    points: number,
    reason: string,
    reasonDisplay: string,
    stage: string,
    metadata: any = {}
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Insert into points ledger
      const { error: ledgerError } = await supabase
        .from('launch_points_ledger')
        .insert({
          user_id: user.id,
          points,
          reason,
          reason_display: reasonDisplay,
          stage,
          metadata
        });

      if (ledgerError) throw ledgerError;

      // Update total points in launch status
      const { error: statusError } = await supabase
        .from('user_launch_status')
        .update({
          total_points: (launchStatus?.total_points || 0) + points,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (statusError) throw statusError;

      // Increment team launch points (Option A: Real-time aggregation)
      const teamId = user.user_metadata?.team_id;
      if (teamId) {
        const { error: teamPointsError } = await supabase
          .rpc('increment_team_launch_points', {
            p_team_id: teamId,
            p_points: points
          });

        if (teamPointsError) {
          console.error('Error incrementing team points:', teamPointsError);
          // Don't fail the whole operation if team points update fails
        }
      }

      // Refresh data
      await Promise.all([
        fetchLaunchStatus(),
        fetchRecentPoints()
      ]);

      return true;
    } catch (err) {
      console.error('Error awarding points:', err);
      return false;
    }
  }, [user, launchStatus, fetchLaunchStatus, fetchRecentPoints]);

  // Mark achievement as complete
  const completeAchievement = useCallback(async (
    achievementKey: string,
    stage: 'fuel' | 'boosters' | 'guidance'
  ): Promise<boolean> => {
    if (!user) {
      console.error('❌ No user found');
      return false;
    }

    console.log('🔍 Starting completeAchievement:', achievementKey, 'stage:', stage);
    console.log('🔍 Available achievements:', achievements.length, achievements.map(a => a.achievement_key));

    try {
      // Get achievement details
      const achievement = achievements.find(a => a.achievement_key === achievementKey);
      if (!achievement) {
        console.error('❌ Achievement not found:', achievementKey);
        console.error('Available:', achievements.map(a => a.achievement_key));
        return false;
      }
      console.log('✅ Achievement found:', achievement);

      // Get current stage progress
      const progress = getStageProgress(stage);
      if (!progress) {
        console.error('❌ Stage progress not found:', stage);
        return false;
      }
      console.log('✅ Stage progress found:', progress);

      // Check if already completed
      if (progress.achievements.includes(achievementKey)) {
        console.log('ℹ️ Achievement already completed');
        return true; // Already completed
      }

      // Add achievement to progress
      const updatedAchievements = [...progress.achievements, achievementKey];
      console.log('📝 Updating achievements:', updatedAchievements);

      // Update stage progress
      const { error: progressError, data: updateData } = await supabase
        .from('launch_preparation_progress')
        .update({
          achievements: updatedAchievements,
          points_earned: progress.points_earned + achievement.points_value,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('stage', stage)
        .select();

      if (progressError) {
        console.error('❌ Database update error:', progressError);
        throw progressError;
      }
      console.log('✅ Database updated successfully:', updateData);

      // Award points
      console.log('💰 Awarding points:', achievement.points_value);
      await awardPoints(
        achievement.points_value,
        achievementKey,
        achievement.name,
        stage,
        { achievement_key: achievementKey }
      );

      // Refresh stage progress
      console.log('🔄 Refreshing stage progress...');
      await fetchStageProgress();

      console.log('✅ completeAchievement finished successfully');
      return true;
    } catch (err) {
      console.error('❌ Error completing achievement:', err);
      return false;
    }
  }, [user, achievements, getStageProgress, awardPoints, fetchStageProgress]);

  // Update stage level
  const updateStageLevel = useCallback(async (
    stage: 'fuel' | 'boosters' | 'guidance',
    newLevel: number
  ): Promise<boolean> => {
    if (!user) {
      console.error('❌ No user found for updateStageLevel');
      return false;
    }

    console.log('🔍 Updating stage level:', stage, 'to level:', newLevel);

    try {
      const { error, data } = await supabase
        .from('launch_preparation_progress')
        .update({
          level: newLevel,
          level_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('stage', stage)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Stage level updated successfully:', data);
      await fetchStageProgress();
      return true;
    } catch (err) {
      console.error('❌ Error updating stage level:', err);
      return false;
    }
  }, [user, fetchStageProgress]);

  // Update current stage
  const updateCurrentStage = useCallback(async (
    newStage: 'fuel' | 'boosters' | 'guidance' | 'ready' | 'launched'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: any = {
        current_stage: newStage,
        updated_at: new Date().toISOString()
      };

      if (newStage === 'launched') {
        updateData.is_launched = true;
        updateData.launched_at = new Date().toISOString();

        const isAlreadyLaunched = launchStatus?.is_launched === true;
        if (!isAlreadyLaunched) {
          console.log('🚀 [Launch] First launch - clearing onboarding metadata to trigger Welcome Modal and Tour');
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              onboarding_completed: false,
              onboarding_dismissed: false
            }
          });

          if (metadataError) {
            console.error('Error clearing onboarding metadata:', metadataError);
          } else {
            console.log('✅ [Launch] Onboarding metadata cleared successfully');
          }
        } else {
          console.log('🚀 [Launch] User already launched - skipping onboarding metadata reset');
        }
      }

      const { error } = await supabase
        .from('user_launch_status')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchLaunchStatus();
      return true;
    } catch (err) {
      console.error('Error updating current stage:', err);
      return false;
    }
  }, [user, fetchLaunchStatus]);

  // Mark user as active today
  const markActiveToday = useCallback(async (): Promise<void> => {
    if (!user || !launchStatus) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = launchStatus.last_active_date;

    // If already active today, skip
    if (lastActive === today) return;

    try {
      let newStreak = 1;

      // Check if this continues a streak
      if (lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActive === yesterdayStr) {
          newStreak = launchStatus.daily_streak + 1;
        }
      }

      // Update status
      const { error } = await supabase
        .from('user_launch_status')
        .update({
          last_active_date: today,
          daily_streak: newStreak,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchLaunchStatus();
    } catch (err) {
      console.error('Error marking user active:', err);
    }
  }, [user, launchStatus, fetchLaunchStatus]);

  // Initial data load
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([
          fetchLaunchStatus(),
          fetchStageProgress(),
          fetchRecentPoints(),
          fetchAchievements()
        ]);
        setLoading(false);
      };

      loadData();
    }
  }, [user, fetchLaunchStatus, fetchStageProgress, fetchRecentPoints, fetchAchievements]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const statusSubscription = supabase
      .channel('launch_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_launch_status',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchLaunchStatus();
        }
      )
      .subscribe();

    const progressSubscription = supabase
      .channel('launch_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'launch_preparation_progress',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchStageProgress();
        }
      )
      .subscribe();

    return () => {
      statusSubscription.unsubscribe();
      progressSubscription.unsubscribe();
    };
  }, [user, fetchLaunchStatus, fetchStageProgress]);

  return {
    launchStatus,
    stageProgress,
    recentPoints,
    achievements,
    loading,
    error,
    checkEligibility,
    checkIsLegacyUser,
    initializeLaunchStatus,
    getStageProgress,
    awardPoints,
    completeAchievement,
    updateStageLevel,
    updateCurrentStage,
    markActiveToday,
    fetchStageProgress,
    refresh: async () => {
      await Promise.all([
        fetchLaunchStatus(),
        fetchStageProgress(),
        fetchRecentPoints()
      ]);
    }
  };
}
