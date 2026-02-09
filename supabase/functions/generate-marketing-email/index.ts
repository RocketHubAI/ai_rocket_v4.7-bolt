import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateEmailRequest {
  subject?: string;
  contentDescription: string;
  specialNotes?: string;
  previousHtml?: string;
  regenerationComments?: string;
  featureContext?: string;
  generateDynamicSubject?: boolean;
  subjectOnly?: boolean;
  featuredImageUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured - GEMINI_API_KEY secret missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting email generation request...");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      subject,
      contentDescription,
      specialNotes,
      previousHtml,
      regenerationComments,
      featureContext,
      generateDynamicSubject,
      subjectOnly,
      featuredImageUrl
    }: GenerateEmailRequest = await req.json();

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    if (subjectOnly && generateDynamicSubject) {
      console.log("Generating subject line only...");
      const subjectPrompt = `Generate a compelling email subject line for a marketing email with this content description:\n\n"${contentDescription}"\n\n${subject ? `Hints/keywords to incorporate: ${subject}` : ''}\n\nRequirements:\n- Be engaging, creative, and attention-grabbing\n- Maximum 60 characters\n- Can include 1-2 relevant emojis if appropriate\n- Should create curiosity or convey value\n- Professional but energetic tone\n- Do NOT use generic subjects like "Test Email" or placeholder text\n\nReturn ONLY the subject line text, nothing else.`;

      try {
        const subjectResult = await model.generateContent(subjectPrompt);
        const generatedSubject = subjectResult.response.text().trim();
        console.log("Generated subject:", generatedSubject);
        return new Response(
          JSON.stringify({ subject: generatedSubject }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (subjectError) {
        console.error("Error generating subject:", subjectError);
        return new Response(
          JSON.stringify({ subject: "AI Insights for Your Team" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const templateReference = `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;\n      line-height: 1.6;\n      color: #e5e7eb;\n      margin: 0;\n      padding: 0;\n      background-color: #0f172a;\n    }\n    .container {\n      max-width: 600px;\n      margin: 40px auto;\n      background-color: #1e293b;\n      border-radius: 12px;\n      overflow: hidden;\n    }\n    .email-wrapper {\n      background-color: #0f172a;\n      padding: 20px;\n    }\n    .logo-bar {\n      background-color: #1e293b;\n      padding: 20px 30px;\n      border-bottom: 1px solid #334155;\n    }\n    .header {\n      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);\n      color: white;\n      padding: 40px 30px;\n      text-align: center;\n    }\n    .header h1 {\n      margin: 0;\n      font-size: 24px;\n      font-weight: 700;\n    }\n    .header .tagline {\n      margin: 8px 0 0 0;\n      font-size: 14px;\n      opacity: 0.95;\n    }\n    .content {\n      padding: 40px 30px;\n    }\n    .greeting {\n      font-size: 20px;\n      font-weight: 600;\n      color: #f3f4f6;\n      margin-bottom: 16px;\n    }\n    .intro-text {\n      font-size: 16px;\n      color: #d1d5db;\n      margin-bottom: 24px;\n      line-height: 1.7;\n    }\n    .section-header {\n      margin-top: 32px;\n      margin-bottom: 16px;\n    }\n    .section-icon {\n      width: 44px;\n      height: 44px;\n      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);\n      border-radius: 12px;\n      text-align: center;\n      line-height: 44px;\n      font-size: 24px;\n    }\n    .section-title {\n      font-size: 18px;\n      font-weight: 700;\n      color: #f1f5f9;\n    }\n    .section-subtitle {\n      font-size: 13px;\n      color: #94a3b8;\n    }\n    .insight-card {\n      background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);\n      border: 1px solid #3b82f6;\n      border-radius: 12px;\n      padding: 20px;\n      margin-bottom: 16px;\n    }\n    .insight-icon {\n      font-size: 20px;\n      vertical-align: top;\n      padding-top: 4px;\n    }\n    .insight-title {\n      font-size: 15px;\n      font-weight: 600;\n      color: #93c5fd;\n      margin-bottom: 4px;\n    }\n    .insight-text {\n      font-size: 13px;\n      color: #cbd5e1;\n      line-height: 1.5;\n    }\n    .cta-container {\n      text-align: center;\n      margin: 36px 0;\n    }\n    .cta-button {\n      display: inline-block;\n      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);\n      color: white !important;\n      padding: 18px 48px;\n      border-radius: 50px;\n      text-decoration: none;\n      font-weight: 700;\n      font-size: 16px;\n      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);\n    }\n    .cta-subtext {\n      font-size: 12px;\n      color: #94a3b8;\n      margin-top: 12px;\n    }\n    .footer {\n      background: #0f172a;\n      padding: 24px;\n      text-align: center;\n      border-top: 1px solid #334155;\n      font-size: 12px;\n      color: #64748b;\n    }\n    .footer a {\n      color: #60a5fa;\n      text-decoration: none;\n    }\n  </style>\n</head>\n<body>\n  <div class="email-wrapper">\n    <div class="container">\n      <div class="logo-bar">\n        <table width="100%" cellpadding="0" cellspacing="0" border="0">\n          <tr>\n            <td align="center">\n              <table cellpadding="0" cellspacing="0" border="0">\n                <tr>\n                  <td style="vertical-align: middle;">\n                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); border-radius: 50%; display: inline-block; text-align: center; line-height: 40px; font-size: 20px;">&#128640;</div>\n                  </td>\n                  <td style="vertical-align: middle; padding-left: 12px;">\n                    <span style="font-size: 18px; font-weight: 600; color: #f1f5f9;">AI Rocket</span>\n                    <span style="font-size: 18px; color: #64748b; margin: 0 8px;">+</span>\n                    <span style="font-size: 18px; font-weight: 600; color: #5eead4;">Astra Intelligence</span>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n        </table>\n      </div>\n      <div class="header">\n        <h1>{{DYNAMIC_SUBJECT}} ✨</h1>\n        <p class="tagline">AI that Works for Work</p>\n      </div>\n      <div class="content">\n        <p class="greeting">Hi {{firstName}}!</p>\n        <p class="intro-text">Brief intro text here.</p>\n        <div class="section-header">\n          <table width="100%" cellpadding="0" cellspacing="0" border="0">\n            <tr>\n              <td width="50" style="vertical-align: middle;">\n                <div class="section-icon">📊</div>\n              </td>\n              <td style="padding-left: 12px; vertical-align: middle;">\n                <div class="section-title">Section Title</div>\n                <div class="section-subtitle">Section subtitle text.</div>\n              </td>\n            </tr>\n          </table>\n        </div>\n        <div class="insight-card">\n          <table width="100%" cellpadding="0" cellspacing="0" border="0">\n            <tr>\n              <td width="32" style="vertical-align: top; padding-top: 4px;">\n                <span class="insight-icon">📈</span>\n              </td>\n              <td>\n                <div class="insight-title">Feature Title</div>\n                <div class="insight-text">Feature description text goes here.</div>\n              </td>\n            </tr>\n          </table>\n        </div>\n        <div class="cta-container">\n          <a href="https://airocket.app" class="cta-button">Get Started</a>\n          <p class="cta-subtext">Supporting text under CTA</p>\n        </div>\n      </div>\n      <div class="footer">\n        <p>You're receiving this from AI Rocket + Astra Intelligence.</p>\n        <p style="margin-top: 12px;"><a href="https://airocket.app">Visit AI Rocket</a></p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>`;

    let prompt = `You are an email marketing designer for AI Rocket / Astra Intelligence.\n\nBRAND GUIDELINES:\n- Use dark theme (#0f172a background, #1e293b containers)\n- Blue-to-cyan gradient for CTAs and headers (#3b82f6 to #06b6d4) - NOT purple\n- Professional, friendly, energetic tone\n- Focus on value and capabilities\n- Use emojis purposefully for visual interest\n- CTA button should link to https://airocket.app\n- CTA button text should be "Get Started"\n- CTA buttons should have border-radius: 50px (pill shape)\n\nKEY PRODUCT MESSAGING:\n- Astra is powered by Gemini, Claude, and OpenAI working together in alignment with your team\n- Emphasize the multi-AI approach as a unique strength\n\nCRITICAL EMAIL STRUCTURE (must follow exactly):\n1. LOGO BAR at top:\n   - Dark background (#1e293b) with border-bottom\n   - Centered content with rocket emoji in circular gradient background\n   - "AI Rocket" in white + "+" in gray + "Astra Intelligence" in teal (#5eead4)\n\n2. HEADER with blue-to-cyan gradient (#3b82f6 to #06b6d4):\n   - Shows the DYNAMIC SUBJECT LINE as h1 (can include sparkle emoji ✨)\n   - Tagline: "AI that Works for Work"\n\n3. CONTENT section:\n   - Greeting: "Hi {{firstName}}!" or "Hi there!"\n   - Brief intro paragraph (2-3 sentences max)\n   - SECTION HEADERS: Icon in gradient box (44x44px, border-radius 12px) + title + subtitle\n   - INSIGHT CARDS: Full-width cards with icon on left, title in blue (#93c5fd), description below\n   - Cards should have gradient background (#1e3a5f to #1e293b) and blue border\n\n4. CTA BUTTON:\n   - Pill-shaped (border-radius: 50px)\n   - Blue-cyan gradient background\n   - Text like "Get Started"\n   - Subtext below button\n\n5. FOOTER:\n   - Dark background\n   - "You're receiving this from AI Rocket + Astra Intelligence."\n   - Link to visit AI Rocket (do NOT include unsubscribe link - it's added automatically)\n\nTEMPLATE STRUCTURE TO FOLLOW:\n${templateReference}\n\n${featureContext ? `PRODUCT FEATURE CONTEXT:\n${featureContext}\n\nUse this context to create accurate, specific content about our actual features and benefits.\n` : ''}\n\n${featuredImageUrl ? `FEATURED IMAGE:\nThe admin has uploaded a featured image that MUST be prominently displayed in the email.\nImage URL: ${featuredImageUrl}\n\nIMPORTANT IMAGE PLACEMENT INSTRUCTIONS:\n- Place the image in a dedicated section AFTER the greeting/intro text\n- Use a full-width image (max-width: 100%, width: 100%)\n- Center the image horizontally\n- Add a subtle border-radius (8-12px) for polish\n- Wrap in a container with proper padding (20-30px)\n- The image section should be visually prominent and stand out\n- Add an optional caption below if relevant to the content description\n- Use this exact HTML structure for the image:\n  <div style="padding: 20px 30px; text-align: center;">\n    <img src="${featuredImageUrl}" alt="Featured content" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);" />\n  </div>\n` : ''}\n\nUSER REQUEST:\nSubject/Theme: ${subject || 'To be determined'}\nContent Description: ${contentDescription}\n${specialNotes ? `Special Instructions: ${specialNotes}` : ''}\n`;

    if (previousHtml && regenerationComments) {
      prompt += `\n\nPREVIOUS VERSION:\n${previousHtml}\n\nUSER FEEDBACK:\n${regenerationComments}\n\nPlease regenerate the email incorporating this feedback while maintaining the brand guidelines and template structure.`;
    } else {
      const imageInstructions = featuredImageUrl 
        ? '5. FEATURED IMAGE section (REQUIRED - use the provided image URL prominently after intro)\n6. 2-3 section headers with icons in gradient boxes' 
        : '5. 2-3 section headers with icons in gradient boxes';
      const insightNum = featuredImageUrl ? '7.' : '6.';
      const ctaNum = featuredImageUrl ? '8.' : '7.';
      const footerNum = featuredImageUrl ? '9.' : '8.';
      const imageReminder = featuredImageUrl ? '\n- MUST include the featured image prominently in the email body' : '';
      
      prompt += `\n\nGenerate a complete HTML email that EXACTLY matches the template structure above. Include:\n1. Logo bar with rocket icon + "AI Rocket" + "Astra Intelligence" (teal)\n2. Header with dynamic subject as h1 and "AI that Works for Work" tagline\n3. Personalized greeting with {{firstName}} variable\n4. Brief opening paragraph\n${imageInstructions}\n${insightNum} Multiple insight cards under each section (full-width, icon on left)\n${ctaNum} CTA button (pill-shaped, blue-cyan gradient)\n${footerNum} Professional footer (do NOT include unsubscribe links)\n\nCRITICAL REMINDERS:\n- Use blue-to-cyan gradient (#3b82f6 to #06b6d4), NOT purple\n- Logo bar must have rocket emoji in circular gradient background\n- Section headers must have icons in square gradient boxes with rounded corners\n- Insight cards are full-width with icon on the left side\n- CTA button is pill-shaped (border-radius: 50px)\n- Use the exact CSS classes and structure from the template${imageReminder}\n\nReturn ONLY the complete HTML code, no markdown formatting or additional text.`;
    }

    console.log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    let htmlContent = response.text();

    console.log("Generated content length:", htmlContent.length);
    htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    let generatedSubject: string | undefined;

    if (generateDynamicSubject) {
      console.log("Generating dynamic subject line...");
      const subjectPrompt = `Generate a compelling email subject line for a marketing email with this content description:\n\n"${contentDescription}"\n\n${subject ? `Hints/keywords to incorporate: ${subject}` : ''}\n\nRequirements:\n- Be engaging, creative, and attention-grabbing\n- Maximum 60 characters\n- Can include 1-2 relevant emojis if appropriate\n- Should create curiosity or convey value\n- Professional but energetic tone\n- Do NOT use generic subjects like "Test Email" or placeholder text\n\nReturn ONLY the subject line text, nothing else.`;

      try {
        const subjectResult = await model.generateContent(subjectPrompt);
        generatedSubject = subjectResult.response.text().trim();
        console.log("Generated subject:", generatedSubject);
      } catch (subjectError) {
        console.error("Error generating subject:", subjectError);
        generatedSubject = "AI Insights for Your Team";
      }
    }

    if (generatedSubject) {
      htmlContent = htmlContent.replace(/\{\{DYNAMIC_SUBJECT\}\}/g, generatedSubject);
    } else if (subject) {
      htmlContent = htmlContent.replace(/\{\{DYNAMIC_SUBJECT\}\}/g, subject);
    } else {
      htmlContent = htmlContent.replace(/\{\{DYNAMIC_SUBJECT\}\}/g, 'AI Insights for Your Team');
    }

    console.log("Email generation successful");
    return new Response(
      JSON.stringify({
        html: htmlContent,
        ...(generatedSubject && { subject: generatedSubject })
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-marketing-email function:", error);
    console.error("Error details:", error.message, error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});