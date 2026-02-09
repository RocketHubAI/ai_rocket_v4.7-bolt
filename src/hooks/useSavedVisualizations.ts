import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import { useMetricsTracking } from './useMetricsTracking';

type SavedVisualization = Database['public']['Tables']['saved_visualizations']['Row'];

export function useSavedVisualizations(userId: string | undefined) {
  const { trackVisualizationCreation } = useMetricsTracking();
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    fetchSavedVisualizations();

    console.log('📡 Setting up realtime subscription for saved_visualizations');

    const channel = supabase
      .channel('saved_visualizations_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'saved_visualizations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📡 New saved visualization detected:', payload);
          setSavedVisualizations((prev) => {
            const newViz = payload.new as SavedVisualization;
            if (prev.some(v => v.id === newViz.id)) {
              return prev;
            }
            return [newViz, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'saved_visualizations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📡 Saved visualization deleted:', payload);
          setSavedVisualizations((prev) =>
            prev.filter((v) => v.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      console.log('📡 Cleaning up saved_visualizations realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchSavedVisualizations = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('saved_visualizations')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSavedVisualizations(data || []);
    } catch (err) {
      console.error('Error fetching saved visualizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load saved visualizations');
    } finally {
      setLoading(false);
    }
  };

  const saveVisualization = async (
    chatMessageId: string,
    title: string,
    visualizationData: string,
    originalPrompt: string | null
  ) => {
    if (!userId) {
      console.error('❌ saveVisualization: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    console.log('💾 saveVisualization called with:', {
      chatMessageId,
      title,
      userId,
      visualizationDataLength: visualizationData.length,
      originalPromptLength: originalPrompt?.length
    });

    try {
      const { data, error: insertError } = await supabase
        .from('saved_visualizations')
        .insert({
          user_id: userId,
          chat_message_id: chatMessageId,
          title,
          visualization_data: visualizationData,
          original_prompt: originalPrompt,
        })
        .select();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Visualization saved successfully:', data);

      // Track visualization creation metric
      trackVisualizationCreation(chatMessageId);

      // Optimistically update local state immediately
      if (data && data.length > 0) {
        const newViz = data[0] as SavedVisualization;
        console.log('🔄 Optimistically updating local state with:', newViz);
        setSavedVisualizations((prev) => {
          if (prev.some(v => v.id === newViz.id)) {
            console.log('⚠️ Visualization already in state, skipping');
            return prev;
          }
          console.log('➕ Adding visualization to local state');
          return [newViz, ...prev];
        });
      }

      return { success: true };
    } catch (err) {
      console.error('❌ Error saving visualization:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save visualization',
      };
    }
  };

  const deleteVisualization = async (visualizationId: string) => {
    if (!userId) return { success: false, error: 'User not authenticated' };

    try {
      const { error: deleteError } = await supabase
        .from('saved_visualizations')
        .delete()
        .eq('id', visualizationId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      setSavedVisualizations((prev) => prev.filter((v) => v.id !== visualizationId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting visualization:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete visualization',
      };
    }
  };

  const isVisualizationSaved = (chatMessageId: string): boolean => {
    const isSaved = savedVisualizations.some((v) => v.chat_message_id === chatMessageId);
    console.log('🔍 isVisualizationSaved check:', {
      chatMessageId,
      isSaved,
      savedVisualizationsCount: savedVisualizations.length,
      savedChatMessageIds: savedVisualizations.map(v => v.chat_message_id)
    });
    return isSaved;
  };

  return {
    savedVisualizations,
    loading,
    error,
    saveVisualization,
    deleteVisualization,
    isVisualizationSaved,
    refreshSavedVisualizations: fetchSavedVisualizations,
  };
}
