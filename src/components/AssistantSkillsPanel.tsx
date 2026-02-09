import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Check,
  Loader2,
  DollarSign,
  Megaphone,
  Radar,
  Settings,
  Heart,
  TrendingUp,
  Pen,
  ClipboardList,
  Lightbulb,
  UserCheck,
  Sparkles,
  MessageSquarePlus,
  Send,
  X,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Skill {
  id: string;
  skill_key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  capability_areas: string[];
}

interface ActiveSkill {
  skill_id: string;
  usage_count: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign, Megaphone, Radar, Settings, Heart, TrendingUp,
  Pen, ClipboardList, Lightbulb, UserCheck, Sparkles, Zap,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; activeBorder: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', activeBorder: 'border-emerald-500/60' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', activeBorder: 'border-cyan-500/60' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', activeBorder: 'border-amber-500/60' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', activeBorder: 'border-blue-500/60' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', activeBorder: 'border-red-500/60' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', activeBorder: 'border-pink-500/60' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', activeBorder: 'border-sky-500/60' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', activeBorder: 'border-teal-500/60' },
};

const CATEGORY_LABELS: Record<string, string> = {
  analysis: 'Analysis',
  strategy: 'Strategy',
  operations: 'Operations',
  creative: 'Creative',
  leadership: 'Leadership',
};

function SuggestSkillModal({ onClose, userId, teamId }: { onClose: () => void; userId: string; teamId: string | null }) {
  const [skillName, setSkillName] = useState('');
  const [description, setDescription] = useState('');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!skillName.trim() || !description.trim()) return;
    setSubmitting(true);

    await supabase.from('feedback_submissions').insert({
      user_id: userId,
      team_id: teamId,
      feedback_type: 'feature_request',
      message: `[Skill Suggestion] ${skillName.trim()}\n\nDescription: ${description.trim()}${useCase.trim() ? `\n\nUse Case: ${useCase.trim()}` : ''}`,
      metadata: {
        source: 'skills_panel',
        suggested_skill_name: skillName.trim(),
        suggested_skill_description: description.trim(),
        suggested_skill_use_case: useCase.trim(),
      },
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-semibold">Suggest a New Skill</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-1">Suggestion Submitted</h4>
            <p className="text-gray-400 text-sm mb-4">
              Thanks for the idea! Our team will review it and consider adding it to the skills library.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <p className="text-gray-400 text-sm">
              Have an idea for a skill that would help your business? Describe it below and we will review it for a future release.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Skill Name *</label>
              <input
                type="text"
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                placeholder="e.g., Supply Chain Analyst, HR Advisor..."
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">What would it do? *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what this skill would enhance -- what kind of analysis, insights, or capabilities should it add?"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-20"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Your use case (optional)</label>
              <textarea
                value={useCase}
                onChange={e => setUseCase(e.target.value)}
                placeholder="How would you use this skill in your day-to-day work?"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-16"
                maxLength={300}
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !skillName.trim() || !description.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Submit Suggestion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssistantSkillsPanel() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeSkillIds, setActiveSkillIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [skillsRes, activeRes] = await Promise.all([
      supabase.from('assistant_skills').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_active_skills').select('skill_id, usage_count').eq('user_id', user.id),
    ]);
    setSkills((skillsRes.data as Skill[]) || []);
    setActiveSkillIds(new Set((activeRes.data || []).map((a: ActiveSkill) => a.skill_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSkill = async (skillId: string) => {
    if (!user || toggling) return;
    setToggling(skillId);

    const isActive = activeSkillIds.has(skillId);

    if (isActive) {
      const { error } = await supabase
        .from('user_active_skills')
        .delete()
        .eq('user_id', user.id)
        .eq('skill_id', skillId);

      if (!error) {
        setActiveSkillIds(prev => {
          const next = new Set(prev);
          next.delete(skillId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from('user_active_skills')
        .insert({
          user_id: user.id,
          team_id: user.user_metadata?.team_id || null,
          skill_id: skillId,
        });

      if (!error) {
        setActiveSkillIds(prev => new Set([...prev, skillId]));
      }
    }

    setToggling(null);
  };

  const categories = [...new Set(skills.map(s => s.category))];
  const activeCount = activeSkillIds.size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/20">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Assistant Skills</h2>
            <p className="text-gray-400 text-sm">
              {activeCount} skill{activeCount !== 1 ? 's' : ''} active
            </p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Skills enhance how your assistant analyzes data and provides insights. Activate the ones most relevant to your work.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {categories.map(category => {
          const categorySkills = skills.filter(s => s.category === category);
          return (
            <div key={category}>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="space-y-2">
                {categorySkills.map(skill => {
                  const Icon = ICON_MAP[skill.icon] || Sparkles;
                  const colors = COLOR_MAP[skill.color] || COLOR_MAP.blue;
                  const isActive = activeSkillIds.has(skill.id);
                  const isLoading = toggling === skill.id;

                  return (
                    <div
                      key={skill.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? `${colors.bg} ${colors.activeBorder} ring-1 ring-${skill.color}-500/20`
                          : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border} flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-white font-medium text-sm">{skill.name}</h4>
                            <button
                              onClick={() => toggleSkill(skill.id)}
                              disabled={!!toggling}
                              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? `${colors.bg} ${colors.text} border ${colors.activeBorder}`
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                              } disabled:opacity-50`}
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isActive ? (
                                <Check className="w-3 h-3" />
                              ) : null}
                              {isActive ? 'Active' : 'Activate'}
                            </button>
                          </div>
                          <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                            {skill.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {skill.capability_areas.slice(0, 4).map((area, i) => (
                              <span
                                key={i}
                                className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
                              >
                                {area}
                              </span>
                            ))}
                            {skill.capability_areas.length > 4 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                                +{skill.capability_areas.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="pt-2 pb-4">
          <button
            onClick={() => setShowSuggestModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-600 hover:border-amber-500/40 bg-gray-800/30 hover:bg-amber-500/5 text-gray-400 hover:text-amber-400 transition-all"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span className="text-sm font-medium">Suggest a New Skill</span>
          </button>
          <p className="text-center text-[11px] text-gray-600 mt-2">
            {"Don't see what you need? Submit an idea and we'll consider it."}
          </p>
        </div>
      </div>

      {showSuggestModal && user && (
        <SuggestSkillModal
          onClose={() => setShowSuggestModal(false)}
          userId={user.id}
          teamId={user.user_metadata?.team_id || null}
        />
      )}
    </div>
  );
}
