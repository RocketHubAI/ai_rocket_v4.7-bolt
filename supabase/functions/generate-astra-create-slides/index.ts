import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeneratedSlide {
  id: string;
  slideNumber: number;
  title: string;
  content: string;
  bulletPoints?: string[];
  metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
  imageBase64?: string;
}

interface DesignStyleConfig {
  name: string;
  vibe: string;
  colorPalette: string;
  dataVisualization: string[];
}

const DESIGN_STYLES: Record<string, DesignStyleConfig> = {
  infographic: {
    name: 'Infographic (Business Intelligence)',
    vibe: 'Professional, clean, structured, and data-focused with modern corporate aesthetics. Educational format emphasizing clarity and comprehension.',
    colorPalette: 'Professional teals, blues, and grays with clean dark backgrounds. High contrast for readability, subtle gradients for depth.',
    dataVisualization: [
      'Clean bar charts and pie charts with clear labels',
      'Structured sections with visual hierarchy',
      'Icon-based callouts for key metrics',
      'Professional typography with clear data presentation',
      'Numbered insights and clear section headers'
    ]
  },
  pixel_power: {
    name: 'Pixel Power (8-Bit Arcade)',
    vibe: 'Nostalgic, blocky, vibrant, and digital-first retro gaming aesthetics.',
    colorPalette: 'Bright neon colors on dark backgrounds, pixel art gradients, classic 8-bit game palettes (cyan, magenta, yellow, green).',
    dataVisualization: [
      'Health Bars represent budget or resource levels',
      'Experience Points (XP) bars track progress toward goals',
      'Leaderboards replace standard ranked lists',
      'Pixel art icons and blocky typography'
    ]
  },
  blueprint: {
    name: 'The Blueprint (Technical Sketch)',
    vibe: 'Structural, technical, precise - framing data as business architecture.',
    colorPalette: 'Dark blue backgrounds, stark white grid lines, technical cyan accents.',
    dataVisualization: [
      'Foundation blocks represent base metrics',
      'Pillars represent key growth drivers',
      'Schematic arrows show workflow processes',
      'Hand-drawn technical annotation style'
    ]
  },
  botanical_garden: {
    name: 'Botanical Garden (Organic Growth)',
    vibe: 'Natural, nurturing, gentle - using nature as metaphor for growth.',
    colorPalette: 'Soft greens, earthy tones, sage and moss colors, watercolor textures, dark forest backgrounds.',
    dataVisualization: [
      'Tree Rings show year-over-year expansion',
      'Root Systems visualize underlying causes',
      'Blooming Flowers where petal size represents metrics',
      'Organic flowing lines and natural shapes'
    ]
  },
  interstellar_voyage: {
    name: 'Interstellar Voyage (Space & Sci-Fi)',
    vibe: 'Cosmic, exploratory, visionary - for moonshots and the unknown.',
    colorPalette: 'Deep blacks and dark blues, neon highlights (cyan, magenta), starfield backgrounds, aurora effects.',
    dataVisualization: [
      'Planetary Size compares project budgets',
      'Orbits track recurring patterns or cycles',
      'Constellations connect related data points',
      'Nebula effects for category groupings'
    ]
  },
  papercraft_popup: {
    name: 'Papercraft Pop-Up (3D Collage)',
    vibe: 'Tactile, artistic, crafted - making data feel tangible.',
    colorPalette: 'Matte colors, textured paper effects, warm tones, construction paper aesthetic.',
    dataVisualization: [
      'Stacked Layers for accumulation data',
      'Unfolding Paper reveals step-by-step processes',
      'Cut-outs highlight key metrics',
      'Shadow effects create depth and dimension'
    ]
  },
  neon_noir: {
    name: 'Neon Noir (Cyberpunk City)',
    vibe: 'Futuristic, high-energy, sophisticated - data as city pulse.',
    colorPalette: 'Dark backgrounds, neon pinks and teals, rain-slicked reflections, glowing lines, high contrast.',
    dataVisualization: [
      'Traffic flows represent data movement',
      'Skyscraper heights for competitive metrics',
      'Glowing circuitry maps for connections',
      'Holographic overlays for highlights'
    ]
  },
  modern_superhero: {
    name: 'Modern Superhero (Comic Book Bold)',
    vibe: 'Heroic, powerful, impactful - data as epic narrative.',
    colorPalette: 'Deep shadows, halftone dots (Ben-Day dots), bold primary colors, dramatic contrast.',
    dataVisualization: [
      'Power Meters like superhero energy cores',
      'Action Sequences showing before/after battles',
      'Heroic Portraits for top performers',
      'Dynamic perspective angles'
    ]
  },
  animal_kingdom: {
    name: 'Animal Kingdom (Ecosystem Logic)',
    vibe: 'Natural hierarchy, ecosystem thinking - explaining complex relationships.',
    colorPalette: 'Earthy natural textures, wildlife photography style, woodcut illustration aesthetic.',
    dataVisualization: [
      'Food Chain/Pyramid for hierarchy',
      'Migration Maps for movement tracking',
      'Herd Size for scale comparisons',
      'Natural habitat backdrops'
    ]
  },
  vintage_board_game: {
    name: 'Vintage Board Game (Path to Success)',
    vibe: 'Playful journey, strategic progress - data as game being won.',
    colorPalette: 'Warm wood tones, vintage game aesthetics, parchment backgrounds, classic game colors.',
    dataVisualization: [
      'Winding Path board game track for lifecycle',
      'Property Cards for KPIs',
      'Dice/Tokens for allocations',
      'Isometric game board views'
    ]
  },
  pop_art: {
    name: 'Pop Art (The Warhol Report)',
    vibe: 'Bold, repetitive, commercial art - making data impossible to miss.',
    colorPalette: 'Neon high-saturation colors, heavy black outlines, clashing color combinations, screen print style.',
    dataVisualization: [
      'Icon Grids with color variations',
      'High-Contrast Callouts for outliers',
      'Stylized Pop-art portraits',
      'Repetitive pattern backgrounds'
    ]
  },
  expedition_map: {
    name: 'Expedition Map (Antique Cartography)',
    vibe: 'Discovery, exploration, navigation - data as uncharted territory.',
    colorPalette: 'Parchment textures, hand-drawn ink lines, sepia and aged paper tones, compass rose accents.',
    dataVisualization: [
      'Archipelago of Data (business units as islands)',
      'Trade Routes with dashed lines',
      'The Unknown (fading into clouds for projections)',
      'Nautical and cartographic elements'
    ]
  }
};

interface ImageStyleConfig {
  name: string;
  vibe: string;
  visualDirection: string;
  technicalSpecs: string[];
  textOverlayStyle: string;
}

const IMAGE_STYLE_CONFIGS: Record<string, ImageStyleConfig> = {
  photorealistic: {
    name: 'Photorealistic',
    vibe: 'Life-like, natural, cinematic quality with realistic lighting and textures. Like a professional photograph.',
    visualDirection: 'Create a photorealistic scene that represents the business content. Use natural lighting, realistic depth of field, and cinematic composition. The image should look like it was captured by a professional photographer.',
    technicalSpecs: [
      'Natural lighting with soft shadows',
      'Realistic textures and materials',
      'Shallow depth of field for focus',
      'Cinematic 35mm or 50mm lens perspective',
      'Professional color grading',
      'High dynamic range for detail'
    ],
    textOverlayStyle: 'Clean white or light-colored text with subtle drop shadows for readability. Modern sans-serif typography positioned to complement the photographic composition.'
  },
  digital_art: {
    name: 'Digital Art',
    vibe: 'Modern digital illustration with vibrant colors, clean lines, and contemporary aesthetics. Polished and professional.',
    visualDirection: 'Create a modern digital illustration that brings the content to life. Use vibrant colors, clean vector-like shapes, and contemporary design aesthetics. Think Behance or Dribbble quality.',
    technicalSpecs: [
      'Vibrant, saturated color palette',
      'Clean vector-style shapes and lines',
      'Smooth gradients and transitions',
      'Modern geometric elements',
      'Crisp edges and defined forms',
      'Contemporary illustration style'
    ],
    textOverlayStyle: 'Bold, modern typography with strong contrast. Can use colored text that complements the illustration. Clean sans-serif fonts with confident sizing.'
  },
  watercolor: {
    name: 'Watercolor',
    vibe: 'Soft, artistic, and organic with flowing colors and natural imperfections. Warm and approachable.',
    visualDirection: 'Create a watercolor-style illustration with soft washes of color, organic bleeding edges, and artistic texture. The style should feel hand-painted and emotionally warm.',
    technicalSpecs: [
      'Soft color washes with natural bleeding',
      'Organic edges and imperfections',
      'Paper texture visible through paint',
      'Layered transparent colors',
      'Visible brush strokes',
      'Muted, harmonious color palette'
    ],
    textOverlayStyle: 'Elegant serif or hand-written style typography. Text should feel integrated with the art, possibly with subtle watercolor effects on the text itself.'
  },
  minimalist: {
    name: 'Minimalist',
    vibe: 'Clean, simple, focused. Maximum impact through restraint and intentional whitespace.',
    visualDirection: 'Create a minimalist design with essential elements only. Use generous whitespace, simple geometric shapes, and a restrained color palette. Every element must serve a purpose.',
    technicalSpecs: [
      'Generous whitespace',
      'Limited color palette (2-3 colors max)',
      'Simple geometric shapes',
      'Clean lines and precise alignment',
      'No decorative elements',
      'Strong visual hierarchy'
    ],
    textOverlayStyle: 'Ultra-clean typography with perfect alignment. Thin, modern sans-serif fonts. Text is a primary design element, not an overlay.'
  },
  '3d_render': {
    name: '3D Render',
    vibe: 'Dimensional, polished, premium. Modern 3D visualization with realistic materials and lighting.',
    visualDirection: 'Create a 3D rendered scene with realistic materials, dramatic lighting, and dimensional depth. Think high-end product visualization or premium tech company aesthetics.',
    technicalSpecs: [
      'Realistic 3D materials and textures',
      'Dramatic studio-quality lighting',
      'Soft shadows and ambient occlusion',
      'Depth and dimensional perspective',
      'Reflective and glossy surfaces',
      'Professional rendering quality'
    ],
    textOverlayStyle: 'Premium, floating 3D-style text or clean overlays with glass/frosted effects. Modern typography that matches the dimensional aesthetic.'
  },
  sketch: {
    name: 'Sketch / Hand-drawn',
    vibe: 'Organic, approachable, human. Visible hand-drawn quality that feels warm and relatable.',
    visualDirection: 'Create a hand-drawn sketch style illustration with visible pencil or pen strokes, organic lines, and charming imperfections. The style should feel like it was drawn by a talented artist.',
    technicalSpecs: [
      'Visible pencil/pen strokes',
      'Organic, slightly imperfect lines',
      'Cross-hatching for shading',
      'Paper or notebook texture',
      'Hand-drawn labels and annotations',
      'Warm, approachable aesthetic'
    ],
    textOverlayStyle: 'Hand-written or hand-lettered typography that matches the sketch aesthetic. Can include underlines, arrows, and annotation-style elements.'
  },
  vintage_retro: {
    name: 'Vintage / Retro',
    vibe: 'Classic, nostalgic, timeless. Mid-century modern or retro aesthetics with character.',
    visualDirection: 'Create a vintage or retro-styled illustration drawing from mid-century design, 1970s aesthetics, or classic advertising art. Include authentic period-appropriate textures and colors.',
    technicalSpecs: [
      'Muted, period-appropriate colors',
      'Grain and texture overlays',
      'Retro typography and badges',
      'Halftone dot patterns',
      'Aged paper or print effects',
      'Classic illustration techniques'
    ],
    textOverlayStyle: 'Vintage typography with serifs, decorative fonts, or retro sans-serifs. Can include badges, banners, and classic typographic treatments.'
  },
  abstract: {
    name: 'Abstract',
    vibe: 'Conceptual, artistic, evocative. Non-representational imagery that conveys emotion and ideas through form and color.',
    visualDirection: 'Create an abstract artistic composition that evokes the themes and emotions of the content without literal representation. Use shape, color, and movement to convey meaning.',
    technicalSpecs: [
      'Bold, expressive shapes',
      'Dynamic color relationships',
      'Movement and flow',
      'Layered compositions',
      'Emotional color choices',
      'Non-representational forms'
    ],
    textOverlayStyle: 'Bold, artistic typography that becomes part of the composition. Can be integrated into the abstract forms or positioned as strong graphic elements.'
  }
};

const CONTENT_TYPE_PROMPTS: Record<string, (teamName: string) => string> = {
  team_snapshot: (teamName) => `Create a comprehensive overview of ${teamName}'s current state, activities, and momentum. Include key metrics, recent achievements, and current focus areas.`,
  mission: (teamName) => `Present ${teamName}'s purpose, vision, and the impact they're creating. Focus on their core mission statement, why they exist, and the change they're driving.`,
  core_values: (teamName) => `Highlight ${teamName}'s core values - the principles and beliefs that guide their decisions and culture. Show how these values manifest in daily operations.`,
  goals: (teamName) => `Detail ${teamName}'s current objectives, key results, and progress toward targets. Include specific goals, timelines, and achievement status.`,
  weekly_review: (teamName) => `Summarize ${teamName}'s past week including accomplishments, learnings, key decisions made, and priorities for the coming week.`,
  quarterly_review: (teamName) => `Provide a 90-day retrospective for ${teamName} covering achievements, challenges overcome, growth areas, and lessons learned this quarter.`,
  yearly_review: (teamName) => `Create an annual highlights review for ${teamName} showing milestones achieved, transformations completed, key metrics, and outlook for the coming year.`,
  challenges_opportunities: (teamName) => `Identify ${teamName}'s biggest challenges and strategic opportunities. Show obstacles to overcome and potential areas for growth or innovation.`,
  financial_health: (teamName) => `Present ${teamName}'s financial health including revenue trends, key financial metrics, runway, and alignment with business objectives.`,
  team_wins: (teamName) => `Celebrate ${teamName}'s recent achievements, milestones reached, and recognition moments. Highlight what the team should be proud of.`,
  strategic_priorities: (teamName) => `Outline ${teamName}'s top 3-5 strategic priorities driving their roadmap. Show where focus and resources are being directed.`,
  customer_impact: (teamName) => `Showcase ${teamName}'s customer/client impact through stories, testimonials, and metrics demonstrating value delivered.`,
  innovation_ideas: (teamName) => `Present ${teamName}'s innovation initiatives, experiments in progress, and creative ideas being explored.`,
  custom: () => `Create content based on the custom prompt provided.`
};

const SLIDE_STRUCTURES: Record<number, { title: string; focus: string }[]> = {
  1: [{ title: 'Overview', focus: 'Complete, comprehensive view' }],
  3: [
    { title: 'Overview', focus: 'Introduction and context' },
    { title: 'Key Points', focus: 'Main content and insights' },
    { title: 'Summary', focus: 'Conclusions and next steps' }
  ],
  5: [
    { title: 'Introduction', focus: 'Set the stage and context' },
    { title: 'Context', focus: 'Background and situation' },
    { title: 'Main Content', focus: 'Core insights and data' },
    { title: 'Insights', focus: 'Analysis and implications' },
    { title: 'Conclusion', focus: 'Summary and call to action' }
  ],
  7: [
    { title: 'Title', focus: 'Opening and hook' },
    { title: 'Background', focus: 'Context and history' },
    { title: 'Point 1', focus: 'First major theme' },
    { title: 'Point 2', focus: 'Second major theme' },
    { title: 'Point 3', focus: 'Third major theme' },
    { title: 'Analysis', focus: 'Synthesis and implications' },
    { title: 'Closing', focus: 'Summary and next steps' }
  ]
};

interface AnalyzedContent {
  title: string;
  subtitle?: string;
  teamSnapshot: string;
  keyMetrics: { label: string; value: string; trend?: string }[];
  highlights: string[];
  insights: string[];
  callToAction?: string;
}

interface WorkshopGoalData {
  goalNumber: number;
  goalTitle: string;
  goalDescription: string;
  positiveImpact1: string;
  positiveImpact2: string;
  positiveImpact3: string;
}

async function analyzeContentWithFlash(
  teamData: any,
  contentTypes: string[],
  customPrompt: string | null,
  slideNumber: number,
  totalSlides: number,
  apiKey: string,
  workshopMode: boolean = false,
  workshopGoal: WorkshopGoalData | null = null,
  workshopChatMessages: string | null = null,
  n8nContext: string | null = null,
  useTeamData: boolean = true
): Promise<AnalyzedContent> {
  const teamName = teamData?.team_info?.team_name || 'Team';

  const strategyContent = teamData.strategy_content?.slice(0, 5).map((d: any) =>
    `[${d.file_name}] ${d.content?.substring(0, 1000) || ''}`
  ).join('\n\n') || 'No strategy documents';

  const meetingContent = teamData.meeting_content?.slice(0, 5).map((d: any) =>
    `[${d.file_name}] ${d.content?.substring(0, 1000) || ''}`
  ).join('\n\n') || 'No meeting notes';

  const financialContent = teamData.financial_content?.slice(0, 3).map((d: any) =>
    `[${d.file_name}] ${d.content?.substring(0, 800) || ''}`
  ).join('\n\n') || 'No financial data';

  const projectContent = teamData.project_content?.slice(0, 3).map((d: any) =>
    `[${d.file_name}] ${d.content?.substring(0, 600) || ''}`
  ).join('\n\n') || 'No project data';

  const teamDiscussions = teamData.team_discussions?.slice(0, 15).map((t: any) =>
    `${t.user_name}: ${t.message?.substring(0, 200) || ''}`
  ).join('\n') || 'No team discussions';

  const missionContext = teamData.mission_values_context || {};
  const vtoContent = missionContext.vto_documents?.map((d: any) =>
    d.content?.substring(0, 800)
  ).join('\n') || '';

  const goalsContext = teamData.goals_context || {};
  const goalsContent = goalsContext.goal_documents?.map((d: any) =>
    `[${d.file_name}] ${d.content?.substring(0, 600) || ''}`
  ).join('\n\n') || '';

  const contentPrompts = contentTypes.map(ct => {
    const promptFn = CONTENT_TYPE_PROMPTS[ct];
    return promptFn ? promptFn(teamName) : '';
  }).filter(Boolean);

  const structure = SLIDE_STRUCTURES[totalSlides] || SLIDE_STRUCTURES[1];
  const slideStructure = structure[slideNumber - 1] || structure[0];

  let prompt: string;

  if (workshopMode && workshopGoal) {
    prompt = `You are creating a visualization for ${teamName}'s workshop goal.

WORKSHOP GOAL:
- Goal ${workshopGoal.goalNumber}: ${workshopGoal.goalTitle}
- Description: ${workshopGoal.goalDescription}
- Positive Impact 1: ${workshopGoal.positiveImpact1}
- Positive Impact 2: ${workshopGoal.positiveImpact2}
- Positive Impact 3: ${workshopGoal.positiveImpact3}

${workshopChatMessages ? `ASTRA CHAT CONVERSATION (strategies discussed):
${workshopChatMessages}` : ''}

SLIDE ROLE: "${slideStructure.title}" - Focus on: ${slideStructure.focus}
This is slide ${slideNumber} of ${totalSlides}.

${customPrompt ? `CUSTOM REQUEST: ${customPrompt}` : ''}

=== SUPPORTING TEAM DATA ===
TEAM: ${teamName}

STRATEGY DOCUMENTS:
${strategyContent}

MEETING NOTES:
${meetingContent}

PROJECTS:
${projectContent}
=== END DATA ===

INSTRUCTIONS:
1. Focus primarily on the WORKSHOP GOAL and the strategies discussed in the chat
2. Use the team data to provide supporting context
3. Create content that helps the user achieve their goal
4. Highlight key action items and insights from the Astra conversation
5. Keep text concise for visual presentation

Return ONLY valid JSON:
{
  "title": "<compelling 3-8 word title related to the goal>",
  "subtitle": "<optional 5-10 word subtitle>",
  "teamSnapshot": "<2-3 sentence overview of the goal and path to achieve it>",
  "keyMetrics": [
    {"label": "<metric or milestone>", "value": "<target or action>", "trend": "up"}
  ],
  "highlights": [
    "<key strategy or action from the chat>",
    "<key strategy or action from the chat>",
    "<key strategy or action from the chat>"
  ],
  "insights": [
    "<insight about achieving the goal>",
    "<insight about positive impacts>"
  ],
  "callToAction": "<next step to work on>"
}`;
  } else if (customPrompt && !useTeamData) {
    prompt = `You are creating a visualization based on a custom request.

SLIDE ${slideNumber} of ${totalSlides}
SLIDE ROLE: "${slideStructure.title}" - Focus on: ${slideStructure.focus}

CUSTOM REQUEST: ${customPrompt}

INSTRUCTIONS:
1. Create content based ONLY on the custom request above
2. Do NOT include any team-specific data or context
3. Keep text concise for visual presentation
4. Make the content compelling and actionable

Return ONLY valid JSON:
{
  "title": "<compelling 3-8 word title for the slide>",
  "subtitle": "<optional 5-10 word subtitle>",
  "teamSnapshot": "<2-3 sentence overview addressing the custom request>",
  "keyMetrics": [
    {"label": "<metric name>", "value": "<value from request>", "trend": "<up|down|neutral>"}
  ],
  "highlights": [
    "<key point 1 from the custom request>",
    "<key point 2 from the custom request>",
    "<key point 3 from the custom request>"
  ],
  "insights": [
    "<insight 1 based on the request>",
    "<insight 2 based on the request>"
  ],
  "callToAction": "<optional next step>"
}`;
  } else if (n8nContext && customPrompt) {
    prompt = `You are analyzing data for ${teamName} to create slide ${slideNumber} of ${totalSlides}.

SLIDE ROLE: "${slideStructure.title}" - Focus on: ${slideStructure.focus}

CUSTOM REQUEST: ${customPrompt}

=== INTELLIGENT CONTEXT FROM ASTRA (use this as primary source) ===
${n8nContext}
=== END INTELLIGENT CONTEXT ===

=== SUPPORTING TEAM DATA ===
TEAM: ${teamName}
MEMBERS: ${teamData.member_info?.total_members || 0}

MISSION/VALUES/VTO:
${vtoContent || 'Not specified'}

GOALS & OKRS:
${goalsContent || 'Not specified'}
=== END SUPPORTING DATA ===

INSTRUCTIONS:
1. Prioritize the INTELLIGENT CONTEXT from Astra - this contains semantically relevant information
2. Use supporting team data for additional context
3. Create content that directly addresses the CUSTOM REQUEST
4. Keep text concise for visual presentation

Return ONLY valid JSON:
{
  "title": "<compelling 3-8 word title for the slide>",
  "subtitle": "<optional 5-10 word subtitle>",
  "teamSnapshot": "<2-3 sentence overview addressing the custom request>",
  "keyMetrics": [
    {"label": "<metric name>", "value": "<value from data>", "trend": "<up|down|neutral>"}
  ],
  "highlights": [
    "<key highlight 1 from data>",
    "<key highlight 2 from data>",
    "<key highlight 3 from data>"
  ],
  "insights": [
    "<insight 1 based on data>",
    "<insight 2 based on data>"
  ],
  "callToAction": "<optional next step>"
}`;
  } else {
    prompt = `You are analyzing data for ${teamName} to create slide ${slideNumber} of ${totalSlides}.

SLIDE ROLE: "${slideStructure.title}" - Focus on: ${slideStructure.focus}

CONTENT TO EXTRACT:
${contentPrompts.join('\n')}
${customPrompt ? `\nCUSTOM REQUEST: ${customPrompt}` : ''}

=== TEAM DATA ===
TEAM: ${teamName}
MEMBERS: ${teamData.member_info?.total_members || 0}

MISSION/VALUES/VTO:
${vtoContent || 'Not specified'}

GOALS & OKRS:
${goalsContent || 'Not specified'}

STRATEGY DOCUMENTS:
${strategyContent}

MEETING NOTES:
${meetingContent}

FINANCIAL DATA:
${financialContent}

PROJECTS:
${projectContent}

TEAM DISCUSSIONS:
${teamDiscussions}
=== END DATA ===

INSTRUCTIONS:
1. Extract REAL data from the documents above
2. Create a compelling ${slideStructure.title} for this slide
3. Do NOT invent data - only use what's in the documents
4. Keep text concise for visual presentation

Return ONLY valid JSON:
{
  "title": "<compelling 3-8 word title for the slide>",
  "subtitle": "<optional 5-10 word subtitle>",
  "teamSnapshot": "<2-3 sentence overview of current state based on data>",
  "keyMetrics": [
    {"label": "<metric name>", "value": "<value from data>", "trend": "<up|down|neutral>"}
  ],
  "highlights": [
    "<key highlight 1 from data>",
    "<key highlight 2 from data>",
    "<key highlight 3 from data>"
  ],
  "insights": [
    "<insight 1 based on data>",
    "<insight 2 based on data>"
  ],
  "callToAction": "<optional next step>"
}`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Flash API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AnalyzedContent;
    }
  } catch (error) {
    console.error('Error analyzing content:', error);
  }

  return {
    title: `${teamName} ${slideStructure.title}`,
    teamSnapshot: 'Team data is being established. Check back for insights as more information becomes available.',
    keyMetrics: [],
    highlights: ['Building foundation', 'Establishing practices'],
    insights: ['Team is in early stages of data collection']
  };
}

function isImageStyle(style: string): boolean {
  return style in IMAGE_STYLE_CONFIGS;
}

function buildPresentationStylePrompt(
  teamName: string,
  analyzedContent: AnalyzedContent,
  styleConfig: DesignStyleConfig,
  dimensions: string,
  slideNumber: number,
  totalSlides: number,
  useTeamData: boolean = true
): string {
  const metricsSection = analyzedContent.keyMetrics.length > 0
    ? `**Key Metrics (show as metric cards with icons):**
${analyzedContent.keyMetrics.map(m => `- ${m.label}: ${m.value}${m.trend ? ` (${m.trend === 'up' ? 'trending up' : m.trend === 'down' ? 'trending down' : 'stable'})` : ''}`).join('\n')}`
    : '';

  const highlightsSection = analyzedContent.highlights.length > 0
    ? `**Highlights (show with icons):**
${analyzedContent.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';

  const insightsSection = analyzedContent.insights.length > 0
    ? `**Insights (lightbulb icons):**
${analyzedContent.insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}`
    : '';

  const titlePrefix = useTeamData ? `"${teamName}" - ` : '';
  const headerTitle = useTeamData ? `"${teamName}: ${analyzedContent.title}"` : `"${analyzedContent.title}"`;

  return `Create an infographic ${titlePrefix}${analyzedContent.title}. Focus on VISUAL STORYTELLING with MINIMAL TEXT.

=== DESIGN STYLE: ${styleConfig.name} ===
VIBE: ${styleConfig.vibe}
COLOR PALETTE: ${styleConfig.colorPalette}
DATA VISUALIZATION TECHNIQUES:
${styleConfig.dataVisualization.map(d => `- ${d}`).join('\n')}

IMPORTANT: Fully embrace this design style throughout the entire infographic. Every element should reflect this aesthetic.

=== SPECS ===
- ${dimensions}
- Mostly graphics/icons with minimal text
- NO photographs or human faces
- Clean, modern, premium aesthetic

=== HEADER (compact) ===
${headerTitle} | ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}${totalSlides > 1 ? ` | Slide ${slideNumber}/${totalSlides}` : ''}

=== CONTENT TO VISUALIZE ===

**Overview:**
${analyzedContent.teamSnapshot}
${analyzedContent.subtitle ? `\n**Subtitle:** ${analyzedContent.subtitle}` : ''}

${metricsSection}

${highlightsSection}

${insightsSection}

${analyzedContent.callToAction ? `**Call to Action:** ${analyzedContent.callToAction}` : ''}

=== FOOTER (small) ===
"Powered by AI Rocket"

=== DESIGN RULES ===
1. LESS TEXT - use icons and visuals to convey meaning
2. Clear visual hierarchy
3. Lots of white space
4. Every icon serves a purpose
5. Premium, clean aesthetic matching the ${styleConfig.name} style

=== DO NOT ===
- NO human faces or photographs
- NO walls of text - keep it visual
- NO purple/indigo colors
- NO cluttered layouts
- NO percentage labels in section headers`;
}

const TEXT_INTEGRATION_GUIDANCE: Record<string, string> = {
  integrated: `TEXT INTEGRATION: INTEGRATED INTO SCENE
- Integrate all text NATURALLY INTO the image composition itself
- Text should appear ON objects in the scene: signs, screens, buildings, banners, posters, windows
- The text must feel like it belongs in the environment - NOT a floating overlay
- Use perspective and lighting to make text feel part of the 3D space
- Examples: company name on a building sign, metrics on a digital screen, highlights on a conference poster`,

  overlay: `TEXT INTEGRATION: CLEAN OVERLAY
- Create the image with designated areas of negative space or darker regions for text
- Add semi-transparent overlay zones where text will be clearly readable
- Text should float elegantly ON TOP of the image, not integrated into the scene
- Use drop shadows, text boxes, or gradient overlays for legibility
- Keep text distinct from the image content`,

  minimal: `TEXT INTEGRATION: MINIMAL (IMAGE HERO)
- The image is the STAR - let it tell the story visually
- ONLY include: small title at very top and "Powered by AI Rocket" at very bottom
- NO metrics, highlights, or body text - the imagery conveys the message
- Reserve 90%+ of the canvas for the powerful visual
- Text should be subtle, small, and unobtrusive`,

  caption: `TEXT INTEGRATION: CAPTION STYLE
- Create the main image in the UPPER 65-70% of the canvas
- Leave a dedicated CAPTION ZONE at the bottom (30-35% of canvas)
- The caption zone should have a solid or gradient background that complements the image
- All text content (title, metrics, highlights) goes in the caption zone
- The image and caption should feel like one cohesive design`
};

function buildImageStylePrompt(
  teamName: string,
  analyzedContent: AnalyzedContent,
  imageStyleConfig: ImageStyleConfig,
  dimensions: string,
  slideNumber: number,
  totalSlides: number,
  textIntegration: string = 'overlay',
  useTeamData: boolean = true
): string {
  const metricsText = analyzedContent.keyMetrics.length > 0
    ? analyzedContent.keyMetrics.map(m => `${m.label}: ${m.value}`).join(' | ')
    : '';

  const highlightsText = analyzedContent.highlights.length > 0
    ? analyzedContent.highlights.slice(0, 3).join(' • ')
    : '';

  const isPhotorealistic = imageStyleConfig.name === 'Photorealistic';
  const isMinimal = textIntegration === 'minimal';

  const textGuidance = TEXT_INTEGRATION_GUIDANCE[textIntegration] || TEXT_INTEGRATION_GUIDANCE.overlay;

  const headerTitle = useTeamData ? `"${teamName}: ${analyzedContent.title}"` : `"${analyzedContent.title}"`;
  const titlePrefix = useTeamData ? `"${teamName}" - ` : '';

  const contentSection = isMinimal ? `
=== CONTENT (MINIMAL - IMAGE FOCUSED) ===
Header (small, top): ${headerTitle}
Footer (small, bottom): "Powered by AI Rocket"
NOTE: The image should visually represent: ${analyzedContent.teamSnapshot}` : `
=== CONTENT TO INCLUDE ===

Header: ${headerTitle}
Date: ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}${totalSlides > 1 ? ` | Slide ${slideNumber}/${totalSlides}` : ''}

Main Message:
${analyzedContent.teamSnapshot}
${analyzedContent.subtitle ? `\nSubtitle: ${analyzedContent.subtitle}` : ''}

${metricsText ? `Key Numbers: ${metricsText}` : ''}

${highlightsText ? `Highlights: ${highlightsText}` : ''}

${analyzedContent.callToAction ? `Call to Action: ${analyzedContent.callToAction}` : ''}

Footer: "Powered by AI Rocket"`;

  return `Create a ${imageStyleConfig.name.toLowerCase()} visual ${titlePrefix}${analyzedContent.title}.

=== ARTISTIC STYLE: ${imageStyleConfig.name} ===
VIBE: ${imageStyleConfig.vibe}
VISUAL DIRECTION: ${imageStyleConfig.visualDirection}

TECHNICAL SPECIFICATIONS:
${imageStyleConfig.technicalSpecs.map(s => `- ${s}`).join('\n')}

=== ${textGuidance} ===

=== IMAGE SPECIFICATIONS ===
- Dimensions: ${dimensions}
- This is a ${imageStyleConfig.name.toLowerCase()} IMAGE, NOT an infographic
${isPhotorealistic ? '- Photorealistic imagery IS allowed and encouraged - create life-like visuals' : '- Create artistic visuals in the specified style'}
${contentSection}

=== DESIGN APPROACH ===
1. Create a visually stunning ${imageStyleConfig.name.toLowerCase()} visual that evokes: ${analyzedContent.title}
2. Follow the TEXT INTEGRATION style exactly as specified above
3. The visual should be premium, professional, and emotionally engaging
4. ${isMinimal ? 'Let the imagery be the hero - minimal text, maximum visual impact' : 'Balance the artistic visual with clear information hierarchy'}

=== DO NOT ===
- NO infographic-style layouts with data visualizations
- NO icon grids or chart graphics
- NO purple/indigo colors
${!isMinimal ? '- NO cluttered text - keep content organized' : '- NO body text, metrics, or highlights - image tells the story'}
- NO low-quality or generic aesthetics`;
}

async function generateInfographicImage(
  teamName: string,
  analyzedContent: AnalyzedContent,
  style: string,
  layout: string,
  slideNumber: number,
  totalSlides: number,
  apiKey: string,
  textIntegration: string = 'overlay',
  useTeamData: boolean = true
): Promise<{ base64?: string; error?: string }> {
  const isLandscape = layout === 'landscape';
  const dimensions = isLandscape ? '1920x1080 (16:9 landscape)' : '1080x1920 (9:16 portrait)';

  let prompt: string;

  if (isImageStyle(style)) {
    const imageStyleConfig = IMAGE_STYLE_CONFIGS[style];
    prompt = buildImageStylePrompt(teamName, analyzedContent, imageStyleConfig, dimensions, slideNumber, totalSlides, textIntegration, useTeamData);
    console.log('[Image Gen] Using IMAGE STYLE:', imageStyleConfig.name, 'with text integration:', textIntegration, 'useTeamData:', useTeamData);
  } else {
    const styleConfig = DESIGN_STYLES[style] || DESIGN_STYLES.infographic;
    prompt = buildPresentationStylePrompt(teamName, analyzedContent, styleConfig, dimensions, slideNumber, totalSlides, useTeamData);
    console.log('[Image Gen] Using PRESENTATION STYLE:', styleConfig.name, 'useTeamData:', useTeamData);
  }

  console.log('[Image Gen] Starting image generation with style:', style);

  try {
    const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
    console.log('[Image Gen] Using model: gemini-3-pro-image-preview');

    const response = await fetch(modelUrl, {
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
    });

    console.log('[Image Gen] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Image Gen] API error:', errorText);
      return { error: `Image API error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    const result = await response.json();
    console.log('[Image Gen] Candidates count:', result.candidates?.length || 0);

    if (result.candidates?.[0]?.content?.parts) {
      result.candidates[0].content.parts.forEach((part: any, idx: number) => {
        console.log(`[Image Gen] Part ${idx}:`, {
          hasText: !!part.text,
          hasInlineData: !!part.inlineData,
          mimeType: part.inlineData?.mimeType
        });
      });
    }

    const imagePart = result.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (imagePart?.inlineData?.data) {
      console.log('[Image Gen] Image generated successfully, size:', imagePart.inlineData.data.length, 'chars');
      return { base64: imagePart.inlineData.data };
    }

    console.log('[Image Gen] No image found in response');
    return { error: 'No image generated in response' };
  } catch (error) {
    console.error('[Image Gen] Error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function formatDateForTitle(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear().toString().slice(-2);
  return `${month}.${day}.${year}`;
}

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function generateVisualizationTitle(
  contentTypes: string[],
  teamName: string,
  apiKey: string,
  workshopMode: boolean = false,
  workshopGoal: WorkshopGoalData | null = null
): Promise<string> {
  if (workshopMode && workshopGoal) {
    return `${teamName} Goal ${workshopGoal.goalNumber} Action Plan`;
  }

  const contentNames: Record<string, string> = {
    team_snapshot: 'Team Snapshot',
    mission: 'Mission & Vision',
    core_values: 'Core Values',
    goals: 'Goals & Progress',
    weekly_review: 'Weekly Review',
    quarterly_review: 'Quarterly Review',
    yearly_review: 'Yearly Review',
    challenges_opportunities: 'Challenges & Opportunities',
    financial_health: 'Financial Health',
    team_wins: 'Team Wins',
    strategic_priorities: 'Strategic Priorities',
    customer_impact: 'Customer Impact',
    innovation_ideas: 'Innovation & Ideas',
    thought_leadership: 'Thought Leadership',
    custom: 'Custom Content'
  };

  const names = contentTypes.map(ct => contentNames[ct] || toTitleCase(ct)).join(', ');
  const dateStr = formatDateForTitle();
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  try {
    const prompt = `Generate a descriptive, professional title for a business visualization.

TEAM: ${teamName}
CONTENT TOPICS: ${names}
DATE: ${currentDate}

REQUIREMENTS:
- Title should be 4-8 words that clearly describe the content
- Include the team/company name at the start
- Be specific about what the visualization shows
- Sound professional and polished
- Use proper title case (capitalize important words)
- NO underscores - use spaces between words
- NO colons or special characters

GOOD EXAMPLES:
- "Acme Corp Q1 Performance Goals"
- "TechStart Innovation Roadmap"
- "GrowthCo Financial Health Review"
- "BlueWave Team Wins and Strategy"
- "RocketHub Thought Leadership"

BAD EXAMPLES (avoid these):
- "Team Update" (too generic)
- "Company_Name_Report" (has underscores)
- "Report: Something" (has colon)

Return ONLY the title text, no quotes, no explanation, no date suffix.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        })
      }
    );

    if (response.ok) {
      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.trim()
        .replace(/["']/g, '')
        .replace(/\n/g, ' ')
        .replace(/_/g, ' ')
        .replace(/:/g, ' -')
        .replace(/\s+/g, ' ')
        .trim();

      if (text && text.length > 5 && text.toLowerCase() !== teamName.toLowerCase()) {
        return `${text} - ${dateStr}`;
      }
    }
  } catch (err) {
    console.error('Title generation error:', err);
  }

  const formattedNames = names.replace(/, /g, ' & ').replace(/_/g, ' ');
  return `${teamName} ${formattedNames} - ${dateStr}`;
}

async function getContextFromN8N(
  customPrompt: string,
  teamId: string,
  userId: string,
  userEmail: string,
  teamName: string,
  selectedDocuments: { id: string; name: string }[] | null,
  n8nWebhookUrl: string
): Promise<{ context: string; error?: string }> {
  try {
    let enhancedPrompt = customPrompt;
    if (selectedDocuments && selectedDocuments.length > 0) {
      const docNames = selectedDocuments.map(d => d.name).join(', ');
      enhancedPrompt = `${customPrompt}\n\nIMPORTANT: Focus your analysis specifically on these documents: ${docNames}. Pull detailed information from these files to address the request.`;
    }

    console.log('[N8N] Calling Astra Intelligence Agent for custom mode context...');
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatInput: `For an Astra Create visualization, provide comprehensive context about: ${enhancedPrompt}. Return detailed facts, metrics, highlights, and insights that can be used to create a visual presentation. Focus on concrete data points and specific information.`,
        user_id: userId,
        user_email: userEmail,
        team_id: teamId,
        team_name: teamName,
        mode: 'astra_create',
        metadata: {
          source: 'astra_create_custom',
          custom_prompt: customPrompt,
          selected_documents: selectedDocuments
        }
      })
    });

    if (!response.ok) {
      console.error('[N8N] Agent error:', response.status);
      return { context: '', error: `N8N returned status ${response.status}` };
    }

    const responseText = await response.text();
    let context = responseText;

    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.output) {
        context = jsonResponse.output;
      }
    } catch {
      // Use raw text if not JSON
    }

    console.log('[N8N] Got context, length:', context.length);
    return { context };
  } catch (error) {
    console.error('[N8N] Error calling agent:', error);
    return { context: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      teamId,
      contentTypes,
      visualizationType = 'single_image',
      style = 'infographic',
      textIntegration = 'overlay',
      layout = 'landscape',
      slideCount = 1,
      customPrompt = null,
      selectedDocuments = null,
      useTeamData = true,
      sectionIds,
      jobId,
      action,
      workshopMode = false,
      workshopGoal = null,
      workshopChatMessages = null
    } = body;

    if (action === 'check_status' && jobId) {
      const { data: vizData, error: vizError } = await supabase
        .from('astra_visualizations')
        .select(`
          id, title, type, status, error_message, content_types, style, layout, slide_count,
          astra_visualization_slides (
            id, slide_number, title, content, image_url, image_base64, bullet_points, metrics
          )
        `)
        .eq('id', jobId)
        .maybeSingle();

      if (vizError || !vizData) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vizData.status === 'complete') {
        const slides = (vizData.astra_visualization_slides || [])
          .sort((a: any, b: any) => a.slide_number - b.slide_number)
          .map((s: any) => ({
            id: s.id,
            slideNumber: s.slide_number,
            title: s.title || '',
            content: s.content || '',
            imageBase64: s.image_base64,
            bulletPoints: s.bullet_points || [],
            metrics: s.metrics || []
          }));

        return new Response(
          JSON.stringify({
            status: 'complete',
            slides,
            title: vizData.title,
            visualizationId: vizData.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          status: vizData.status,
          error: vizData.error_message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveContentTypes = workshopMode ? ['workshop_goal'] : (contentTypes || sectionIds || []);

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: 'teamId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workshopMode && (!Array.isArray(effectiveContentTypes) || effectiveContentTypes.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'contentTypes array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workshopMode && effectiveContentTypes.length > 3) {
      return new Response(
        JSON.stringify({ error: 'Maximum 3 content types allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actualSlideCount = visualizationType === 'single_image' ? 1 : slideCount;
    console.log(`Generating ${actualSlideCount} slides for team ${teamId} with style: ${style}, content types: ${effectiveContentTypes.join(', ')}`);

    const { data: vizRecord, error: createError } = await supabase
      .from('astra_visualizations')
      .insert({
        team_id: teamId,
        user_id: user.id,
        title: 'Generating...',
        type: visualizationType,
        content_types: effectiveContentTypes,
        style,
        layout,
        slide_count: actualSlideCount,
        custom_prompt: customPrompt,
        use_team_data: useTeamData,
        status: 'generating'
      })
      .select()
      .single();

    if (createError || !vizRecord) {
      console.error('Error creating visualization record:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to start generation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visualizationId = vizRecord.id;
    console.log(`Created visualization record: ${visualizationId}`);

    const generateInBackground = async () => {
      try {
        const { data: teamData, error: dataError } = await supabase.rpc('get_user_dashboard_data', {
          p_team_id: teamId,
          p_user_id: user.id
        });

        if (dataError) {
          console.error('Error getting team data:', dataError);
          await supabase.from('astra_visualizations')
            .update({ status: 'error', error_message: 'Failed to get team data' })
            .eq('id', visualizationId);
          return;
        }

        const teamName = teamData?.team_info?.team_name || 'Team';
        console.log(`Got team data for ${teamName}`);

        const isCustomMode = customPrompt && (effectiveContentTypes.includes('custom') || effectiveContentTypes.length === 0 || selectedDocuments?.length > 0);
        let n8nContext: string | null = null;

        if (isCustomMode && n8nWebhookUrl && useTeamData) {
          console.log('[Custom Mode] Using N8N agent for context gathering...');
          const n8nResult = await getContextFromN8N(
            customPrompt,
            teamId,
            user.id,
            user.email || '',
            teamName,
            selectedDocuments,
            n8nWebhookUrl
          );

          if (n8nResult.context) {
            n8nContext = n8nResult.context;
            console.log('[Custom Mode] N8N context received, length:', n8nContext.length);
          } else if (n8nResult.error) {
            console.warn('[Custom Mode] N8N error, falling back to database:', n8nResult.error);
          }
        } else if (isCustomMode && !useTeamData) {
          console.log('[Custom Mode] Team data disabled - using custom prompt only');
        }

        const title = await generateVisualizationTitle(effectiveContentTypes, teamName, geminiApiKey, workshopMode, workshopGoal);
        console.log(`Generated title: ${title}`);

        await supabase.from('astra_visualizations')
          .update({ title })
          .eq('id', visualizationId);

        const slides: GeneratedSlide[] = [];
        let failedSlides = 0;
        const generationStartTime = Date.now();

        for (let i = 1; i <= actualSlideCount; i++) {
          console.log(`\n=== Generating slide ${i} of ${actualSlideCount} ===`);

          try {
            console.log('Step 1: Analyzing content with Flash model...');
            const analyzedContent = await analyzeContentWithFlash(
              teamData,
              effectiveContentTypes,
              customPrompt,
              i,
              actualSlideCount,
              geminiApiKey,
              workshopMode,
              workshopGoal,
              workshopChatMessages,
              n8nContext,
              useTeamData
            );
            console.log('Content analysis complete:', analyzedContent.title);

            console.log('Step 2: Generating infographic image with gemini-3-pro-image-preview...');
            const imageResult = await generateInfographicImage(
              teamName,
              analyzedContent,
              style,
              layout,
              i,
              actualSlideCount,
              geminiApiKey,
              textIntegration,
              useTeamData
            );

            const slideId = `slide_${Date.now()}_${i}`;

            if (imageResult.error) {
              console.error('Image generation failed:', imageResult.error);
              failedSlides++;
            }

            const slideData = {
              id: slideId,
              slideNumber: i,
              title: analyzedContent.title,
              content: analyzedContent.teamSnapshot,
              bulletPoints: [...analyzedContent.highlights, ...analyzedContent.insights].slice(0, 5),
              metrics: analyzedContent.keyMetrics.slice(0, 4).map(m => ({
                label: m.label,
                value: m.value,
                trend: (m.trend as 'up' | 'down' | 'neutral') || 'neutral'
              })),
              imageBase64: imageResult.base64 ? `data:image/png;base64,${imageResult.base64}` : undefined
            };

            slides.push(slideData);

            const { error: slideError } = await supabase.from('astra_visualization_slides').insert({
              visualization_id: visualizationId,
              slide_number: i,
              title: slideData.title,
              content: slideData.content,
              image_base64: slideData.imageBase64,
              bullet_points: slideData.bulletPoints,
              metrics: slideData.metrics
            });

            if (slideError) {
              console.error(`Error saving slide ${i}:`, slideError);
            } else {
              console.log(`Slide ${i} saved successfully`);
            }
          } catch (slideError) {
            console.error(`Error generating slide ${i}:`, slideError);
            failedSlides++;

            await supabase.from('astra_visualization_slides').insert({
              visualization_id: visualizationId,
              slide_number: i,
              title: `Slide ${i}`,
              content: 'This slide failed to generate. Please try regenerating.',
              bullet_points: [],
              metrics: []
            });
          }
        }

        const finalStatus = slides.length === 0 ? 'error' : 'complete';
        const errorMessage = slides.length === 0 ? 'All slides failed to generate' :
                            failedSlides > 0 ? `${failedSlides} of ${actualSlideCount} slides had issues` : null;

        await supabase.from('astra_visualizations')
          .update({
            status: finalStatus,
            error_message: errorMessage
          })
          .eq('id', visualizationId);

        const totalTime = Math.round((Date.now() - generationStartTime) / 1000);
        console.log(`\nGenerated ${slides.length} slides in ${totalTime}s (${failedSlides} failed) and saved to database`);
      } catch (bgError) {
        console.error('Background generation error:', bgError);
        await supabase.from('astra_visualizations')
          .update({
            status: 'error',
            error_message: bgError instanceof Error ? bgError.message : 'Generation failed'
          })
          .eq('id', visualizationId);
      }
    };

    EdgeRuntime.waitUntil(generateInBackground());

    return new Response(
      JSON.stringify({
        status: 'generating',
        jobId: visualizationId,
        message: 'Generation started. Poll for status using action: check_status'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-astra-create-slides:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
