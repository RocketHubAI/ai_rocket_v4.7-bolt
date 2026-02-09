import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type LibraryItemType = 'report' | 'image' | 'presentation';

export interface UnifiedLibraryItem {
  id: string;
  title: string;
  type: LibraryItemType;
  createdAt: string;
  content?: string;
  contentTypes?: string[];
  style?: string;
  layout?: string;
  slideCount?: number;
  thumbnailUrl?: string;
  thumbnailBase64?: string;
  originalPrompt?: string;
  slides?: {
    id: string;
    slideNumber: number;
    title: string;
    content?: string;
    imageUrl?: string;
    imageBase64?: string;
    bulletPoints?: string[];
    metrics?: { label: string; value: string; trend?: string }[];
  }[];
  slidesLoaded?: boolean;
}

const ITEMS_PER_PAGE = 20;

async function fetchLibraryData(
  userId: string,
  teamId: string,
  pageNum: number
): Promise<{ items: UnifiedLibraryItem[]; hasMore: boolean }> {
  const offset = pageNum * ITEMS_PER_PAGE;

  const [reportsResult, visualizationsResult] = await Promise.all([
    supabase
      .from('saved_visualizations')
      .select('id, title, saved_at, original_prompt')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1),

    supabase
      .from('astra_visualizations')
      .select(`
        id,
        title,
        type,
        content_types,
        style,
        layout,
        slide_count,
        generated_at,
        custom_prompt,
        status
      `)
      .eq('team_id', teamId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1)
  ]);

  if (reportsResult.error) throw reportsResult.error;
  if (visualizationsResult.error) throw visualizationsResult.error;

  const vizIds = (visualizationsResult.data || []).map((v: any) => v.id);
  let thumbnails: Record<string, { imageUrl?: string; imageBase64?: string }> = {};

  if (vizIds.length > 0) {
    const { data: slideData } = await supabase
      .from('astra_visualization_slides')
      .select('visualization_id, image_url, image_base64')
      .in('visualization_id', vizIds)
      .eq('slide_number', 1);

    if (slideData) {
      thumbnails = slideData.reduce((acc: any, s: any) => {
        acc[s.visualization_id] = {
          imageUrl: s.image_url,
          imageBase64: s.image_base64
        };
        return acc;
      }, {});
    }
  }

  const reports: UnifiedLibraryItem[] = (reportsResult.data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    type: 'report' as LibraryItemType,
    createdAt: r.saved_at,
    originalPrompt: r.original_prompt,
    slidesLoaded: false
  }));

  const visualizations: UnifiedLibraryItem[] = (visualizationsResult.data || []).map((v: any) => {
    const thumb = thumbnails[v.id];
    return {
      id: v.id,
      title: v.title,
      type: v.type === 'single_image' ? 'image' as LibraryItemType : 'presentation' as LibraryItemType,
      createdAt: v.generated_at,
      contentTypes: v.content_types || [],
      style: v.style,
      layout: v.layout,
      slideCount: v.slide_count,
      thumbnailUrl: thumb?.imageUrl,
      thumbnailBase64: thumb?.imageBase64,
      originalPrompt: v.custom_prompt,
      slidesLoaded: false
    };
  });

  const combined = [...reports, ...visualizations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const hasMore = reportsResult.data?.length === ITEMS_PER_PAGE ||
                  visualizationsResult.data?.length === ITEMS_PER_PAGE;

  return { items: combined, hasMore };
}

export function useUnifiedLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const teamId = user?.user_metadata?.team_id;
  const userId = user?.id;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || !teamId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    fetchLibraryData(userId, teamId, 0)
      .then(({ items: newItems, hasMore: more }) => {
        if (mountedRef.current && fetchIdRef.current === currentFetchId) {
          setItems(newItems);
          setHasMore(more);
          setPage(0);
        }
      })
      .catch((err) => {
        console.error('Error fetching library:', err);
        if (mountedRef.current && fetchIdRef.current === currentFetchId) {
          setError('Failed to load library');
        }
      })
      .finally(() => {
        if (mountedRef.current && fetchIdRef.current === currentFetchId) {
          setLoading(false);
        }
      });
  }, [userId, teamId]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !userId || !teamId) return;

    const nextPage = page + 1;
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);

    try {
      const { items: newItems, hasMore: more } = await fetchLibraryData(userId, teamId, nextPage);

      if (mountedRef.current && fetchIdRef.current === currentFetchId) {
        const existingIds = new Set(items.map(i => i.id));
        const uniqueNewItems = newItems.filter(i => !existingIds.has(i.id));

        setItems(prev => {
          const combined = [...prev, ...uniqueNewItems];
          return combined.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setHasMore(more);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      if (mountedRef.current && fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [loading, hasMore, userId, teamId, page, items]);

  const refresh = useCallback(async () => {
    if (!userId || !teamId) return;

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const { items: newItems, hasMore: more } = await fetchLibraryData(userId, teamId, 0);

      if (mountedRef.current && fetchIdRef.current === currentFetchId) {
        setItems(newItems);
        setHasMore(more);
        setPage(0);
      }
    } catch (err) {
      console.error('Error refreshing library:', err);
      if (mountedRef.current && fetchIdRef.current === currentFetchId) {
        setError('Failed to refresh library');
      }
    } finally {
      if (mountedRef.current && fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [userId, teamId]);

  const loadItemSlides = useCallback(async (itemId: string): Promise<UnifiedLibraryItem | null> => {
    const item = items.find(i => i.id === itemId);
    if (!item) return null;

    if (item.slidesLoaded && (item.slides || item.content)) {
      return item;
    }

    if (item.type === 'report') {
      const { data, error } = await supabase
        .from('saved_visualizations')
        .select('visualization_data')
        .eq('id', itemId)
        .maybeSingle();

      if (error || !data) return null;

      const updatedItem = { ...item, content: data.visualization_data, slidesLoaded: true };
      setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      return updatedItem;
    }

    const { data: slides, error } = await supabase
      .from('astra_visualization_slides')
      .select('id, slide_number, title, content, image_url, image_base64, bullet_points, metrics')
      .eq('visualization_id', itemId)
      .order('slide_number', { ascending: true });

    if (error) return null;

    const mappedSlides = (slides || []).map((s: any) => ({
      id: s.id,
      slideNumber: s.slide_number,
      title: s.title || '',
      content: s.content || '',
      imageUrl: s.image_url,
      imageBase64: s.image_base64,
      bulletPoints: s.bullet_points || [],
      metrics: s.metrics || []
    }));

    const updatedItem = { ...item, slides: mappedSlides, slidesLoaded: true };
    setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
    return updatedItem;
  }, [items]);

  const deleteItem = useCallback(async (id: string, type: LibraryItemType): Promise<boolean> => {
    try {
      const table = type === 'report' ? 'saved_visualizations' : 'astra_visualizations';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting item:', err);
      return false;
    }
  }, []);

  const getItemsByType = useCallback((type: LibraryItemType | 'all'): UnifiedLibraryItem[] => {
    if (type === 'all') return items;
    return items.filter(item => item.type === type);
  }, [items]);

  const searchItems = useCallback((query: string): UnifiedLibraryItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.originalPrompt?.toLowerCase().includes(lowerQuery)
    );
  }, [items]);

  return {
    items,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    loadItemSlides,
    deleteItem,
    getItemsByType,
    searchItems,
    counts: {
      all: items.length,
      reports: items.filter(i => i.type === 'report').length,
      images: items.filter(i => i.type === 'image').length,
      presentations: items.filter(i => i.type === 'presentation').length
    }
  };
}
