import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DELAY_BETWEEN_TEAMS_MS = 60000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processTeamsInBackground(
  dueSettings: Array<{ team_id: string; generation_day: number; generation_hour: number }>,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  console.log(`[Background] Starting to process ${dueSettings.length} teams with 1-minute delays`);

  for (let i = 0; i < dueSettings.length; i++) {
    const setting = dueSettings[i];

    if (i > 0) {
      console.log(`[Background] Waiting ${DELAY_BETWEEN_TEAMS_MS / 1000} seconds before processing next team...`);
      await delay(DELAY_BETWEEN_TEAMS_MS);
    }

    console.log(`[Background] Processing team ${i + 1} of ${dueSettings.length}: ${setting.team_id}`);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-team-pulse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            team_id: setting.team_id,
            generation_type: 'scheduled'
          })
        }
      );

      if (response.ok) {
        console.log(`[Background] Successfully generated pulse for team ${setting.team_id}`);
      } else {
        const errorText = await response.text();
        console.error(`[Background] Failed to generate pulse for team ${setting.team_id}:`, errorText);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Background] Error processing team ${setting.team_id}:`, errorMsg);
    }
  }

  console.log(`[Background] Finished processing all ${dueSettings.length} teams`);
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
      console.error('Gemini API key not configured');
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dueSettings, error: settingsError } = await supabase
      .from('team_pulse_settings')
      .select('team_id, generation_day, generation_hour')
      .eq('is_enabled', true)
      .lte('next_generation_at', new Date().toISOString());

    if (settingsError) {
      console.error('Error fetching due settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled teams' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dueSettings || dueSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No teams due for pulse generation', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueSettings.length} teams due for pulse generation`);

    EdgeRuntime.waitUntil(
      processTeamsInBackground(dueSettings, supabaseUrl, supabaseServiceKey)
    );

    return new Response(
      JSON.stringify({
        message: `Started processing ${dueSettings.length} teams in background`,
        teams_queued: dueSettings.length,
        estimated_completion_minutes: dueSettings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-scheduled-team-pulse:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});