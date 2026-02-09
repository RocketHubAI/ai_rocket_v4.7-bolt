import { useState } from 'react';
import {
  Sparkles,
  Star,
  ChevronRight,
  ArrowLeft,
  Clock,
  Target,
  Search,
  Users,
  TrendingUp,
  BarChart3,
  ListOrdered,
  Newspaper,
  BookOpen,
  Cpu,
  MessageSquare,
  FileText,
  HeartPulse,
  Radar,
  GraduationCap,
  Play,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import {
  useTaskTemplates,
  CATEGORY_META,
  type TaskTemplate,
} from '../../hooks/useTaskTemplates';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Search,
  Users,
  TrendingUp,
  BarChart3,
  ListOrdered,
  Newspaper,
  BookOpen,
  Cpu,
  MessageSquare,
  FileText,
  HeartPulse,
  Radar,
  GraduationCap,
  Sparkles,
  Star,
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'text-emerald-400',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  amber: 'text-amber-400',
  teal: 'text-teal-400',
  red: 'text-red-400',
};

const BG_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/15 border-emerald-500/20',
  blue: 'bg-blue-500/15 border-blue-500/20',
  cyan: 'bg-cyan-500/15 border-cyan-500/20',
  amber: 'bg-amber-500/15 border-amber-500/20',
  teal: 'bg-teal-500/15 border-teal-500/20',
  red: 'bg-red-500/15 border-red-500/20',
};

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const period = i >= 12 ? 'PM' : 'AM';
  const display = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${display}:00 ${period}` };
});

const DAY_NAME_TO_NUM: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

interface TaskTemplateBuilderProps {
  onClose: () => void;
}

export default function TaskTemplateBuilder({ onClose }: TaskTemplateBuilderProps) {
  const { templates, categories, popularTemplates, getTemplatesByCategory, loading } = useTaskTemplates();
  const { session } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [customTitle, setCustomTitle] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleDay, setScheduleDay] = useState<number | null>(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');

  const selectTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setCustomTitle(template.title);
    setCustomPrompt(template.ai_prompt_template);
    setFrequency(template.default_schedule_type);
    const [hourStr] = template.default_schedule_time.split(':');
    setScheduleHour(parseInt(hourStr, 10) || 9);
    setScheduleDay(
      template.default_schedule_day
        ? DAY_NAME_TO_NUM[template.default_schedule_day.toLowerCase()] ?? 1
        : 1
    );
    setCreated(false);
    setError('');
  };

  const handleCreate = async () => {
    if (!customTitle.trim() || !customPrompt.trim()) {
      setError('Title and prompt are required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-scheduled-task`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: customTitle.trim(),
          description: selectedTemplate?.description || '',
          task_type: selectedTemplate?.task_type || 'custom',
          frequency,
          schedule_hour: scheduleHour,
          schedule_minute: 0,
          schedule_day: (frequency === 'weekly' || frequency === 'biweekly') ? scheduleDay : undefined,
          ai_prompt: customPrompt.trim(),
          delivery_method: 'conversation',
          metadata: selectedTemplate ? { template_id: selectedTemplate.id } : {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      setCreated(true);
      setTimeout(() => {
        setSelectedTemplate(null);
        setCreated(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (selectedTemplate) {
    const TemplateIcon = ICON_MAP[selectedTemplate.icon] || Sparkles;
    const colorClass = COLOR_MAP[selectedTemplate.color] || 'text-blue-400';

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTemplate(null)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={`p-2 rounded-lg bg-gray-700/50 ${colorClass}`}>
            <TemplateIcon className="w-4 h-4" />
          </div>
          <h3 className="text-white font-medium">Customize Task</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Task Name</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter task name..."
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">AI Instructions</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="What should the AI do each time this runs?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
                <option value="once">One Time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Time</label>
              <select
                value={scheduleHour}
                onChange={(e) => setScheduleHour(parseInt(e.target.value, 10))}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Day of Week</label>
              <select
                value={scheduleDay ?? 1}
                onChange={(e) => setScheduleDay(parseInt(e.target.value, 10))}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || created}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              created
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50`}
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : created ? (
              <><Check className="w-4 h-4" /> Task Created</>
            ) : (
              <><Play className="w-4 h-4" /> Create & Activate</>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (activeCategory) {
    const meta = CATEGORY_META[activeCategory] || { label: activeCategory, icon: 'Sparkles', color: 'blue' };
    const CategoryIcon = ICON_MAP[meta.icon] || Sparkles;
    const categoryTemplates = getTemplatesByCategory(activeCategory);

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveCategory(null)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <CategoryIcon className={`w-5 h-5 ${COLOR_MAP[meta.color] || 'text-blue-400'}`} />
          <h3 className="text-white font-medium">{meta.label}</h3>
          <span className="text-xs text-gray-500">({categoryTemplates.length} templates)</span>
        </div>

        {categoryTemplates.map((template) => {
          const Icon = ICON_MAP[template.icon] || Sparkles;
          return (
            <button
              key={template.id}
              onClick={() => selectTemplate(template)}
              className="w-full text-left bg-gray-700/30 hover:bg-gray-700/60 border border-gray-600/50 hover:border-gray-500 rounded-lg p-3 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg border ${BG_COLOR_MAP[template.color] || BG_COLOR_MAP.blue}`}>
                  <Icon className={`w-4 h-4 ${COLOR_MAP[template.color] || 'text-blue-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white text-sm font-medium">{template.title}</h4>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="capitalize">{template.default_schedule_type}</span>
                    <span>at {template.default_schedule_time}</span>
                    {template.default_schedule_day && (
                      <span className="capitalize">on {template.default_schedule_day}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-semibold">Task Templates</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Browse pre-built task templates to get started quickly. Pick one and customize it to fit your needs.
      </p>

      {popularTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Popular</span>
          </div>
          <div className="space-y-2">
            {popularTemplates.map((template) => {
              const Icon = ICON_MAP[template.icon] || Sparkles;
              return (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className="w-full text-left bg-gray-700/30 hover:bg-gray-700/60 border border-gray-600/50 hover:border-amber-500/30 rounded-lg p-3 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${BG_COLOR_MAP[template.color] || BG_COLOR_MAP.blue}`}>
                      <Icon className={`w-4 h-4 ${COLOR_MAP[template.color] || 'text-blue-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium">{template.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{template.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Categories</span>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat] || { label: cat, icon: 'Sparkles', color: 'blue' };
            const CatIcon = ICON_MAP[meta.icon] || Sparkles;
            const count = getTemplatesByCategory(cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-left p-3 rounded-lg border transition-all hover:scale-[1.02] ${BG_COLOR_MAP[meta.color] || BG_COLOR_MAP.blue} hover:border-gray-500`}
              >
                <CatIcon className={`w-5 h-5 ${COLOR_MAP[meta.color] || 'text-blue-400'} mb-1.5`} />
                <div className="text-white text-sm font-medium">{meta.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{count} template{count !== 1 ? 's' : ''}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
