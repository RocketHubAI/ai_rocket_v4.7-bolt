import React, { useState, useEffect, useCallback } from 'react';
import { X, Grid, FileText, Loader, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CategoryData {
  category: string;
  count: number;
}

interface CategoriesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryClick: (category: string) => void;
  categories?: string[];
}

const CATEGORY_INFO: Record<string, { description: string; color: string; bgColor: string; borderColor: string }> = {
  strategy: {
    description: 'Strategic plans, vision statements, goals, OKRs',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30'
  },
  meetings: {
    description: 'Meeting notes, transcripts, minutes, agendas',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30'
  },
  financial: {
    description: 'Financial reports, budgets, forecasts, P&L',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30'
  },
  sales: {
    description: 'Sales proposals, deals, pipelines, quotes',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30'
  },
  marketing: {
    description: 'Campaigns, content plans, analytics, branding',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/30'
  },
  product: {
    description: 'Roadmaps, specs, release notes, features',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30'
  },
  people: {
    description: 'HR documents, hiring, team resources',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/30'
  },
  operations: {
    description: 'SOPs, processes, guides, procedures',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30'
  },
  customer: {
    description: 'Customer feedback, support, success stories',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30'
  },
  legal: {
    description: 'Contracts, compliance, policies, agreements',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30'
  },
  industry: {
    description: 'Market research, competitor analysis, trends',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30'
  },
  reference: {
    description: 'Resources, templates, tools, guides',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30'
  },
  other: {
    description: 'Uncategorized documents',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30'
  },
};

export const CategoriesDetailModal: React.FC<CategoriesDetailModalProps> = ({
  isOpen,
  onClose,
  onCategoryClick,
  categories: providedCategories
}) => {
  const { user } = useAuth();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const teamId = user?.user_metadata?.team_id;

  const fetchCategoryData = useCallback(async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_team_category_counts', {
        p_team_id: teamId
      });

      if (error) throw error;

      setCategoryData(data || []);
      setTotalDocuments((data || []).reduce((sum: number, cat: CategoryData) => sum + cat.count, 0));
    } catch (err) {
      console.error('Error fetching category data:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (isOpen) {
      fetchCategoryData();
    }
  }, [isOpen, fetchCategoryData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Grid className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Data Categories</h2>
              <p className="text-sm text-gray-400">
                {categoryData.length} categories, {totalDocuments} documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700 bg-blue-900/10">
          <p className="text-sm text-blue-300">
            AI automatically categorizes your documents into these business categories. Click a category to view its documents.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : categoryData.length === 0 ? (
            <div className="text-center py-12">
              <Grid className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No categories found</p>
              <p className="text-sm text-gray-500 mt-1">Sync some documents to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categoryData.map((cat) => {
                const info = CATEGORY_INFO[cat.category] || CATEGORY_INFO.other;
                const percentage = totalDocuments > 0 ? Math.round((cat.count / totalDocuments) * 100) : 0;

                return (
                  <button
                    key={cat.category}
                    onClick={() => onCategoryClick(cat.category)}
                    className={`w-full ${info.bgColor} border ${info.borderColor} rounded-lg p-4 hover:brightness-110 transition-all text-left group`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${info.bgColor} flex items-center justify-center`}>
                          <FileText className={`w-5 h-5 ${info.color}`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold capitalize ${info.color}`}>
                            {cat.category}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {info.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{cat.count}</p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${info.bgColor.replace('/20', '')} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
