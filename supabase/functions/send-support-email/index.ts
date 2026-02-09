import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SupportRequest {
  supportType: 'bug_report' | 'support_message' | 'feature_request';
  subject: string;
  description: string;
  attachmentUrls?: string[];
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${authError?.message || 'User not found'}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { supportType, subject, description, attachmentUrls = [] }: SupportRequest = await req.json();

    if (!supportType || !subject || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("team_id, teams(name)")
      .eq("id", userId)
      .single();

    const teamName = userData?.teams?.name || "No team";
    const userName = user.user_metadata?.full_name || user.email;
    const userEmail = user.email || "unknown";

    const { data: submission, error: dbError } = await supabaseAdmin
      .from("user_feedback_submissions")
      .insert({
        user_id: userId,
        team_id: userData?.team_id,
        support_type: supportType,
        support_details: {
          subject,
          description,
        },
        attachment_urls: attachmentUrls,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save support request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supportTypeLabels = {
      bug_report: "Bug Report",
      support_message: "Support Message",
      feature_request: "Feature Request",
    };

    const typeLabel = supportTypeLabels[supportType];
    const emailSubject = `[Astra Support] ${typeLabel} from ${userName}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #84cc16 50%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; text-transform: uppercase; font-size: 12px; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class=\"container\">
            <div class=\"header\">
              <h2 style=\"margin: 0;\">${typeLabel}</h2>
            </div>
            <div class=\"content\">
              <div class=\"field\">
                <div class=\"label\">From</div>
                <div class=\"value\">${userName} (${userEmail})</div>
              </div>
              <div class=\"field\">
                <div class=\"label\">Team</div>
                <div class=\"value\">${teamName}</div>
              </div>
              <div class=\"field\">
                <div class=\"label\">Subject</div>
                <div class=\"value\">${subject}</div>
              </div>
              <div class=\"field\">
                <div class=\"label\">Description</div>
                <div class=\"value\" style=\"white-space: pre-wrap;\">${description}</div>
              </div>
              ${attachmentUrls.length > 0 ? `
              <div class=\"field\">
                <div class=\"label\">Attachments (${attachmentUrls.length})</div>
                <div class=\"value\">
                  ${attachmentUrls.map((url, index) => `
                    <div style=\"margin-bottom: 10px;\">
                      <a href=\"${url}\" target=\"_blank\" style=\"color: #3b82f6; text-decoration: none;\">
                        📎 Attachment ${index + 1}
                      </a>
                    </div>
                  `).join('')}
                </div>
              </div>
              ` : ''}
              <div class=\"field\">
                <div class=\"label\">Submission ID</div>
                <div class=\"value\" style=\"font-family: monospace; font-size: 11px;\">${submission.id}</div>
              </div>
              <div class=\"footer\">
                <p>This ${typeLabel.toLowerCase()} was submitted via Astra Intelligence on ${new Date().toLocaleString()}.</p>
                <p>Reply directly to this email to respond to the user.</p>
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
        from: "AI Rocket Support <support@airocket.app>",
        to: "clay@rockethub.ai",
        reply_to: userEmail,
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
    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Support request submitted successfully",
        submissionId: submission.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
