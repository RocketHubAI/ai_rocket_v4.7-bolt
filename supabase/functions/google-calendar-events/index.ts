import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status: string;
  organizer?: { email: string; displayName?: string; self?: boolean };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri: string; entryPointType: string }>;
  };
}

interface CalendarEventsResponse {
  events: CalendarEvent[];
  timeMin: string;
  timeMax: string;
  calendarEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const daysAhead = parseInt(url.searchParams.get("days") || "7", 10);
    const maxResults = parseInt(url.searchParams.get("max") || "50", 10);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamId = user.user_metadata?.team_id;

    let connection = null;

    const userResult = await supabaseClient
      .from("user_drive_connections")
      .select("access_token, token_expires_at, google_account_email")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .maybeSingle();

    if (userResult.data) {
      connection = userResult.data;
    } else if (teamId) {
      const teamResult = await supabaseClient
        .from("user_drive_connections")
        .select("access_token, token_expires_at, google_account_email")
        .eq("team_id", teamId)
        .eq("provider", "google")
        .eq("is_active", true)
        .maybeSingle();

      connection = teamResult.data;
    }

    if (!connection?.access_token) {
      return new Response(JSON.stringify({ error: "No active Google connection. Connect Google Drive first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const timeMin = now.toISOString();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const timeMax = futureDate.toISOString();

    const calendarParams = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults: String(Math.min(maxResults, 100)),
      singleEvents: "true",
      orderBy: "startTime",
      fields: "items(id,summary,description,location,start,end,status,organizer,attendees,htmlLink,hangoutLink,conferenceData)"
    });

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${calendarParams.toString()}`;

    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();

      if (calendarResponse.status === 403) {
        return new Response(JSON.stringify({
          error: "Calendar access not granted. Your Google connection needs calendar permissions. Please reconnect Google Drive to include calendar access.",
          needs_reauth: true
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        error: `Google Calendar API error: ${calendarResponse.status}`,
        details: errorText
      }), {
        status: calendarResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calendarData = await calendarResponse.json();
    const events: CalendarEvent[] = calendarData.items || [];

    const serviceRoleClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceRoleClient
      .from("user_integrations")
      .update({
        last_used_at: new Date().toISOString(),
        times_used_by_agent: (await serviceRoleClient
          .from("user_integrations")
          .select("times_used_by_agent")
          .eq("user_id", user.id)
          .eq("connected_account_email", connection.google_account_email)
          .maybeSingle()
        ).data?.times_used_by_agent + 1 || 1
      })
      .eq("user_id", user.id)
      .eq("connected_account_email", connection.google_account_email);

    const response: CalendarEventsResponse = {
      events,
      timeMin,
      timeMax,
      calendarEmail: connection.google_account_email || ""
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[google-calendar-events] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
