import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GoalData {
  goalNumber: number;
  goalTitle: string;
  goalDescription: string;
  positiveImpact1: string;
  positiveImpact2: string;
  positiveImpact3: string;
}

interface DocumentData {
  fileName: string;
  content: string;
}

interface MissionValuesAnalysis {
  mission: string;
  coreValues: string[];
  visionStatement: string;
}

async function extractMissionValues(
  documents: DocumentData[],
  apiKey: string
): Promise<MissionValuesAnalysis> {
  if (documents.length === 0) {
    return {
      mission: "Transform your business with AI-powered innovation",
      coreValues: ["Innovation", "Growth", "Excellence"],
      visionStatement: "Leading the future through intelligent solutions"
    };
  }

  const docContent = documents.map(d => `[${d.fileName}]\n${d.content}`).join('\n\n');

  const prompt = `Analyze the following business documents and extract:
1. The company's mission statement (or create one based on the content)
2. 3-5 core values evident from the documents
3. A vision statement (or create one based on the content)

Documents:
${docContent.substring(0, 8000)}

Respond ONLY with valid JSON:
{
  "mission": "<mission statement - 1-2 sentences>",
  "coreValues": ["<value 1>", "<value 2>", "<value 3>"],
  "visionStatement": "<vision statement - 1 sentence>"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as MissionValuesAnalysis;
    }
  } catch (error) {
    console.error('Error extracting mission/values:', error);
  }

  return {
    mission: "Transform your business with AI-powered innovation",
    coreValues: ["Innovation", "Growth", "Excellence"],
    visionStatement: "Leading the future through intelligent solutions"
  };
}

async function generateInfographic(
  teamName: string,
  goal: GoalData,
  missionValues: MissionValuesAnalysis,
  apiKey: string
): Promise<{ base64?: string; error?: string }> {
  const prompt = `Create a premium, inspiring infographic for an entrepreneur completing an AI-preneur workshop. This should feel like a powerful visual summary of their transformation journey.

=== DESIGN STYLE ===
VIBE: Inspiring, professional, transformative - like a vision board meets business strategy document
COLOR PALETTE: Deep teals and cyans (#06B6D4, #0891B2), rich dark backgrounds (#111827, #1F2937), white text, gold accents for achievements
AESTHETIC: Clean, modern, premium with a subtle cosmic/innovation theme

=== SPECIFICATIONS ===
- Landscape 1920x1080 (16:9)
- Mostly graphics/icons with minimal but impactful text
- NO photographs or human faces
- Clean, premium, inspiring aesthetic
- Strong visual hierarchy

=== LAYOUT ===
Three main sections arranged elegantly:
1. TOP: Mission & Values Foundation
2. CENTER (HERO): The Selected Impossible Goal
3. BOTTOM: Three Positive Impacts (like stepping stones to success)

=== SECTION 1: FOUNDATION (Top Banner) ===
Team: "${teamName}"
Mission: "${missionValues.mission}"
Core Values: ${missionValues.coreValues.join(' | ')}
Vision: "${missionValues.visionStatement}"

Visual treatment:
- Elegant banner across top
- Mission text prominent
- Core values as small badges/pills
- Subtle gradient background

=== SECTION 2: THE IMPOSSIBLE GOAL (Center - Hero Section) ===
This is the MAIN FOCUS - the user's selected impossible goal.

Goal Title: "${goal.goalTitle}"
Goal Description: "${goal.goalDescription}"

Visual treatment:
- Large, prominent central placement
- Rocket or star icon above the title
- Goal title in large, bold typography
- Description in clean, readable text below
- Glowing or highlighted border/frame effect
- This should feel like the centerpiece of achievement

=== SECTION 3: POSITIVE IMPACTS (Bottom - Three Columns) ===
The three transformational impacts of achieving this goal:

Impact 1: "${goal.positiveImpact1}"
Impact 2: "${goal.positiveImpact2}"
Impact 3: "${goal.positiveImpact3}"

Visual treatment:
- Three equal columns or connected stepping stones
- Each impact has its own icon (lightbulb, chart-up, trophy)
- Numbered 1, 2, 3 with visual hierarchy
- Connected with flowing arrows or path
- Feel of "ripple effects" or "domino effects"

=== FOOTER ===
"Your AI-preneur Journey" | "Powered by AI Rocket"

=== DESIGN RULES ===
1. The goal should be the absolute HERO element
2. Create visual flow from foundation -> goal -> impacts
3. Use icons strategically to represent concepts
4. Lots of breathing room - premium feel
5. Color accents on key elements (goal, impacts)
6. Inspire action and possibility
7. Feel like something worth framing or sharing

=== DO NOT ===
- NO human faces or photographs
- NO purple or indigo colors
- NO cluttered layouts
- NO generic stock imagery
- NO more than 3-4 font sizes total
- NO walls of text`;

  try {
    console.log('[Workshop Infographic] Starting generation for:', teamName);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 1.0
          }
        })
      }
    );

    console.log('[Workshop Infographic] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Workshop Infographic] API error:', errorText);
      return { error: `Image API error: ${response.status}` };
    }

    const result = await response.json();

    const imagePart = result.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imagePart?.inlineData?.data) {
      console.log('[Workshop Infographic] Image generated successfully');
      return { base64: imagePart.inlineData.data };
    }

    console.log('[Workshop Infographic] No image in response');
    return { error: 'No image generated in response' };
  } catch (error) {
    console.error('[Workshop Infographic] Error:', error);
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
    const { registration_id } = body;

    if (!registration_id) {
      return new Response(
        JSON.stringify({ error: 'registration_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: registration, error: regError } = await supabase
      .from('workshop_registrations')
      .select('*, teams(name)')
      .eq('id', registration_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (regError || !registration) {
      return new Response(
        JSON.stringify({ error: 'Registration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamName = registration.teams?.name || registration.team_name || 'My Team';

    const { data: selectedGoal, error: goalError } = await supabase
      .from('workshop_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_selected', true)
      .maybeSingle();

    if (goalError || !selectedGoal) {
      return new Response(
        JSON.stringify({ error: 'No selected goal found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const goal: GoalData = {
      goalNumber: selectedGoal.goal_number,
      goalTitle: selectedGoal.goal_title,
      goalDescription: selectedGoal.goal_description,
      positiveImpact1: selectedGoal.positive_impact_1,
      positiveImpact2: selectedGoal.positive_impact_2,
      positiveImpact3: selectedGoal.positive_impact_3
    };

    const { data: workshopDocs } = await supabase
      .from('workshop_documents')
      .select('document_id, document_name')
      .eq('user_id', user.id);

    const documents: DocumentData[] = [];

    if (workshopDocs && workshopDocs.length > 0) {
      for (const doc of workshopDocs.slice(0, 3)) {
        const { data: chunks } = await supabase
          .from('document_chunks')
          .select('content')
          .eq('source_id', doc.document_id)
          .limit(5);

        if (chunks && chunks.length > 0) {
          documents.push({
            fileName: doc.document_name,
            content: chunks.map(c => c.content).join('\n')
          });
        }
      }
    }

    console.log(`Generating workshop infographic for user ${user.id}`);
    console.log(`Team: ${teamName}, Goal: ${goal.goalTitle}`);
    console.log(`Documents found: ${documents.length}`);

    const missionValues = await extractMissionValues(documents, geminiApiKey);
    console.log('Mission/values extracted:', missionValues);

    const infographicResult = await generateInfographic(
      teamName,
      goal,
      missionValues,
      geminiApiKey
    );

    if (infographicResult.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: infographicResult.error,
          fallback: {
            teamName,
            goal,
            missionValues
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let infographicUrl: string | null = null;

    if (infographicResult.base64) {
      try {
        const fileName = `workshop/${user.id}/${Date.now()}.png`;
        const imageBuffer = Uint8Array.from(atob(infographicResult.base64), c => c.charCodeAt(0));

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workshop-infographics')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('workshop-infographics')
            .getPublicUrl(fileName);
          infographicUrl = urlData.publicUrl;
          console.log('Infographic uploaded to storage');
        }
      } catch (uploadErr) {
        console.error('Storage upload failed:', uploadErr);
      }
    }

    const { data: visualization, error: vizError } = await supabase
      .from('workshop_visualizations')
      .insert({
        user_id: user.id,
        visualization_type: 'goal_infographic',
        visualization_data: {
          teamName,
          goal,
          missionValues
        },
        image_url: infographicUrl,
        image_base64: infographicUrl ? null : infographicResult.base64
      })
      .select()
      .single();

    if (vizError) {
      console.error('Error saving visualization:', vizError);
    }

    await supabase
      .from('workshop_registrations')
      .update({ current_step: 'infographic' })
      .eq('id', registration_id);

    return new Response(
      JSON.stringify({
        success: true,
        visualization: {
          id: visualization?.id,
          imageUrl: infographicUrl,
          imageBase64: infographicUrl ? null : infographicResult.base64,
          teamName,
          goal,
          missionValues
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-workshop-infographic:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
