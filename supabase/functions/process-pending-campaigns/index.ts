import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 50;
const DELAY_BETWEEN_EMAILS_MS = 500;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    if (!resendApiKey) {
      console.log("Email service not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: campaignsWithPending, error: fetchError } = await supabaseAdmin
      .from('marketing_email_recipients')
      .select('marketing_email_id')
      .eq('status', 'pending')
      .limit(1);

    if (fetchError) {
      console.error("Error checking for pending campaigns:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to check pending campaigns" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!campaignsWithPending || campaignsWithPending.length === 0) {
      console.log("No pending campaigns to process");
      return new Response(
        JSON.stringify({ message: "No pending campaigns", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const marketingEmailId = campaignsWithPending[0].marketing_email_id;
    console.log(`Processing campaign: ${marketingEmailId}`);

    const { data: emailData, error: emailError } = await supabaseAdmin
      .from('marketing_emails')
      .select('*')
      .eq('id', marketingEmailId)
      .single();

    if (emailError || !emailData) {
      console.error("Marketing email not found:", marketingEmailId);
      return new Response(
        JSON.stringify({ error: "Marketing email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: pendingRecipients, error: recipientsError } = await supabaseAdmin
      .from('marketing_email_recipients')
      .select('id, email, user_id')
      .eq('marketing_email_id', marketingEmailId)
      .eq('status', 'pending')
      .limit(BATCH_SIZE);

    if (recipientsError) {
      console.error("Failed to fetch pending recipients:", recipientsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending recipients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingRecipients || pendingRecipients.length === 0) {
      await supabaseAdmin
        .from('marketing_emails')
        .update({ status: 'sent', sent_at: emailData.sent_at || new Date().toISOString() })
        .eq('id', marketingEmailId);

      console.log(`Campaign ${marketingEmailId} complete - no pending recipients`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Campaign complete",
          processed: 0,
          remaining: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingRecipients.length} recipients for campaign ${marketingEmailId}`);

    const senderAddress = emailData.from_address || 'astra@airocket.app';
    const senderName = emailData.from_name || 'AI Rocket';
    const senderReplyTo = emailData.reply_to || senderAddress;
    const emailFrom = `${senderName} <${senderAddress}>`;

    console.log(`Sending from: ${emailFrom}`);

    let successCount = 0;
    let failCount = 0;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < pendingRecipients.length; i++) {
      const recipient = pendingRecipients[i];

      let firstName = 'there';
      if (recipient.user_id) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('name')
          .eq('id', recipient.user_id)
          .single();
        if (userData?.name) {
          firstName = userData.name.split(' ')[0];
        }
      }

      let emailHtml = emailData.html_content;
      emailHtml = emailHtml.replace(/\{\{firstName\}\}/g, firstName);

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to: recipient.email,
            subject: emailData.subject,
            html: emailHtml,
            reply_to: senderReplyTo,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          console.error(`Failed to send to ${recipient.email}:`, errorText);

          await supabaseAdmin
            .from('marketing_email_recipients')
            .update({ status: 'failed', error_message: errorText })
            .eq('id', recipient.id);

          failCount++;
        } else {
          const resendData = await resendResponse.json();

          await supabaseAdmin
            .from('marketing_email_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              email_id: resendData.id
            })
            .eq('id', recipient.id);

          successCount++;
          console.log(`Email sent to ${recipient.email}`);
        }
      } catch (error) {
        console.error(`Error sending to ${recipient.email}:`, error);

        await supabaseAdmin
          .from('marketing_email_recipients')
          .update({ status: 'failed', error_message: error.message })
          .eq('id', recipient.id);

        failCount++;
      }

      if (i < pendingRecipients.length - 1) {
        await delay(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    const { count: remainingCount } = await supabaseAdmin
      .from('marketing_email_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('marketing_email_id', marketingEmailId)
      .eq('status', 'pending');

    const { data: totals } = await supabaseAdmin
      .from('marketing_email_recipients')
      .select('status')
      .eq('marketing_email_id', marketingEmailId);

    const totalSent = totals?.filter(r => r.status === 'sent').length || 0;
    const totalFailed = totals?.filter(r => r.status === 'failed').length || 0;

    await supabaseAdmin
      .from('marketing_emails')
      .update({
        successful_sends: totalSent,
        failed_sends: totalFailed,
        status: remainingCount === 0 ? 'sent' : 'sending'
      })
      .eq('id', marketingEmailId);

    console.log(`Batch complete for ${marketingEmailId}: ${successCount} sent, ${failCount} failed, ${remainingCount} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: marketingEmailId,
        processed_this_batch: pendingRecipients.length,
        successful_this_batch: successCount,
        failed_this_batch: failCount,
        total_sent: totalSent,
        total_failed: totalFailed,
        remaining: remainingCount || 0,
        is_complete: remainingCount === 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-pending-campaigns:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});