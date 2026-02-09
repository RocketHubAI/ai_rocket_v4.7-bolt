import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (!resendApiKey || !geminiApiKey) {
      console.error("Required API keys not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: recurringEmails, error: fetchError } = await supabaseAdmin
      .from('marketing_emails')
      .select('*')
      .eq('is_recurring', true)
      .eq('status', 'recurring')
      .lte('next_run_at', new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching recurring emails:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recurring emails" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recurringEmails || recurringEmails.length === 0) {
      console.log("No recurring emails due to process");
      return new Response(
        JSON.stringify({ message: "No recurring emails to process", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${recurringEmails.length} recurring emails`);

    const results = [];

    for (const template of recurringEmails) {
      try {
        console.log(`Processing recurring email: ${template.id} - ${template.subject}`);

        const nextRunAt = calculateNextRunAt(
          template.frequency,
          template.custom_interval_days,
          template.send_hour
        );

        const { data: lockResult, error: lockError } = await supabaseAdmin
          .from('marketing_emails')
          .update({
            next_run_at: nextRunAt,
            last_run_at: new Date().toISOString()
          })
          .eq('id', template.id)
          .eq('next_run_at', template.next_run_at)
          .select()
          .single();

        if (lockError || !lockResult) {
          console.log(`Skipping email ${template.id} - already being processed by another instance`);
          continue;
        }

        console.log(`Locked email ${template.id}, next run scheduled for ${nextRunAt}`);

        const isDynamicSubject = template.subject_mode === 'dynamic';
        const subjectHints = isDynamicSubject ? template.subject : null;

        let finalSubject = template.subject;
        let generatedHtml: string;

        if (isDynamicSubject) {
          const generated = await generateEmailWithDynamicSubject(
            geminiApiKey,
            template.content_description,
            template.special_notes,
            template.context_type,
            subjectHints
          );
          finalSubject = generated.subject;
          generatedHtml = generated.html;
          console.log(`Generated dynamic subject: ${finalSubject}`);
        } else {
          generatedHtml = await generateEmailContent(
            geminiApiKey,
            template.subject,
            template.content_description,
            template.special_notes,
            template.context_type
          );
        }

        const { data: childEmail, error: childError } = await supabaseAdmin
          .from('marketing_emails')
          .insert({
            subject: finalSubject,
            subject_mode: template.subject_mode || 'static',
            content_description: template.content_description,
            special_notes: template.special_notes,
            html_content: generatedHtml,
            recipient_filter: template.recipient_filter,
            context_type: template.context_type,
            status: 'sending',
            parent_recurring_id: template.id,
            created_by: template.created_by,
            from_address: template.from_address,
            from_name: template.from_name,
            reply_to: template.reply_to
          })
          .select()
          .single();

        if (childError || !childEmail) {
          console.error(`Failed to create child email for ${template.id}:`, childError);
          results.push({ id: template.id, success: false, error: 'Failed to create child email' });
          continue;
        }

        const sendResult = await sendCampaign(
          supabaseAdmin,
          resendApiKey,
          childEmail.id,
          childEmail.html_content,
          childEmail.subject,
          template.recipient_filter,
          {
            fromAddress: template.from_address || 'astra@airocket.app',
            fromName: template.from_name || 'AI Rocket',
            replyTo: template.reply_to
          }
        );

        await supabaseAdmin
          .from('marketing_emails')
          .update({
            run_count: (template.run_count || 0) + 1
          })
          .eq('id', template.id);

        results.push({
          id: template.id,
          success: true,
          childEmailId: childEmail.id,
          recipientCount: sendResult.total,
          successfulSends: sendResult.successful,
          failedSends: sendResult.failed
        });

        console.log(`Successfully processed recurring email ${template.id}`);

      } catch (error) {
        console.error(`Error processing recurring email ${template.id}:`, error);
        results.push({ id: template.id, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-recurring-marketing-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateNextRunAt(
  frequency: string,
  customIntervalDays?: number,
  sendHour?: number
): string {
  const hour = sendHour ?? 9;
  const now = new Date();
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const etParts = etFormatter.formatToParts(now);
  const etYear = parseInt(etParts.find(p => p.type === 'year')?.value || '2024');
  const etMonth = parseInt(etParts.find(p => p.type === 'month')?.value || '1') - 1;
  const etDay = parseInt(etParts.find(p => p.type === 'day')?.value || '1');
  let targetDate = new Date(Date.UTC(etYear, etMonth, etDay, hour + 5, 0, 0));
  const testDate = new Date(targetDate);
  const etOffsetCheck = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false
  }).format(testDate);
  const actualHour = parseInt(etOffsetCheck);
  if (actualHour !== hour) {
    targetDate = new Date(targetDate.getTime() + (hour - actualHour) * 60 * 60 * 1000);
  }
  switch (frequency) {
    case 'daily':
      targetDate.setUTCDate(targetDate.getUTCDate() + 1);
      break;
    case 'weekly':
      targetDate.setUTCDate(targetDate.getUTCDate() + 7);
      break;
    case 'biweekly':
      targetDate.setUTCDate(targetDate.getUTCDate() + 14);
      break;
    case 'monthly':
      targetDate.setUTCMonth(targetDate.getUTCMonth() + 1);
      break;
    case 'custom':
      targetDate.setUTCDate(targetDate.getUTCDate() + (customIntervalDays || 7));
      break;
    default:
      targetDate.setUTCDate(targetDate.getUTCDate() + 7);
  }
  return targetDate.toISOString();
}

async function generateEmailContent(
  geminiApiKey: string,
  subject: string,
  contentDescription: string,
  specialNotes: string,
  contextType: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const emailTemplateStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #e5e7eb;
      margin: 0;
      padding: 0;
      background-color: #0f172a;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #1e293b;
      border-radius: 12px;
      overflow: hidden;
    }
    .email-wrapper {
      background-color: #0f172a;
      padding: 20px;
    }
    .logo-bar {
      background-color: #1e293b;
      padding: 20px 30px;
      border-bottom: 1px solid #334155;
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
    .intro-text {
      font-size: 16px;
      color: #d1d5db;
      margin-bottom: 24px;
      line-height: 1.7;
    }
    .insight-card {
      background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
      border: 1px solid #3b82f6;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .cta-container {
      text-align: center;
      margin: 36px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
      color: white !important;
      padding: 18px 48px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }
    .cta-subtext {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 12px;
    }
    .footer {
      background: #0f172a;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #60a5fa;
      text-decoration: none;
    }
  `;

  const prompt = `You are an email marketing designer for AI Rocket / Astra Intelligence.

TASK: Create a VISUALLY RICH marketing email with GRAPHICS and ICONS - minimal text, maximum visual impact.

EMAIL SUBJECT: ${subject}
CONTENT DESCRIPTION: ${contentDescription}
${specialNotes ? `SPECIAL INSTRUCTIONS: ${specialNotes}` : ''}

IMPORTANT: This is a RECURRING email. Create FRESH, UNIQUE content. If instructed to vary content or pick random items, actually randomize your selection each time.

REQUIRED EMAIL STRUCTURE:

1. GREETING (Very brief - 1 line max):
   <p class="greeting">Hi {{firstName}}!</p>
   <p class="intro-text">One sentence intro...</p>

2. VISUAL SECTION HEADERS - Create 3-4 main sections with BIG ICONS:

   <!-- Section Header with Large Icon -->
   <div style="margin-top: 32px; margin-bottom: 16px;">
     <table width="100%" cellpadding="0" cellspacing="0" border="0">
       <tr>
         <td width="50" style="vertical-align: middle;">
           <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 12px; text-align: center; line-height: 44px; font-size: 24px;">EMOJI</div>
         </td>
         <td style="padding-left: 12px; vertical-align: middle;">
           <div style="font-size: 18px; font-weight: 700; color: #f1f5f9;">SECTION TITLE</div>
           <div style="font-size: 13px; color: #94a3b8;">Brief subtitle</div>
         </td>
       </tr>
     </table>
   </div>

3. CONTENT CARDS - Under each section, add 2-3 insight cards with icons:

   <div class="insight-card">
     <table width="100%" cellpadding="0" cellspacing="0" border="0">
       <tr>
         <td width="32" style="vertical-align: top; padding-top: 4px;">
           <span style="font-size: 20px;">EMOJI</span>
         </td>
         <td>
           <div style="font-size: 15px; font-weight: 600; color: #93c5fd; margin-bottom: 4px;">Point Title</div>
           <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">One to two sentences max. Keep it brief and impactful.</div>
         </td>
       </tr>
     </table>
   </div>

4. CTA BUTTON:
   <div class="cta-container">
     <a href="https://airocket.app" class="cta-button">Get Started</a>
     <p class="cta-subtext">Transform how your team works with AI</p>
   </div>

DESIGN RULES:
- Use LOTS of emojis as visual icons (varied and relevant)
- Keep text SHORT - 1-2 sentences per card max
- Create 3-4 visual sections with big headers
- Under each section, 2-3 insight cards
- Make it SCANNABLE - people should get the message from icons and headlines
- Use TABLE layouts for email compatibility
- NO walls of text - graphics over paragraphs

BRAND COLORS:
- Background: #0f172a (dark navy)
- Container: #1e293b (slate)
- Accent gradients: #3b82f6 to #06b6d4 (blue to cyan)
- Text: #f1f5f9 (headers), #cbd5e1 (body), #93c5fd (highlights)

HTML TEMPLATE:
<!DOCTYPE html>
<html>
<head>
  <style>
${emailTemplateStyles}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="logo-bar">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); border-radius: 50%; display: inline-block; text-align: center; line-height: 40px; font-size: 20px;">&#128640;</div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <span style="font-size: 18px; font-weight: 600; color: #f1f5f9;">AI Rocket</span>
                    <span style="font-size: 18px; color: #64748b; margin: 0 8px;">+</span>
                    <span style="font-size: 18px; font-weight: 600; color: #5eead4;">Astra Intelligence</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
      <div class="header">
        <h1>${subject}</h1>
        <p class="tagline">AI that Works for Work</p>
      </div>
      <div class="content">
        <!-- Greeting -->
        <!-- Visual Section Headers with Icon -->
        <!-- Insight Cards -->
        <!-- CTA button -->
      </div>
      <div class="footer">
        <p>You're receiving this from AI Rocket + Astra Intelligence.</p>
        <p style="margin-top: 12px;"><a href="https://airocket.app">Visit AI Rocket</a></p>
        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
          <a href="{{unsubscribeUrl}}" style="color: #64748b; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>

Return ONLY the complete HTML code. No markdown formatting or code blocks.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let htmlContent = response.text();
  htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

  return htmlContent;
}

async function generateEmailWithDynamicSubject(
  geminiApiKey: string,
  contentDescription: string,
  specialNotes: string,
  contextType: string,
  subjectHints: string | null
): Promise<{ subject: string; html: string }> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const subjectStyles = [
    { style: "question", desc: "Ask a thought-provoking question", examples: ["What if your data could talk back?", "Ready to work smarter, not harder?", "Is your team missing this?"] },
    { style: "curiosity_gap", desc: "Create intrigue without revealing everything", examples: ["The one thing top teams do differently", "We noticed something about your workflow...", "This changes everything"] },
    { style: "benefit_focused", desc: "Lead with a clear benefit", examples: ["Save 10 hours this week", "Never miss an insight again", "Your meetings just got productive"] },
    { style: "number_list", desc: "Use specific numbers", examples: ["3 ways AI transforms your week", "5 minutes to smarter decisions", "The 2-step workflow upgrade"] },
    { style: "personal_direct", desc: "Speak directly to the reader", examples: ["You asked, we delivered", "Built for teams like yours", "Your AI assistant is ready"] },
    { style: "news_announcement", desc: "Frame as news or update", examples: ["Introducing: Smarter reports", "New: AI that learns your style", "Just launched: Team insights"] },
    { style: "challenge", desc: "Challenge assumptions", examples: ["Forget everything about spreadsheets", "Your old tools can't do this", "Think AI is complicated? Think again"] },
    { style: "story_hook", desc: "Start a story or scenario", examples: ["Picture this: Monday morning clarity", "Remember when reports took hours?", "Last week, a team discovered..."] },
    { style: "fomo_urgency", desc: "Create gentle urgency", examples: ["Don't let insights slip away", "Your competitors are already doing this", "The future of work is here"] },
    { style: "playful", desc: "Light, fun, conversational", examples: ["AI magic, zero tech headaches", "Less chaos, more coffee breaks", "Work smarter, impress everyone"] },
    { style: "minimalist", desc: "Short and punchy", examples: ["Smarter. Faster. Done.", "AI that just works", "Finally."] },
    { style: "metaphor", desc: "Use creative comparisons", examples: ["Your data's new best friend", "Like GPS for your business", "The engine behind great teams"] }
  ];

  const randomStyle = subjectStyles[Math.floor(Math.random() * subjectStyles.length)];
  const randomSeed = Math.floor(Math.random() * 10000);

  const subjectPrompt = `You are an email marketing expert for AI Rocket / Astra Intelligence.

Generate a UNIQUE, compelling email subject line for this marketing email.

CONTENT DESCRIPTION: ${contentDescription}
${specialNotes ? `SPECIAL NOTES: ${specialNotes}` : ''}
${subjectHints ? `SUBJECT HINTS/KEYWORDS: ${subjectHints}` : ''}

CRITICAL: Use THIS specific style for this email:
STYLE: "${randomStyle.style}" - ${randomStyle.desc}
EXAMPLES of this style: ${randomStyle.examples.join(" | ")}

REQUIREMENTS:
- 4-8 words max (shorter is better)
- Match the "${randomStyle.style}" style above
- Be CREATIVE and DIFFERENT - avoid cliches
- Optional: include ONE emoji if it fits naturally (not required)
- DO NOT start with "AI" or "Unlock" or "Power-Up" or "Transform"
- DO NOT use patterns like "X + Y" or "X: Y"
- Make it sound human, not corporate
- Random seed for uniqueness: ${randomSeed}

BAD EXAMPLES (DO NOT USE patterns like these):
- "AI Team Power-Up: X + Y"
- "AI-Powered Teams: Something Something"
- "Unlock AI Superpowers"
- "Transform Your Team with AI"

Return ONLY the subject line, nothing else. No quotes, no explanation.`;

  const subjectResult = await model.generateContent(subjectPrompt);
  const generatedSubject = subjectResult.response.text().trim().replace(/^["']|["']$/g, '');

  const html = await generateEmailContent(
    geminiApiKey,
    generatedSubject,
    contentDescription,
    specialNotes,
    contextType
  );

  return { subject: generatedSubject, html };
}

async function sendCampaign(
  supabase: any,
  resendApiKey: string,
  emailId: string,
  htmlContent: string,
  subject: string,
  recipientFilter: any,
  senderConfig?: { fromAddress?: string; fromName?: string; replyTo?: string }
): Promise<{ total: number; successful: number; failed: number }> {
  const senderAddress = senderConfig?.fromAddress || 'astra@airocket.app';
  const senderName = senderConfig?.fromName || 'AI Rocket';
  const senderReplyTo = senderConfig?.replyTo || senderAddress;
  const emailFrom = `${senderName} <${senderAddress}>`;
  let recipients: { id: string | null; email: string; firstName: string }[] = [];
  const seenEmails = new Set<string>();

  const addRecipient = (r: { id: string | null; email: string; firstName: string }) => {
    const emailLower = r.email.toLowerCase();
    if (!seenEmails.has(emailLower)) {
      seenEmails.add(emailLower);
      recipients.push(r);
    }
  };

  let types: string[] = [];
  if (recipientFilter?.types && recipientFilter.types.length > 0) {
    types = recipientFilter.types;
  } else if (recipientFilter?.type) {
    types = [recipientFilter.type === 'all' ? 'all_users' : recipientFilter.type];
  } else {
    types = ['all_users'];
  }

  if (types.includes('all_users')) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name');

    (users || []).forEach((u: any) => addRecipient({
      id: u.id,
      email: u.email,
      firstName: u.name?.split(' ')[0] || 'there'
    }));
  }

  if (types.includes('preview_requests')) {
    const { data: previewRequests } = await supabase
      .rpc('get_preview_requests_with_onboarding');

    const notYetSignedUp = previewRequests?.filter((req: any) => !req.user_onboarded) || [];
    notYetSignedUp.forEach((req: any) => addRecipient({
      id: null,
      email: req.email,
      firstName: 'there'
    }));
  }

  if (types.includes('marketing_contacts')) {
    const { data: contacts } = await supabase
      .rpc('get_marketing_contacts_for_campaign');

    (contacts || []).forEach((c: any) => addRecipient({
      id: null,
      email: c.email,
      firstName: c.first_name || 'there'
    }));
  }

  if (types.includes('moonshot_registrations')) {
    const { data: registrations } = await supabase
      .from('moonshot_registrations')
      .select('email, name')
      .is('converted_at', null);

    (registrations || []).forEach((r: any) => addRecipient({
      id: null,
      email: r.email,
      firstName: r.name?.split(' ')[0] || 'there'
    }));
  }

  if (types.includes('specific') && recipientFilter?.emails?.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name')
      .in('email', recipientFilter.emails);

    (users || []).forEach((u: any) => addRecipient({
      id: u.id,
      email: u.email,
      firstName: u.name?.split(' ')[0] || 'there'
    }));
  }

  await supabase
    .from('marketing_emails')
    .update({ total_recipients: recipients.length })
    .eq('id', emailId);

  const recipientRecords = recipients.map(r => ({
    marketing_email_id: emailId,
    user_id: r.id,
    email: r.email,
    status: 'pending'
  }));

  if (recipientRecords.length > 0) {
    await supabase
      .from('marketing_email_recipients')
      .insert(recipientRecords);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    if (i > 0 && i % 2 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let emailHtml = htmlContent.replace(/\{\{firstName\}\}/g, recipient.firstName);

    // Get unsubscribe token for this recipient
    const { data: contactData } = await supabase
      .from('marketing_contacts')
      .select('unsubscribe_token')
      .eq('email', recipient.email)
      .maybeSingle();

    const unsubscribeUrl = contactData?.unsubscribe_token
      ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
      : 'https://airocket.app/unsubscribe';

    emailHtml = emailHtml.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);

    try {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: recipient.email,
          subject: subject,
          html: emailHtml,
          reply_to: senderReplyTo,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        await supabase
          .from('marketing_email_recipients')
          .update({ status: 'failed', error_message: errorText })
          .eq('marketing_email_id', emailId)
          .eq('email', recipient.email);
        failCount++;
      } else {
        const resendData = await resendResponse.json();
        await supabase
          .from('marketing_email_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_id: resendData.id
          })
          .eq('marketing_email_id', emailId)
          .eq('email', recipient.email);
        successCount++;
      }
    } catch (error) {
      await supabase
        .from('marketing_email_recipients')
        .update({ status: 'failed', error_message: error.message })
        .eq('marketing_email_id', emailId)
        .eq('email', recipient.email);
      failCount++;
    }
  }

  await supabase
    .from('marketing_emails')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      successful_sends: successCount,
      failed_sends: failCount
    })
    .eq('id', emailId);

  return { total: recipients.length, successful: successCount, failed: failCount };
}