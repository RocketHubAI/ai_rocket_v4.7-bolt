import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface FuelLevelData {
  current_level: number;
  total_documents: number;
  fully_synced_documents: number;
  pending_classification: number;
  category_count: number;
  categories: string[];
  drive_connected: boolean;
  next_level_requirements: {
    documents: number | null;
    categories: number | null;
  } | null;
  progress_percentage: number;
}

export interface FuelLevelThreshold {
  level: number;
  description: string;
  documents_required: number;
  categories_required: number;
  points_value: number;
}

export const FUEL_LEVEL_THRESHOLDS: FuelLevelThreshold[] = [
  {
    level: 1,
    description: 'First document synced',
    documents_required: 1,
    categories_required: 0,
    points_value: 50
  },
  {
    level: 2,
    description: '5+ documents, 2+ categories',
    documents_required: 5,
    categories_required: 2,
    points_value: 100
  },
  {
    level: 3,
    description: '50+ documents, 5+ categories',
    documents_required: 50,
    categories_required: 5,
    points_value: 200
  },
  {
    level: 4,
    description: '200+ documents, 8+ categories',
    documents_required: 200,
    categories_required: 8,
    points_value: 300
  },
  {
    level: 5,
    description: '1000+ documents, 12+ categories',
    documents_required: 1000,
    categories_required: 12,
    points_value: 500
  }
];

export function useFuelLevel() {
  const { user } = useAuth();
  const [fuelData, setFuelData] = useState<FuelLevelData | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const cacheTimeMs = 30000;

  const teamId = user?.user_metadata?.team_id;

  const fetchFuelLevel = useCallback(async (forceRefresh = false): Promise<FuelLevelData | null> => {
    if (!teamId) return null;

    const now = Date.now();
    if (!forceRefresh && fuelData && (now - lastFetchRef.current) < cacheTimeMs) {
      return fuelData;
    }

    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase
        .rpc('calculate_fuel_level', { p_team_id: teamId });

      if (rpcError) throw rpcError;

      const result = data as FuelLevelData;

      if (fuelData && result.current_level > fuelData.current_level) {
        setPreviousLevel(fuelData.current_level);
      }

      setFuelData(result);
      lastFetchRef.current = now;
      setError(null);
      return result;
    } catch (err) {
      console.error('Error fetching fuel level:', err);
      setError('Failed to calculate fuel level');
      return null;
    } finally {
      setLoading(false);
    }
  }, [teamId, fuelData, cacheTimeMs]);

  const getCurrentThreshold = useCallback((): FuelLevelThreshold | null => {
    if (!fuelData) return null;
    return FUEL_LEVEL_THRESHOLDS.find(t => t.level === fuelData.current_level) || null;
  }, [fuelData]);

  const getNextThreshold = useCallback((): FuelLevelThreshold | null => {
    if (!fuelData || fuelData.current_level >= 5) return null;
    return FUEL_LEVEL_THRESHOLDS.find(t => t.level === fuelData.current_level + 1) || null;
  }, [fuelData]);

  const getProgressToNextLevel = useCallback((): {
    documentsProgress: number;
    categoriesProgress: number;
    documentsNeeded: number;
    categoriesNeeded: number;
  } => {
    if (!fuelData) {
      return { documentsProgress: 0, categoriesProgress: 0, documentsNeeded: 0, categoriesNeeded: 0 };
    }

    const nextThreshold = getNextThreshold();
    if (!nextThreshold) {
      return { documentsProgress: 100, categoriesProgress: 100, documentsNeeded: 0, categoriesNeeded: 0 };
    }

    const currentThreshold = getCurrentThreshold();
    const prevDocs = currentThreshold?.documents_required || 0;
    const prevCats = currentThreshold?.categories_required || 0;

    const docsRange = nextThreshold.documents_required - prevDocs;
    const catsRange = nextThreshold.categories_required - prevCats;

    const docsProgress = docsRange > 0
      ? Math.min(100, Math.round(((fuelData.fully_synced_documents - prevDocs) / docsRange) * 100))
      : 100;
    const catsProgress = catsRange > 0
      ? Math.min(100, Math.round(((fuelData.category_count - prevCats) / catsRange) * 100))
      : 100;

    const documentsNeeded = Math.max(0, nextThreshold.documents_required - fuelData.fully_synced_documents);
    const categoriesNeeded = Math.max(0, nextThreshold.categories_required - fuelData.category_count);

    return {
      documentsProgress: Math.max(0, docsProgress),
      categoriesProgress: Math.max(0, catsProgress),
      documentsNeeded,
      categoriesNeeded
    };
  }, [fuelData, getCurrentThreshold, getNextThreshold]);

  const hasLeveledUp = useCallback((): boolean => {
    return previousLevel !== null && fuelData !== null && fuelData.current_level > previousLevel;
  }, [previousLevel, fuelData]);

  const clearLevelUpNotification = useCallback(() => {
    setPreviousLevel(null);
  }, []);

  const getLevelDisplayInfo = useCallback((level: number): {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
  } => {
    const icons = ['Circle', 'Zap', 'Flame', 'Rocket', 'Target', 'Trophy'];
    const colors = ['text-gray-400', 'text-yellow-500', 'text-orange-500', 'text-red-500', 'text-blue-500', 'text-green-500'];
    const bgColors = ['bg-gray-500/20', 'bg-yellow-500/20', 'bg-orange-500/20', 'bg-red-500/20', 'bg-blue-500/20', 'bg-green-500/20'];

    return {
      label: `Level ${level}`,
      icon: icons[level] || 'Circle',
      color: colors[level] || 'text-gray-500',
      bgColor: bgColors[level] || 'bg-gray-500/20'
    };
  }, []);

  useEffect(() => {
    if (teamId) {
      fetchFuelLevel();
    }
  }, [teamId, fetchFuelLevel]);

  useEffect(() => {
    if (!teamId) return;

    const chunksSubscription = supabase
      .channel('document_chunks_fuel_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_chunks',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchFuelLevel(true);
        }
      )
      .subscribe();

    const driveSubscription = supabase
      .channel('drive_connection_fuel_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_drive_connections',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchFuelLevel(true);
        }
      )
      .subscribe();

    return () => {
      chunksSubscription.unsubscribe();
      driveSubscription.unsubscribe();
    };
  }, [teamId, fetchFuelLevel]);

  return {
    fuelData,
    loading,
    error,
    fetchFuelLevel,
    getCurrentThreshold,
    getNextThreshold,
    getProgressToNextLevel,
    hasLeveledUp,
    clearLevelUpNotification,
    getLevelDisplayInfo,
    thresholds: FUEL_LEVEL_THRESHOLDS,
    refresh: () => fetchFuelLevel(true)
  };
}
