import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WelcomeEmailRequest {
  user_email: string;
  user_name: string;
  team_name: string;
  expires_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: WelcomeEmailRequest = await req.json();
    const { user_email, user_name, team_name, expires_at } = body;

    if (!user_email || !user_name || !team_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresDate = new Date(expires_at);
    const formattedExpiry = expiresDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="color-scheme" content="light dark">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #e5e7eb;
              margin: 0;
              padding: 0;
              background-color: #0A0F1C;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #111827;
              border-radius: 16px;
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #0891b2 0%, #0d9488 100%);
              padding: 48px 30px;
              text-align: center;
            }
            .header h1 {
              color: white;
              font-size: 28px;
              margin: 0 0 8px;
            }
            .header p {
              color: rgba(255,255,255,0.9);
              font-size: 16px;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 20px;
              font-weight: 600;
              color: #f3f4f6;
              margin-bottom: 16px;
            }
            .message {
              color: #9ca3af;
              margin-bottom: 24px;
            }
            .info-box {
              background: rgba(6, 182, 212, 0.1);
              border: 1px solid rgba(6, 182, 212, 0.3);
              border-radius: 12px;
              padding: 20px;
              margin: 24px 0;
            }
            .info-box strong {
              color: #06b6d4;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #0891b2 0%, #0d9488 100%);
              color: white;
              padding: 16px 40px;
              border-radius: 50px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
            }
            .steps {
              background: #1f2937;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
            }
            .steps h3 {
              color: #06b6d4;
              margin: 0 0 16px;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
              color: #d1d5db;
            }
            .steps li {
              margin-bottom: 12px;
            }
            .footer {
              background: #0A0F1C;
              padding: 24px 30px;
              text-align: center;
              border-top: 1px solid #1f2937;
            }
            .footer p {
              color: #6b7280;
              font-size: 14px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to the AI-preneur Workshop!</h1>
              <p>Your journey to AI-powered business transformation starts now</p>
            </div>
            <div class="content">
              <div class="greeting">Hi ${user_name}!</div>
              <p class="message">
                Thank you for joining the AI-preneur Workshop. You're about to discover how AI can transform your business and help you achieve goals you once thought impossible.
              </p>

              <div class="info-box">
                <p style="margin: 0;">
                  <strong>Team:</strong> ${team_name}<br>
                  <strong>Access expires:</strong> ${formattedExpiry}
                </p>
              </div>

              <div class="steps">
                <h3>Your Workshop Journey:</h3>
                <ol>
                  <li><strong>AI Mindset Journey</strong> - Discover your 3 impossible goals through guided AI conversation</li>
                  <li><strong>Data Connection</strong> - Sync your business documents for personalized AI insights</li>
                  <li><strong>Goal Visualization</strong> - See your transformation captured in a beautiful infographic</li>
                  <li><strong>Experience Astra</strong> - Chat with AI and create visualizations using your data</li>
                  <li><strong>Launch Code</strong> - Complete the workshop to receive your exclusive access code</li>
                </ol>
              </div>

              <p class="message">
                You have 5 days to explore the workshop. Make the most of your experience by completing each step and discovering what AI can do for your business.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://airocket.app/workshop" class="cta-button">
                  Start Your Journey
                </a>
              </div>

              <p class="message" style="font-size: 14px;">
                If you have any questions during your workshop experience, use the Help Center within the app or reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>AI Rocket by RocketHub.AI - AI that Works for Work</p>
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
        from: "AI Rocket Workshop <workshop@airocket.app>",
        to: user_email,
        subject: `Welcome to the AI-preneur Workshop, ${user_name}!`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log("Welcome email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-workshop-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
