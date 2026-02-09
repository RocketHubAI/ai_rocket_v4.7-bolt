import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfirmationRequest {
  registrationId: string;
  email: string;
  name: string;
  inviteCode: string;
  isExistingUser?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { registrationId, email, name, inviteCode, isExistingUser }: ConfirmationRequest = await req.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isExistingUser && !inviteCode) {
      return new Response(
        JSON.stringify({ error: "Missing invite code for new user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: contactData } = await supabase
      .from('marketing_contacts')
      .select('unsubscribe_token')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const unsubscribeUrl = contactData?.unsubscribe_token
      ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
      : 'https://airocket.app/unsubscribe';

    const firstName = name.split(' ')[0];
    const appUrl = 'https://airocket.app';

    const emailSubject = isExistingUser
      ? `Welcome to the Moonshot Challenge, ${firstName}!`
      : `Your Moonshot Challenge Launch Code: ${inviteCode}`;

    let emailHtml = isExistingUser
      ? generateExistingUserEmail(firstName, appUrl)
      : generateNewUserEmail(firstName, inviteCode, appUrl);

    emailHtml = emailHtml.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AI Rocket Moonshot Challenge <moonshot@airocket.app>",
        to: email,
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
    console.log("Moonshot confirmation email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Confirmation email sent successfully to ${email}`,
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in moonshot-send-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateExistingUserEmail(firstName: string, appUrl: string): string {
  const targetDate = new Date('2026-01-15T00:00:00Z').getTime();
  const now = Date.now();
  const diff = targetDate - now;
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
  const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #e5e7eb !important; margin: 0 !important; padding: 0 !important; background-color: #0A0F1C !important; }
          .container { max-width: 640px; margin: 40px auto; background-color: #0A0F1C !important; border-radius: 20px; overflow: hidden; }
          .email-wrapper { background-color: #0A0F1C !important; padding: 20px; }
          .header { background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%); color: white; padding: 48px 30px 40px; text-align: center; }
          .rocket-icon { display: inline-block; width: 64px; height: 64px; background: linear-gradient(145deg, #5BA4E6, #3B82C4); border-radius: 16px; font-size: 36px; line-height: 64px; text-align: center; margin-bottom: 12px; box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4); }
          .brand-name { font-size: 42px; font-weight: 800; color: white; margin: 8px 0 4px; letter-spacing: -0.5px; }
          .brand-tagline { font-size: 14px; color: #6b7280; letter-spacing: 1px; margin-bottom: 24px; }
          .challenge-title { font-size: 32px; font-weight: 800; color: #fbbf24; margin: 0; }
          .registered-badge { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-size: 13px; font-weight: 600; padding: 8px 20px; border-radius: 20px; margin-top: 16px; }
          .content { padding: 40px 30px; background: #131B2E; }
          .greeting { font-size: 22px; font-weight: 600; color: #f3f4f6; margin-bottom: 16px; }
          .message { font-size: 16px; color: #9ca3af; margin-bottom: 24px; line-height: 1.7; }
          .footer { background: #0A0F1C; padding: 32px 30px; text-align: center; border-top: 1px solid #1e293b; }
          .footer p { font-size: 14px; color: #64748b; margin: 0 0 16px; }
          .footer a { color: #10b981; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="rocket-icon">🚀</div>
              <div class="brand-name">AI Rocket</div>
              <div class="brand-tagline">AI Built for Entrepreneurs and Their Teams</div>
              <h1 class="challenge-title">$5M AI Moonshot Challenge</h1>
              <div class="registered-badge">Already a Member!</div>
            </div>
            <div class="content">
              <div class="greeting">Welcome to the Challenge, ${firstName}!</div>
              <div class="message">Great news! Since you're already an AI Rocket member, you're automatically entered into the $5M Moonshot Challenge.</div>
            </div>
            <div class="footer">
              <p>Questions? Visit <a href="${appUrl}/moonshot">the Challenge page</a> for FAQs.</p>
              <p style="margin-top: 16px;">🚀 <a href="${appUrl}">AI Rocket</a> <span style="color: #475569;">by RocketHub.AI</span></p>
              <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e293b;">
                <a href="{{unsubscribeUrl}}" style="color: #64748b; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateNewUserEmail(firstName: string, inviteCode: string, appUrl: string): string {
  const targetDate = new Date('2026-01-15T00:00:00Z').getTime();
  const now = Date.now();
  const diff = targetDate - now;
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #e5e7eb !important; margin: 0 !important; padding: 0 !important; background-color: #0A0F1C !important; }
          .container { max-width: 640px; margin: 40px auto; background-color: #0A0F1C !important; border-radius: 20px; overflow: hidden; }
          .email-wrapper { background-color: #0A0F1C !important; padding: 20px; }
          .header { background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%); color: white; padding: 48px 30px 40px; text-align: center; }
          .rocket-icon { display: inline-block; width: 64px; height: 64px; background: linear-gradient(145deg, #5BA4E6, #3B82C4); border-radius: 16px; font-size: 36px; line-height: 64px; text-align: center; margin-bottom: 12px; box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4); }
          .brand-name { font-size: 42px; font-weight: 800; color: white; margin: 8px 0 4px; letter-spacing: -0.5px; }
          .brand-tagline { font-size: 14px; color: #6b7280; letter-spacing: 1px; margin-bottom: 24px; }
          .challenge-title { font-size: 32px; font-weight: 800; color: #fbbf24; margin: 0; }
          .registered-badge { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #10b981 100%); color: white; font-size: 13px; font-weight: 600; padding: 8px 20px; border-radius: 20px; margin-top: 16px; }
          .content { padding: 40px 30px; background: #131B2E; }
          .greeting { font-size: 22px; font-weight: 600; color: #f3f4f6; margin-bottom: 16px; }
          .message { font-size: 16px; color: #9ca3af; margin-bottom: 24px; line-height: 1.7; }
          .launch-code { font-size: 32px; font-weight: 700; color: #f97316; font-family: 'Courier New', monospace; letter-spacing: 4px; text-align: center; margin: 32px 0; }
          .footer { background: #0A0F1C; padding: 32px 30px; text-align: center; border-top: 1px solid #1e293b; }
          .footer p { font-size: 14px; color: #64748b; margin: 0 0 16px; }
          .footer a { color: #f97316; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="rocket-icon">🚀</div>
              <div class="brand-name">AI Rocket</div>
              <div class="brand-tagline">AI Built for Entrepreneurs and Their Teams</div>
              <h1 class="challenge-title">$5M AI Moonshot Challenge</h1>
              <div class="registered-badge">You're Registered!</div>
            </div>
            <div class="content">
              <div class="greeting">Welcome aboard, ${firstName}!</div>
              <div class="message">Your registration is confirmed. Save your unique launch code below:</div>
              <div class="launch-code">${inviteCode}</div>
              <div class="message">You'll need this code to create your account on January 15, 2026 (${days} days away).</div>
            </div>
            <div class="footer">
              <p>Questions? Visit <a href="${appUrl}/moonshot">the Challenge page</a> for FAQs.</p>
              <p style="margin-top: 16px;">🚀 <a href="${appUrl}">AI Rocket</a> <span style="color: #475569;">by RocketHub.AI</span></p>
              <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e293b;">
                <a href="{{unsubscribeUrl}}" style="color: #64748b; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}