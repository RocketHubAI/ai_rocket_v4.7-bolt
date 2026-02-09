import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email }: ResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const resetRedirectUrl = Deno.env.get("PASSWORD_RESET_REDIRECT_URL") || `${supabaseUrl.replace(".supabase.co", ".netlify.app")}/reset-password`;

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      console.error("Error checking user:", userError);
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, you will receive a password reset link shortly."
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, you will receive a password reset link shortly."
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
    });

    if (resetError || !resetData) {
      console.error("Error generating reset link:", resetError);
      throw new Error("Failed to generate reset link");
    }

    // Use hashed_token to construct the proper reset URL with token in hash
    const token = resetData.properties.hashed_token;
    const resetUrl = `${resetRedirectUrl}#access_token=${token}&type=recovery`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a1a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="background-color: #60a5fa; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
        🚀
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
    </div>

    <div style="background-color: #2d2d2d; padding: 40px; border-radius: 0 0 12px 12px;">
      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Hi there,
      </p>

      <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
        We received a request to reset your password for your <strong style="color: #60a5fa;">AI Rocket</strong> account. Click the button below to create a new password:
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
          Reset Password
        </a>
      </div>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #404040;">
        <strong style="color: #e5e5e5;">Security Note:</strong> This link will expire in 1 hour for your security.
      </p>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 10px 0 0;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
        If the button above doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: #60a5fa; font-size: 12px; word-break: break-all; margin: 10px 0 0;">
        ${resetUrl}
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px; padding: 20px;">
      <p style="color: #666; font-size: 14px; margin: 0 0 10px;">
        Best regards,<br>
        <strong style="color: #60a5fa;">The AI Rocket Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const emailText = `Reset Your Password - AI Rocket

Hi there,

You requested to reset your password for your AI Rocket account.

Click the link below to create a new password:
${resetUrl}

SECURITY NOTICE:
- This link expires in 1 hour
- This is a one-time use link
- If you didn't request this, ignore this email

Need help? Reply to this email or contact support@airocket.app

Best regards,
The AI Rocket Team`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AI Rocket <astra@airocket.app>",
        to: [email.toLowerCase()],
        subject: "Reset Your AI Rocket Password",
        html: emailHtml,
        text: emailText,
        reply_to: "support@airocket.app",
        tags: [
          {
            name: "category",
            value: "password_reset"
          }
        ],
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "high"
        }
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    console.log("Password reset email sent successfully to:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly."
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request. Please try again later."
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
