import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  userId: string;
  reportId: string;
  prompt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL environment variable is not set. Please configure it in your Supabase project settings.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, reportId, prompt }: RequestBody = await req.json();

    console.log('Generating report for user:', userId, 'reportId:', reportId);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      throw new Error('User not found or email unavailable');
    }

    let teamId = '';
    let teamName = '';
    let role = 'member';
    let viewFinancial = true;
    let userName = userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'Unknown User';

    try {
      console.log(`Fetching team info for user ${userId}...`);
      const { data: userTeamData, error: teamError } = await supabase.rpc('get_user_team_info_service', {
        p_user_id: userId
      });

      if (teamError) {
        console.error(`RPC error fetching team info:`, teamError);
        teamId = userData.user.user_metadata?.team_id || '';
        role = userData.user.user_metadata?.role || 'member';
        viewFinancial = userData.user.user_metadata?.view_financial !== false;
      } else if (!userTeamData || userTeamData.length === 0) {
        console.warn(`No team data returned for user ${userId}`);
        teamId = userData.user.user_metadata?.team_id || '';
        role = userData.user.user_metadata?.role || 'member';
        viewFinancial = userData.user.user_metadata?.view_financial !== false;
      } else {
        const userInfo = userTeamData[0];
        console.log(`Team data fetched successfully:`, userInfo);
        teamId = userInfo.team_id || '';
        teamName = userInfo.team_name || '';
        role = userInfo.role || 'member';
        viewFinancial = userInfo.view_financial !== false;
        userName = userInfo.user_name || userName;
        console.log(`Extracted values: teamId=${teamId}, teamName=${teamName}, role=${role}`);
      }
    } catch (err) {
      console.error('Exception fetching team info:', err);
      teamId = userData.user.user_metadata?.team_id || '';
      role = userData.user.user_metadata?.role || 'member';
      viewFinancial = userData.user.user_metadata?.view_financial !== false;
    }

    const { data: report, error: reportError } = await supabase
      .from('astra_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found or access denied');
    }

    const latestPrompt = report.prompt;
    console.log('Using prompt from database:', latestPrompt.substring(0, 100) + '...');

    console.log('Calling n8n webhook for report generation...');

    const webhookPayload = {
      chatInput: latestPrompt,
      user_id: userId,
      user_email: userData.user.email,
      user_name: userName,
      conversation_id: null,
      team_id: teamId,
      team_name: teamName,
      role: role,
      view_financial: viewFinancial,
      mode: 'reports',
      original_message: latestPrompt,
      mentions: [],
      report_title: report.title,
      report_schedule: report.schedule_time,
      report_frequency: report.schedule_frequency,
      is_manual_run: true,
      is_team_report: report.is_team_report || false,
      created_by_user_id: report.created_by_user_id || null,
      executed_at: new Date().toISOString()
    };

    console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));

    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('n8n webhook failed:', webhookResponse.status, errorText);
      throw new Error('Failed to get report from n8n webhook');
    }

    const responseText = await webhookResponse.text();
    let reportText = responseText;

    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.output) {
        reportText = jsonResponse.output;
      }
    } catch (e) {
    }

    console.log('Report generated successfully from n8n webhook');

    const recipients: Array<{ user_id: string; user_email: string; user_name: string }> = [];

    if (report.is_team_report && teamId) {
      console.log(`Team report detected - sending to all members of team: ${teamId}`);

      const { data: teamMembers, error: membersError } = await supabase
        .from('users')
        .select('id, raw_user_meta_data')
        .eq('team_id', teamId);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        recipients.push({
          user_id: userId,
          user_email: userData.user.email,
          user_name: userName
        });
      } else if (teamMembers && teamMembers.length > 0) {
        console.log(`Found ${teamMembers.length} team members`);
        for (const member of teamMembers) {
          const { data: memberAuth } = await supabase.auth.admin.getUserById(member.id);
          if (memberAuth?.user?.email) {
            recipients.push({
              user_id: member.id,
              user_email: memberAuth.user.email,
              user_name: member.raw_user_meta_data?.full_name || memberAuth.user.email
            });
          }
        }
      }
    } else {
      recipients.push({
        user_id: userId,
        user_email: userData.user.email,
        user_name: userName
      });
    }

    console.log(`Sending report to ${recipients.length} recipient(s)`);

    const insertedMessages: Array<{ chatMessageId: string; userId: string; userEmail: string; userName: string }> = [];

    for (const recipient of recipients) {
      const { data: insertedChat, error: insertError } = await supabase
        .from('astra_chats')
        .insert({
          user_id: recipient.user_id,
          user_email: recipient.user_email,
          mode: 'reports',
          message: reportText,
          message_type: 'astra',
          metadata: {
            reportId: reportId,
            title: report.title,
            report_title: report.title,
            report_schedule: report.schedule_time,
            report_frequency: report.schedule_frequency,
            is_manual_run: true,
            executed_at: new Date().toISOString(),
            is_team_report: report.is_team_report || false,
            created_by_user_id: report.created_by_user_id || null,
            created_by_name: report.is_team_report ? userName : null
          }
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`Failed to insert chat for ${recipient.user_email}:`, insertError);
      } else if (insertedChat) {
        insertedMessages.push({
          chatMessageId: insertedChat.id,
          userId: recipient.user_id,
          userEmail: recipient.user_email,
          userName: recipient.user_name
        });
      }
    }

    console.log(`Report delivered to ${insertedMessages.length} recipient(s)`);

    await supabase
      .from('astra_reports')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', reportId);

    console.log('Report saved to database');

    if (report.send_email !== false) {
      console.log('Report has email notifications enabled, triggering emails...');
      
      const emailPromise = (async () => {
        for (const msg of insertedMessages) {
          try {
            console.log(`Sending report email to ${msg.userEmail}...`);
            
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reportId: reportId,
                chatMessageId: msg.chatMessageId,
                userId: msg.userId,
                userEmail: msg.userEmail,
                userName: msg.userName,
                reportTitle: report.title,
                reportContent: reportText,
                reportFrequency: report.schedule_frequency || 'manual',
                reportPrompt: latestPrompt,
                dataSources: ['Google Drive Documents', 'Meeting Notes', 'Strategy Documents'],
                isTeamReport: report.is_team_report || false
              })
            });

            if (emailResponse.ok) {
              const result = await emailResponse.json();
              if (result.skipped) {
                console.log(`Email skipped for ${msg.userEmail}: ${result.reason}`);
              } else {
                console.log(`Email sent to ${msg.userEmail}`);
              }
            } else {
              console.error(`Failed to send email to ${msg.userEmail}:`, await emailResponse.text());
            }
          } catch (emailError) {
            console.error(`Error sending email to ${msg.userEmail}:`, emailError);
          }
        }
      })();

      EdgeRuntime.waitUntil(emailPromise);
    } else {
      console.log('Report has email notifications disabled, skipping emails');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Report generated successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});