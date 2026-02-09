import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, TrendingUp, Calendar, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  version: string;
  feature_type: 'new_feature' | 'improvement';
  date_added: string;
  display_order: number;
}

export function WhatsNewSection() {
  const [items, setItems] = useState<WhatsNewItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadWhatsNew();
  }, []);

  const loadWhatsNew = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No active session');
        setError('Please sign in to view updates.');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('whats_new')
        .select('*')
        .eq('is_published', true)
        .order('date_added', { ascending: false });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        throw fetchError;
      }

      console.log('Loaded whats_new items:', data?.length);
      setItems(data || []);
    } catch (err: any) {
      console.error('Failed to load what\'s new:', err);
      setError(err.message || 'Failed to load updates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getFeatureIcon = (type: string) => {
    return type === 'new_feature' ? (
      <Sparkles className="w-5 h-5 text-orange-500" />
    ) : (
      <TrendingUp className="w-5 h-5 text-blue-500" />
    );
  };

  const getFeatureLabel = (type: string) => {
    return type === 'new_feature' ? 'New Feature' : 'Improvement';
  };

  const getFeatureBadgeColor = (type: string) => {
    return type === 'new_feature'
      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={loadWhatsNew}
          className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">No updates available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isExpanded = expandedItems.has(item.id);
        const isNewest = index === 0;

        return (
          <div
            key={item.id}
            className={`border rounded-lg transition-all ${
              isNewest
                ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-blue-500/5'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            <button
              onClick={() => toggleExpanded(item.id)}
              className="w-full p-4 text-left flex items-start gap-3 hover:bg-white/5 transition-colors rounded-lg"
            >
              <div className="flex-shrink-0 mt-1">
                {getFeatureIcon(item.feature_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm leading-tight">
                    {item.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md border ${getFeatureBadgeColor(
                      item.feature_type
                    )}`}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {getFeatureLabel(item.feature_type)}
                  </span>

                  <span className="inline-flex items-center text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(item.date_added), 'MMM d, yyyy')}
                  </span>
                </div>

                {!isExpanded && (
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {item.description.split('\n')[0]}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0">
                <div className="pl-8 pr-8 pt-2 border-t border-gray-700">
                  <div className="prose prose-sm prose-invert max-w-none">
                    {item.description.split('\n\n').map((paragraph, idx) => {
                      if (paragraph.trim().startsWith('•')) {
                        const items = paragraph
                          .split('\n')
                          .filter((line) => line.trim().startsWith('•'));
                        return (
                          <ul key={idx} className="space-y-2 my-3">
                            {items.map((listItem, listIdx) => (
                              <li
                                key={listIdx}
                                className="text-gray-300 text-sm leading-relaxed"
                              >
                                {listItem.replace('•', '').trim()}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p
                          key={idx}
                          className="text-gray-300 text-sm leading-relaxed mb-3"
                        >
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
