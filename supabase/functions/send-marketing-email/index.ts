import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MarketingEmailRequest {
  recipientEmails?: string[];
  subject?: string;
  htmlContent?: string;
  isTestEmail?: boolean;
  testInviteCode?: string;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
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

    const { recipientEmails, subject, htmlContent, isTestEmail, testInviteCode, fromAddress, fromName, replyTo }: MarketingEmailRequest = await req.json();

    const defaultFrom = "AI Rocket <astra@airocket.app>";
    const emailFrom = fromAddress
      ? (fromName ? `${fromName} <${fromAddress}>` : fromAddress)
      : defaultFrom;

    let recipients: { email: string; firstName: string }[] = [];

    if (recipientEmails && recipientEmails.length > 0) {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .in('email', recipientEmails);

      if (error) {
        console.error("Error fetching test users:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipients = users.map(u => ({
        email: u.email,
        firstName: u.name?.split(' ')[0] || 'there'
      }));
    } else {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('email, name');

      if (error) {
        console.error("Error fetching all users:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipients = users.map(u => ({
        email: u.email,
        firstName: u.name?.split(' ')[0] || 'there'
      }));
    }

    const appUrl = 'https://airocket.app';
    const emailSubject = subject || 'Astra Guided Setup now Live';

    const results = [];
    const errors = [];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      if (i > 0 && i % 2 === 0) {
        await delay(1000);
      }

      const { data: contactData } = await supabaseAdmin
        .from('marketing_contacts')
        .select('unsubscribe_token')
        .eq('email', recipient.email.toLowerCase())
        .maybeSingle();

      const unsubscribeUrl = contactData?.unsubscribe_token
        ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
        : `https://airocket.app/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

      let emailHtmlContent = htmlContent
        ? htmlContent.replace(/\{\{firstName\}\}/g, recipient.firstName).replace(/\{\{inviteCode\}\}/g, testInviteCode || 'TESTCODE')
        : `<!DOCTYPE html><html><body><p>Hello ${recipient.firstName}</p></body></html>`;

      if (emailHtmlContent.includes('{{unsubscribeUrl}}')) {
        emailHtmlContent = emailHtmlContent.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);
      } else if (!emailHtmlContent.toLowerCase().includes('unsubscribe')) {
        const unsubscribeFooter = `
          <div style="text-align: center; padding: 20px; border-top: 1px solid #334155; margin-top: 20px;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> from future emails
            </p>
          </div>`;

        if (emailHtmlContent.includes('</body>')) {
          emailHtmlContent = emailHtmlContent.replace('</body>', `${unsubscribeFooter}</body>`);
        } else if (emailHtmlContent.includes('</html>')) {
          emailHtmlContent = emailHtmlContent.replace('</html>', `${unsubscribeFooter}</html>`);
        } else {
          emailHtmlContent += unsubscribeFooter;
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
            subject: emailSubject,
            html: emailHtmlContent,
            ...(replyTo && { reply_to: replyTo }),
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          console.error(`Failed to send to ${recipient.email}:`, resendResponse.status, errorText);
          errors.push({ email: recipient.email, error: errorText });
        } else {
          const resendData = await resendResponse.json();
          results.push({ email: recipient.email, emailId: resendData.id });
          console.log(`Email sent successfully to ${recipient.email}`);
        }
      } catch (error) {
        console.error(`Error sending to ${recipient.email}:`, error);
        errors.push({ email: recipient.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.length} emails successfully`,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-marketing-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});