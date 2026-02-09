export interface Message {
  id: string;
  chatId?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isExpanded?: boolean;
  visualization?: string;
  visualization_data?: string;
  hasStoredVisualization?: boolean;
  isCentered?: boolean;
  isFavorited?: boolean;
  messageType?: 'user' | 'astra' | 'system';
  isReply?: boolean;
  replyToId?: string;
  metadata?: any;
  isProgressMessage?: boolean;
}

export interface VisualizationState {
  messageId: string;
  isGenerating: boolean;
  content: string | null;
  isVisible: boolean;
}

export interface GroupMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  message_content: string;
  message_type: 'user' | 'astra' | 'system';
  mentions: string[];
  astra_prompt?: string | null;
  visualization_data?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ReplyState {
  isReplying: boolean;
  messageId: string | null;
  messageSnippet: string | null;
  originalMessage?: {
    id: string;
    content: string;
    userName: string;
    timestamp: string;
  } | null;
}

export interface FavoriteMessage {
  id: string;
  text: string;
  createdAt: Date;
}

export type ChatMode = 'reports' | 'private' | 'team';

export type CoreTabType = 'mission-control' | 'private' | 'reports';
export type FeatureTabType = 'team' | 'visualizations' | 'ai-specialists' | 'team-agents' | 'team-guidance' | 'research-projects' | 'business-coach' | 'ai-advisors' | 'team-dashboard' | 'team-pulse' | 'challenge' | 'moonshot-details' | 'scheduled-tasks' | 'assistant-skills' | 'connect' | 'connected-apps' | 'mcp-tools';
export type TabType = CoreTabType | FeatureTabType;

export interface TabConfig {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: string;
  isCore: boolean;
  isComingSoon: boolean;
  order: number;
  description: string;
  color: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  icon: string;
  default_schedule: string;
  default_time: string;
  is_active: boolean;
  created_at: string;
}

export interface UserReport {
  id: string;
  user_id: string;
  report_template_id: string | null;
  title: string;
  prompt: string;
  schedule_type: 'manual' | 'scheduled';
  schedule_frequency: string;
  schedule_time: string;
  schedule_day: number | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
  template?: ReportTemplate;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'report' | 'mention' | 'system';
  title: string;
  message: string;
  related_chat_id: string | null;
  related_report_id: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

export interface ReportConfig {
  id: string;
  title: string;
  prompt: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule_time: string; // HH:MM format
  start_date?: string; // Day of week for weekly, day of month for monthly
  enabled: boolean;
  created_at: string;
  last_executed?: string;
  next_execution?: string;
}

export interface ReportMessage extends Message {
  reportMetadata?: {
    report_type: string;
    report_title: string;
    report_frequency: string;
    report_schedule: string;
    executed_at: string;
    is_manual_run: boolean;
  };
}

export interface MeetingType {
  type: string;
  description: string;
  enabled: boolean;
}

export interface NewsPreferences {
  industries: string[];
  custom_topics: string;
  max_results: number;
}

export interface TeamSettings {
  team_id: string;
  meeting_types: MeetingType[];
  news_preferences: NewsPreferences;
  created_at?: string;
  updated_at?: string;
}

export interface TeamPulseHealthFactors {
  data_richness: number;
  goal_progress: number;
  meeting_cadence: number;
  team_engagement: number;
  risk_indicators: number;
  financial_health: number;
}

export interface TeamPulseInsights {
  score_trend: 'up' | 'down' | 'stable';
  score_change: number;
  factor_trends: Record<string, {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  highlights: string[];
  recommendations: string[];
}

export interface TeamPulseFactorExplanations {
  strategic_alignment?: string;
  project_momentum?: string;
  financial_health?: string;
  team_collaboration?: string;
  operational_efficiency?: string;
  risk_management?: string;
}

export interface TeamPulseSections {
  mission: {
    team_name: string;
    launch_points?: number;
    members: number;
  };
  data_overview?: {
    total_documents: number;
    categories: Array<{ category: string; count: number }>;
    fuel_level: number;
  };
  activity?: {
    new_docs_this_week: number;
    chat_messages: number;
    reports_generated: number;
    active_members: number;
  };
  key_metrics?: {
    active_projects?: string;
    recent_decisions?: string;
    upcoming_deadlines?: string;
    financial_status?: string;
    team_focus_areas?: string;
  };
  factor_explanations?: TeamPulseFactorExplanations;
}

export interface TeamPulseSnapshot {
  id: string;
  team_id: string;
  generated_at: string;
  health_score: number;
  health_explanation: string | null;
  health_factors: TeamPulseHealthFactors;
  infographic_url: string | null;
  infographic_base64: string | null;
  source_data_summary: Record<string, any>;
  sections: TeamPulseSections;
  insights_and_trends: TeamPulseInsights;
  generated_by_user_id: string | null;
  generation_type: 'scheduled' | 'manual';
  is_current: boolean;
  created_at: string;
  design_style: string | null;
}

export interface TeamPulseSettings {
  team_id: string;
  is_enabled: boolean;
  generation_day: number;
  generation_hour: number;
  last_generated_at: string | null;
  next_generation_at: string | null;
  custom_instructions: string | null;
  design_style: string | null;
  design_description: string | null;
  rotate_random: boolean;
  last_used_style: string | null;
  apply_to_future: boolean;
  created_at: string;
  updated_at: string;
}

export interface LastAstraMessage {
  id: string;
  content: string;
  timestamp: Date;
}

export type FollowUpDetectionType =
  | 'confirmation'
  | 'option_selection'
  | 'clarification_request'
  | 'elaboration_request'
  | 'referential'
  | 'continuation'
  | 'negation';

export interface FollowUpSuggestionState {
  isVisible: boolean;
  suggestionText: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  detectionType: FollowUpDetectionType | null;
  lastAstraMessage: LastAstraMessage | null;
  selectedOption?: {
    optionNumber: number;
    optionText: string;
  };
}