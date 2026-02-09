import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SlideData {
  slideNumber: number;
  title: string;
  content: string;
  keyPoints: string[];
  visualDescription: string;
}

interface InsightsData {
  summary: string;
  insights: string[];
  examples: string[];
  recommendations: string[];
  slides: SlideData[];
}

async function generateSlideInfographic(
  slide: SlideData,
  insightType: string,
  totalSlides: number,
  apiKey: string
): Promise<{ base64?: string; error?: string }> {
  const colorScheme = insightType === 'goals'
    ? 'warm amber and gold tones (#F59E0B, #D97706, #FCD34D) with deep charcoal backgrounds (#1F2937, #111827)'
    : insightType === 'wishes'
    ? 'cool cyan and teal tones (#06B6D4, #0891B2, #67E8F9) with deep navy backgrounds (#0F172A, #1E293B)'
    : 'fresh emerald and green tones (#10B981, #059669, #6EE7B7) with dark slate backgrounds (#1E293B, #334155)';

  const typeContext = insightType === 'goals'
    ? 'entrepreneur goals and aspirations for AI adoption'
    : insightType === 'wishes'
    ? 'entrepreneur wishes for AI automation capabilities'
    : 'entrepreneur build plans and AI implementation projects';

  const prompt = `Create an infographic for "AI-preneur Workshop Insights" - ${slide.title}. Focus on VISUAL STORYTELLING with MINIMAL TEXT.

=== DESIGN STYLE: Professional Business Infographic ===
VIBE: Professional, clean, structured, and data-focused with modern corporate aesthetics. Premium consulting presentation quality (McKinsey/TED talk level).
COLOR PALETTE: ${colorScheme}
DATA VISUALIZATION TECHNIQUES:
- Clean bar charts and pie charts with clear labels
- Structured sections with visual hierarchy
- Icon-based callouts for key metrics
- Professional typography with clear data presentation
- Numbered insights and clear section headers

IMPORTANT: Fully embrace this design style throughout the entire infographic. Every element should reflect this aesthetic.

=== SPECS ===
- Dimensions: 1920x1080 (16:9 landscape) - THIS IS A WIDESCREEN PRESENTATION SLIDE
- Mostly graphics/icons with minimal text
- NO photographs or human faces
- Clean, modern, premium aesthetic

=== HEADER (compact) ===
"AI-preneur Insights: ${slide.title}" | Slide ${slide.slideNumber}/${totalSlides}

=== CONTENT TO VISUALIZE ===

**Topic:** ${typeContext}

**Overview:**
${slide.content}

**Key Points (show with icons):**
${slide.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

=== FOOTER (small) ===
"Powered by AI Rocket"

=== DESIGN RULES ===
1. LESS TEXT - use icons and visuals to convey meaning
2. Clear visual hierarchy
3. Lots of white space
4. Every icon serves a purpose
5. Premium, clean infographic aesthetic
6. Content flows LEFT to RIGHT across the wide format
7. LEFT SIDE: Slide number badge and title
8. CENTER: Main visual (icons, charts, diagrams)
9. RIGHT SIDE: Key points as visual callouts

=== DO NOT ===
- NO human faces or photographs
- NO walls of text - keep it visual
- NO purple/indigo colors
- NO cluttered layouts
- NO percentage labels in section headers`;

  try {
    console.log(`[Insights Infographic] Generating slide ${slide.slideNumber}: ${slide.title} using gemini-3-pro-image-preview`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 1.0,
            candidateCount: 1
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Insights Infographic] API error for slide ${slide.slideNumber}:`, errorText);
      return { error: `Image API error: ${response.status}` };
    }

    const result = await response.json();

    const imagePart = result.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imagePart?.inlineData?.data) {
      console.log(`[Insights Infographic] Slide ${slide.slideNumber} generated successfully`);
      return { base64: imagePart.inlineData.data };
    }

    console.log(`[Insights Infographic] No image in response for slide ${slide.slideNumber}`);
    return { error: 'No image generated in response' };
  } catch (error) {
    console.error(`[Insights Infographic] Error generating slide ${slide.slideNumber}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { insight_type, insights_data, slide_index } = body;

    if (!insight_type || !insights_data) {
      return new Response(
        JSON.stringify({ error: 'insight_type and insights_data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedInsights: InsightsData = typeof insights_data === 'string'
      ? JSON.parse(insights_data)
      : insights_data;

    if (!parsedInsights.slides || parsedInsights.slides.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No slides found in insights data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalSlides = parsedInsights.slides.length;

    if (slide_index !== undefined && slide_index !== null) {
      const slideToGenerate = parsedInsights.slides[slide_index];
      if (!slideToGenerate) {
        return new Response(
          JSON.stringify({ error: `Slide index ${slide_index} not found` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateSlideInfographic(
        slideToGenerate,
        insight_type,
        totalSlides,
        geminiApiKey
      );

      let imageUrl: string | null = null;
      if (result.base64) {
        try {
          const fileName = `insights/${user.id}/${insight_type}_slide_${slide_index + 1}_${Date.now()}.png`;
          const imageBuffer = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('workshop-infographics')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('workshop-infographics')
              .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        } catch (uploadErr) {
          console.error('Storage upload failed:', uploadErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: !result.error,
          slideIndex: slide_index,
          imageUrl,
          imageBase64: imageUrl ? null : result.base64,
          error: result.error
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedSlides: Array<{
      slideIndex: number;
      imageUrl: string | null;
      imageBase64: string | null;
      error?: string;
    }> = [];

    for (let i = 0; i < parsedInsights.slides.length; i++) {
      const slide = parsedInsights.slides[i];
      console.log(`[Insights Infographic] Processing slide ${i + 1}/${totalSlides}`);

      const result = await generateSlideInfographic(
        slide,
        insight_type,
        totalSlides,
        geminiApiKey
      );

      let imageUrl: string | null = null;
      if (result.base64) {
        try {
          const fileName = `insights/${user.id}/${insight_type}_slide_${i + 1}_${Date.now()}.png`;
          const imageBuffer = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('workshop-infographics')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('workshop-infographics')
              .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        } catch (uploadErr) {
          console.error('Storage upload failed:', uploadErr);
        }
      }

      generatedSlides.push({
        slideIndex: i,
        imageUrl,
        imageBase64: imageUrl ? null : result.base64,
        error: result.error
      });

      if (i < parsedInsights.slides.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = generatedSlides.filter(s => s.imageUrl || s.imageBase64).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        totalSlides: parsedInsights.slides.length,
        generatedCount: successCount,
        slides: generatedSlides
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-insights-infographic:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
