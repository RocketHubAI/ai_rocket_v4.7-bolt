import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 50;
const DELAY_BETWEEN_EMAILS_MS = 500;
const MAX_EXECUTION_TIME_MS = 45000;

interface UserFilters {
  launch_status?: string;
  current_stage?: string;
  drive_connected?: string;
  activity_level?: string;
  user_role?: string;
  account_age?: string;
  has_visualizations?: boolean | null;
  has_scheduled_reports?: boolean | null;
  has_messages?: boolean | null;
}

interface CampaignRequest {
  marketingEmailId: string;
  recipientFilter?: {
    type?: 'all' | 'specific' | 'preview_requests';
    types?: ('all_users' | 'specific' | 'preview_requests' | 'marketing_contacts' | 'moonshot_registrations' | 'filtered_users')[];
    emails?: string[];
    user_filters?: UserFilters;
  };
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { marketingEmailId, recipientFilter, fromAddress, fromName, replyTo }: CampaignRequest = await req.json();

    const { data: emailData, error: emailError } = await supabaseAdmin
      .from('marketing_emails')
      .select('*')
      .eq('id', marketingEmailId)
      .single();

    if (emailError || !emailData) {
      return new Response(
        JSON.stringify({ error: "Marketing email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderAddress = fromAddress || emailData.from_address || 'astra@airocket.app';
    const senderName = fromName || emailData.from_name || 'AI Rocket';
    const senderReplyTo = replyTo || emailData.reply_to || senderAddress;
    const emailFrom = `${senderName} <${senderAddress}>`;

    let recipients: { id: string | null; email: string; firstName: string; inviteCode?: string }[] = [];
    const seenEmails = new Set<string>();

    const addRecipient = (r: { id: string | null; email: string; firstName: string; inviteCode?: string }) => {
      const emailLower = r.email.toLowerCase();
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        recipients.push(r);
      }
    };

    let types: string[] = [];
    if (recipientFilter?.types && recipientFilter.types.length > 0) {
      types = recipientFilter.types;
    } else if (recipientFilter?.type) {
      types = [recipientFilter.type === 'all' ? 'all_users' : recipientFilter.type];
    } else {
      types = ['all_users'];
    }

    if (types.includes('all_users')) {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name');

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      users.forEach(u => addRecipient({
        id: u.id,
        email: u.email,
        firstName: u.name?.split(' ')[0] || 'there'
      }));
    }

    if (types.includes('preview_requests')) {
      const { data: previewRequests, error } = await supabaseAdmin
        .from('preview_requests')
        .select('email, invite_code, onboarded')
        .eq('invite_sent', true)
        .or('onboarded.is.null,onboarded.eq.false');

      if (!error && previewRequests) {
        previewRequests.forEach((req: any) => addRecipient({
          id: null,
          email: req.email,
          firstName: 'there',
          inviteCode: req.invite_code || ''
        }));
      }
    }

    if (types.includes('marketing_contacts')) {
      const { data: contacts, error } = await supabaseAdmin
        .rpc('get_marketing_contacts_for_campaign');

      if (!error && contacts) {
        contacts.forEach((c: any) => addRecipient({
          id: null,
          email: c.email,
          firstName: c.first_name || 'there'
        }));
      }
    }

    if (types.includes('moonshot_registrations')) {
      const { data: registrations, error } = await supabaseAdmin
        .from('moonshot_registrations')
        .select('email, name')
        .is('converted_at', null);

      if (!error && registrations) {
        registrations.forEach((r: any) => addRecipient({
          id: null,
          email: r.email,
          firstName: r.name?.split(' ')[0] || 'there'
        }));
      }
    }

    if (types.includes('filtered_users')) {
      const filters = recipientFilter?.user_filters || emailData.recipient_filter?.user_filters || {};
      const { data: filteredData, error } = await supabaseAdmin.rpc('get_filtered_marketing_recipients', {
        p_launch_status: filters.launch_status || 'all',
        p_current_stage: filters.current_stage || 'all',
        p_drive_connected: filters.drive_connected || 'all',
        p_activity_level: filters.activity_level || 'all',
        p_user_role: filters.user_role || 'all',
        p_account_age: filters.account_age || 'all',
        p_has_visualizations: filters.has_visualizations ?? null,
        p_has_scheduled_reports: filters.has_scheduled_reports ?? null,
        p_has_messages: filters.has_messages ?? null
      });

      if (!error && filteredData && filteredData.length > 0) {
        const userEmails = filteredData[0].user_emails || [];
        userEmails.forEach((u: any) => addRecipient({
          id: u.id,
          email: u.email,
          firstName: u.name?.split(' ')[0] || 'there'
        }));
      }
    }

    if (types.includes('specific') && recipientFilter?.emails && recipientFilter.emails.length > 0) {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .in('email', recipientFilter.emails);

      if (!error && users) {
        users.forEach(u => addRecipient({
          id: u.id,
          email: u.email,
          firstName: u.name?.split(' ')[0] || 'there'
        }));
      }
    }

    await supabaseAdmin
      .from('marketing_emails')
      .update({
        total_recipients: recipients.length,
        status: 'sending'
      })
      .eq('id', marketingEmailId);

    const recipientRecords = recipients.map(r => ({
      marketing_email_id: marketingEmailId,
      user_id: r.id,
      email: r.email,
      status: 'pending'
    }));

    if (recipientRecords.length > 0) {
      await supabaseAdmin
        .from('marketing_email_recipients')
        .insert(recipientRecords);
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;
    let timedOut = false;

    for (let i = 0; i < recipients.length && i < BATCH_SIZE; i++) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        console.log("Approaching timeout, saving progress and exiting");
        timedOut = true;
        break;
      }

      const recipient = recipients[i];
      let emailHtml = emailData.html_content;
      emailHtml = emailHtml.replace(/\{\{firstName\}\}/g, recipient.firstName);
      if (recipient.inviteCode) {
        emailHtml = emailHtml.replace(/\{\{inviteCode\}\}/g, recipient.inviteCode);
      }

      const { data: contactData } = await supabaseAdmin
        .from('marketing_contacts')
        .select('unsubscribe_token')
        .eq('email', recipient.email.toLowerCase())
        .maybeSingle();

      const unsubscribeUrl = contactData?.unsubscribe_token
        ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
        : `https://airocket.app/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

      if (emailHtml.includes('{{unsubscribeUrl}}')) {
        emailHtml = emailHtml.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);
      }

      if (!emailHtml.toLowerCase().includes('unsubscribe')) {
        const unsubscribeFooter = `
          <div style="text-align: center; padding: 20px; border-top: 1px solid #334155; margin-top: 20px;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> from future emails
            </p>
          </div>`;

        if (emailHtml.includes('</body>')) {
          emailHtml = emailHtml.replace('</body>', `${unsubscribeFooter}</body>`);
        } else if (emailHtml.includes('</html>')) {
          emailHtml = emailHtml.replace('</html>', `${unsubscribeFooter}</html>`);
        } else {
          emailHtml += unsubscribeFooter;
        }
      }

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
            .eq('marketing_email_id', marketingEmailId)
            .eq('email', recipient.email);

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
            .eq('marketing_email_id', marketingEmailId)
            .eq('email', recipient.email);

          successCount++;
          console.log(`Email sent to ${recipient.email}`);
        }
      } catch (error) {
        console.error(`Error sending to ${recipient.email}:`, error);

        await supabaseAdmin
          .from('marketing_email_recipients')
          .update({ status: 'failed', error_message: error.message })
          .eq('marketing_email_id', marketingEmailId)
          .eq('email', recipient.email);

        failCount++;
      }

      processedCount++;

      if (i < Math.min(recipients.length, BATCH_SIZE) - 1) {
        await delay(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    const remainingCount = recipients.length - processedCount;
    const isComplete = remainingCount === 0 && !timedOut;

    await supabaseAdmin
      .from('marketing_emails')
      .update({
        status: isComplete ? 'sent' : 'sending',
        sent_at: isComplete ? new Date().toISOString() : null,
        successful_sends: successCount,
        failed_sends: failCount
      })
      .eq('id', marketingEmailId);

    return new Response(
      JSON.stringify({
        success: true,
        message: isComplete 
          ? "Campaign completed successfully!" 
          : `First batch sent. ${remainingCount} recipients remaining. Call resume-marketing-campaign to continue.`,
        total_recipients: recipients.length,
        processed_this_batch: processedCount,
        successful_sends: successCount,
        failed_sends: failCount,
        remaining: remainingCount,
        is_complete: isComplete,
        requires_resume: !isComplete
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-marketing-email-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});