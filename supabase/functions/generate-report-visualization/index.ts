import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VisualizationRequest {
  chatMessageId: string;
  reportContent: string;
}

function generateVisualizationPrompt(messageText: string): string {
  const baseDesign = `DESIGN REQUIREMENTS:
- Use a dark theme with gray-900 (#111827) background
- Use gray-800 (#1f2937) and gray-700 (#374151) for card backgrounds
- Use white (#ffffff) and gray-300 (#d1d5db) for text
- Use blue (#3b82f6), purple (#8b5cf6), and cyan (#06b6d4) for accents and highlights
- Match the visual style of a modern dark dashboard
- Include proper spacing, rounded corners, and subtle shadows
- Use responsive layouts with flexbox or CSS grid
- Ensure all content fits within containers without overflow`;

  return `Create a comprehensive visual dashboard to help understand the information in the message below.

${baseDesign}
- Use graphics, emojis, and charts as needed to enhance the visualization
- Include visual elements like progress bars, icons, charts, and infographics where appropriate
- Make the dashboard visually engaging with relevant emojis and graphical elements

CRITICAL TYPOGRAPHY & SIZING RULES:
- Headings: Use max font-size of 1.875rem (30px)
- Large numbers/metrics: Use max font-size of 2rem (32px) with clamp() for responsiveness
- Subheadings: 1rem to 1.25rem (16-20px)
- Body text: 0.875rem to 1rem (14-16px)

CRITICAL LAYOUT RULES TO PREVENT OVERFLOW:
- Add padding inside ALL cards and containers (minimum 1rem on all sides)
- Use word-wrap: break-word on all text elements
- Use overflow-wrap: break-word to handle long numbers and text
- For responsive card grids, use: display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;
- Never use fixed widths that might cause overflow
- Ensure numbers scale down on smaller containers using clamp() or max-width with text wrapping

MESSAGE TEXT:
${messageText}

Return only the HTML code - no other text or formatting.`;
}

function wrapHtmlContent(content: string): string {
  if (content.toLowerCase().includes('<!doctype') || content.toLowerCase().includes('<html')) {
    return content;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualization</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            background: #111827;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            width: 100%;
            overflow-x: hidden;
        }
        h1, h2, h3, h4, h5, h6, p, div, span {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }
        h1 { font-size: clamp(1.5rem, 4vw, 1.875rem) !important; }
        h2 { font-size: clamp(1.25rem, 3.5vw, 1.5rem) !important; }
        h3 { font-size: clamp(1.125rem, 3vw, 1.25rem) !important; }
        img {
            max-width: 100%;
            height: auto;
        }
        [class*="card"], [class*="container"], [class*="box"], [style*="padding"] {
            padding: 1rem !important;
            overflow: hidden;
        }
    </style>
</head>
<body>
    ${content}
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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Visualization service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chatMessageId, reportContent }: VisualizationRequest = await req.json();

    if (!chatMessageId || !reportContent) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating visualization for chat message: ${chatMessageId}`);
    console.log(`Report content length: ${reportContent.length} characters`);

    const { data: existingMessage, error: fetchError } = await supabase
      .from('astra_chats')
      .select('metadata, visualization_data')
      .eq('id', chatMessageId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching message:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch message' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingMessage?.visualization_data) {
      console.log('Visualization already exists, skipping generation');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Visualization already exists' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingMetadata = existingMessage?.metadata || {};
    await supabase
      .from('astra_chats')
      .update({
        visualization: true,
        metadata: { ...existingMetadata, visualization_generating: true }
      })
      .eq('id', chatMessageId);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 1.0,
        topK: 64,
        topP: 0.95,
        maxOutputTokens: 100000,
      }
    });

    const prompt = generateVisualizationPrompt(reportContent);
    console.log('Calling Gemini API for visualization generation...');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let visualizationHtml = response.text();

    visualizationHtml = visualizationHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    visualizationHtml = wrapHtmlContent(visualizationHtml);

    console.log('Visualization generated, length:', visualizationHtml.length);

    const { visualization_generating, visualization_error, ...updatedMetadata } = existingMetadata;

    const { error: updateError } = await supabase
      .from('astra_chats')
      .update({
        visualization_data: visualizationHtml,
        visualization: true,
        metadata: updatedMetadata
      })
      .eq('id', chatMessageId);

    if (updateError) {
      console.error('Error saving visualization:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save visualization' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Visualization saved successfully for message: ${chatMessageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        chatMessageId,
        visualizationLength: visualizationHtml.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-report-visualization:", error);

    let errorMessage = error.message || "Internal server error";
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exhausted')) {
      errorMessage = 'API rate limit reached. Please try again later.';
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
