import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TeamDashboardData {
  team_info: {
    team_id: string;
    team_name: string;
    created_at: string;
  };
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeTeamData(data: TeamDashboardData, apiKey: string): Promise<DashboardAnalysis> {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const totalDocuments = data.category_summary.reduce((sum, c) => sum + c.document_count, 0);
  const hasStrategyData = data.strategy_content.length > 0;
  const hasMeetingData = data.meeting_content.length > 0;
  const hasFinancialData = data.financial_content.length > 0;

  const prompt = `You are a business analyst creating a daily "Team Dashboard" for ${data.team_info.team_name}. Today is ${dateStr}.

Your job is to extract and analyze THREE key areas from the team's data:
1. GOALS, TARGETS, AND PROJECTS PROGRESS
2. MISSION AND CORE VALUES ALIGNMENT
3. TEAM HEALTH OVERVIEW

TEAM: ${data.team_info.team_name}
TEAM SIZE: ${data.member_info.total_members} members

=== STRATEGY DOCUMENTS ===
${data.strategy_content.map(s => `[${s.file_name}] ${s.content}`).join('\n\n') || 'No strategy documents'}

=== MEETING NOTES ===
${data.meeting_content.map(m => `[${m.file_name}] ${m.content}`).join('\n\n') || 'No meeting data'}

=== FINANCIAL DOCUMENTS ===
${data.financial_content.map(f => `[${f.file_name}] ${f.content}`).join('\n\n') || 'No financial data'}

=== PROJECT DOCUMENTS ===
${data.project_content.map(p => `[${p.file_name}] ${p.content}`).join('\n\n') || 'No project data'}

=== TEAM DISCUSSIONS ===
${data.team_discussions.map(t => `${t.user_name}: ${t.message}`).join('\n') || 'No discussions'}

Provide JSON response:
{
  "goals_progress": {
    "has_data": <boolean>,
    "items": [{"name": "<goal>", "type": "<goal|okr|target|milestone|project|kpi>", "status": "<on_track|at_risk|blocked|not_started|completed>", "progress_percentage": <0-100|null>, "notes": "<details>", "source_reference": "<file>"}],
    "suggestions": ["<if no data>"]
  },
  "alignment_metrics": {
    "has_data": <boolean>,
    "mission_statement": "<or null>",
    "core_values": ["<values>"],
    "alignment_score": <0-100|null>,
    "alignment_examples": [{"type": "aligned|misaligned", "description": "<example>"}],
    "recommendations": ["<recs>"],
    "suggestions": ["<if no data>"]
  },
  "health_overview": {
    "overall_score": <0-100>,
    "factors": [{"name": "<factor>", "score": <0-100>, "explanation": "<why>", "trend": "<up|down|stable>"}],
    "trend_vs_previous": "<improving|declining|stable|first_snapshot>",
    "explanation": "<summary>"
  },
  "data_sufficiency": {"goals": <bool>, "alignment": <bool>, "health": true}
}

Respond ONLY with valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 6000 }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    return JSON.parse(jsonMatch[0]) as DashboardAnalysis;
  } catch (error) {
    console.error('Analysis error:', error);
    return {
      goals_progress: { has_data: false, items: [], suggestions: ['Add strategy documents'] },
      alignment_metrics: { has_data: false, mission_statement: null, core_values: [], alignment_score: null, alignment_examples: [], recommendations: [], suggestions: ['Add mission statement'] },
      health_overview: {
        overall_score: 50,
        factors: [
          { name: 'Data Richness', score: totalDocuments > 0 ? 60 : 20, explanation: `${totalDocuments} documents`, trend: 'stable' as const },
          { name: 'Goal Progress', score: 50, explanation: 'Analysis unavailable', trend: 'stable' as const },
          { name: 'Team Engagement', score: data.team_discussions.length > 0 ? 70 : 30, explanation: `${data.team_discussions.length} discussions`, trend: 'stable' as const },
          { name: 'Meeting Cadence', score: hasMeetingData ? 70 : 30, explanation: hasMeetingData ? 'Meetings detected' : 'No meetings', trend: 'stable' as const },
          { name: 'Financial Health', score: hasFinancialData ? 60 : 0, explanation: hasFinancialData ? 'Data available' : 'No data', trend: 'stable' as const },
          { name: 'Risk Indicators', score: 70, explanation: 'No risks detected', trend: 'stable' as const }
        ],
        trend_vs_previous: 'first_snapshot',
        explanation: 'Dashboard metrics are being established.'
      },
      data_sufficiency: { goals: false, alignment: false, health: true }
    };
  }
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dueTeams, error: teamsError } = await supabase
      .from('team_dashboard_settings')
      .select('team_id')
      .eq('is_enabled', true)
      .lte('next_generation_at', new Date().toISOString())
      .limit(10);

    if (teamsError) {
      console.error('Error fetching due teams:', teamsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch teams' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dueTeams || dueTeams.length === 0) {
      console.log('No teams due for dashboard generation');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No teams due' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${dueTeams.length} teams for dashboard generation`);

    const results: Array<{ team_id: string; user_id: string | null; success: boolean; error?: string }> = [];

    for (const team of dueTeams) {
      try {
        console.log(`Processing team ${team.team_id}`);

        const { data: teamUsers, error: usersError } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('team_id', team.team_id);

        if (usersError) {
          console.error(`Error fetching users for team ${team.team_id}:`, usersError);
          results.push({ team_id: team.team_id, user_id: null, success: false, error: 'Failed to fetch users' });
          continue;
        }

        const users = teamUsers || [];
        console.log(`Found ${users.length} users in team ${team.team_id}`);

        for (const user of users) {
          try {
            console.log(`Generating dashboard for user ${user.email} in team ${team.team_id}`);

            const { data: dashboardData, error: dataError } = await supabase.rpc('get_user_dashboard_data', {
              p_team_id: team.team_id,
              p_user_id: user.id
            });

            if (dataError) {
              console.error(`Error getting data for user ${user.id}:`, dataError);
              results.push({ team_id: team.team_id, user_id: user.id, success: false, error: 'Failed to get data' });
              continue;
            }

            const teamData = dashboardData as TeamDashboardData;
            const accessibleCategories = teamData.accessible_categories || [];
            console.log(`User ${user.email} has access to ${accessibleCategories.length} categories`);

            const analysis = await analyzeTeamData(teamData, geminiApiKey);

            await supabase
              .from('team_dashboard_snapshots')
              .update({ is_current: false })
              .eq('team_id', team.team_id)
              .eq('target_user_id', user.id)
              .eq('is_current', true);

            const { error: snapshotError } = await supabase
              .from('team_dashboard_snapshots')
              .insert({
                team_id: team.team_id,
                target_user_id: user.id,
                goals_progress: analysis.goals_progress,
                alignment_metrics: analysis.alignment_metrics,
                health_overview: analysis.health_overview,
                data_sufficiency: analysis.data_sufficiency,
                source_data_summary: {
                  category_summary: teamData.category_summary,
                  member_info: teamData.member_info,
                  accessible_categories: accessibleCategories
                },
                generated_by_user_id: null,
                generation_type: 'scheduled',
                is_current: true
              });

            if (snapshotError) {
              console.error(`Error saving snapshot for user ${user.id}:`, snapshotError);
              results.push({ team_id: team.team_id, user_id: user.id, success: false, error: 'Failed to save' });
              continue;
            }

            results.push({ team_id: team.team_id, user_id: user.id, success: true });
            console.log(`Successfully generated dashboard for user ${user.email}`);

            await sleep(30000);
          } catch (userErr) {
            console.error(`Error processing user ${user.id}:`, userErr);
            results.push({ team_id: team.team_id, user_id: user.id, success: false, error: userErr instanceof Error ? userErr.message : 'Unknown error' });
          }
        }

        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(5, 0, 0, 0);

        await supabase
          .from('team_dashboard_settings')
          .update({
            last_generated_at: new Date().toISOString(),
            next_generation_at: tomorrow.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('team_id', team.team_id);

        console.log(`Completed all users for team ${team.team_id}`);

        await sleep(2000);
      } catch (err) {
        console.error(`Error processing team ${team.team_id}:`, err);
        results.push({ team_id: team.team_id, user_id: null, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Batch complete. ${successCount}/${results.length} user dashboards processed successfully.`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-scheduled-team-dashboard:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});