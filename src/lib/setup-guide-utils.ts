import { supabase } from './supabase';

export interface SyncedDataContext {
  categories: string[];
  totalDocuments: number;
}

export interface SetupGuideProgress {
  id?: string;
  user_id: string;
  step_1_onboarding_completed: boolean;
  step_2_google_drive_connected: boolean;
  step_3_folder_selected_or_created: boolean;
  step_4_files_placed_in_folder: boolean;
  step_5_data_synced: boolean;
  step_6_team_settings_configured: boolean;
  step_7_first_prompt_sent: boolean;
  step_8_visualization_created: boolean;
  step_9_manual_report_run: boolean;
  step_10_scheduled_report_created: boolean;
  step_11_team_members_invited: boolean;
  created_folder_type?: string | null;
  created_folder_id?: string | null;
  selected_folder_path?: string | null;
  current_step: number;
  is_completed: boolean;
  is_skipped: boolean;
  started_at?: string;
  completed_at?: string | null;
  last_updated_at?: string;
}

/**
 * Get user's synced data context - which categories have documents
 */
export const getUserDataContext = async (teamId: string): Promise<SyncedDataContext> => {
  const { data, error } = await supabase.rpc('get_team_category_counts', {
    p_team_id: teamId
  });

  if (error) {
    console.error('Error fetching data context:', error);
    return { categories: [], totalDocuments: 0 };
  }

  const categories = data?.map((c: { category: string }) => c.category) || [];
  const totalDocuments = data?.reduce((sum: number, c: { count: number }) => sum + c.count, 0) || 0;

  return { categories, totalDocuments };
};

/**
 * Get context-aware prompts based on user's synced data categories
 */
export const getContextAwarePrompts = (context: SyncedDataContext): string[] => {
  const prompts: string[] = [];
  const { categories, totalDocuments } = context;

  const hasMeetings = categories.includes('meetings');
  const hasStrategy = categories.includes('strategy');
  const hasFinancial = categories.includes('financial');
  const hasSales = categories.includes('sales');
  const hasMarketing = categories.includes('marketing');
  const hasProduct = categories.includes('product');
  const hasPeople = categories.includes('people');
  const hasOperations = categories.includes('operations');
  const hasCustomer = categories.includes('customer');

  if (totalDocuments === 0) {
    return [
      "Tell me about the data you have access to",
      "What insights can you provide from my data?",
      "Help me understand what I can ask you"
    ];
  }

  if (hasMeetings) {
    prompts.push(
      "Summarize our most recent meeting with key action items",
      "What topics have we discussed most frequently in recent meetings?"
    );
  }

  if (hasStrategy) {
    prompts.push(
      "What are our top 3 strategic priorities based on our documents?",
      "Summarize our mission, vision, and core values"
    );
  }

  if (hasFinancial) {
    prompts.push(
      "Summarize our revenue and expense trends",
      "What's our current financial health?"
    );
  }

  if (hasSales) {
    prompts.push(
      "What is our current sales pipeline status?",
      "Summarize recent sales activity and trends"
    );
  }

  if (hasMarketing) {
    prompts.push(
      "What marketing campaigns are currently active?",
      "Summarize our marketing strategy and initiatives"
    );
  }

  if (hasProduct) {
    prompts.push(
      "What is our product roadmap?",
      "Summarize our product development priorities"
    );
  }

  if (hasPeople) {
    prompts.push(
      "Summarize our HR policies and initiatives",
      "What are our current people priorities?"
    );
  }

  if (hasOperations) {
    prompts.push(
      "Summarize our operational processes",
      "What are our current operational priorities?"
    );
  }

  if (hasCustomer) {
    prompts.push(
      "Summarize customer feedback and trends",
      "What are our key customer insights?"
    );
  }

  if (hasMeetings && hasStrategy) {
    prompts.push(
      "How well are our recent meetings aligned with our strategic priorities?"
    );
  }

  if (hasStrategy && hasFinancial) {
    prompts.push(
      "How is our spending aligned with our strategic priorities?"
    );
  }

  if (categories.length >= 3) {
    prompts.push(
      "Provide a comprehensive business overview based on all available data",
      "Generate an executive summary of our business health"
    );
  }

  if (prompts.length === 0) {
    prompts.push(
      "Tell me about the data you have access to",
      "Summarize the key information in my connected documents",
      "What insights can you provide from my data?"
    );
  }

  return prompts.slice(0, 5);
};

/**
 * Sample prompts to show while data is syncing
 */
export const getSamplePrompts = (): string[] => {
  return [
    "📊 Generate a summary of our last leadership meeting with action items",
    "🎯 What are the top 3 strategic priorities from our recent strategy documents?",
    "💰 Analyze our burn rate and cash runway based on latest financials",
    "📈 Show me attendance trends across all meeting types over the last 60 days",
    "🔍 What customer pain points were discussed in our recent sales calls?",
    "📅 List all upcoming deadlines mentioned in meetings this month",
    "💡 What innovative ideas have we discussed in our strategy sessions?",
    "👥 Who are the key stakeholders mentioned most frequently in our docs?",
    "⚠️ What risks or challenges have we identified in our planning documents?",
    "📊 Create a visualization comparing Q3 vs Q4 financial performance",
    "🎯 What progress have we made on our OKRs based on meeting documents?",
    "🔄 Which action items from past meetings are still pending?",
    "💬 Summarize feedback from our latest customer meetings",
    "📈 What trends do you see in our team velocity over the past quarter?",
    "🚀 What opportunities should we prioritize based on our data?"
  ];
};

/**
 * Check if data sync has completed
 */
export const checkSyncCompletion = async (teamId: string, startTime: Date): Promise<boolean> => {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('created_at', startTime.toISOString());

  if (error) {
    console.error('Error checking sync completion:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
};

/**
 * Trigger the data sync webhook
 */
export const triggerDataSync = async (): Promise<boolean> => {
  try {
    const response = await fetch(
      'https://n8n.rockethub.ai/webhook/21473ebb-405d-4be1-ab71-6bf2a2d4063b',
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Failed to trigger data sync');
    }

    const result = await response.json();
    console.log('Data sync triggered:', result);

    return true;
  } catch (error) {
    console.error('Error triggering sync:', error);
    return false;
  }
};

/**
 * Get or create setup guide progress for user
 */
export const getSetupGuideProgress = async (userId: string): Promise<SetupGuideProgress | null> => {
  const { data, error } = await supabase
    .from('setup_guide_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching setup guide progress:', error);
    return null;
  }

  return data;
};

/**
 * Create initial setup guide progress
 */
export const createSetupGuideProgress = async (userId: string): Promise<SetupGuideProgress | null> => {
  const { data, error } = await supabase
    .from('setup_guide_progress')
    .insert({
      user_id: userId,
      current_step: 1,
      is_completed: false,
      is_skipped: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating setup guide progress:', error);
    return null;
  }

  return data;
};

/**
 * Update setup guide progress
 */
export const updateSetupGuideProgress = async (
  userId: string,
  updates: Partial<SetupGuideProgress>
): Promise<boolean> => {
  const { error } = await supabase
    .from('setup_guide_progress')
    .update(updates)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating setup guide progress:', error);
    return false;
  }

  return true;
};

/**
 * Mark a specific step as complete
 */
export const markStepComplete = async (
  userId: string,
  stepNumber: number,
  additionalUpdates?: Partial<SetupGuideProgress>
): Promise<boolean> => {
  const stepField = `step_${stepNumber}_${getStepName(stepNumber)}` as keyof SetupGuideProgress;

  const updates: Partial<SetupGuideProgress> = {
    [stepField]: true,
    current_step: stepNumber + 1,
    ...additionalUpdates
  };

  return updateSetupGuideProgress(userId, updates);
};

/**
 * Get step name from number
 */
const getStepName = (stepNumber: number): string => {
  const stepNames: Record<number, string> = {
    1: 'onboarding_completed',
    2: 'google_drive_connected',
    3: 'folder_selected_or_created',
    4: 'files_placed_in_folder',
    5: 'data_synced',
    6: 'team_settings_configured',
    7: 'first_prompt_sent',
    8: 'visualization_created',
    9: 'manual_report_run',
    10: 'scheduled_report_created',
    11: 'team_members_invited'
  };

  return stepNames[stepNumber] || '';
};

/**
 * Check if step is already completed (for auto-detection)
 */
export const detectStepCompletion = async (
  userId: string,
  teamId: string,
  stepNumber: number
): Promise<boolean> => {
  switch (stepNumber) {
    case 1: // Onboarding
      const { data: feedbackStatus } = await supabase
        .from('user_feedback_status')
        .select('onboarded_at')
        .eq('user_id', userId)
        .maybeSingle();
      return !!feedbackStatus?.onboarded_at;

    case 2: // Google Drive connected
      const { data: driveConnection } = await supabase
        .from('user_drive_connections')
        .select('is_active')
        .eq('user_id', userId)
        .maybeSingle();
      return driveConnection?.is_active === true;

    case 3: // Folder selected
      const { data: folders } = await supabase
        .from('user_drive_connections')
        .select('selected_meetings_folder_ids, selected_strategy_folder_ids, selected_financial_folder_ids')
        .eq('user_id', userId)
        .maybeSingle();
      return !!(
        (folders?.selected_meetings_folder_ids && folders.selected_meetings_folder_ids.length > 0) ||
        (folders?.selected_strategy_folder_ids && folders.selected_strategy_folder_ids.length > 0) ||
        (folders?.selected_financial_folder_ids && folders.selected_financial_folder_ids.length > 0)
      );

    case 5: // Data synced
      const { data: fuelData } = await supabase.rpc('calculate_fuel_level', {
        p_team_id: teamId
      });
      return (fuelData?.fully_synced_documents ?? 0) > 0;

    case 6: // Team settings configured
      const { data: teamSettings } = await supabase
        .from('team_settings')
        .select('team_id')
        .eq('team_id', teamId)
        .maybeSingle();
      return !!teamSettings;

    case 7: // First prompt sent
      const { data: messages } = await supabase
        .from('astra_chats')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('message_type', 'user');
      return (messages?.length ?? 0) > 0;

    case 8: // Visualization created
      const { data: viz } = await supabase
        .from('astra_chats')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('visualization', true);
      return (viz?.length ?? 0) > 0;

    case 9: // Manual report run
      const { data: reports } = await supabase
        .from('astra_chats')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('mode', 'reports');
      return (reports?.length ?? 0) > 0;

    case 10: // Scheduled report created
      const { data: scheduledReports } = await supabase
        .from('astra_reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('schedule_type', 'scheduled')
        .eq('is_active', true);
      return (scheduledReports?.length ?? 0) > 0;

    case 11: // Team members invited
      const { data: invites } = await supabase
        .from('invite_codes')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId);
      return (invites?.length ?? 0) > 0;

    default:
      return false;
  }
};
