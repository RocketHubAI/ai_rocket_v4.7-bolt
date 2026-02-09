import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CompletionEmailRequest {
  user_email: string;
  user_name: string;
  team_name: string;
  launch_code: string;
  goal_title: string;
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

    const body: CompletionEmailRequest = await req.json();
    const { user_email, user_name, team_name, launch_code, goal_title } = body;

    if (!user_email || !user_name || !launch_code) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
            .header-icon {
              font-size: 48px;
              margin-bottom: 16px;
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
            .code-box {
              background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(20, 184, 166, 0.15));
              border: 2px solid #0891b2;
              border-radius: 16px;
              padding: 32px;
              margin: 32px 0;
              text-align: center;
            }
            .code-label {
              font-size: 12px;
              text-transform: uppercase;
              color: #06b6d4;
              font-weight: 700;
              letter-spacing: 2px;
              margin-bottom: 16px;
            }
            .code-value {
              font-size: 36px;
              font-weight: 700;
              color: #4ade80;
              font-family: 'Courier New', monospace;
              letter-spacing: 4px;
              word-break: break-all;
            }
            .goal-box {
              background: #1f2937;
              border-radius: 12px;
              padding: 20px;
              margin: 24px 0;
            }
            .goal-label {
              font-size: 12px;
              text-transform: uppercase;
              color: #06b6d4;
              font-weight: 600;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .goal-title {
              font-size: 18px;
              font-weight: 600;
              color: #f3f4f6;
              margin: 0;
            }
            .achievements {
              background: rgba(34, 197, 94, 0.1);
              border: 1px solid rgba(34, 197, 94, 0.3);
              border-radius: 12px;
              padding: 20px;
              margin: 24px 0;
            }
            .achievements h3 {
              color: #4ade80;
              margin: 0 0 12px;
              font-size: 16px;
            }
            .achievements ul {
              margin: 0;
              padding-left: 20px;
              color: #d1d5db;
            }
            .achievements li {
              margin-bottom: 8px;
            }
            .next-steps {
              background: #1f2937;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
            }
            .next-steps h3 {
              color: #f3f4f6;
              margin: 0 0 16px;
            }
            .next-steps ol {
              margin: 0;
              padding-left: 20px;
              color: #d1d5db;
            }
            .next-steps li {
              margin-bottom: 12px;
            }
            .next-steps strong {
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
              <div class="header-icon">&#127881;</div>
              <h1>Congratulations, ${user_name}!</h1>
              <p>You've completed the AI-preneur Workshop</p>
            </div>
            <div class="content">
              <div class="greeting">Your transformation journey is just beginning!</div>

              <p class="message">
                You've successfully completed all steps of the AI-preneur Workshop and discovered the power of AI collaboration. Here's your exclusive launch code to continue your journey with full AI Rocket access.
              </p>

              <div class="code-box">
                <div class="code-label">Your Exclusive Launch Code</div>
                <div class="code-value">${launch_code}</div>
              </div>

              ${goal_title ? `
              <div class="goal-box">
                <div class="goal-label">Your Impossible Goal</div>
                <p class="goal-title">${goal_title}</p>
              </div>
              ` : ''}

              <div class="achievements">
                <h3>What You Accomplished:</h3>
                <ul>
                  <li>Identified your "impossible" goals through AI-guided discovery</li>
                  <li>Connected your business data for personalized insights</li>
                  <li>Created a visual representation of your transformation</li>
                  <li>Experienced AI collaboration with Astra</li>
                </ul>
              </div>

              <div class="next-steps">
                <h3>What's Next?</h3>
                <ol>
                  <li>Visit <strong>airocket.app</strong> to sign up for full access</li>
                  <li>Use your launch code <strong>${launch_code}</strong> during registration</li>
                  <li>Unlock unlimited AI collaboration, team features, and advanced analytics</li>
                  <li>Start achieving your impossible goals with AI as your thought partner</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://airocket.app" class="cta-button">
                  Get Full Access Now
                </a>
              </div>

              <p class="message" style="font-size: 14px;">
                Your workshop access will remain active for the duration of your trial period. Use this time to continue exploring and preparing for your full AI Rocket experience.
              </p>
            </div>
            <div class="footer">
              <p>AI Rocket by RocketHub.AI - AI that Works for Work</p>
              <p style="margin-top: 8px; font-size: 12px;">Keep this email safe - your launch code is unique to you.</p>
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
        subject: `Your AI Rocket Launch Code - Congratulations, ${user_name}!`,
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
    console.log("Completion email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-workshop-completion-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
