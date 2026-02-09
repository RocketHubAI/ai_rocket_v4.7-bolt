import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const superAdminEmails = ['clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai'];
    if (!user.email || !superAdminEmails.includes(user.email)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access only' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const url = new URL(req.url);
    const timeFilter = url.searchParams.get('timeFilter') || '30days';

    let dateThreshold = new Date();
    if (timeFilter === '7days') {
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (timeFilter === '30days') {
      dateThreshold.setDate(dateThreshold.getDate() - 30);
    } else if (timeFilter === '90days') {
      dateThreshold.setDate(dateThreshold.getDate() - 90);
    } else {
      dateThreshold = new Date('2000-01-01');
    }

    const now = new Date();
    const estFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const estDateParts = estFormatter.formatToParts(now);
    const estYear = estDateParts.find(p => p.type === 'year')?.value;
    const estMonth = estDateParts.find(p => p.type === 'month')?.value;
    const estDay = estDateParts.find(p => p.type === 'day')?.value;

    const testDate = new Date(`${estYear}-${estMonth}-${estDay}T12:00:00Z`);
    const utcHour = testDate.getUTCHours();
    const estHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false
    }).format(testDate);
    const estHour = parseInt(estHourStr);
    const offsetHours = utcHour - estHour;
    const offsetStr = offsetHours >= 0 ? `-${String(offsetHours).padStart(2, '0')}:00` : `+${String(-offsetHours).padStart(2, '0')}:00`;

    const estMidnightString = `${estYear}-${estMonth}-${estDay}T00:00:00${offsetStr}`;
    const todayISO = new Date(estMidnightString).toISOString();
    console.log('Today (Eastern midnight) ISO:', todayISO, 'Offset:', offsetStr);

    console.log('Fetching document stats using database aggregation');
    const [documentStatsResult, teamStatsResult] = await Promise.all([
      supabaseAdmin.rpc('get_admin_document_stats'),
      supabaseAdmin.rpc('get_admin_team_document_stats')
    ]);

    if (documentStatsResult.error) {
      console.error('Error fetching document stats:', documentStatsResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch document statistics' }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (teamStatsResult.error) {
      console.error('Error fetching team stats:', teamStatsResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch team statistics' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const documentStats = documentStatsResult.data;
    const teamStats = teamStatsResult.data;

    const totalDocs = documentStats?.reduce((sum: number, stat: any) => sum + parseInt(stat.doc_count), 0) || 0;
    console.log(`Retrieved ${totalDocs} unique documents across ${documentStats?.length || 0} team/category combinations`);

    const [
      usersResult,
      teamsResult,
      chatsResult,
      reportsResult,
      gmailConnectionsResult,
      driveConnectionsResult,
      feedbackResult,
      todayChatsResult,
      privateChatsCount,
      teamChatsCount,
      reportsChatsCount,
      launchStatusResult,
      launchProgressResult
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*').range(0, 9999),
      supabaseAdmin.from('teams').select('*').range(0, 9999),
      supabaseAdmin.from('astra_chats').select('id, user_id, mode, message_type').range(0, 49999),
      supabaseAdmin.from('astra_reports').select('*').range(0, 9999),
      supabaseAdmin.from('gmail_auth').select('*').range(0, 9999),
      supabaseAdmin.from('user_drive_connections').select('*').range(0, 9999),
      supabaseAdmin.from('user_feedback_submissions').select('*').range(0, 9999),
      supabaseAdmin.from('astra_chats').select('user_id, mode, message_type, created_at').gte('created_at', todayISO).range(0, 9999),
      supabaseAdmin.from('astra_chats').select('*', { count: 'exact', head: true }).eq('mode', 'private').eq('message_type', 'user'),
      supabaseAdmin.from('astra_chats').select('*', { count: 'exact', head: true }).eq('mode', 'team').eq('message_type', 'user'),
      supabaseAdmin.from('astra_chats').select('*', { count: 'exact', head: true }).eq('mode', 'reports'),
      supabaseAdmin.from('user_launch_status').select('*').range(0, 9999),
      supabaseAdmin.from('launch_preparation_progress').select('*').range(0, 9999)
    ]);

    if (usersResult.error) {
      console.error('Error fetching users:', usersResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (chatsResult.error) {
      console.error('Error fetching chats:', chatsResult.error);
    }
    console.log('Chats fetched:', chatsResult.data?.length || 0);

    const todayChats = todayChatsResult.data || [];
    const activeUsersToday = new Map();

    todayChats.forEach((chat: any) => {
      if (!activeUsersToday.has(chat.user_id)) {
        activeUsersToday.set(chat.user_id, {
          user_id: chat.user_id,
          private_messages: 0,
          team_messages: 0,
          reports: 0
        });
      }

      const userStats = activeUsersToday.get(chat.user_id);
      if (chat.mode === 'private' && chat.message_type === 'user') {
        userStats.private_messages++;
      } else if (chat.mode === 'team' && chat.message_type === 'user') {
        userStats.team_messages++;
      } else if (chat.mode === 'reports') {
        userStats.reports++;
      }
    });

    const activeUsersList = Array.from(activeUsersToday.values()).map((stats: any) => {
      const user = (usersResult.data || []).find((u: any) => u.id === stats.user_id);
      const team = (teamsResult.data || []).find((t: any) => t.id === user?.team_id);

      return {
        id: stats.user_id,
        email: user?.email || 'Unknown',
        name: user?.name || null,
        team_name: team?.name || 'No Team',
        private_messages_today: stats.private_messages,
        team_messages_today: stats.team_messages,
        reports_today: stats.reports,
        total_actions_today: stats.private_messages + stats.team_messages + stats.reports
      };
    });

    const documents: any[] = [];
    const docStatsArray = documentStats || [];

    docStatsArray.forEach((stat: any) => {
      const count = parseInt(stat.doc_count);
      for (let i = 0; i < count; i++) {
        documents.push({
          teamId: stat.team_id,
          category: stat.doc_category || 'uncategorized',
          docId: `${stat.team_id}:${stat.doc_category}:${i}`
        });
      }
    });

    const responseData = {
      users: usersResult.data || [],
      teams: teamsResult.data || [],
      documents: documents,
      document_stats: docStatsArray,
      team_stats: teamStats || [],
      chats: chatsResult.data || [],
      reports: reportsResult.data || [],
      gmail_connections: gmailConnectionsResult.data || [],
      drive_connections: driveConnectionsResult.data || [],
      feedback: feedbackResult.data || [],
      active_users_today: activeUsersList,
      launch_status: launchStatusResult.data || [],
      launch_progress: launchProgressResult.data || [],
      chat_counts: {
        private: privateChatsCount.count || 0,
        team: teamChatsCount.count || 0,
        reports: reportsChatsCount.count || 0,
        reports_today: todayChats.filter((c: any) => c.mode === 'reports' && c.message_type === 'astra').length,
        total: (privateChatsCount.count || 0) + (teamChatsCount.count || 0) + (reportsChatsCount.count || 0)
      }
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in admin-dashboard-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});