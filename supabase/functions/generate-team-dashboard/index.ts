import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MissionValuesContext {
  vto_documents: Array<{ file_name: string; content: string; priority: number; source: string }>;
  vision_documents: Array<{ file_name: string; content: string; priority: number; source: string }>;
  supporting_documents: Array<{ file_name: string; content: string; priority: number; source: string }>;
  total_found: number;
}

interface GoalsContext {
  goal_documents: Array<{ file_name: string; content: string; date: string; priority: number; source: string }>;
  recent_meetings: Array<{ file_name: string; content: string; date: string; priority: number; source: string }>;
  quarterly_documents: Array<{ file_name: string; content: string; date: string; priority: number; source: string }>;
  total_found: number;
}

interface TeamDashboardData {
  team_info: {
    team_id: string;
    team_name: string;
    created_at: string;
  };
  mission_values_context: MissionValuesContext;
  goals_context: GoalsContext;
  strategy_content: Array<{ file_name: string; content: string; date: string }>;
  meeting_content: Array<{ file_name: string; content: string; date: string }>;
  financial_content: Array<{ file_name: string; content: string; date: string }>;
  project_content: Array<{ file_name: string; content: string; date: string }>;
  operational_content: Array<{ file_name: string; content: string; date: string }>;
  general_content: Array<{ file_name: string; content: string; category: string; date: string }>;
  team_discussions: Array<{ user_name: string; message: string; date: string }>;
  recent_reports: Array<{ prompt: string; response: string; date: string }>;
  category_summary: Array<{ category: string; document_count: number; recent_count: number; has_access?: boolean }>;
  member_info: {
    total_members: number;
    members: Array<{ name: string; role: string }>;
  };
  previous_snapshot: {
    generated_at?: string;
    goals_progress?: any;
    alignment_metrics?: any;
    health_overview?: any;
  };
  accessible_categories?: string[];
  target_user_id?: string;
  generated_at: string;
}

interface GoalItem {
  name: string;
  type: 'goal' | 'okr' | 'target' | 'milestone' | 'project' | 'kpi';
  status: 'on_track' | 'at_risk' | 'blocked' | 'not_started' | 'completed';
  progress_percentage: number | null;
  notes: string;
  source_reference: string;
  deadline?: string;
  owner?: string;
}

interface GoalsProgress {
  has_data: boolean;
  items: GoalItem[];
  suggestions: string[];
}

interface AlignmentMetrics {
  has_data: boolean;
  mission_statement: string | null;
  core_values: string[];
  alignment_score: number | null;
  alignment_examples: Array<{ type: 'aligned' | 'misaligned'; description: string }>;
  recommendations: string[];
  suggestions: string[];
}

interface HealthFactor {
  name: string;
  score: number;
  explanation: string;
  trend: 'up' | 'down' | 'stable';
}

interface HealthOverview {
  overall_score: number | null;
  factors: HealthFactor[];
  trend_vs_previous: 'improving' | 'declining' | 'stable' | 'first_snapshot';
  explanation: string;
  recommendations: string[];
}

interface DashboardAnalysis {
  goals_progress: GoalsProgress;
  alignment_metrics: AlignmentMetrics;
  health_overview: HealthOverview;
  data_sufficiency: {
    goals: boolean;
    alignment: boolean;
    health: boolean;
  };
}

async function callGemini(prompt: string, apiKey: string, maxTokens: number = 4096): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: maxTokens
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function extractMissionAndValues(
  data: TeamDashboardData,
  apiKey: string
): Promise<{ mission: string | null; values: string[]; purpose: string | null; niche: string | null }> {
  console.log('Step 1/4: Extracting mission and values from specialized context...');

  const context = data.mission_values_context;

  const allDocs = [
    ...context.vto_documents,
    ...context.vision_documents,
    ...context.supporting_documents
  ].sort((a, b) => a.priority - b.priority);

  console.log(`Found ${allDocs.length} documents for mission/values extraction`);

  if (allDocs.length === 0) {
    console.log('No VTO or vision documents found');
    return { mission: null, values: [], purpose: null, niche: null };
  }

  const docsContent = allDocs
    .map(d => `=== ${d.file_name} (${d.source}) ===\n${d.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are extracting the mission statement and core values from ${data.team_info.team_name}'s business documents.

IMPORTANT: These documents have been pre-filtered to contain VTO (Vision/Traction Organizer) and strategic vision content. The mission and core values ARE in these documents - find them.

DOCUMENTS:
${docsContent}

EXTRACTION INSTRUCTIONS:
1. Look for sections labeled "CORE VALUES", "VALUES", or numbered values like "1. PLAY 2. ADVENTURE..."
2. Extract each value as a single word (e.g., "Play", "Adventure", "Impact", "GRIT", "Growth")
3. Look for "CORE PURPOSE", "MISSION", "PURPOSE/CAUSE/PASSION" sections
4. Extract the mission/purpose statement verbatim
5. Look for "NICHE" or target market description

EXPECTED FORMAT (EOS VTO documents typically have):
- CORE VALUES section with numbered values
- CORE PURPOSE or CORE FOCUS section
- NICHE section describing target market

Return JSON only:
{
  "mission_statement": "<exact mission or purpose statement>",
  "core_values": ["<value1>", "<value2>", "<value3>", ...],
  "purpose": "<purpose/cause/passion if different from mission>",
  "niche": "<niche/target market description>",
  "source_document": "<document name where found>"
}`;

  try {
    const response = await callGemini(prompt, apiKey, 2048);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Extracted mission/values:', {
        mission: parsed.mission_statement?.substring(0, 50),
        values: parsed.core_values,
        source: parsed.source_document
      });
      return {
        mission: parsed.mission_statement || parsed.purpose || null,
        values: parsed.core_values || [],
        purpose: parsed.purpose || null,
        niche: parsed.niche || null
      };
    }
  } catch (error) {
    console.error('Error extracting mission/values:', error);
  }

  return { mission: null, values: [], purpose: null, niche: null };
}

async function extractGoalsAndTargets(
  data: TeamDashboardData,
  apiKey: string
): Promise<GoalItem[]> {
  console.log('Step 2/4: Extracting goals from specialized context...');

  const context = data.goals_context;

  const allDocs = [
    ...context.goal_documents,
    ...context.recent_meetings,
    ...context.quarterly_documents
  ].sort((a, b) => a.priority - b.priority);

  console.log(`Found ${allDocs.length} documents for goals extraction`);

  if (allDocs.length === 0) {
    console.log('No goal-related documents found');
    return [];
  }

  const docsContent = allDocs
    .map(d => `=== ${d.file_name} (${d.source}, ${d.date || 'no date'}) ===\n${d.content}`)
    .join('\n\n---\n\n');

  const prompt = `Extract all goals, rocks, OKRs, targets, and KPIs from ${data.team_info.team_name}'s business documents.

IMPORTANT: These documents have been pre-filtered to contain goal-related content (quarterly rocks, L10 meetings, OKRs). Extract ALL measurable objectives you find.

DOCUMENTS:
${docsContent}

WHAT TO EXTRACT:
- Company Rocks (EOS quarterly priorities)
- OKRs (Objectives and Key Results)
- Revenue/growth targets (e.g., "$100K MRR", "500 users")
- Project milestones with deadlines
- Product launches (e.g., "Moonshot Challenge")
- Certification goals (e.g., "SOC2 Type II")
- KPIs being tracked

For each goal, determine:
- name: Clear description
- type: goal, okr, target, milestone, project, or kpi
- status: on_track, at_risk, blocked, not_started, or completed (infer from meeting notes)
- progress_percentage: 0-100 if mentioned
- notes: Recent context from meeting discussions
- deadline: Date if mentioned
- owner: Person responsible if mentioned
- source_reference: Document name

Return 5-8 of the most important active items. JSON only:
{
  "goals": [
    {
      "name": "<goal description>",
      "type": "<goal|okr|target|milestone|project|kpi>",
      "status": "<on_track|at_risk|blocked|not_started|completed>",
      "progress_percentage": <0-100 or null>,
      "notes": "<context from meetings>",
      "source_reference": "<document>",
      "deadline": "<date or null>",
      "owner": "<person or null>"
    }
  ]
}`;

  try {
    const response = await callGemini(prompt, apiKey, 4096);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`Extracted ${parsed.goals?.length || 0} goals`);
      return parsed.goals || [];
    }
  } catch (error) {
    console.error('Error extracting goals:', error);
  }

  return [];
}

async function analyzeTeamHealth(data: TeamDashboardData, goals: GoalItem[], apiKey: string): Promise<HealthOverview> {
  console.log('Step 3/4: Analyzing team health...');

  const totalDocuments = data.category_summary.reduce((sum, c) => sum + c.document_count, 0);
  const recentDocuments = data.category_summary.reduce((sum, c) => sum + (c.recent_count || 0), 0);
  const hasMeetings = data.meeting_content.length > 0;
  const hasFinancials = data.financial_content.length > 0;
  const discussionCount = data.team_discussions.length;
  const goalsOnTrack = goals.filter(g => g.status === 'on_track' || g.status === 'completed').length;
  const goalsAtRisk = goals.filter(g => g.status === 'at_risk' || g.status === 'blocked').length;

  const contextSummary = `
TEAM: ${data.team_info.team_name}
MEMBERS: ${data.member_info.total_members}

DATA SUMMARY:
- Total documents: ${totalDocuments}
- Recent documents (30 days): ${recentDocuments}
- Meeting notes: ${data.meeting_content.length}
- Financial documents: ${data.financial_content.length}
- Team discussions: ${discussionCount}

GOALS STATUS:
- Total goals: ${goals.length}
- On track/completed: ${goalsOnTrack}
- At risk/blocked: ${goalsAtRisk}

RECENT MEETING HIGHLIGHTS:
${data.meeting_content.slice(0, 3).map(m => `[${m.file_name}] ${m.content.substring(0, 500)}`).join('\n\n')}

RECENT TEAM DISCUSSIONS:
${data.team_discussions.slice(0, 10).map(t => `${t.user_name}: ${t.message.substring(0, 200)}`).join('\n')}

PREVIOUS SNAPSHOT: ${data.previous_snapshot.generated_at ? `Generated ${data.previous_snapshot.generated_at}` : 'First snapshot'}
`;

  const prompt = `Analyze team health for ${data.team_info.team_name} and provide scores for 6 metrics.

${contextSummary}

Score these 6 factors (0-100):
1. Data Richness - How comprehensive is connected data?
2. Goal Progress - How well is team progressing on goals?
3. Team Engagement - How active is collaboration?
4. Meeting Cadence - Are meetings regular and productive?
5. Financial Health - Is financial data present and positive?
6. Risk Indicators - Any risks or blockers? (higher = fewer risks)

JSON response only:
{
  "overall_score": <0-100>,
  "factors": [
    {"name": "Data Richness", "score": <0-100>, "explanation": "<15 words max>", "trend": "<up|down|stable>"},
    {"name": "Goal Progress", "score": <0-100>, "explanation": "<15 words max>", "trend": "<up|down|stable>"},
    {"name": "Team Engagement", "score": <0-100>, "explanation": "<15 words max>", "trend": "<up|down|stable>"},
    {"name": "Meeting Cadence", "score": <0-100>, "explanation": "<15 words max>", "trend": "<up|down|stable>"},
    {"name": "Financial Health", "score": <0-100>, "explanation": "<15 words max>", "trend": "<up|down|stable>"},
    {"name": "Risk Indicators", "score": <0-100>, "explanation": "<15 words max>", "trend": "<up|down|stable>"}
  ],
  "trend_vs_previous": "<improving|declining|stable|first_snapshot>",
  "explanation": "<2-3 sentence summary>",
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"]
}`;

  try {
    const response = await callGemini(prompt, apiKey, 2048);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`Health analysis complete. Overall score: ${parsed.overall_score}`);
      return parsed;
    }
  } catch (error) {
    console.error('Error analyzing health:', error);
  }

  return {
    overall_score: 50,
    factors: [
      { name: 'Data Richness', score: totalDocuments > 10 ? 70 : 50, explanation: `${totalDocuments} documents connected`, trend: 'stable' },
      { name: 'Goal Progress', score: goals.length > 0 ? Math.round((goalsOnTrack / goals.length) * 100) : 50, explanation: `${goalsOnTrack}/${goals.length} goals on track`, trend: 'stable' },
      { name: 'Team Engagement', score: discussionCount > 10 ? 80 : 60, explanation: `${discussionCount} team discussions`, trend: 'stable' },
      { name: 'Meeting Cadence', score: hasMeetings ? 70 : 30, explanation: hasMeetings ? 'Regular meetings detected' : 'No meeting data', trend: 'stable' },
      { name: 'Financial Health', score: hasFinancials ? 60 : 40, explanation: hasFinancials ? 'Financial data available' : 'Limited financial data', trend: 'stable' },
      { name: 'Risk Indicators', score: goalsAtRisk > 2 ? 50 : 75, explanation: goalsAtRisk > 0 ? `${goalsAtRisk} items at risk` : 'No major risks', trend: 'stable' }
    ],
    trend_vs_previous: data.previous_snapshot.generated_at ? 'stable' : 'first_snapshot',
    explanation: 'Team health metrics based on available data.',
    recommendations: ['Connect more data sources', 'Add regular meeting notes', 'Document goals in strategy folder']
  };
}

async function generateAlignmentAnalysis(
  data: TeamDashboardData,
  mission: string | null,
  values: string[],
  goals: GoalItem[],
  apiKey: string
): Promise<AlignmentMetrics> {
  console.log('Step 4/4: Generating alignment analysis...');

  if (!mission && values.length === 0) {
    return {
      has_data: false,
      mission_statement: null,
      core_values: [],
      alignment_score: null,
      alignment_examples: [],
      recommendations: [],
      suggestions: [
        'Add a VTO document with mission and core values',
        'Include a strategy document defining team purpose',
        'Create a document with core values and guiding principles'
      ]
    };
  }

  const recentActivities = [
    ...data.meeting_content.slice(0, 5).map(m => `Meeting: ${m.file_name}\n${m.content.substring(0, 400)}`),
    ...data.team_discussions.slice(0, 10).map(t => `Discussion by ${t.user_name}: ${t.message.substring(0, 200)}`),
    ...goals.slice(0, 5).map(g => `Goal: ${g.name} - Status: ${g.status}`)
  ].join('\n\n');

  const prompt = `Analyze alignment between ${data.team_info.team_name}'s activities and their mission/values.

MISSION: ${mission || 'Not defined'}
CORE VALUES: ${values.length > 0 ? values.join(', ') : 'Not defined'}

RECENT ACTIVITIES:
${recentActivities}

Provide:
1. Alignment score (0-100) based on how well activities support mission
2. 2-3 specific alignment examples (activities supporting mission/values)
3. Any misalignment examples if they exist
4. 2-3 recommendations for better alignment

JSON only:
{
  "alignment_score": <0-100>,
  "alignment_examples": [
    {"type": "aligned", "description": "<specific example>"},
    {"type": "aligned", "description": "<specific example>"}
  ],
  "recommendations": ["<rec 1>", "<rec 2>"]
}`;

  try {
    const response = await callGemini(prompt, apiKey, 2048);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`Alignment analysis complete. Score: ${parsed.alignment_score}`);
      return {
        has_data: true,
        mission_statement: mission,
        core_values: values,
        alignment_score: parsed.alignment_score,
        alignment_examples: parsed.alignment_examples || [],
        recommendations: parsed.recommendations || [],
        suggestions: []
      };
    }
  } catch (error) {
    console.error('Error generating alignment analysis:', error);
  }

  return {
    has_data: true,
    mission_statement: mission,
    core_values: values,
    alignment_score: 70,
    alignment_examples: [],
    recommendations: ['Review activities against mission', 'Ensure goals align with values'],
    suggestions: []
  };
}

async function analyzeTeamData(
  data: TeamDashboardData,
  apiKey: string
): Promise<DashboardAnalysis> {
  console.log('Starting 4-step analysis with specialized context data...');
  console.log('Mission/Values context:', {
    vto_docs: data.mission_values_context?.vto_documents?.length || 0,
    vision_docs: data.mission_values_context?.vision_documents?.length || 0,
    supporting_docs: data.mission_values_context?.supporting_documents?.length || 0
  });
  console.log('Goals context:', {
    goal_docs: data.goals_context?.goal_documents?.length || 0,
    recent_meetings: data.goals_context?.recent_meetings?.length || 0,
    quarterly_docs: data.goals_context?.quarterly_documents?.length || 0
  });

  const { mission, values } = await extractMissionAndValues(data, apiKey);

  const goals = await extractGoalsAndTargets(data, apiKey);

  const healthOverview = await analyzeTeamHealth(data, goals, apiKey);

  const alignmentMetrics = await generateAlignmentAnalysis(data, mission, values, goals, apiKey);

  const goalsProgress: GoalsProgress = {
    has_data: goals.length > 0,
    items: goals,
    suggestions: goals.length < 3 ? [
      'Add strategy documents with quarterly goals or OKRs',
      'Include meeting notes discussing project milestones',
      'Document specific targets with deadlines'
    ] : []
  };

  return {
    goals_progress: goalsProgress,
    alignment_metrics: alignmentMetrics,
    health_overview: healthOverview,
    data_sufficiency: {
      goals: goals.length > 0,
      alignment: alignmentMetrics.has_data,
      health: true
    }
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { team_id, generation_type = 'manual', target_user_id = null } = await req.json();

    if (!team_id) {
      return new Response(
        JSON.stringify({ error: 'team_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveTargetUserId = target_user_id || user.id;
    console.log(`Generating Team Dashboard for team ${team_id}, target user: ${effectiveTargetUserId}`);

    await supabase
      .from('team_dashboard_settings')
      .upsert({
        team_id,
        generation_in_progress: true,
        generation_started_at: new Date().toISOString(),
        generation_error: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'team_id' });

    try {
      const { data: dashboardData, error: dataError } = await supabase.rpc('get_user_dashboard_data', {
        p_team_id: team_id,
        p_user_id: effectiveTargetUserId
      });

    if (dataError) {
      console.error('Error getting dashboard data:', dataError);
      return new Response(
        JSON.stringify({ error: 'Failed to get team data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamData = dashboardData as TeamDashboardData;
    console.log(`Got team data for ${teamData.team_info.team_name}`);

    const analysis = await analyzeTeamData(teamData, geminiApiKey);
    console.log('All 4 analysis steps complete.');

    const updateQuery = supabase
      .from('team_dashboard_snapshots')
      .update({ is_current: false })
      .eq('team_id', team_id)
      .eq('is_current', true);

    if (effectiveTargetUserId) {
      updateQuery.eq('target_user_id', effectiveTargetUserId);
    } else {
      updateQuery.is('target_user_id', null);
    }

    await updateQuery;

    const accessibleCategories = teamData.accessible_categories || [];
    console.log(`User has access to ${accessibleCategories.length} categories:`, accessibleCategories);

    const { data: snapshot, error: snapshotError } = await supabase
      .from('team_dashboard_snapshots')
      .insert({
        team_id,
        target_user_id: effectiveTargetUserId,
        goals_progress: analysis.goals_progress,
        alignment_metrics: analysis.alignment_metrics,
        health_overview: analysis.health_overview,
        data_sufficiency: analysis.data_sufficiency,
        source_data_summary: {
          category_summary: teamData.category_summary,
          member_info: teamData.member_info,
          documents_analyzed: teamData.category_summary.reduce((sum, c) => sum + c.document_count, 0),
          mission_values_docs_found: teamData.mission_values_context?.total_found || 0,
          goals_docs_found: teamData.goals_context?.total_found || 0,
          accessible_categories: accessibleCategories
        },
        generated_by_user_id: generation_type === 'manual' ? user.id : null,
        generation_type,
        is_current: true
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError);
      return new Response(
        JSON.stringify({ error: 'Failed to save snapshot' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(now.getUTCDate() + 1);
    tomorrow.setUTCHours(5, 0, 0, 0);

    await supabase
      .from('team_dashboard_settings')
      .upsert({
        team_id,
        is_enabled: true,
        last_generated_at: new Date().toISOString(),
        next_generation_at: tomorrow.toISOString(),
        generation_in_progress: false,
        generation_error: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'team_id' });

    console.log('Team Dashboard generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        snapshot: {
          id: snapshot.id,
          generated_at: snapshot.generated_at,
          goals_progress: analysis.goals_progress,
          alignment_metrics: analysis.alignment_metrics,
          health_overview: analysis.health_overview,
          data_sufficiency: analysis.data_sufficiency
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    } catch (innerError) {
      console.error('Error during dashboard generation:', innerError);

      await supabase
        .from('team_dashboard_settings')
        .upsert({
          team_id,
          generation_in_progress: false,
          generation_error: innerError instanceof Error ? innerError.message : 'Generation failed',
          updated_at: new Date().toISOString()
        }, { onConflict: 'team_id' });

      throw innerError;
    }
  } catch (error) {
    console.error('Error in generate-team-dashboard:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
