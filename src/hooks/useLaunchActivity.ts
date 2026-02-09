import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLaunchPreparation } from './useLaunchPreparation';
import { useDocumentCounts } from './useDocumentCounts';
import { useLaunchToast } from '../components/LaunchToast';
import { supabase } from '../lib/supabase';

export function useLaunchActivity() {
  const { user } = useAuth();
  const {
    launchStatus,
    stageProgress,
    completeAchievement,
    updateStageLevel,
    markActiveToday,
    getStageProgress
  } = useLaunchPreparation();
  const { counts, calculateFuelLevel } = useDocumentCounts();
  const { showLevelUp, showAchievement } = useLaunchToast();

  // Track daily activity
  useEffect(() => {
    if (user && launchStatus) {
      markActiveToday();
    }
  }, [user, launchStatus, markActiveToday]);

  // Monitor document counts and auto-level Fuel stage
  useEffect(() => {
    const checkFuelProgress = async () => {
      if (!user || !launchStatus) return;

      const fuelProgress = getStageProgress('fuel');
      if (!fuelProgress) return;

      const currentLevel = fuelProgress.level;
      const actualLevel = calculateFuelLevel();

      // If documents meet requirements for higher level, upgrade
      if (actualLevel > currentLevel) {
        // Award achievements for all levels between current and actual
        for (let level = currentLevel + 1; level <= actualLevel; level++) {
          const achievementKey = getAchievementKeyForFuelLevel(level);
          if (achievementKey) {
            await completeAchievement(achievementKey, 'fuel');
            await updateStageLevel('fuel', level);

            // Show celebration
            const points = getFuelLevelPoints(level);
            showLevelUp('Fuel', level, points);
          }
        }
      }
    };

    checkFuelProgress();
  }, [counts, user, launchStatus, getStageProgress, calculateFuelLevel, completeAchievement, updateStageLevel, showLevelUp]);

  // Monitor for visualization creation
  const trackVisualizationCreated = useCallback(async () => {
    if (!user || !launchStatus) return;

    const boostersProgress = getStageProgress('boosters');
    if (!boostersProgress) return;

    // Check if visualization achievement is already complete
    if (boostersProgress.achievements.includes('boosters_first_visualization')) return;

    // Award achievement
    await completeAchievement('boosters_first_visualization', 'boosters');

    // If this completes level 2, update level
    if (boostersProgress.level < 2) {
      await updateStageLevel('boosters', 2);
      showLevelUp('Boosters', 2, 400);
    }

    showAchievement('First Visualization', 'Created your first data visualization', 400);
  }, [user, launchStatus, getStageProgress, completeAchievement, updateStageLevel, showLevelUp, showAchievement]);

  // Monitor for report generation
  const trackManualReportGenerated = useCallback(async () => {
    if (!user || !launchStatus) return;

    const boostersProgress = getStageProgress('boosters');
    if (!boostersProgress) return;

    if (boostersProgress.achievements.includes('boosters_manual_report')) return;

    await completeAchievement('boosters_manual_report', 'boosters');

    if (boostersProgress.level < 3) {
      await updateStageLevel('boosters', 3);
      showLevelUp('Boosters', 3, 600);
    }

    showAchievement('Astra Report', 'Generated your first Astra report', 600);
  }, [user, launchStatus, getStageProgress, completeAchievement, updateStageLevel, showLevelUp, showAchievement]);

  // Monitor for scheduled report
  const trackScheduledReportCreated = useCallback(async () => {
    if (!user || !launchStatus) return;

    const boostersProgress = getStageProgress('boosters');
    if (!boostersProgress) return;

    if (boostersProgress.achievements.includes('boosters_scheduled_report')) return;

    await completeAchievement('boosters_scheduled_report', 'boosters');

    if (boostersProgress.level < 4) {
      await updateStageLevel('boosters', 4);
      showLevelUp('Boosters', 4, 800);
    }

    showAchievement('Scheduled Report', 'Set up your first recurring report', 800);
  }, [user, launchStatus, getStageProgress, completeAchievement, updateStageLevel, showLevelUp, showAchievement]);

  // Monitor for team member invitation
  const trackTeamMemberInvited = useCallback(async () => {
    if (!user || !launchStatus) return;

    const guidanceProgress = getStageProgress('guidance');
    if (!guidanceProgress) return;

    if (guidanceProgress.achievements.includes('guidance_member_invited')) return;

    await completeAchievement('guidance_member_invited', 'guidance');

    if (guidanceProgress.level < 3) {
      await updateStageLevel('guidance', 3);
      showLevelUp('Guidance', 3, 400);
    }

    showAchievement('Team Member Invited', 'Invited your first team member', 400);
  }, [user, launchStatus, getStageProgress, completeAchievement, updateStageLevel, showLevelUp, showAchievement]);

  // Monitor for messages sent (for Boosters Level 1)
  // DISABLED: Retroactive achievement check - users should complete Level 1 by taking new actions
  // useEffect(() => {
  //   if (!user || !launchStatus) return;

  //   const checkMessageCount = async () => {
  //     const boostersProgress = getStageProgress('boosters');
  //     if (!boostersProgress) return;

  //     // If already at level 1, skip
  //     if (boostersProgress.level >= 1) return;

  //     // Check if user has sent 5+ messages
  //     const { count } = await supabase
  //       .from('astra_chats')
  //       .select('id', { count: 'exact', head: true })
  //       .eq('user_id', user.id);

  //     if (count && count >= 5) {
  //       // Complete level 1
  //       await completeAchievement('boosters_first_prompt', 'boosters');
  //       await updateStageLevel('boosters', 1);
  //       showLevelUp('Boosters', 1, 200);
  //     }
  //   };

  //   checkMessageCount();
  // }, [user, launchStatus, getStageProgress, completeAchievement, updateStageLevel, showLevelUp]);

  // Subscribe to real-time changes for automatic detection
  useEffect(() => {
    if (!user) return;

    // Listen for new visualizations
    const visualizationSubscription = supabase
      .channel('visualization_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'saved_visualizations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          trackVisualizationCreated();
        }
      )
      .subscribe();

    // Listen for new reports
    const reportSubscription = supabase
      .channel('report_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scheduled_reports',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Check if it's a scheduled or manual report
          if (payload.new.schedule_type === 'none') {
            trackManualReportGenerated();
          } else {
            trackScheduledReportCreated();
          }
        }
      )
      .subscribe();

    // Listen for team member additions
    const teamSubscription = supabase
      .channel('team_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users'
        },
        async (payload) => {
          // Check if new user joined our team
          const { data: currentUserData } = await supabase
            .from('users')
            .select('team_id')
            .eq('id', user.id)
            .single();

          if (payload.new.team_id === currentUserData?.team_id && payload.new.id !== user.id) {
            trackTeamMemberInvited();
          }
        }
      )
      .subscribe();

    return () => {
      visualizationSubscription.unsubscribe();
      reportSubscription.unsubscribe();
      teamSubscription.unsubscribe();
    };
  }, [user, trackVisualizationCreated, trackManualReportGenerated, trackScheduledReportCreated, trackTeamMemberInvited]);

  return {
    trackVisualizationCreated,
    trackManualReportGenerated,
    trackScheduledReportCreated,
    trackTeamMemberInvited
  };
}

// Helper functions
function getAchievementKeyForFuelLevel(level: number): string | null {
  switch (level) {
    case 1: return 'fuel_first_document';
    case 2: return 'fuel_one_per_category';
    case 3: return 'fuel_basic_collection';
    case 4: return 'fuel_mature_foundation';
    case 5: return 'fuel_advanced_preparation';
    default: return null;
  }
}

function getFuelLevelPoints(level: number): number {
  const points = [100, 300, 500, 1000, 2000];
  return points[level - 1] || 0;
}
