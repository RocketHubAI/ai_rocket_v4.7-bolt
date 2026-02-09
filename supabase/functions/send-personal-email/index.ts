import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PersonalEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
  isTest?: boolean;
}

const getPersonalMoonshotEmailHtml = (firstName: string, unsubscribeUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Personal Note from Clay</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

    <!-- Personal Message Section -->
    <div style="padding: 40px 32px; border-bottom: 1px solid #e2e8f0;">
      <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px 0; line-height: 1.7;">
        Hi ${firstName},
      </p>

      <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0; line-height: 1.8;">
        I wanted to reach out personally because tomorrow is a big day for our team at RocketHub - we're officially launching the <strong>AI Rocket Moonshot Challenge</strong>.
      </p>

      <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0; line-height: 1.8;">
        Over the past year, we've been quietly building AI Rocket based on feedback from entrepreneurs like you in Gobundance. We listened to the challenges you face - managing strategy documents, extracting insights from meeting notes, understanding your financials, and trying to make sense of all your business data scattered across different tools.
      </p>

      <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0; line-height: 1.8;">
        What we built is <strong>Astra Intelligence</strong> - an AI assistant that connects directly to your Google Drive, learns your business context, and helps you get answers without the endless searching and manual analysis.
      </p>

      <p style="font-size: 16px; color: #475569; margin: 0 0 16px 0; line-height: 1.8;">
        I truly believe this is the start of an <strong>AI for Entrepreneurs revolution</strong> - and I want to thank you for being part of it from the beginning. Your feedback, questions, and support have shaped everything we've built.
      </p>

      <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0; line-height: 1.8;">
        If you haven't had a chance to try AI Rocket yet, I'd love for you to join us for the Moonshot Challenge. It's a 30-day guided experience to get you up and running with AI-powered business intelligence.
      </p>

      <p style="font-size: 16px; color: #1e293b; margin: 0; line-height: 1.8; font-weight: 500;">
        - Clay
      </p>
    </div>

    <!-- Moonshot Challenge Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 48px 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">&#127775;</div>
      <h1 style="color: #fbbf24; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
        AI Rocket Moonshot Challenge
      </h1>
      <p style="color: #94a3b8; font-size: 16px; margin: 0;">
        Launching Tomorrow - January 15th, 2026
      </p>
    </div>

    <!-- What You'll Experience -->
    <div style="padding: 40px 32px; background-color: #f8fafc;">
      <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 24px 0; text-align: center;">
        What You'll Experience
      </h2>

      <div style="display: table; width: 100%; margin-bottom: 16px;">
        <div style="display: table-cell; width: 48px; vertical-align: top; padding-right: 16px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: 600;">1</div>
        </div>
        <div style="display: table-cell; vertical-align: top;">
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Connect Your Data</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">Securely link your Google Drive folders - strategy docs, meeting notes, financials</p>
        </div>
      </div>

      <div style="display: table; width: 100%; margin-bottom: 16px;">
        <div style="display: table-cell; width: 48px; vertical-align: top; padding-right: 16px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: 600;">2</div>
        </div>
        <div style="display: table-cell; vertical-align: top;">
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Ask Astra Anything</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">Get instant answers about your business from your own documents</p>
        </div>
      </div>

      <div style="display: table; width: 100%; margin-bottom: 16px;">
        <div style="display: table-cell; width: 48px; vertical-align: top; padding-right: 16px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: 600;">3</div>
        </div>
        <div style="display: table-cell; vertical-align: top;">
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Generate Visual Reports</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">Create beautiful charts and insights from your data in seconds</p>
        </div>
      </div>

      <div style="display: table; width: 100%;">
        <div style="display: table-cell; width: 48px; vertical-align: top; padding-right: 16px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; text-align: center; line-height: 40px; color: white; font-weight: 600;">4</div>
        </div>
        <div style="display: table-cell; vertical-align: top;">
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Collaborate with Your Team</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">Share insights and work together with shared business context</p>
        </div>
      </div>
    </div>

    <!-- Key Features Grid -->
    <div style="padding: 40px 32px; background-color: #ffffff;">
      <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 24px 0; text-align: center;">
        AI Rocket Key Features
      </h2>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
        <tr>
          <td width="50%" style="padding: 8px;">
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">&#128202;</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">Strategy Intelligence</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px;">
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">&#128221;</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">Meeting Insights</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 8px;">
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">&#128176;</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">Financial Analysis</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px;">
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">&#127919;</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">Cross-Data Insights</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 8px;">
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">&#128200;</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">Visual Reports</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px;">
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">&#129309;</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">Team Collaboration</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Section -->
    <div style="padding: 40px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); text-align: center;">
      <h2 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">
        Ready to Join the Challenge?
      </h2>
      <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
        Get started with AI Rocket and transform how you work with your business data.
      </p>
      <a href="https://airocket.app/moonshot" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
        Join the Moonshot Challenge
      </a>
      <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
        Already have an account? <a href="https://airocket.app" style="color: #60a5fa; text-decoration: underline;">Log in here</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">
        Questions? Just reply to this email - I read every message.
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        RocketHub AI | AI Rocket + Astra Intelligence
      </p>
      <p style="margin: 16px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color: #94a3b8; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

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
    const requestBody = await req.json();

    const {
      recipientEmail,
      recipientName,
      subject,
      htmlContent,
      fromAddress = "clay@rockethub.ai",
      fromName = "Clay Gardner",
      replyTo = "clay@rockethub.ai",
      isTest = false,
    }: PersonalEmailRequest = requestBody;

    const firstName = recipientName?.split(' ')[0] || 'there';

    const { data: contactData } = await supabaseAdmin
      .from('marketing_contacts')
      .select('unsubscribe_token')
      .eq('email', recipientEmail.toLowerCase())
      .maybeSingle();

    const unsubscribeUrl = contactData?.unsubscribe_token
      ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
      : `https://airocket.app/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;

    let emailHtml = htmlContent || getPersonalMoonshotEmailHtml(firstName, unsubscribeUrl);
    emailHtml = emailHtml.replace(/\{\{firstName\}\}/g, firstName);
    emailHtml = emailHtml.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);

    const emailFrom = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: recipientEmail,
        subject: subject || "A Personal Note About AI Rocket",
        html: emailHtml,
        reply_to: replyTo,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error(`Failed to send email:`, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`Personal email sent to ${recipientEmail} from ${emailFrom}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${recipientEmail}`,
        emailId: resendData.id,
        from: emailFrom,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-personal-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});