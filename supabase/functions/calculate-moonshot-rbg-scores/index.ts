import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HealthFactor {
  name: string;
  score: number;
  description: string;
}

interface GoalItem {
  title: string;
  type: string;
  progress_percentage: number;
  status: string;
}

interface AlignmentMetrics {
  has_data: boolean;
  alignment_score: number | null;
  mission_statement: string | null;
  core_values: string[];
  examples: Array<{ type: string; aligned: boolean }>;
}

interface HealthOverview {
  overall_score: number | null;
  factors: HealthFactor[];
}

interface GoalsProgress {
  has_data: boolean;
  items: GoalItem[];
}

function calculateRunScore(healthOverview: HealthOverview): number {
  if (!healthOverview.overall_score) {
    if (!healthOverview.factors || healthOverview.factors.length === 0) {
      return 25;
    }
    const avgFactor = healthOverview.factors.reduce((sum, f) => sum + (f.score || 0), 0) / healthOverview.factors.length;
    return Math.min(100, Math.max(0, avgFactor));
  }
  return Math.min(100, Math.max(0, healthOverview.overall_score));
}

function calculateBuildScore(goalsProgress: GoalsProgress): number {
  if (!goalsProgress.has_data || !goalsProgress.items || goalsProgress.items.length === 0) {
    return 25;
  }
  
  const items = goalsProgress.items;
  const completedOrOnTrack = items.filter(i => 
    i.status === 'completed' || i.status === 'on_track' || i.status === 'On Track'
  ).length;
  const completionRate = (completedOrOnTrack / items.length) * 100;
  
  const avgProgress = items.reduce((sum, i) => sum + (i.progress_percentage || 0), 0) / items.length;
  
  const goalTypes = new Set(items.map(i => i.type));
  const diversityBonus = Math.min(20, goalTypes.size * 5);
  
  const score = (completionRate * 0.4) + (avgProgress * 0.4) + diversityBonus;
  return Math.min(100, Math.max(0, score));
}

function calculateGrowScore(alignmentMetrics: AlignmentMetrics): number {
  if (!alignmentMetrics.has_data) {
    return 25;
  }
  
  let score = 0;
  
  if (alignmentMetrics.alignment_score !== null) {
    score += alignmentMetrics.alignment_score * 0.5;
  }
  
  let clarityScore = 0;
  if (alignmentMetrics.mission_statement) clarityScore += 50;
  if (alignmentMetrics.core_values && alignmentMetrics.core_values.length > 0) clarityScore += 50;
  score += clarityScore * 0.25;
  
  if (alignmentMetrics.examples && alignmentMetrics.examples.length > 0) {
    const alignedCount = alignmentMetrics.examples.filter(e => e.aligned).length;
    const alignedRatio = alignedCount / alignmentMetrics.examples.length;
    score += (alignedRatio * 100) * 0.25;
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateLaunchPointsScore(teamPoints: number, allTeamPoints: number[]): number {
  if (allTeamPoints.length === 0) return 50;
  
  const sorted = [...allTeamPoints].sort((a, b) => a - b);
  const position = sorted.findIndex(p => p >= teamPoints);
  const percentile = ((position + 1) / sorted.length) * 100;
  
  return Math.min(100, Math.max(0, percentile));
}

function scoreToIndicator(score: number): string {
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Moderate';
  return 'Needs Improvement';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: standings, error: standingsError } = await supabase
      .from('moonshot_challenge_standings')
      .select('team_id');

    if (standingsError) throw standingsError;

    if (!standings || standings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No teams to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamIds = standings.map(s => s.team_id);

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, total_launch_points')
      .in('id', teamIds);

    if (teamsError) throw teamsError;

    const allLaunchPoints = (teamsData || []).map(t => t.total_launch_points || 0);

    const { data: snapshots, error: snapshotsError } = await supabase
      .from('team_dashboard_snapshots')
      .select('*')
      .in('team_id', teamIds)
      .eq('is_current', true);

    if (snapshotsError) throw snapshotsError;

    const snapshotMap = new Map((snapshots || []).map(s => [s.team_id, s]));

    const scores: Array<{
      team_id: string;
      run_score: number;
      build_score: number;
      grow_score: number;
      launch_points_score: number;
      overall_astra_score: number;
      calculation_details: object;
      dashboard_snapshot_id: string | null;
      raw_launch_points: number;
    }> = [];

    for (const team of teamsData || []) {
      const snapshot = snapshotMap.get(team.id);
      const launchPoints = team.total_launch_points || 0;

      const healthOverview: HealthOverview = snapshot?.health_overview || { overall_score: null, factors: [] };
      const goalsProgress: GoalsProgress = snapshot?.goals_progress || { has_data: false, items: [] };
      const alignmentMetrics: AlignmentMetrics = snapshot?.alignment_metrics || { has_data: false, alignment_score: null, mission_statement: null, core_values: [], examples: [] };

      const runScore = calculateRunScore(healthOverview);
      const buildScore = calculateBuildScore(goalsProgress);
      const growScore = calculateGrowScore(alignmentMetrics);
      const launchPointsScore = calculateLaunchPointsScore(launchPoints, allLaunchPoints);

      const overallScore = (runScore * 0.25) + (buildScore * 0.25) + (growScore * 0.25) + (launchPointsScore * 0.25);

      scores.push({
        team_id: team.id,
        run_score: Math.round(runScore * 100) / 100,
        build_score: Math.round(buildScore * 100) / 100,
        grow_score: Math.round(growScore * 100) / 100,
        launch_points_score: Math.round(launchPointsScore * 100) / 100,
        overall_astra_score: Math.round(overallScore * 100) / 100,
        calculation_details: {
          has_dashboard_snapshot: !!snapshot,
          health_factors_count: healthOverview.factors?.length || 0,
          goals_count: goalsProgress.items?.length || 0,
          has_mission: !!alignmentMetrics.mission_statement,
          core_values_count: alignmentMetrics.core_values?.length || 0,
        },
        dashboard_snapshot_id: snapshot?.id || null,
        raw_launch_points: launchPoints,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    for (const score of scores) {
      await supabase
        .from('moonshot_rbg_scores')
        .upsert({
          team_id: score.team_id,
          score_date: today,
          run_score: score.run_score,
          build_score: score.build_score,
          grow_score: score.grow_score,
          launch_points_score: score.launch_points_score,
          overall_astra_score: score.overall_astra_score,
          calculation_details: score.calculation_details,
          dashboard_snapshot_id: score.dashboard_snapshot_id,
          raw_launch_points: score.raw_launch_points,
        }, {
          onConflict: 'team_id,score_date',
        });
    }

    scores.sort((a, b) => b.overall_astra_score - a.overall_astra_score);
    const totalTeams = scores.length;
    const top25Threshold = Math.ceil(totalTeams * 0.25);

    for (let i = 0; i < scores.length; i++) {
      const score = scores[i];
      const percentileRank = ((totalTeams - i) / totalTeams) * 100;
      const isTop25 = i < top25Threshold;

      await supabase
        .from('moonshot_challenge_standings')
        .update({
          current_astra_score: score.overall_astra_score,
          run_indicator: scoreToIndicator(score.run_score),
          build_indicator: scoreToIndicator(score.build_score),
          grow_indicator: scoreToIndicator(score.grow_score),
          launch_points_indicator: scoreToIndicator(score.launch_points_score),
          overall_indicator: scoreToIndicator(score.overall_astra_score),
          percentile_rank: Math.round(percentileRank * 100) / 100,
          is_top_25_percent: isTop25,
          scores_calculated_count: 1,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', score.team_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Calculated scores for ${scores.length} teams`,
        processed: scores.length,
        top25Count: top25Threshold,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating RBG scores:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});