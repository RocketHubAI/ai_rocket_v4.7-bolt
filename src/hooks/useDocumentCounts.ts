import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CategoryInfo {
  category: string;
  count: number;
}

export interface DocumentInfo {
  google_file_id: string;
  file_name: string;
  category: string;
  synced_at: string;
}

export interface DocumentCounts {
  byCategory: Record<string, number>;
  total: number;
  categoryCount: number;
}

export function useDocumentCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DocumentCounts>({
    byCategory: {},
    total: 0,
    categoryCount: 0
  });
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamId = user?.user_metadata?.team_id;

  const fetchCounts = useCallback(async () => {
    if (!teamId) {
      setCounts({ byCategory: {}, total: 0, categoryCount: 0 });
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: categoryData, error: catError } = await supabase.rpc('get_team_category_counts', {
        p_team_id: teamId
      });

      if (catError) throw catError;

      const catList: CategoryInfo[] = categoryData || [];
      setCategories(catList);

      const byCategory: Record<string, number> = {};
      let total = 0;

      catList.forEach((cat: CategoryInfo) => {
        byCategory[cat.category] = cat.count;
        total += cat.count;
      });

      setCounts({
        byCategory,
        total,
        categoryCount: catList.length
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching document counts:', err);
      setError('Failed to load document counts');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const getCategoryCount = useCallback((category: string): number => {
    return counts.byCategory[category] || 0;
  }, [counts]);

  const calculateFuelLevel = useCallback((): number => {
    const { total, categoryCount } = counts;

    if (total >= 1000 && categoryCount >= 8) return 5;
    if (total >= 200 && categoryCount >= 4) return 4;
    if (total >= 50 && categoryCount >= 2) return 3;
    if (total >= 1) return 2;

    return 0;
  }, [counts]);

  const getNextLevelRequirements = useCallback((currentLevel: number): string[] => {
    switch (currentLevel) {
      case 0:
        return ['Connect Google Drive and sync your first document'];
      case 1:
        return ['Sync at least 1 document'];
      case 2:
        return ['50+ documents', '2+ categories'];
      case 3:
        return ['200+ documents', '4+ categories'];
      case 4:
        return ['1000+ documents', '8+ categories'];
      case 5:
        return ['Maximum level reached!'];
      default:
        return [];
    }
  }, []);

  const meetsLevelRequirements = useCallback((level: number): boolean => {
    const { total, categoryCount } = counts;

    switch (level) {
      case 1:
        return true;
      case 2:
        return total >= 1;
      case 3:
        return total >= 50 && categoryCount >= 2;
      case 4:
        return total >= 200 && categoryCount >= 4;
      case 5:
        return total >= 1000 && categoryCount >= 8;
      default:
        return false;
    }
  }, [counts]);

  useEffect(() => {
    if (teamId) {
      fetchCounts();
    }
  }, [teamId, fetchCounts]);

  useEffect(() => {
    if (!teamId) return;

    const subscription = supabase
      .channel('document_count_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_chunks'
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teamId, fetchCounts]);

  return {
    counts,
    categories,
    loading,
    error,
    getCategoryCount,
    calculateFuelLevel,
    getNextLevelRequirements,
    meetsLevelRequirements,
    refresh: fetchCounts
  };
}
