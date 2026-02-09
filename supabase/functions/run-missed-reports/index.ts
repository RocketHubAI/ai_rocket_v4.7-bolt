import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DELAY_BETWEEN_REPORTS_MS = 30000;

function calculateNextRunTime(scheduleTime: string, frequency: string, scheduleDay: number | null): string {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const nextRun = new Date();
  nextRun.setUTCHours(hours + 5, minutes, 0, 0);

  if (frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    const targetDay = scheduleDay ?? 1;
    const daysUntilTarget = (targetDay - nextRun.getUTCDay() + 7) % 7;
    nextRun.setDate(nextRun.getDate() + (daysUntilTarget === 0 && nextRun <= now ? 7 : daysUntilTarget));
  } else if (frequency === 'monthly') {
    const targetDay = scheduleDay ?? 1;
    nextRun.setUTCDate(targetDay);
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }

  return nextRun.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!n8nWebhookUrl) {
      throw new Error('Missing N8N_WEBHOOK_URL');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const missedReportIds = [
      'd51f4718-bd80-4de2-ac8a-43987bcf8e6d',
      '23fde5da-1d68-4949-a826-a2eddf2ee78c',
      '3bfaf453-634c-4251-b1d8-303ef1c82a33',
      'df981d49-0182-4a41-9f5b-58cc5f58f863',
      '7ad694fe-5ccd-4b04-9f6c-4d0511d26334',
      'ecc63e95-3d77-4b24-a17a-3bb029386022',
      'b221200f-2c69-415f-b154-9c57706ac7fa',
      '323a5946-a431-4dac-96dd-34e5583cba5e',
      'd6720c39-fc76-41cd-b1a5-b5589f26f246',
      '0dfa8b4f-3a4f-4ca2-ac86-980df32468f6',
      'eb5be4b6-3e00-40cc-9e71-686388a8f5d2'
    ];

    console.log(`Processing ${missedReportIds.length} missed reports with ${DELAY_BETWEEN_REPORTS_MS / 1000}s spacing`);

    const results = [];

    for (let i = 0; i < missedReportIds.length; i++) {
      const reportId = missedReportIds[i];

      if (i > 0) {
        console.log(`Waiting ${DELAY_BETWEEN_REPORTS_MS / 1000}s before next report...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REPORTS_MS));
      }

      try {
        const { data: report, error: reportError } = await supabase
          .from('astra_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (reportError || !report) {
          console.error(`Report ${reportId} not found:`, reportError);
          results.push({ reportId, success: false, error: 'Report not found' });
          continue;
        }

        console.log(`\nProcessing report ${i + 1}/${missedReportIds.length}: ${report.title}`);

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(report.user_id);

        if (userError || !userData?.user?.email) {
          console.error(`User not found for report ${reportId}`);
          results.push({ reportId, reportTitle: report.title, success: false, error: 'User not found' });
          continue;
        }

        const { data: userRecord } = await supabase
          .from('users')
          .select('team_id, role, view_financial, name, teams(name)')
          .eq('id', report.user_id)
          .single();

        const teamId = userRecord?.team_id || userData.user.user_metadata?.team_id || null;
        const teamName = userRecord?.teams?.name || '';
        const role = userRecord?.role || 'member';
        const viewFinancial = userRecord?.view_financial !== false;
        const userName = userRecord?.name || userData.user.user_metadata?.full_name || userData.user.email;

        const nextRunAt = calculateNextRunTime(
          report.schedule_time,
          report.schedule_frequency,
          report.schedule_day
        );

        console.log('Marking report as running, next run:', nextRunAt);
        await supabase
          .from('astra_reports')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunAt
          })
          .eq('id', report.id);

        console.log('Calling n8n webhook...');

        const webhookPayload = {
          chatInput: report.prompt,
          user_id: report.user_id,
          user_email: userData.user.email,
          user_name: userName,
          conversation_id: null,
          team_id: teamId,
          team_name: teamName,
          role: role,
          view_financial: viewFinancial,
          mode: 'reports',
          original_message: report.prompt,
          mentions: [],
          report_title: report.title,
          report_schedule: report.schedule_time,
          report_frequency: report.schedule_frequency,
          is_manual_run: false,
          is_team_report: report.is_team_report || false,
          created_by_user_id: report.created_by_user_id || null,
          executed_at: new Date().toISOString()
        };

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('n8n webhook failed:', webhookResponse.status, errorText);
          results.push({ reportId, reportTitle: report.title, success: false, error: `Webhook failed: ${webhookResponse.status}` });
          continue;
        }

        const webhookResponseText = await webhookResponse.text();
        let webhookData;
        try {
          webhookData = JSON.parse(webhookResponseText);
        } catch {
          webhookData = { output: webhookResponseText };
        }

        const reportText = webhookData.output || webhookData.message || webhookData.text ||
          (typeof webhookData === 'string' ? webhookData : JSON.stringify(webhookData));

        console.log('Report text received, length:', reportText.length);

        const reportRecipients = [{
          user_id: report.user_id,
          user_email: userData.user.email,
          user_name: userName
        }];

        for (const recipient of reportRecipients) {
          const { data: insertedChat, error: insertError } = await supabase
            .from('astra_chats')
            .insert({
              user_id: recipient.user_id,
              user_email: recipient.user_email,
              mode: 'reports',
              message: reportText,
              message_type: 'astra',
              metadata: {
                reportId: report.id,
                title: report.title,
                report_title: report.title,
                executed_at: new Date().toISOString(),
                schedule_time: report.schedule_time,
                schedule_frequency: report.schedule_frequency,
                is_team_report: report.is_team_report || false
              }
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`Failed to insert chat for ${recipient.user_email}:`, insertError);
          } else {
            console.log(`Chat message inserted for ${recipient.user_email}`);

            if (report.send_email !== false && insertedChat) {
              console.log('Sending email...');
              try {
                const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reportId: report.id,
                    chatMessageId: insertedChat.id,
                    userId: recipient.user_id,
                    userEmail: recipient.user_email,
                    userName: recipient.user_name,
                    reportTitle: report.title,
                    reportContent: reportText,
                    reportFrequency: report.schedule_frequency || 'scheduled',
                    isTeamReport: report.is_team_report || false
                  })
                });

                if (emailResponse.ok) {
                  console.log(`Email sent to ${recipient.user_email}`);
                } else {
                  console.error(`Failed to send email:`, await emailResponse.text());
                }
              } catch (emailError) {
                console.error(`Error sending email:`, emailError);
              }
            }
          }
        }

        console.log(`Report ${report.title} completed successfully`);
        results.push({ reportId, reportTitle: report.title, success: true, nextRunAt });

      } catch (error) {
        console.error(`Error processing report ${reportId}:`, error);
        results.push({ reportId, success: false, error: error.message || 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`\nSummary: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: { successCount, failureCount, total: missedReportIds.length },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in run-missed-reports:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
