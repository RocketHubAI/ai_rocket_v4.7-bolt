import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Users, Loader2, ChevronDown, ChevronRight, Info, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CategoryAccess {
  category: string;
  has_access: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member';
  categories: CategoryAccess[];
}

interface CategoryAccessManagerProps {
  teamId: string;
  onChange?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  meetings: 'Meetings',
  strategy: 'Strategy',
  financial: 'Financial',
  operations: 'Operations',
  marketing: 'Marketing',
  sales: 'Sales',
  customer: 'Customer',
  product: 'Product',
  people: 'People',
  legal: 'Legal',
  support: 'Support',
  industry: 'Industry',
  reference: 'Reference',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  meetings: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  strategy: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  financial: 'bg-green-500/20 text-green-400 border-green-500/30',
  operations: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  marketing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  sales: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  customer: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  product: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  people: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  legal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  support: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  industry: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  reference: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const CategoryAccessManager: React.FC<CategoryAccessManagerProps> = ({ teamId, onChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamCategories, setTeamCategories] = useState<string[]>([]);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [isTeamCreator, setIsTeamCreator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (teamId) {
      loadData();
    }
  }, [teamId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('created_by')
        .eq('id', teamId)
        .maybeSingle();

      const isCreator = teamData?.created_by === user?.id;
      setIsTeamCreator(isCreator);

      const { data: currentUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .maybeSingle();

      setIsAdmin(currentUserData?.role === 'admin');

      const { data: categoriesData, error: categoriesError } = await supabase
        .rpc('get_team_categories', { p_team_id: teamId });

      if (categoriesError) throw categoriesError;

      const categories = (categoriesData || []).map((c: { category: string }) => c.category);
      setTeamCategories(categories);

      const { data: accessData, error: accessError } = await supabase
        .rpc('get_team_member_category_access', { p_team_id: teamId });

      if (accessError) throw accessError;

      const memberMap = new Map<string, TeamMember>();

      (accessData || []).forEach((row: any) => {
        if (!memberMap.has(row.user_id)) {
          memberMap.set(row.user_id, {
            id: row.user_id,
            email: row.email,
            name: row.name,
            role: row.role,
            categories: [],
          });
        }
        memberMap.get(row.user_id)!.categories.push({
          category: row.category,
          has_access: row.has_access,
        });
      });

      const sortedMembers = Array.from(memberMap.values()).sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.email.localeCompare(b.email);
      });

      setMembers(sortedMembers);
    } catch (err: any) {
      console.error('Error loading category access data:', err);
      setError(err.message || 'Failed to load category access data');
    } finally {
      setLoading(false);
    }
  };

  const canEditMember = (member: TeamMember): boolean => {
    if (member.id === user?.id) return false;
    if (isTeamCreator) return true;
    if (isAdmin && member.role === 'member') return true;
    return false;
  };

  const getPermissionReason = (member: TeamMember): string | null => {
    if (member.id === user?.id) return 'You cannot modify your own category access';
    if (!isTeamCreator && !isAdmin) return 'Only admins can modify category access';
    if (!isTeamCreator && isAdmin && member.role === 'admin') {
      return 'Only the account creator can modify admin category access';
    }
    return null;
  };

  const handleToggleAccess = async (memberId: string, category: string, currentAccess: boolean) => {
    const member = members.find(m => m.id === memberId);
    if (!member || !canEditMember(member)) return;

    setSaving(`${memberId}-${category}`);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: updateError } = await supabase.rpc('update_user_category_access', {
        p_user_id: memberId,
        p_category: category,
        p_has_access: !currentAccess,
        p_granted_by: user?.id,
      });

      if (updateError) throw updateError;

      setMembers(prev =>
        prev.map(m => {
          if (m.id === memberId) {
            return {
              ...m,
              categories: m.categories.map(c =>
                c.category === category ? { ...c, has_access: !currentAccess } : c
              ),
            };
          }
          return m;
        })
      );

      setSuccessMessage(`Updated ${category} access for ${member.name || member.email}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      onChange?.();
    } catch (err: any) {
      console.error('Error updating category access:', err);
      setError(err.message || 'Failed to update category access');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleAllForMember = async (memberId: string, enable: boolean) => {
    const member = members.find(m => m.id === memberId);
    if (!member || !canEditMember(member)) return;

    setSaving(memberId);
    setError(null);

    try {
      for (const cat of member.categories) {
        if (cat.has_access !== enable) {
          await supabase.rpc('update_user_category_access', {
            p_user_id: memberId,
            p_category: cat.category,
            p_has_access: enable,
            p_granted_by: user?.id,
          });
        }
      }

      setMembers(prev =>
        prev.map(m => {
          if (m.id === memberId) {
            return {
              ...m,
              categories: m.categories.map(c => ({ ...c, has_access: enable })),
            };
          }
          return m;
        })
      );

      setSuccessMessage(`${enable ? 'Enabled' : 'Disabled'} all categories for ${member.name || member.email}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      onChange?.();
    } catch (err: any) {
      console.error('Error updating category access:', err);
      setError(err.message || 'Failed to update category access');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (teamCategories.length === 0) {
    return (
      <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600 text-center">
        <Info className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 mb-2">No categories available yet</p>
        <p className="text-sm text-gray-500">
          Category access settings will appear here once your team has synced data with categories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Category Access Control</h3>
          <p className="text-sm text-gray-400">
            Manage which data categories each team member can access
          </p>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200 space-y-2">
            <p className="font-medium">Permission Levels</p>
            <ul className="space-y-1 text-xs text-blue-300">
              <li><strong>Account Creator:</strong> Can manage category access for all team members (admins and members)</li>
              <li><strong>Admin:</strong> Can manage category access for members only, not for other admins</li>
              <li><strong>Member:</strong> Cannot modify category access settings</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-sm text-gray-400">Team Categories:</span>
        {teamCategories.map(cat => (
          <span
            key={cat}
            className={`px-2 py-1 text-xs rounded-full border ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {members.map(member => {
          const isExpanded = expandedMember === member.id;
          const canEdit = canEditMember(member);
          const permissionReason = getPermissionReason(member);
          const accessCount = member.categories.filter(c => c.has_access).length;
          const totalCount = member.categories.length;
          const isCurrentUser = member.id === user?.id;
          const isSavingMember = saving === member.id || saving?.startsWith(`${member.id}-`);

          return (
            <div
              key={member.id}
              className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {member.name || member.email.split('@')[0]}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          member.role === 'admin'
                            ? 'text-yellow-400 bg-yellow-500/10'
                            : 'text-gray-400 bg-gray-500/10'
                        }`}
                      >
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                      {!canEdit && (
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-400">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-sm font-medium ${
                      accessCount === totalCount
                        ? 'text-green-400'
                        : accessCount === 0
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}>
                      {accessCount}/{totalCount} categories
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                  {permissionReason && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <Lock className="w-4 h-4" />
                        <span>{permissionReason}</span>
                      </div>
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => handleToggleAllForMember(member.id, true)}
                        disabled={isSavingMember}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Enable All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllForMember(member.id, false)}
                        disabled={isSavingMember}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Disable All
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {member.categories.map(cat => {
                      const isSavingThis = saving === `${member.id}-${cat.category}`;
                      const colorClass = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;

                      return (
                        <button
                          key={cat.category}
                          type="button"
                          onClick={() => canEdit && handleToggleAccess(member.id, cat.category, cat.has_access)}
                          disabled={!canEdit || isSavingMember}
                          className={`
                            relative p-3 rounded-lg border transition-all text-left
                            ${cat.has_access
                              ? `${colorClass} hover:opacity-80`
                              : 'bg-gray-800 border-gray-600 text-gray-500 hover:border-gray-500'
                            }
                            ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                            ${isSavingMember ? 'opacity-50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {CATEGORY_LABELS[cat.category] || cat.category}
                            </span>
                            {isSavingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : cat.has_access ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-xs opacity-70">
                            {cat.has_access ? 'Has access' : 'No access'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No team members found</p>
        </div>
      )}
    </div>
  );
};
