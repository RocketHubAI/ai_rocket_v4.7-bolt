import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for pending report deliveries...');
    const now = new Date();

    const { data: pendingReports, error: fetchError } = await supabase
      .from('astra_chats')
      .select('*, metadata')
      .eq('mode', 'reports')
      .eq('message_type', 'astra')
      .not('deliver_at', 'is', null)
      .lte('deliver_at', now.toISOString())
      .order('deliver_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching pending reports:', fetchError);
      throw new Error(`Failed to fetch pending reports: ${fetchError.message}`);
    }

    if (!pendingReports || pendingReports.length === 0) {
      console.log('No pending reports to deliver');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending reports to deliver',
          checkedAt: now.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingReports.length} report(s) to deliver`);

    const results = [];

    for (const report of pendingReports) {
      try {
        console.log(`Delivering report: ${report.metadata?.title || 'Unknown'} to ${report.user_email}`);

        const reportId = report.metadata?.reportId;
        const sendEmail = report.metadata?.send_email !== false;

        if (sendEmail && reportId) {
          const { data: reportConfig } = await supabase
            .from('astra_reports')
            .select('send_email, is_team_report, schedule_frequency')
            .eq('id', reportId)
            .maybeSingle();

          if (reportConfig?.send_email !== false) {
            console.log(`Sending email to ${report.user_email}...`);

            const { data: userData } = await supabase.auth.admin.getUserById(report.user_id);
            const userName = userData?.user?.user_metadata?.full_name || report.user_email;

            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                reportId: reportId,
                chatMessageId: report.id,
                userId: report.user_id,
                userEmail: report.user_email,
                userName: userName,
                reportTitle: report.metadata?.title || 'Report',
                reportContent: report.message,
                reportFrequency: reportConfig?.schedule_frequency || 'scheduled',
                isTeamReport: reportConfig?.is_team_report || false
              })
            });

            if (emailResponse.ok) {
              console.log(`Email sent to ${report.user_email}`);
            } else {
              console.error(`Failed to send email:`, await emailResponse.text());
            }
          }
        }

        const { error: updateError } = await supabase
          .from('astra_chats')
          .update({ deliver_at: null })
          .eq('id', report.id);

        if (updateError) {
          console.error(`Failed to mark report as delivered:`, updateError);
        } else {
          console.log(`Report marked as delivered`);
        }

        results.push({
          reportId: report.id,
          title: report.metadata?.title,
          userEmail: report.user_email,
          success: true
        });

      } catch (error) {
        console.error(`Error delivering report ${report.id}:`, error);
        results.push({
          reportId: report.id,
          title: report.metadata?.title,
          userEmail: report.user_email,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`\nDelivery Summary: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: { successCount, failureCount, total: pendingReports.length },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deliver-pending-reports:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
