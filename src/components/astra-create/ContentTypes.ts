import {
  Users, Target, Heart, Flag, Calendar, CalendarDays, CalendarRange,
  AlertTriangle, DollarSign, Trophy, TrendingUp, Lightbulb, MessageSquare,
  Megaphone, Award
} from 'lucide-react';

export interface ContentType {
  id: string;
  name: string;
  description: string;
  icon: typeof Users;
  category: 'overview' | 'foundation' | 'progress' | 'marketing' | 'analysis' | 'custom';
  requiredCategories?: string[];
  minDocuments?: number;
}

export const CONTENT_TYPE_DATA_REQUIREMENTS: Record<string, { categories: string[]; minDocs: number; reason: string }> = {
  team_snapshot: { categories: [], minDocs: 5, reason: 'Requires at least 5 synced documents for a meaningful snapshot' },
  mission: { categories: ['strategy', 'planning'], minDocs: 2, reason: 'Requires strategy or planning documents' },
  core_values: { categories: ['strategy', 'culture'], minDocs: 1, reason: 'Requires documents about company culture or values' },
  goals: { categories: ['strategy', 'planning', 'projects'], minDocs: 2, reason: 'Requires strategy, planning, or project documents' },
  weekly_review: { categories: ['meetings'], minDocs: 1, reason: 'Requires meeting notes or recordings' },
  quarterly_review: { categories: ['meetings', 'projects'], minDocs: 5, reason: 'Requires meeting notes and project documents' },
  yearly_review: { categories: ['meetings', 'projects', 'strategy'], minDocs: 10, reason: 'Requires substantial meeting and project history' },
  sales_campaign: { categories: ['strategy', 'projects'], minDocs: 1, reason: 'Requires strategy or project documents' },
  thought_leadership: { categories: ['strategy', 'planning', 'meetings'], minDocs: 2, reason: 'Requires strategy, planning, or meeting documents' },
  challenges_opportunities: { categories: ['strategy', 'planning'], minDocs: 2, reason: 'Requires strategic planning documents' },
  financial_health: { categories: ['financial'], minDocs: 1, reason: 'Requires financial documents' },
  team_wins: { categories: ['meetings', 'projects'], minDocs: 3, reason: 'Requires meeting notes or project updates' },
  trends_insights: { categories: ['strategy', 'planning', 'meetings'], minDocs: 3, reason: 'Requires strategy, planning, or meeting documents' },
  innovation_ideas: { categories: ['strategy', 'planning', 'projects'], minDocs: 1, reason: 'Requires planning or project documents' },
  custom: { categories: [], minDocs: 0, reason: '' }
};

export const CONTENT_TYPES: ContentType[] = [
  {
    id: 'team_snapshot',
    name: 'Team Snapshot',
    description: 'A comprehensive overview of your team\'s current state, activities, and momentum',
    icon: Users,
    category: 'overview'
  },
  {
    id: 'team_wins',
    name: 'Team Wins & Celebrations',
    description: 'Recent achievements, milestones, and recognition moments',
    icon: Trophy,
    category: 'overview'
  },
  {
    id: 'mission',
    name: 'Mission',
    description: 'Your organization\'s purpose, vision, and the impact you\'re creating',
    icon: Target,
    category: 'foundation'
  },
  {
    id: 'core_values',
    name: 'Core Values',
    description: 'The principles and beliefs that guide your team\'s decisions and culture',
    icon: Heart,
    category: 'foundation'
  },
  {
    id: 'goals',
    name: 'Goals',
    description: 'Current objectives, key results, and progress toward targets',
    icon: Flag,
    category: 'progress'
  },
  {
    id: 'weekly_review',
    name: 'Weekly Review',
    description: 'Summary of the past week\'s accomplishments, learnings, and priorities',
    icon: Calendar,
    category: 'progress'
  },
  {
    id: 'quarterly_review',
    name: 'Quarterly Review',
    description: '90-day retrospective with achievements, challenges, and growth areas',
    icon: CalendarDays,
    category: 'progress'
  },
  {
    id: 'yearly_review',
    name: 'Yearly Review',
    description: 'Annual highlights, milestones, transformations, and looking ahead',
    icon: CalendarRange,
    category: 'progress'
  },
  {
    id: 'sales_campaign',
    name: 'Sales Campaign',
    description: 'Highlight the benefits of customers using your products or services',
    icon: Megaphone,
    category: 'marketing'
  },
  {
    id: 'thought_leadership',
    name: 'Thought Leadership',
    description: 'Produce content that establishes your team\'s expertise and industry authority',
    icon: Award,
    category: 'marketing'
  },
  {
    id: 'challenges_opportunities',
    name: 'Challenges & Opportunities',
    description: 'Key obstacles to overcome and strategic opportunities to pursue',
    icon: AlertTriangle,
    category: 'analysis'
  },
  {
    id: 'financial_health',
    name: 'Financial Health',
    description: 'Revenue, expenses, runway, and alignment with business objectives',
    icon: DollarSign,
    category: 'analysis'
  },
  {
    id: 'trends_insights',
    name: 'Trends & Insights',
    description: 'Identify positive and negative trends and how they are affecting your team',
    icon: TrendingUp,
    category: 'analysis'
  },
  {
    id: 'innovation_ideas',
    name: 'Innovation & Ideas',
    description: 'New initiatives, experiments, and creative exploration',
    icon: Lightbulb,
    category: 'analysis'
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Enter your own prompt to guide the AI on what to create',
    icon: MessageSquare,
    category: 'custom'
  }
];

export const CONTENT_CATEGORIES = [
  { id: 'overview', label: 'Overview' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'progress', label: 'Progress' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'custom', label: 'Custom' }
];

export function getContentType(id: string): ContentType | undefined {
  return CONTENT_TYPES.find(ct => ct.id === id);
}

export function getContentTypesByCategory(category: string): ContentType[] {
  return CONTENT_TYPES.filter(ct => ct.category === category);
}
