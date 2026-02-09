import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  SetupGuideProgress,
  getSetupGuideProgress,
  createSetupGuideProgress,
  updateSetupGuideProgress,
  markStepComplete as utilMarkStepComplete,
  detectStepCompletion,
  getUserDataContext,
  SyncedDataContext
} from '../lib/setup-guide-utils';

export const useSetupGuide = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<SetupGuideProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataContext, setDataContext] = useState<SyncedDataContext | null>(null);

  // Load progress on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;

    setLoading(true);

    try {
      let existingProgress = await getSetupGuideProgress(user.id);

      if (!existingProgress) {
        // Create new progress
        existingProgress = await createSetupGuideProgress(user.id);
      }

      setProgress(existingProgress);

      // Load data context if we have team_id
      const teamId = user.user_metadata?.team_id;
      if (teamId) {
        const ctx = await getUserDataContext(teamId);
        setDataContext(ctx);
      }
    } catch (error) {
      console.error('Error loading setup guide progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProgress = useCallback(async () => {
    if (!user) return;

    const updatedProgress = await getSetupGuideProgress(user.id);
    setProgress(updatedProgress);

    // Refresh data context
    const teamId = user.user_metadata?.team_id;
    if (teamId) {
      const ctx = await getUserDataContext(teamId);
      setDataContext(ctx);
    }
  }, [user]);

  const markStepComplete = useCallback(
    async (stepNumber: number, additionalUpdates?: Partial<SetupGuideProgress>) => {
      if (!user) return false;

      const success = await utilMarkStepComplete(user.id, stepNumber, additionalUpdates);

      if (success) {
        await refreshProgress();
      }

      return success;
    },
    [user, refreshProgress]
  );

  const updateProgress = useCallback(
    async (updates: Partial<SetupGuideProgress>) => {
      if (!user) return false;

      const success = await updateSetupGuideProgress(user.id, updates);

      if (success) {
        await refreshProgress();
      }

      return success;
    },
    [user, refreshProgress]
  );

  const checkStepCompletion = useCallback(
    async (stepNumber: number): Promise<boolean> => {
      if (!user) return false;

      const teamId = user.user_metadata?.team_id;
      if (!teamId) return false;

      return detectStepCompletion(user.id, teamId, stepNumber);
    },
    [user]
  );

  const resetProgress = useCallback(async () => {
    if (!user) return;

    await updateSetupGuideProgress(user.id, {
      current_step: 1,
      is_completed: false,
      is_skipped: false,
      step_1_onboarding_completed: false,
      step_2_google_drive_connected: false,
      step_3_folder_selected_or_created: false,
      step_4_files_placed_in_folder: false,
      step_5_data_synced: false,
      step_6_team_settings_configured: false,
      step_7_first_prompt_sent: false,
      step_8_visualization_created: false,
      step_9_manual_report_run: false,
      step_10_scheduled_report_created: false,
      step_11_team_members_invited: false
    });

    await refreshProgress();
  }, [user, refreshProgress]);

  return {
    progress,
    loading,
    dataContext,
    markStepComplete,
    updateProgress,
    checkStepCompletion,
    refreshProgress,
    resetProgress
  };
};
