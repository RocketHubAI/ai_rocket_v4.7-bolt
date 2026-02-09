import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  email: string;
  inviteCode: string;
  teamName: string;
  role: string;
  testMode?: boolean;
  inviterEmail?: string;
  categoryAccess?: string[];
}

const featureContent = [
  {
    title: 'Sync Your Data',
    tagline: 'AI that understands your entire team.',
    icon: '&#128202;',
    summary: 'AI Rocket connects and vectorizes all of your company\'s documents, financials, meetings, and strategy files into an encrypted, real-time knowledge base.',
    benefits: [
      '<strong>Eliminate Data Silos:</strong> Allow AI Rocket to access and process every file type (PDFs, Google Sheets, transcripts) from your connected storage.',
      '<strong>Real-Time Context:</strong> Data is continuously synced so AI\'s insights are always based on the absolute latest company information.',
      '<strong>Mission Alignment:</strong> Every AI response is aligned with your documented core values, mission, and goals.'
    ]
  },
  {
    title: 'Visualizations',
    tagline: 'See your data, not just read it.',
    icon: '&#128200;',
    summary: 'Effortlessly convert any chat response or raw data query into a custom, interactive graphic dashboard with the push of a button.',
    benefits: [
      '<strong>Instant Dashboard Creation:</strong> Transform complex text-based answers into a custom graphic dashboard with a single click.',
      '<strong>One-Click People Analyzer:</strong> Run an EOS People Analyzer visualization correlating leadership meeting transcripts against your core values.',
      '<strong>Prompt-Driven Reporting:</strong> Simply prompt for the metrics you care about, and AI Rocket builds a live-updated, real-time dashboard.'
    ]
  },
  {
    title: 'Team Collaboration',
    tagline: 'Where AI is an active member of your team.',
    icon: '&#128101;',
    summary: 'The integrated Team Chat replaces traditional communication platforms, giving your AI assistant full access to conversation history and team data.',
    benefits: [
      '<strong>AI as a Team Member:</strong> Your AI assistant is an active participant in your team chat, ready to answer questions and provide intelligence.',
      '<strong>Context-Rich Discussions:</strong> Instantly pull an infinite amount of context (financials, strategy docs, past meetings) into team chat.',
      '<strong>Automated Chat Summaries:</strong> Generate a summary of the last seven days of team activity with a simple prompt.'
    ]
  },
  {
    title: 'Automated Reports',
    tagline: 'Your business intelligence, delivered on your schedule.',
    icon: '&#128203;',
    summary: 'Configure complex, context-rich reports with a single prompt and schedule them to be automatically delivered daily, weekly, or monthly.',
    benefits: [
      '<strong>Personalized Action Reports:</strong> Generate a Weekly Action Report summarizing your leadership meeting into a personalized dashboard.',
      '<strong>Set-It-and-Forget-It:</strong> Schedule any report to run on a recurring schedule, eliminating manual report preparation.',
      '<strong>Context-Aware News Briefs:</strong> Receive a Daily News Brief that understands your company and finds relevant external articles.'
    ]
  },
  {
    title: 'AI Specialists',
    tagline: 'Hire an AI executive for any role in your company.',
    icon: '&#129302;',
    summary: 'Quickly create highly specialized, autonomous AI roles (Agents) like a Financial Analyst or Marketing Director by giving them a simple conversational job description.',
    benefits: [
      '<strong>Custom Roles in Minutes:</strong> Build a new AI Specialist like an EOS Business Coach with just a conversation.',
      '<strong>Leverage Proprietary Data:</strong> Empower AI Specialists with detailed instructions and all your synced company data.',
      '<strong>Automate Complex Tasks:</strong> Have an AI Marketing Director generate and send custom email campaigns from a simple prompt.'
    ]
  }
];

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: InviteRequest = await req.json();
    const { email, inviteCode, teamName, role, testMode, inviterEmail: testInviterEmail, categoryAccess } = body;

    const CATEGORY_LABELS: Record<string, string> = {
      meetings: 'Meetings',
      strategy: 'Strategy',
      financial: 'Financial',
      operations: 'Operations',
      marketing: 'Marketing',
      sales: 'Sales',
      customer: 'Customer',
      product: 'Product',
      people: 'People',
      legal: 'Legal',
      support: 'Support',
      industry: 'Industry',
      reference: 'Reference',
      other: 'Other',
    };

    let inviterEmailToUse: string;

    if (testMode) {
      inviterEmailToUse = testInviterEmail || 'test@airocket.app';
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const jwt = authHeader.replace("Bearer ", "");

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

      inviterEmailToUse = result.data.user.email || 'A team member';
    }

    if (!email || !inviteCode || !teamName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviterEmail = inviterEmailToUse;
    const appUrl = 'https://airocket.app';

    const emailSubject = teamName === 'AI Rocket'
      ? 'AI Rocket - Preview Access Invite'
      : `Join ${teamName} on AI Rocket`;

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
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              line-height: 1.6;
              color: #e5e7eb !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #0A0F1C !important;
            }
            .container {
              max-width: 640px;
              margin: 40px auto;
              background-color: #0A0F1C !important;
              border-radius: 20px;
              overflow: hidden;
            }
            .email-wrapper {
              background-color: #0A0F1C !important;
              padding: 20px;
            }
            .header {
              background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%);
              color: white;
              padding: 48px 30px 40px;
              text-align: center;
              position: relative;
            }
            .header::before {
              content: '';
              position: absolute;
              top: 20%;
              left: 20%;
              width: 200px;
              height: 200px;
              background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
              border-radius: 50%;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: 20%;
              right: 20%;
              width: 200px;
              height: 200px;
              background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
              border-radius: 50%;
            }
            .brand-section {
              position: relative;
              z-index: 1;
            }
            .rocket-icon {
              display: inline-block;
              width: 64px;
              height: 64px;
              background: linear-gradient(145deg, #5BA4E6, #3B82C4);
              border-radius: 16px;
              font-size: 36px;
              line-height: 64px;
              text-align: center;
              margin-bottom: 12px;
              box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4);
            }
            .brand-name {
              font-size: 42px;
              font-weight: 800;
              color: white;
              margin: 8px 0 4px;
              letter-spacing: -0.5px;
            }
            .brand-tagline {
              font-size: 16px;
              color: #9ca3af;
              letter-spacing: 0.5px;
              margin-bottom: 0;
            }
            .content {
              padding: 40px 30px;
              background: #131B2E;
            }
            .greeting {
              font-size: 22px;
              font-weight: 600;
              color: #f3f4f6;
              margin-bottom: 16px;
            }
            .message {
              font-size: 16px;
              color: #9ca3af;
              margin-bottom: 24px;
              line-height: 1.7;
            }
            .message a {
              color: #60a5fa;
              text-decoration: none;
            }
            .invite-box {
              background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1));
              border: 2px solid #3b82f6;
              border-radius: 20px;
              padding: 24px 16px;
              margin: 32px 0;
              text-align: center;
            }
            @media only screen and (min-width: 480px) {
              .invite-box {
                padding: 36px;
              }
            }
            .invite-label {
              font-size: 11px;
              text-transform: uppercase;
              color: #94a3b8;
              font-weight: 700;
              letter-spacing: 2px;
              margin-bottom: 16px;
            }
            .invite-code {
              font-size: 32px;
              font-weight: 700;
              color: #4ade80;
              font-family: 'Courier New', monospace;
              letter-spacing: 4px;
              margin-bottom: 16px;
              word-break: break-all;
            }
            @media only screen and (min-width: 480px) {
              .invite-code {
                font-size: 40px;
                letter-spacing: 6px;
              }
            }
            .email-display {
              font-size: 14px;
              color: #94a3b8;
              margin-top: 12px;
            }
            .email-value {
              color: #60a5fa;
              font-weight: 600;
            }
            .cta-container {
              text-align: center;
              margin: 36px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
              color: white;
              padding: 18px 52px;
              border-radius: 50px;
              text-decoration: none;
              font-weight: 700;
              font-size: 17px;
              box-shadow: 0 8px 32px rgba(59, 130, 246, 0.35);
            }
            .divider {
              border-top: 1px solid #334155;
              margin: 30px 0;
            }
            .features-section {
              margin: 36px 0;
            }
            .features-title {
              font-size: 22px;
              font-weight: 700;
              color: #f3f4f6;
              margin-bottom: 24px;
              text-align: center;
            }
            .feature-card {
              background: #1e293b;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 16px;
              border: 1px solid #334155;
            }
            .feature-card-header {
              margin-bottom: 12px;
            }
            .feature-card-icon {
              font-size: 28px;
              margin-right: 12px;
            }
            .feature-card-title {
              font-size: 18px;
              font-weight: 700;
              color: #f3f4f6;
            }
            .feature-card-tagline {
              font-size: 14px;
              color: #3b82f6;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .feature-card-summary {
              font-size: 14px;
              color: #9ca3af;
              line-height: 1.6;
              margin-bottom: 16px;
            }
            .benefits-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .benefits-list li {
              padding: 10px 0;
              color: #d1d5db;
              border-bottom: 1px solid rgba(71, 85, 105, 0.5);
              font-size: 13px;
              line-height: 1.5;
            }
            .benefits-list li:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .benefits-list li strong {
              color: #f3f4f6;
            }
            .check-icon {
              color: #10b981;
              font-weight: bold;
              font-size: 14px;
              margin-right: 8px;
            }
            .steps {
              background: linear-gradient(180deg, #1e3a5f 0%, #1a2f4a 100%);
              border-left: 4px solid #3b82f6;
              padding: 24px;
              margin: 30px 0;
              border-radius: 0 12px 12px 0;
            }
            .steps-title {
              font-weight: 700;
              color: #60a5fa;
              margin-bottom: 16px;
              font-size: 18px;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
              color: #93c5fd;
            }
            .steps li {
              margin-bottom: 12px;
              font-size: 15px;
              line-height: 1.5;
            }
            .steps li strong {
              color: #4ade80;
            }
            .role-info {
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.3);
              border-radius: 12px;
              padding: 20px;
              margin: 24px 0;
            }
            .role-info strong {
              color: #60a5fa;
            }
            .footer {
              background: #0A0F1C;
              padding: 32px 30px;
              text-align: center;
              border-top: 1px solid #1e293b;
            }
            .footer p {
              font-size: 14px;
              color: #64748b;
              margin: 0 0 16px;
            }
            .footer a {
              color: #3b82f6;
              text-decoration: none;
              font-weight: 500;
            }
            .footer .brand-footer {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-top: 20px;
            }
            .footer .mini-rocket {
              font-size: 18px;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header">
                <div class="brand-section">
                  <div class="rocket-icon">&#128640;</div>
                  <div class="brand-name">Welcome to AI Rocket</div>
                  <div class="brand-tagline">AI that Works for Work</div>
                </div>
              </div>
              <div class="content">
                ${teamName === 'AI Rocket' ? `
                <div class="greeting">Hi ${email},</div>
                <div class="message">
                  The RocketHub team is excited to welcome you for Preview Access to AI Rocket.
                </div>
                <div class="message" style="margin-top: 16px;">
                  Enjoy Unlimited & Free Access to AI that Works for Work and help us Launch AI-Powered businesses for Entrepreneurs and their Teams!
                </div>
                <div class="message" style="margin-top: 16px;">
                  Enjoy and give us lots of feedback!
                </div>
                <div class="message" style="margin-top: 16px;">
                  Sincerely - Clay Speakman and the RocketHub.AI team
                </div>

                <div class="role-info" style="margin-top: 24px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);">
                  <div class="message" style="margin-bottom: 0;">
                    <strong style="color: #fbbf24;">Important Note:</strong> Please ensure the email here is connected to a Google Drive account to access your data. If not, please request a new Preview Access from the AI Rocket homepage using an email connected to a Google Drive. You can contact support from the login page if you need assistance.
                  </div>
                </div>
                ` : `
                <div class="greeting">Hi there!</div>
                <div class="message">
                  <a href="mailto:${inviterEmail}">${inviterEmail}</a> has invited you to create your account on AI Rocket.
                </div>
                `}

                <div class="invite-box">
                  <div class="invite-label">Your Invite Code</div>
                  <div class="invite-code">${inviteCode}</div>
                  <div class="email-display">
                    Use with email: <span class="email-value">${email}</span>
                  </div>
                </div>

                <div class="cta-container">
                  <a href="${appUrl}" class="cta-button">
                    Create Your Account
                  </a>
                </div>

                <div class="divider"></div>

                <div class="features-section">
                  <div class="features-title">What You'll Get with AI Rocket</div>

                  ${featureContent.map(feature => `
                    <div class="feature-card">
                      <div class="feature-card-header">
                        <span class="feature-card-icon">${feature.icon}</span>
                        <span class="feature-card-title">${feature.title}</span>
                      </div>
                      <div class="feature-card-tagline">${feature.tagline}</div>
                      <p class="feature-card-summary">${feature.summary}</p>
                      <ul class="benefits-list">
                        ${feature.benefits.map(b => `<li><span class="check-icon">&#10003;</span>${b}</li>`).join('')}
                      </ul>
                    </div>
                  `).join('')}
                </div>

                <div class="steps">
                  <div class="steps-title">Get Started in 3 Minutes:</div>
                  <ol>
                    <li>Click the button above to visit AI Rocket</li>
                    <li>Select "Sign Up" and enter your email: <strong>${email}</strong></li>
                    <li>Create a password for your account</li>
                    <li>Enter your invite code: <strong>${inviteCode}</strong></li>
                    <li>Start asking AI Rocket anything about your team!</li>
                  </ol>
                </div>

                <div class="role-info">
                  <div class="message" style="margin-bottom: 0;">
                    <strong>Your Role:</strong> You'll be joining as a <strong>${role}</strong> with access to team conversations, AI-powered insights, meeting transcripts, action items, strategy documents, and company goals.
                  </div>
                </div>

                ${categoryAccess && categoryAccess.length > 0 ? `
                <div class="steps" style="margin-top: 24px;">
                  <div class="steps-title">Your Data Access</div>
                  <p style="color: #93c5fd; font-size: 14px; margin-bottom: 16px;">
                    You'll have access to the following data categories:
                  </p>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${categoryAccess.map(cat => `
                      <span style="background: #3b82f6; color: white; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 500; display: inline-block;">
                        ${CATEGORY_LABELS[cat] || cat}
                      </span>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                <div class="invite-box">
                  <div class="invite-label">Your Invite Code</div>
                  <div class="invite-code">${inviteCode}</div>
                  <div class="email-display">
                    Use with email: <span class="email-value">${email}</span>
                  </div>
                </div>

                <div class="cta-container">
                  <a href="${appUrl}" class="cta-button">
                    Create Your Account
                  </a>
                </div>
              </div>
              <div class="footer">
                <p>
                  This invitation was sent by ${inviterEmail} from AI Rocket and the RocketHub team.
                </p>
                <div class="brand-footer">
                  <span class="mini-rocket">&#128640;</span>
                  <a href="${appUrl}">AI Rocket</a>
                  <span style="color: #475569;">by RocketHub.AI</span>
                </div>
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
        from: "AI Rocket Invite <invite@airocket.app>",
        to: email,
        reply_to: inviterEmail,
        subject: testMode ? `[TEST] ${emailSubject}` : emailSubject,
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
    console.log("Invite email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite email sent successfully to ${email}`,
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});