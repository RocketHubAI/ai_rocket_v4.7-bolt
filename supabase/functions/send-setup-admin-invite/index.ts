import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SetupAdminInviteRequest {
  email: string;
  teamName: string;
  teamId?: string;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

    const jwt = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      console.error("Failed to parse JWT:", e);
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await supabaseAdmin.auth.admin.getUserById(userId);

    if (result.error || !result.data.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User not found' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = result.data.user;
    const { email, teamName, teamId }: SetupAdminInviteRequest = await req.json();

    if (!email || !teamName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let actualTeamId = teamId;
    if (!actualTeamId) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('team_id')
        .eq('id', userId)
        .maybeSingle();

      actualTeamId = userData?.team_id;
    }

    if (!actualTeamId) {
      return new Response(
        JSON.stringify({ error: "Could not determine team for invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: inviteCodeError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code: inviteCode,
        team_id: actualTeamId,
        created_by: userId,
        max_uses: 1,
        current_uses: 0,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        invited_email: email.trim().toLowerCase(),
        assigned_role: 'admin',
        view_financial: true,
      });

    if (inviteCodeError) {
      console.error("Error creating invite code:", inviteCodeError);
      return new Response(
        JSON.stringify({ error: "Failed to create invite code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviterName = user.user_metadata?.full_name || user.email;
    const appUrl = 'https://airocket.app';
    const signupUrl = `${appUrl}?invite=${inviteCode}`;

    const emailSubject = `${inviterName} needs your help setting up ${teamName} on AI Rocket`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <style>
            :root {
              color-scheme: light dark;
              supported-color-schemes: light dark;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              line-height: 1.6;
              color: #e5e7eb !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #0f172a !important;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #1e293b !important;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            }
            .email-wrapper {
              background-color: #0f172a !important;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .header .tagline {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.95;
              font-weight: 500;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #f3f4f6;
              margin-bottom: 20px;
            }
            .message {
              font-size: 16px;
              color: #d1d5db;
              margin-bottom: 20px;
              line-height: 1.8;
            }
            .highlight-box {
              background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
              border-radius: 12px;
              padding: 24px;
              margin: 30px 0;
              text-align: center;
            }
            .highlight-box h2 {
              color: white;
              font-size: 20px;
              margin: 0 0 8px 0;
            }
            .highlight-box p {
              color: rgba(255,255,255,0.9);
              margin: 0;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 18px 48px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 700;
              font-size: 18px;
              margin: 10px 0;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            .cta-container {
              text-align: center;
              margin: 20px 0;
            }
            .steps {
              background: #334155;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .steps-title {
              font-weight: 600;
              color: #60a5fa;
              margin-bottom: 12px;
              font-size: 16px;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
              color: #93c5fd;
            }
            .steps li {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .info-box {
              background: #1e3a5f;
              border-left: 4px solid #06b6d4;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .info-box-title {
              font-weight: 600;
              color: #22d3ee;
              margin-bottom: 8px;
              font-size: 16px;
            }
            .info-box p {
              color: #67e8f9;
              font-size: 14px;
              margin: 0;
            }
            .footer {
              background: #0f172a;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #334155;
              font-size: 13px;
              color: #94a3b8;
            }
            .footer a {
              color: #60a5fa;
              text-decoration: none;
            }
            .divider {
              border-top: 1px solid #334155;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
            <div class="header">
              <h1>You've Been Asked to Help Setup</h1>
              <p class="tagline">${teamName} on AI Rocket</p>
            </div>
            <div class="content">
              <div class="greeting">
                Hi there!
              </div>
              <div class="message">
                <strong>${inviterName}</strong> has invited you to help set up <strong>${teamName}</strong> on AI Rocket.
              </div>

              <div class="highlight-box">
                <h2>You're Needed as a Setup Admin</h2>
                <p>${inviterName} is delegating the initial setup to you because you're the best person to configure the team's data connections and settings.</p>
              </div>

              <div class="message">
                As a Setup Admin, you'll complete the Launch Preparation process which includes:
              </div>

              <div class="steps">
                <div class="steps-title">What You'll Configure:</div>
                <ol>
                  <li><strong>Connect Google Drive</strong> - Link the team's shared folders for meetings, strategy, and financials</li>
                  <li><strong>Team Settings</strong> - Configure the company mission and goals</li>
                  <li><strong>News Sources</strong> - Set up relevant industry news feeds</li>
                  <li><strong>Invite Members</strong> - Bring the rest of the team onboard</li>
                </ol>
              </div>

              <div class="cta-container">
                <a href="${signupUrl}" class="cta-button">
                  Accept & Start Setup
                </a>
              </div>

              <div style="background: #1e3a5f; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
                <div style="font-size: 12px; color: #93c5fd; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Your Invite Code</div>
                <div style="font-size: 28px; font-weight: bold; color: white; font-family: monospace; letter-spacing: 4px;">${inviteCode}</div>
                <div style="font-size: 12px; color: #60a5fa; margin-top: 8px;">Use this code when signing up to join ${teamName}</div>
              </div>

              <div class="info-box">
                <div class="info-box-title">What happens next?</div>
                <p>Click the button above or go to <a href="${appUrl}" style="color: #60a5fa;">${appUrl}</a> and enter your invite code <strong>${inviteCode}</strong> when signing up. You'll automatically be connected to ${teamName} and can begin the setup process. ${inviterName} will be notified when you complete the setup.</p>
              </div>

              <div class="divider"></div>

              <div class="message">
                This invitation expires in <strong>7 days</strong>. If you have questions, reach out to ${inviterName} at ${user.email}.
              </div>

              <div class="cta-container">
                <a href="${signupUrl}" class="cta-button">
                  Accept & Start Setup
                </a>
              </div>
            </div>
            <div class="footer">
              <p>
                This invitation was sent by ${inviterName} from ${teamName}.<br>
                Questions? Reply to this email or contact ${user.email}.
              </p>
              <p style="margin-top: 20px;">
                <a href="${appUrl}">AI Rocket</a> - AI that Works for Work
              </p>
            </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AI Rocket <invite@airocket.app>",
        to: email,
        reply_to: user.email,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: errorText,
          status: resendResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log("Setup admin invite email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Setup admin invite sent successfully to ${email}`,
        emailId: resendData.id,
        inviteCode: inviteCode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-setup-admin-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});