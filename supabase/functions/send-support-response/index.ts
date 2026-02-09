import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SupportResponseRequest {
  submissionId: string;
  responseMessage: string;
  notResolved?: boolean;
  internalNotes?: string;
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

    // Verify user is super admin
    let adminUserId: string;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      adminUserId = payload.sub;
    } catch (e) {
      console.error("Failed to parse JWT:", e);
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(adminUserId);

    const superAdminEmails = ['clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai'];
    if (authError || !adminUser || !adminUser.email || !superAdminEmails.includes(adminUser.email)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { submissionId, responseMessage, notResolved, internalNotes }: SupportResponseRequest = await req.json();

    if (!submissionId || !responseMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: submissionId and responseMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the original submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("user_feedback_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      console.error("Failed to fetch submission:", fetchError);
      return new Response(
        JSON.stringify({ error: "Support message not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user details from auth.users
    const { data: { user: submissionUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(submission.user_id);

    if (userError || !submissionUser) {
      console.error("Failed to fetch user:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team details if exists
    let teamName = "No team";
    if (submission.team_id) {
      const { data: team } = await supabaseAdmin
        .from("teams")
        .select("name")
        .eq("id", submission.team_id)
        .single();

      if (team) {
        teamName = team.name;
      }
    }

    // Update submission with response (always mark as 'responded')
    const updateData: any = {
      admin_response: responseMessage,
      responded_at: new Date().toISOString(),
      responded_by: adminUserId,
      status: 'responded',
      not_resolved: notResolved || false,
    };

    if (internalNotes !== undefined) {
      updateData.internal_notes = internalNotes;
    }

    const { error: updateError } = await supabaseAdmin
      .from("user_feedback_submissions")
      .update(updateData)
      .eq("id", submissionId);

    if (updateError) {
      console.error("Failed to update submission:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update support message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add to message history
    await supabaseAdmin
      .from("support_message_history")
      .insert({
        submission_id: submissionId,
        message: responseMessage,
        is_admin: true,
        created_by: adminUserId,
      });

    // Send email to user
    const userEmail = submissionUser.email;
    const userName = submissionUser.user_metadata?.full_name || userEmail;
    const supportType = submission.support_type || "support_message";
    const subject = submission.support_details?.subject || "Support Request";
    const originalDescription = submission.support_details?.description || "";

    const supportTypeLabels = {
      bug_report: "Bug Report",
      support_message: "Support Message",
      feature_request: "Feature Request",
    };

    const typeLabel = supportTypeLabels[supportType as keyof typeof supportTypeLabels] || "Support Request";
    const emailSubject = `Re: ${typeLabel} - ${subject}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #84cc16 50%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .response-box { background: white; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0; }
            .original-message { background: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">AI Rocket Support</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Response to your ${typeLabel}</p>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Thank you for reaching out to AI Rocket Support. We've reviewed your ${typeLabel.toLowerCase()} and wanted to get back to you.</p>

              <div class="response-box">
                <div class="label">Support Team Response</div>
                <div style="margin-top: 10px; white-space: pre-wrap;">${responseMessage}</div>
              </div>

              <div class="original-message">
                <div class="label">Your Original Message</div>
                <div class="field" style="margin-top: 10px;">
                  <strong>Subject:</strong> ${subject}
                </div>
                <div class="field">
                  <strong>Description:</strong>
                  <div style="margin-top: 5px; white-space: pre-wrap;">${originalDescription}</div>
                </div>
                ${submission.attachment_urls && submission.attachment_urls.length > 0 ? `
                <div class="field">
                  <strong>Attachments:</strong>
                  <div style="margin-top: 5px;">
                    ${submission.attachment_urls.map((url: string, index: number) => `
                      <div style="margin-bottom: 5px;">
                        <a href="${url}" target="_blank" style="color: #3b82f6; text-decoration: none;">
                          📎 Attachment ${index + 1}
                        </a>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ''}
              </div>

              <div class="footer">
                <p><strong>Need more help?</strong> Simply reply to this email and we'll continue the conversation.</p>
                <p style="margin-top: 10px;">
                  <strong>Reference ID:</strong> <span style="font-family: monospace; font-size: 11px;">${submissionId}</span>
                </p>
                <p style="margin-top: 15px;">
                  Best regards,<br>
                  The AI Rocket Team<br>
                  <a href="mailto:support@airocket.app" style="color: #3b82f6; text-decoration: none;">support@airocket.app</a>
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
        from: "AI Rocket Support <support@airocket.app>",
        to: userEmail,
        reply_to: "support@airocket.app",
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errorText);
      // Don't fail the whole request if email fails - the response is already saved
      return new Response(
        JSON.stringify({
          success: true,
          warning: "Response saved but email failed to send",
          details: errorText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log("Response email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Response sent successfully",
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-support-response function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});