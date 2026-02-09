import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportEmailRequest {
  reportId: string;
  chatMessageId: string;
  userId: string;
  userEmail: string;
  userName: string;
  reportTitle: string;
  reportContent: string;
  reportFrequency: string;
  reportPrompt?: string;
  dataSources?: string[];
  isTeamReport: boolean;
  isRetry?: boolean;
}

async function generateEmailWithGemini(
  reportContent: string,
  displayReportTitle: string,
  firstName: string,
  reportFrequency: string,
  isTeamReport: boolean,
  geminiApiKey: string
): Promise<string | null> {
  const reportTypeLabel = isTeamReport ? 'Team Report' : 'Personal Report';

  const prompt = `You are an expert email designer. Create a beautifully designed HTML email for a business intelligence report.

REPORT DETAILS:
- Title: ${displayReportTitle}
- Recipient Name: ${firstName}
- Frequency: ${reportFrequency}
- Type: ${reportTypeLabel}

REPORT CONTENT:
${reportContent}

DESIGN REQUIREMENTS:
Create a complete HTML email with these exact specifications:

1. **Overall Structure**:
   - Dark theme with background color #0f172a (dark navy)
   - Main content container with background #1e293b (slate), max-width 640px, centered
   - Border-radius 16px on main container
   - Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif

2. **Header Bar** (top of email):
   - Centered layout with rocket emoji, "AI Rocket" in teal (#5eead4)
   - Bottom border: 1px solid #334155
   - Padding: 20px 30px

3. **Title Section** (below header):
   - Report title in white (#f1f5f9), 28px, bold, centered
   - Below title: orange/amber horizontal line (background: linear-gradient to right from #f59e0b to #fbbf24), height 3px, width 120px, centered, border-radius 2px
   - Subtitle: "Your ${reportFrequency} report from AI Rocket" in gray (#94a3b8), 14px
   - Padding: 40px 30px

4. **Greeting Section**:
   - "Hi ${firstName}! Your ${displayReportTitle} is ready" - white (#f1f5f9), 22px, bold
   - Introduction paragraph summarizing the report - gray (#cbd5e1), 16px, line-height 1.7

5. **"IN THIS REPORT" Summary Card**:
   - Background: #0f172a with border-radius 12px
   - Left border: 4px solid #3b82f6 (blue)
   - "IN THIS REPORT" label in cyan (#22d3ee), 12px, uppercase, letter-spacing 1px, font-weight 600
   - Bullet list of main sections/topics covered - white (#e2e8f0) text

6. **Section Headers** (for each main topic):
   - Include relevant emoji (use Apple-style emojis like 📊, 💰, 🎯, 📈, 🔐, 🤖, 💡, ⚡, 🚀)
   - Section title in white (#f1f5f9), 20px, bold
   - Subtitle/description in gray (#94a3b8), 14px
   - Margin-top: 32px

7. **Content Cards** (for each insight/item):
   - Background: #0f172a
   - Border-radius: 12px
   - Left border: 3px solid #3b82f6 (blue)
   - Padding: 20px
   - Margin: 12px 0
   - Card title: Include relevant emoji, title in cyan (#22d3ee), 16px, bold
   - Card content: Gray (#cbd5e1), 15px, line-height 1.7

8. **Call-to-Action Button**:
   - Centered "View Full Report" button
   - Background: #334155 with border-radius 50px
   - Text: white, 16px, bold
   - Padding: 18px 48px
   - Below button: "See the complete analysis in AI Rocket" in gray (#94a3b8), 13px

9. **Report Details Section**:
   - "Report Details" header in gray (#94a3b8), 14px, uppercase
   - "Report Name" label + value
   - "Report Type" label + "${reportTypeLabel} - ${reportFrequency}"
   - Bottom border: 1px solid #334155

10. **Footer**:
    - Background: #0f172a
    - "You're receiving this because you have report email notifications enabled." in gray (#64748b)
    - "AI Rocket" link in blue (#60a5fa)
    - "- AI that Works for Work" tagline

CRITICAL RULES:
- Output ONLY the complete HTML document, starting with <!DOCTYPE html>
- Use ONLY inline styles (no <style> tags or external CSS)
- Make it email-client compatible (use tables for layout if needed for complex structures)
- Include proper meta tags for charset and viewport
- Do NOT include any markdown, explanations, or code blocks
- Ensure all colors use the exact hex codes specified
- Use semantic HTML where possible
- The email should look premium, professional, and modern`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 16000,
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    let html = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!html) {
      console.error('No content in Gemini response');
      return null;
    }

    html = html.replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim();

    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      console.error('Invalid HTML response from Gemini');
      return null;
    }

    return html;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

function generateFallbackEmailHtml(
  displayReportTitle: string,
  firstName: string,
  reportContent: string,
  reportFrequency: string,
  isTeamReport: boolean
): string {
  const reportTypeLabel = isTeamReport ? 'Team Report' : 'Personal Report';

  const formattedContent = reportContent
    .replace(/^### \*\*(.+?)\*\*$/gm, '<h3 style="color: #22d3ee; font-size: 18px; font-weight: 700; margin: 24px 0 12px 0;">$1</h3>')
    .replace(/^### (.+)$/gm, '<h3 style="color: #22d3ee; font-size: 18px; font-weight: 700; margin: 24px 0 12px 0;">$1</h3>')
    .replace(/^#### \*\*(.+?)\*\*$/gm, '<h4 style="color: #60a5fa; font-size: 16px; font-weight: 600; margin: 20px 0 8px 0;">$1</h4>')
    .replace(/^#### (.+)$/gm, '<h4 style="color: #60a5fa; font-size: 16px; font-weight: 600; margin: 20px 0 8px 0;">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #f1f5f9;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\* (.+)$/gm, '<li style="margin: 8px 0; color: #cbd5e1;">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin: 8px 0; color: #cbd5e1;">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin: 12px 0; color: #cbd5e1; line-height: 1.7;">')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayReportTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #e5e7eb; margin: 0; padding: 0; background-color: #0f172a;">
  <div style="background-color: #0f172a; padding: 20px;">
    <div style="max-width: 640px; margin: 40px auto; background-color: #1e293b; border-radius: 16px; overflow: hidden;">
      <!-- Header Bar -->
      <div style="padding: 20px 30px; border-bottom: 1px solid #334155; text-align: center;">
        <span style="font-size: 24px;">&#128640;</span>
        <span style="font-size: 18px; font-weight: 600; color: #5eead4; margin-left: 8px;">AI Rocket</span>
      </div>

      <!-- Title Section -->
      <div style="padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #f1f5f9;">${displayReportTitle}</h1>
        <div style="width: 120px; height: 3px; background: linear-gradient(to right, #f59e0b, #fbbf24); margin: 16px auto; border-radius: 2px;"></div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Your ${reportFrequency} report from AI Rocket</p>
      </div>

      <!-- Content -->
      <div style="padding: 0 30px 40px 30px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px;">Hi ${firstName}! Your ${displayReportTitle} is ready</h2>

        <!-- Report Content -->
        <div style="background: #0f172a; border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6; margin: 24px 0;">
          <p style="margin: 0; color: #cbd5e1; line-height: 1.7;">${formattedContent}</p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 36px 0;">
          <a href="https://airocket.app" style="display: inline-block; background: #334155; color: white; padding: 18px 48px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px;">View Full Report</a>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 12px;">See the complete analysis in AI Rocket</p>
        </div>
      </div>

      <!-- Report Details -->
      <div style="padding: 24px 30px; border-top: 1px solid #334155;">
        <p style="color: #94a3b8; font-size: 14px; text-transform: uppercase; margin: 0 0 12px 0;">Report Details</p>
        <p style="color: #94a3b8; font-size: 14px; margin: 4px 0;"><strong style="color: #f1f5f9;">Report Name</strong></p>
        <p style="color: #f1f5f9; font-size: 16px; margin: 0 0 12px 0;">${displayReportTitle}</p>
        <p style="color: #94a3b8; font-size: 14px; margin: 4px 0;"><strong style="color: #f1f5f9;">Report Type</strong></p>
        <p style="color: #f1f5f9; font-size: 16px; margin: 0;">${reportTypeLabel} - ${reportFrequency}</p>
      </div>

      <!-- Footer -->
      <div style="background: #0f172a; padding: 24px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">You're receiving this because you have report email notifications enabled.</p>
        <p style="margin-top: 12px;"><a href="https://airocket.app" style="color: #60a5fa; text-decoration: none;">AI Rocket</a> - AI that Works for Work</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      reportId,
      chatMessageId,
      userId,
      userEmail,
      userName,
      reportTitle,
      reportContent,
      reportFrequency,
      isTeamReport,
      isRetry = false
    }: ReportEmailRequest = await req.json();

    console.log(`Processing report email for ${userEmail}`);
    console.log(`Report: ${reportTitle} (${reportId})`);
    console.log(`Report content length: ${reportContent?.length || 0} characters`);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('receive_report_emails, name, team_id, teams(name)')
      .eq('email', userEmail)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userData?.receive_report_emails) {
      console.log(`User ${userEmail} has report emails disabled, skipping`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'User has report emails disabled' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamName = userData?.teams?.name || '';
    const displayReportTitle = teamName ? `${teamName} ${reportTitle}` : reportTitle;
    console.log(`Team name: ${teamName}, Display title: ${displayReportTitle}`);

    const { data: deliveryRecord, error: deliveryError } = await supabase
      .from('report_email_deliveries')
      .insert({
        report_id: reportId,
        chat_message_id: chatMessageId,
        user_id: userId,
        email: userEmail,
        status: 'pending',
        retry_count: isRetry ? 1 : 0
      })
      .select()
      .single();

    if (deliveryError) {
      console.error('Error creating delivery record:', deliveryError);
    }

    const deliveryId = deliveryRecord?.id;
    const firstName = userName?.split(' ')[0] || userData?.name?.split(' ')[0] || 'there';

    let emailHtml: string;

    if (geminiApiKey) {
      console.log('Generating email with Gemini AI...');
      const geminiHtml = await generateEmailWithGemini(
        reportContent || 'No content available for this report.',
        displayReportTitle,
        firstName,
        reportFrequency,
        isTeamReport,
        geminiApiKey
      );

      if (geminiHtml) {
        console.log('Gemini generated email successfully');
        emailHtml = geminiHtml;
      } else {
        console.log('Gemini generation failed, using fallback template');
        emailHtml = generateFallbackEmailHtml(
          displayReportTitle,
          firstName,
          reportContent || 'No content available for this report.',
          reportFrequency,
          isTeamReport
        );
      }
    } else {
      console.log('GEMINI_API_KEY not configured, using fallback template');
      emailHtml = generateFallbackEmailHtml(
        displayReportTitle,
        firstName,
        reportContent || 'No content available for this report.',
        reportFrequency,
        isTeamReport
      );
    }

    console.log('Email content generated, sending via Resend...');
    const emailSubject = `${displayReportTitle} is Ready`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AI Rocket - Reports <astra@airocket.app>",
        to: userEmail,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error(`Failed to send email:`, resendResponse.status, errorText);

      if (deliveryId) {
        await supabase
          .from('report_email_deliveries')
          .update({
            status: isRetry ? 'retry_failed' : 'failed',
            error_message: errorText,
            updated_at: new Date().toISOString()
          })
          .eq('id', deliveryId);
      }

      return new Response(
        JSON.stringify({ success: false, error: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`Email sent successfully to ${userEmail}, ID: ${resendData.id}`);

    if (deliveryId) {
      await supabase
        .from('report_email_deliveries')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        recipient: userEmail
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-report-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
