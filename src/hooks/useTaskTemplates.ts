import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TaskTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  task_type: string;
  default_schedule_type: string;
  default_schedule_time: string;
  default_schedule_day: string | null;
  ai_prompt_template: string;
  icon: string;
  color: string;
  is_popular: boolean;
  sort_order: number;
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  productivity: { label: 'Productivity', icon: 'Target', color: 'emerald' },
  research: { label: 'Research & Intelligence', icon: 'Search', color: 'cyan' },
  team: { label: 'Team & Alignment', icon: 'Users', color: 'blue' },
  growth: { label: 'Growth & Strategy', icon: 'TrendingUp', color: 'amber' },
};

export { CATEGORY_META };

export function useTaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_task_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[TaskTemplates] Fetch error:', error.message);
        return;
      }

      setTemplates((data as TaskTemplate[]) || []);
    } catch (err) {
      console.error('[TaskTemplates] Unexpected error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const categories = [...new Set(templates.map(t => t.category))];

  const popularTemplates = templates.filter(t => t.is_popular);

  const getTemplatesByCategory = (category: string) =>
    templates.filter(t => t.category === category);

  return {
    templates,
    categories,
    popularTemplates,
    getTemplatesByCategory,
    loading,
  };
}
