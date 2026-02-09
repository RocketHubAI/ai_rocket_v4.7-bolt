import React, { useState, useEffect, useMemo } from 'react';
import { FileCode, Search, Filter, Calendar, TrendingUp, Code } from 'lucide-react';

interface DevUpdate {
  date: string;
  title: string;
  category: string;
  impactScore: number;
  description: string;
  changes: string[];
}

interface MonthGroup {
  monthYear: string;
  updates: DevUpdate[];
}

interface DevUpdatesPanelProps {
  onMetricsLoad?: (count: number) => void;
}

const categoryColors: Record<string, string> = {
  'Feature': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Major Feature': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Feature Enhancement': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Bug Fix': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Enhancement': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Security': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Performance': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Cleanup': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'Infrastructure': 'bg-teal-500/20 text-teal-400 border-teal-500/30'
};

const getImpactColor = (score: number): string => {
  if (score >= 9) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 7) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (score >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (score >= 3) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

export const DevUpdatesPanel: React.FC<DevUpdatesPanelProps> = ({ onMetricsLoad }) => {
  const [updates, setUpdates] = useState<DevUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<number>(0);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDevUpdates();
  }, []);

  const loadDevUpdates = async () => {
    try {
      const response = await fetch('/DEV_UPDATES.md');
      const text = await response.text();
      const parsed = parseDevUpdates(text);
      setUpdates(parsed);
      if (onMetricsLoad) {
        onMetricsLoad(parsed.length);
      }

      if (parsed.length > 0) {
        const firstMonth = `${parsed[0].date.slice(0, 7)}`;
        setExpandedMonths(new Set([firstMonth]));
      }
    } catch (error) {
      console.error('Error loading dev updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseDevUpdates = (markdown: string): DevUpdate[] => {
    const updates: DevUpdate[] = [];
    const lines = markdown.split('\n');

    let currentUpdate: Partial<DevUpdate> | null = null;
    let inChanges = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#### ') && line.includes(':')) {
        if (currentUpdate?.date) {
          updates.push(currentUpdate as DevUpdate);
        }

        const parts = line.replace('#### ', '').split(': ');
        currentUpdate = {
          date: parts[0],
          title: parts.slice(1).join(': '),
          category: '',
          impactScore: 0,
          description: '',
          changes: []
        };
        inChanges = false;
      } else if (currentUpdate && line.startsWith('- **Category**:')) {
        currentUpdate.category = line.replace('- **Category**:', '').trim();
      } else if (currentUpdate && line.startsWith('- **Impact Score**:')) {
        currentUpdate.impactScore = parseInt(line.replace('- **Impact Score**:', '').trim()) || 0;
      } else if (currentUpdate && line.startsWith('- **Description**:')) {
        currentUpdate.description = line.replace('- **Description**:', '').trim();
      } else if (currentUpdate && line.startsWith('- **Changes**:')) {
        inChanges = true;
      } else if (currentUpdate && inChanges && line.startsWith('  -')) {
        currentUpdate.changes = currentUpdate.changes || [];
        currentUpdate.changes.push(line.replace('  -', '').trim());
      }
    }

    if (currentUpdate?.date) {
      updates.push(currentUpdate as DevUpdate);
    }

    return updates;
  };

  const filteredUpdates = useMemo(() => {
    return updates.filter(update => {
      const matchesSearch = searchQuery === '' ||
        update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        update.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        update.changes.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || update.category === selectedCategory;
      const matchesImpact = selectedImpact === 0 || update.impactScore >= selectedImpact;

      return matchesSearch && matchesCategory && matchesImpact;
    });
  }, [updates, searchQuery, selectedCategory, selectedImpact]);

  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: DevUpdate[] } = {};

    filteredUpdates.forEach(update => {
      const monthYear = `${update.date.slice(0, 7)}`;
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(update);
    });

    const sortedGroups: MonthGroup[] = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(monthYear => ({
        monthYear,
        updates: groups[monthYear]
      }));

    return sortedGroups;
  }, [filteredUpdates]);

  const categories = useMemo(() => {
    const cats = new Set(updates.map(u => u.category));
    return Array.from(cats).sort();
  }, [updates]);

  const stats = useMemo(() => {
    return {
      total: updates.length,
      avgImpact: updates.length > 0
        ? (updates.reduce((sum, u) => sum + u.impactScore, 0) / updates.length).toFixed(1)
        : '0',
      highImpact: updates.filter(u => u.impactScore >= 7).length
    };
  }, [updates]);

  const toggleMonth = (monthYear: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthYear)) {
      newExpanded.delete(monthYear);
    } else {
      newExpanded.add(monthYear);
    }
    setExpandedMonths(newExpanded);
  };

  const formatMonthYear = (monthYear: string): string => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading development updates...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <FileCode className="w-6 h-6 text-blue-400" />
          Development Updates
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Updates</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.avgImpact}</div>
          <div className="text-sm text-gray-400">Average Impact Score</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.highImpact}</div>
          <div className="text-sm text-gray-400">High Impact (7+)</div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search updates..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Min Impact Score</label>
              <select
                value={selectedImpact}
                onChange={(e) => setSelectedImpact(parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="0">All Scores</option>
                <option value="5">5+ (Significant)</option>
                <option value="7">7+ (Major)</option>
                <option value="9">9+ (Critical)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {groupedByMonth.map(group => (
          <div key={group.monthYear} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleMonth(group.monthYear)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-semibold text-white">
                  {formatMonthYear(group.monthYear)}
                </span>
                <span className="text-sm text-gray-400">
                  ({group.updates.length} update{group.updates.length !== 1 ? 's' : ''})
                </span>
              </div>
              <Code className={`w-5 h-5 text-gray-400 transition-transform ${expandedMonths.has(group.monthYear) ? 'rotate-90' : ''}`} />
            </button>

            {expandedMonths.has(group.monthYear) && (
              <div className="border-t border-gray-700 p-4 space-y-4">
                {group.updates.map((update, idx) => (
                  <div key={idx} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-500">{update.date}</span>
                          <span className={`text-xs px-2 py-1 rounded-full border ${categoryColors[update.category] || categoryColors['Enhancement']}`}>
                            {update.category}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getImpactColor(update.impactScore)}`}>
                            Impact: {update.impactScore}/10
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">{update.title}</h3>
                        <p className="text-gray-400 text-sm mb-3">{update.description}</p>
                      </div>
                    </div>

                    {update.changes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-sm font-semibold text-gray-300 mb-2">Changes:</div>
                        <ul className="space-y-1">
                          {update.changes.map((change, changeIdx) => (
                            <li key={changeIdx} className="text-sm text-gray-400 flex items-start gap-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {groupedByMonth.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No updates found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};
