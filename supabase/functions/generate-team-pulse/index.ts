import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    colorPalette: 'Professional blues, teals, and grays with clean white backgrounds. High contrast for readability, subtle gradients for depth.',
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
    colorPalette: 'Indigo or dark blue backgrounds, stark white grid lines, technical cyan accents.',
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
    colorPalette: 'Soft greens, earthy tones, sage and moss colors, watercolor textures, cream backgrounds.',
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
  retro_cartoon: {
    name: 'Retro Cartoon (Rubber Hose Style)',
    vibe: '1930s animation energy - making data approachable and alive.',
    colorPalette: 'Sepia tones, grainy vintage textures, bold black outlines, limited warm palette.',
    dataVisualization: [
      'Anthropomorphic Charts that express emotion',
      'Speech bubbles and Bang/Pow clouds for alerts',
      'Whimsical vintage icons',
      'Bouncy rubber hose style elements'
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

interface TeamPulseData {
  team_info: {
    team_id: string;
    team_name: string;
    created_at: string;
  };
  meeting_content: Array<{ file_name: string; content: string; date: string }>;
  strategy_content: Array<{ file_name: string; content: string; date: string }>;
  financial_content: Array<{ file_name: string; content: string; date: string }>;
  projects_content: Array<{ file_name: string; content: string; date: string }>;
  operations_content: Array<{ file_name: string; content: string; date: string }>;
  general_content: Array<{ file_name: string; content: string; category: string; date: string }>;
  team_discussions: Array<{ user_name: string; message: string; date: string }>;
  recent_reports: Array<{ prompt: string; response: string; date: string }>;
  category_summary: Array<{ category: string; document_count: number }>;
  member_info: {
    total_members: number;
    members: Array<{ name: string; role: string }>;
  };
  previous_snapshot: {
    generated_at?: string;
    health_score?: number;
    health_factors?: Record<string, number>;
    insights_and_trends?: Record<string, any>;
  };
  generated_at: string;
}

interface AnalysisResult {
  team_snapshot: string;
  key_metrics: {
    active_projects: string;
    recent_decisions: string;
    upcoming_deadlines: string;
    financial_status: string;
    team_focus_areas: string;
  };
  highlights: string[];
  recommendations: string[];
  trends_vs_previous: string;
  short_highlights: string[];
  short_insights: string[];
  short_trends: string[];
}

type FocusMode = 'big3' | 'highlights' | 'full_canvas';

async function analyzeWithFlash(data: TeamPulseData, apiKey: string, focusMode: FocusMode = 'highlights'): Promise<AnalysisResult> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const cutoffStr = thirtyDaysAgo.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = `You are a business analyst creating a weekly "Team Pulse" snapshot. Today is ${dateStr}.

CRITICAL DATE FILTER: The cutoff date is ${cutoffStr}. COMPLETELY IGNORE any content, projects, decisions, or references that appear to be from BEFORE this date. Only analyze data from the LAST 30 DAYS.

TEAM: ${data.team_info.team_name}
TEAM SIZE: ${data.member_info.total_members} members

=== FOUNDATIONAL DATA (Mission/Vision/Goals - can reference regardless of age) ===
Look for: Company Mission, Core Values, Vision, Long-Term Targets (3-year, 5-year, 10-year, etc.), Current Year Goals
Note: Only use CURRENT goals and targets. If you see multiple versions, use the most recent.

=== MEETING NOTES (LAST 30 DAYS ONLY) ===
${data.meeting_content.map(m => `[${m.file_name}] Date: ${m.date || 'Unknown'}\n${m.content}`).join('\n\n') || 'No meeting data'}

=== STRATEGY (LAST 30 DAYS ONLY) ===
${data.strategy_content.map(s => `[${s.file_name}] Date: ${s.date || 'Unknown'}\n${s.content}`).join('\n\n') || 'No strategy data'}

=== FINANCIAL (LAST 30 DAYS ONLY) ===
${data.financial_content.map(f => `[${f.file_name}] Date: ${f.date || 'Unknown'}\n${f.content}`).join('\n\n') || 'No financial data'}

=== PROJECTS (LAST 30 DAYS ONLY) ===
${data.projects_content.map(p => `[${p.file_name}] Date: ${p.date || 'Unknown'}\n${p.content}`).join('\n\n') || 'No project data'}

=== OPERATIONS (LAST 30 DAYS ONLY) ===
${data.operations_content.map(o => `[${o.file_name}] Date: ${o.date || 'Unknown'}\n${o.content}`).join('\n\n') || 'No operations data'}

=== TEAM DISCUSSIONS (LAST 30 DAYS ONLY) ===
${data.team_discussions.map(t => `${t.user_name}: ${t.message}`).join('\n') || 'No discussions'}

=== RECENT AI REPORTS ===
${data.recent_reports.map(r => `Q: ${r.prompt}\nA: ${r.response}`).join('\n\n') || 'No reports'}

=== PREVIOUS PULSE ===
${data.previous_snapshot.generated_at ? `Previous pulse generated: ${data.previous_snapshot.generated_at}` : 'First snapshot'}

${getFocusModePromptSection(focusMode)}

Respond ONLY with valid JSON.`;

  function getFocusModePromptSection(mode: FocusMode): string {
    const baseJsonTemplate = `Provide JSON response:
{
  "team_snapshot": "<DETAILED 4-5 sentence comprehensive overview of the team's current state. Include: what the team is working on, key accomplishments from the past 30 days, current priorities, notable team dynamics or collaboration patterns, and any significant milestones or progress. Be specific and reference actual projects, decisions, and activities from the data. This should paint a complete picture of where the team stands today.>",
  "key_metrics": {
    "active_projects": "<CURRENT projects only - be specific with names and status>",
    "recent_decisions": "<decisions from LAST 30 DAYS only - be specific>",
    "upcoming_deadlines": "<deadlines in the next 30-60 days>",
    "financial_status": "<CURRENT financial status or 'Not specified' if no data>",
    "team_focus_areas": "<what the team is focused on RIGHT NOW - be specific>"
  },`;

    const baseRules = `
STRICT RULES:
1. IGNORE any product/project that was completed more than 30 days ago
2. IGNORE any pricing/subscription models from old products
3. For "team_snapshot": Write a DETAILED 4-5 sentence summary that covers what the team is working on, recent accomplishments, current priorities, and notable team dynamics. Be specific and reference actual data.
5. For "recommendations" (TRENDS): Identify high-level business trends, emerging patterns, and directional shifts. Focus on trajectories and patterns, NOT specific action items.
6. If a date in the content is before ${cutoffStr}, SKIP that information entirely
7. PRIORITIZE the most recent data (last 7-14 days) when analyzing
8. CRITICAL FOR SHORT PHRASES: Each phrase MUST be a COMPLETE thought in 3-5 words. Examples of GOOD phrases: "Strong strategic execution", "High team momentum". Examples of BAD phrases (DO NOT USE): "The team is maintaining", "While financial reserves".`;

    if (mode === 'big3') {
      return `=== FOCUS MODE: BIG 3 ===
Generate EXACTLY THREE big, impactful insights. Quality over quantity. Each insight should be substantial and meaningful.

${baseJsonTemplate}
  "highlights": ["<BIG INSIGHT 1: The single most important accomplishment, decision, or milestone - be specific and impactful>", "<BIG INSIGHT 2: The second most significant development - be specific and impactful>", "<BIG INSIGHT 3: The third most notable thing - be specific and impactful>"],
  "recommendations": ["<trend 1: high-level business trend from 30-day data>", "<trend 2: emerging pattern or shift>"],
  "trends_vs_previous": "<comparison to last pulse or 'First snapshot' if none>",
  "short_highlights": ["<3-5 word COMPLETE phrase for insight 1>", "<3-5 word phrase for insight 2>", "<3-5 word phrase for insight 3>"],
  "short_insights": ["<3-5 word COMPLETE observation>", "<3-5 word observation>", "<3-5 word observation>"],
  "short_trends": ["<3-5 word COMPLETE trend>", "<3-5 word trend>"]
}
${baseRules}
4. CRITICAL - For "highlights": Provide EXACTLY 3 highlights - no more, no less. These must be the THREE most significant, impactful things from the team's data. Each highlight should be substantial and meaningful. Focus on major accomplishments, pivotal decisions, and critical milestones only.`;
    } else if (mode === 'full_canvas') {
      return `=== FOCUS MODE: FULL CANVAS ===
Generate a comprehensive, detailed overview with 10-15 highlights covering all aspects of team activity.

${baseJsonTemplate}
  "highlights": ["<notable thing 1>", "<notable thing 2>", "<notable thing 3>", "<notable thing 4>", "<notable thing 5>", "<notable thing 6>", "<notable thing 7>", "<notable thing 8>", "<notable thing 9>", "<notable thing 10>", "<optional 11>", "<optional 12>", "<optional 13>", "<optional 14>", "<optional 15>"],
  "recommendations": ["<trend 1: high-level business trend from 30-day data>", "<trend 2: emerging pattern or shift>", "<trend 3: notable direction or trajectory>", "<trend 4: additional pattern>"],
  "trends_vs_previous": "<comparison to last pulse or 'First snapshot' if none>",
  "short_highlights": ["<3-5 word COMPLETE phrase>", "<3-5 word phrase>", "<3-5 word phrase>", "<3-5 word phrase>", "<3-5 word phrase>"],
  "short_insights": ["<3-5 word COMPLETE observation>", "<3-5 word observation>", "<3-5 word observation>", "<3-5 word observation>"],
  "short_trends": ["<3-5 word COMPLETE trend>", "<3-5 word trend>", "<3-5 word trend>", "<3-5 word trend>"]
}
${baseRules}
4. For "highlights": Provide 10-15 highlights for a comprehensive view. Cover all aspects: accomplishments, decisions, milestones, events, projects, financial updates, team dynamics, and operational changes. Be thorough and detailed.`;
    } else {
      return `=== FOCUS MODE: HIGHLIGHTS ===
Generate 5-7 of the most notable things from the team's data. Balance breadth with key insights.

${baseJsonTemplate}
  "highlights": ["<notable thing 1: specific accomplishment, decision, milestone, or event from the data>", "<notable thing 2>", "<notable thing 3>", "<notable thing 4>", "<notable thing 5>", "<notable thing 6 (optional)>", "<notable thing 7 (optional)>"],
  "recommendations": ["<trend 1: high-level business trend from 30-day data>", "<trend 2: emerging pattern or shift>", "<trend 3: notable direction or trajectory>"],
  "trends_vs_previous": "<comparison to last pulse or 'First snapshot' if none>",
  "short_highlights": ["<3-5 word COMPLETE phrase, e.g. 'Strong strategic alignment'>", "<3-5 word phrase, e.g. 'High team momentum'>", "<3-5 word phrase, e.g. 'Active project pipeline'>"],
  "short_insights": ["<3-5 word COMPLETE observation, e.g. 'Active project development'>", "<3-5 word observation, e.g. 'Growing team collaboration'>", "<3-5 word observation, e.g. 'Clear goal alignment'>"],
  "short_trends": ["<3-5 word COMPLETE trend, e.g. 'Increasing operational efficiency'>", "<3-5 word trend, e.g. 'Rising customer focus'>", "<3-5 word trend, e.g. 'Expanding market presence'>"]
}
${baseRules}
4. For "highlights" (NOTABLE THINGS): Provide 5-7 of the most notable things from the team's data - specific accomplishments, key decisions made, important milestones reached, significant events, or noteworthy developments. Be specific and reference actual items from the data.`;
    }
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
            maxOutputTokens: 4096
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Flash API error:', errorText);
      throw new Error(`Flash API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Flash response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;
    
    if (analysis.recommendations.length === 0) {
      analysis.recommendations = [
        'Team operations show steady consistency in activity patterns',
        'Documentation practices indicate growing organizational maturity',
        'Communication channels demonstrate regular engagement across the team'
      ];
    }

    if (analysis.highlights.length === 0) {
      analysis.highlights = [
        'Active documentation and tracking practices are becoming established',
        'Team collaboration patterns show consistent engagement'
      ];
    }

    if (!analysis.short_highlights || analysis.short_highlights.length === 0) {
      analysis.short_highlights = [
        'Building strong foundation',
        'Active team engagement',
        'Growing documentation'
      ];
    }

    if (!analysis.short_insights || analysis.short_insights.length === 0) {
      analysis.short_insights = [
        'Consistent team communication',
        'Regular operational activity',
        'Clear organizational focus'
      ];
    }

    if (!analysis.short_trends || analysis.short_trends.length === 0) {
      analysis.short_trends = [
        'Increasing team alignment',
        'Growing data maturity',
        'Expanding knowledge base'
      ];
    }

    return analysis;
  } catch (error) {
    console.error('Error in Flash analysis:', error);
    return {
      team_snapshot: 'The team is building its knowledge base and establishing documentation practices. Activity patterns are emerging as the team develops its operational foundation. Review available documents for specific insights into current projects and priorities.',
      key_metrics: {
        active_projects: 'Not specified in data',
        recent_decisions: 'Not specified in data',
        upcoming_deadlines: 'Not specified in data',
        financial_status: 'Not specified in data',
        team_focus_areas: 'Review documents for focus areas'
      },
      highlights: [
        'Team knowledge base is in early development stages',
        'Documentation practices are beginning to take shape'
      ],
      recommendations: [
        'Data collection patterns suggest an emerging organizational foundation',
        'Initial documentation trends point toward growing team structure',
        'Early-stage activity indicates potential for deeper analytical insights as more data becomes available'
      ],
      trends_vs_previous: 'First snapshot',
      short_highlights: [
        'Building strong foundation',
        'Active team engagement',
        'Growing documentation'
      ],
      short_insights: [
        'Early development stage',
        'Emerging team patterns',
        'Foundation taking shape'
      ],
      short_trends: [
        'Growing organizational structure',
        'Increasing data maturity',
        'Building knowledge base'
      ]
    };
  }
}

interface DesignOptions {
  design_style?: string | null;
  design_description?: string | null;
  custom_instructions?: string | null;
  focus_mode?: FocusMode | null;
}

async function generateInfographic(
  teamName: string,
  analysis: AnalysisResult,
  memberCount: number,
  apiKey: string,
  designOptions?: DesignOptions
): Promise<{ url?: string; base64?: string; error?: string }> {
  const focusAreas = analysis.key_metrics.team_focus_areas || '';
  const activeProjects = analysis.key_metrics.active_projects || '';
  const financialStatus = analysis.key_metrics.financial_status || '';
  const recentDecisions = analysis.key_metrics.recent_decisions || '';
  const upcomingDeadlines = analysis.key_metrics.upcoming_deadlines || '';
  const teamSnapshot = analysis.team_snapshot || '';

  let styleInstructions = '';
  let themeContext = '';
  let accentStyle = '';

  if (designOptions?.design_description) {
    styleInstructions = `
=== CUSTOM DESIGN STYLE ===
Follow this custom design direction: ${designOptions.design_description}
`;
    themeContext = 'custom style as described';
    accentStyle = 'colors and style as specified in the custom description';
  } else {
    const styleKey = designOptions?.design_style || 'infographic';
    const style = DESIGN_STYLES[styleKey] || DESIGN_STYLES.infographic;
    styleInstructions = `
=== DESIGN STYLE: ${style.name} ===
VIBE: ${style.vibe}
COLOR PALETTE: ${style.colorPalette}
DATA VISUALIZATION TECHNIQUES:
${style.dataVisualization.map(d => `- ${d}`).join('\n')}

IMPORTANT: Fully embrace this design style throughout the entire infographic. Every element should reflect this aesthetic.
`;
    themeContext = style.name;
    accentStyle = style.colorPalette;
  }

  const customInstructionsSection = designOptions?.custom_instructions
    ? `\n=== CUSTOM INSTRUCTIONS ===\n${designOptions.custom_instructions}\n`
    : '';

  const focusMode = designOptions?.focus_mode || 'highlights';
  const shortHighlights = analysis.short_highlights || ['Strong team momentum', 'Solid execution focus', 'Building foundation'];
  const shortInsights = analysis.short_insights || ['Active project development', 'Growing collaboration', 'Clear goal alignment'];
  const shortTrends = analysis.short_trends || ['Increasing efficiency', 'Rising engagement', 'Expanding capabilities'];
  const fullHighlights = analysis.highlights || [];
  const fullRecommendations = analysis.recommendations || [];

  const getFocusModeInfographicSection = (): string => {
    if (focusMode === 'big3') {
      const top3 = fullHighlights.slice(0, 3);
      return `=== SECTION 2: THE BIG 3 (RIGHT - PROMINENT) ===
CRITICAL: This section should prominently feature EXACTLY THREE major insights. Make them visually impactful and large.

**THE BIG 3 INSIGHTS (large, prominent icons - use trophy, star, or medal icons):**
${top3.map((h, i) => `${i + 1}. ${h}`).join('\n') || '1. Major accomplishment\n2. Key milestone\n3. Critical decision'}

**Design for Big 3:**
- Each insight should have its own visual "card" or "badge" treatment
- Use large, impactful icons (trophy, rocket, target, lightbulb)
- Make text readable but concise
- These 3 items should be the HERO content of this section
- NO additional insights or trends beyond these 3

**Quick Summary Tags (small, below the Big 3):**
${shortHighlights.slice(0, 3).map(h => `• ${h}`).join('\n')}`;
    } else if (focusMode === 'full_canvas') {
      return `=== SECTION 2: COMPREHENSIVE INSIGHTS (RIGHT - DENSE) ===
Show a comprehensive view with many data points. Pack more information into this section.

**Key Insights (lightbulb icons, compact list):**
${fullHighlights.slice(0, 8).map((h, i) => `${i + 1}. ${h}`).join('\n') || '1. Building momentum\n2. Growing collaboration'}

**Trends (arrow icons):**
${fullRecommendations.slice(0, 4).map((r, i) => `${i + 1}. ${r}`).join('\n') || '1. Positive trajectory\n2. Operations maturing'}

**Quick Tags (pill/badge style, multiple rows):**
${shortHighlights.map(h => `• ${h}`).join('\n')}
${shortTrends.map(t => `• ${t}`).join('\n')}

**Use visuals:** Dense data visualization, multiple small charts, grid layouts, connecting nodes`;
    } else {
      return `=== SECTION 2: INSIGHTS & TRENDS (RIGHT - secondary) ===

**Insights (lightbulb icons):**
${fullHighlights.slice(0, 4).map((h, i) => `${i + 1}. ${h}`).join('\n') || '1. Building momentum\n2. Growing collaboration'}

**Trends (arrow icons):**
${fullRecommendations.slice(0, 2).map((r, i) => `${i + 1}. ${r}`).join('\n') || '1. Positive trajectory\n2. Operations maturing'}

**Quick Tags (pill/badge style):**
${shortHighlights.slice(0, 3).map(h => `• ${h}`).join('\n')}
${shortTrends.slice(0, 2).map(t => `• ${t}`).join('\n')}

**Use visuals:** Trend arrows, mini charts, connecting nodes, flowchart elements`;
    }
  };

  const getBig3OnlyPrompt = (): string => {
    const top3 = fullHighlights.slice(0, 3);
    return `Create an infographic for "${teamName}" showcasing THE BIG 3 INSIGHTS. The ENTIRE image should focus ONLY on these 3 major achievements.
${styleInstructions}
${customInstructionsSection}
THEME: ${themeContext}
COLORS: ${accentStyle}.

=== CRITICAL INSTRUCTION ===
This is a "BIG 3" focused infographic. The ENTIRE canvas should be dedicated to showcasing EXACTLY 3 major insights.
DO NOT include team snapshot, project lists, financial details, or any other information.
ONLY show the 3 big insights as the hero content.

=== SPECS ===
- Landscape 1920x1080 (16:9)
- Mostly graphics/icons with minimal text
- NO photographs or human faces
- Clean, modern, premium aesthetic

=== LAYOUT: SINGLE FOCUS - THE BIG 3 ===
The entire infographic should be a showcase of exactly 3 major insights arranged prominently.

**Suggested layouts (choose one):**
- Three large "award badge" or "trophy card" style panels side by side
- Three prominent circular or hexagonal medallions
- A podium-style layout with 1st, 2nd, 3rd positioning
- Three interconnected achievement cards

=== HEADER (compact, top) ===
"${teamName}: The Big 3" | ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} | Trophy or Star icon

=== THE BIG 3 INSIGHTS (HERO CONTENT - FULL WIDTH) ===
These 3 insights should dominate the entire canvas:

**INSIGHT #1 (Most Important):**
${top3[0] || 'Major accomplishment'}

**INSIGHT #2 (Second Most Important):**
${top3[1] || 'Key milestone'}

**INSIGHT #3 (Third Most Important):**
${top3[2] || 'Critical decision'}

**Visual Treatment for Each Insight:**
- Large, prominent placement (each insight gets ~30% of the canvas)
- Unique icon representing the insight (trophy, rocket, target, star, medal, lightbulb)
- Clear numbering (1, 2, 3) or visual hierarchy
- Brief text label for each insight
- Badge, card, or medallion style framing

=== FOOTER (small) ===
"Powered by AI Rocket"

=== DESIGN RULES ===
1. ONLY show the 3 insights - nothing else
2. Each insight should be visually prominent and impactful
3. Use large icons and minimal text
4. Lots of white space between the 3 items
5. Premium, celebratory aesthetic (like awards or achievements)
6. Clear visual hierarchy showing these are THE most important things

=== DO NOT ===
- NO team snapshot section
- NO project lists or timelines
- NO financial details
- NO "Key Details" sections
- NO trends or recommendations
- NO additional insights beyond the Big 3
- NO human faces
- NO purple/indigo colors
- NO cluttered layouts
- NO percentage labels`;
  };

  const getHighlightsOnlyPrompt = (): string => {
    const highlights = fullHighlights.slice(0, 7);
    return `Create an infographic for "${teamName}" showcasing KEY HIGHLIGHTS. The ENTIRE image should focus ONLY on the most notable things from the team's data.
${styleInstructions}
${customInstructionsSection}
THEME: ${themeContext}
COLORS: ${accentStyle}.

=== CRITICAL INSTRUCTION ===
This is a "HIGHLIGHTS" focused infographic. The ENTIRE canvas should be dedicated to showcasing 5-7 notable highlights.
DO NOT include team snapshot, project lists, financial details, or any other contextual information.
ONLY show the highlights as the hero content.

=== SPECS ===
- Landscape 1920x1080 (16:9)
- Mostly graphics/icons with minimal text
- NO photographs or human faces
- Clean, modern, professional aesthetic

=== LAYOUT: SINGLE FOCUS - KEY HIGHLIGHTS ===
The entire infographic should showcase 5-7 notable things arranged in an engaging layout.

**Suggested layouts (choose one):**
- Grid of highlight cards (2 rows of 3-4 cards)
- Flowing timeline of achievements
- Connected nodes showing related highlights
- Magazine-style feature layout with mixed card sizes

=== HEADER (compact, top) ===
"${teamName}: Key Highlights" | ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} | Lightbulb or Star icon

=== THE HIGHLIGHTS (HERO CONTENT - FULL WIDTH) ===
These highlights should fill the entire canvas:

${highlights.map((h, i) => `**${i + 1}. ${h}**`).join('\n\n')}

**Visual Treatment for Each Highlight:**
- Each highlight gets its own card or visual container
- Relevant icon for each highlight (lightbulb, checkmark, star, rocket, target, chart, handshake)
- Brief, readable text for each item
- Visual variety - mix of card sizes or emphasis levels
- Color coding or visual grouping where appropriate

=== FOOTER (small) ===
"Powered by AI Rocket"

=== DESIGN RULES ===
1. ONLY show the highlights - nothing else
2. Each highlight should be clearly visible and readable
3. Use icons to make each highlight visually distinct
4. Balance the layout - avoid clustering
5. Professional, informative aesthetic
6. Clear visual hierarchy for importance

=== DO NOT ===
- NO team snapshot section
- NO detailed project lists or timelines
- NO financial breakdowns
- NO "Key Details" or "Overview" sections
- NO trends or recommendations section
- NO human faces
- NO purple/indigo colors
- NO cluttered layouts
- NO percentage labels`;
  };

  const getFullCanvasPrompt = (): string => {
    return `Create an infographic for "${teamName}" Team Pulse report. Focus on VISUAL STORYTELLING with MINIMAL TEXT.
${styleInstructions}
${customInstructionsSection}
THEME: ${themeContext}
COLORS: ${accentStyle}.

=== SPECS ===
- Landscape 1920x1080 (16:9)
- Mostly graphics/icons with minimal text
- NO photographs or human faces
- Clean, modern, professional

=== LAYOUT ===
Two main sections side by side: Team Snapshot on the left (larger), Insights & Trends on the right (smaller).
DO NOT display any percentage numbers or labels like "60%" or "40%" in the design.

=== HEADER (compact) ===
"${teamName}: Team Pulse" | ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} | Rocket icon

=== SECTION 1: TEAM SNAPSHOT (LEFT/CENTER - main focus) ===
The primary section. Show current state visually:

**Overview (use icons, minimal text):**
- ${memberCount} members
- Focus: ${focusAreas || 'Building and growing'}
- Projects: ${activeProjects || 'Multiple initiatives'}

**Key Details (icons with short labels):**
- Decisions: ${recentDecisions || 'Strategic planning'}
- Upcoming: ${upcomingDeadlines || 'Milestones tracked'}
${financialStatus && financialStatus !== 'Not specified' ? `- Financial: ${financialStatus}` : ''}

**Snapshot Summary:**
${teamSnapshot}

**Use visuals:** Timeline, milestone markers, status dots, workflow arrows, team diagram icon

=== SECTION 2: INSIGHTS & TRENDS (RIGHT - secondary) ===

**Key Insights (lightbulb icons):**
${fullHighlights.slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join('\n') || '1. Building momentum\n2. Growing collaboration'}

**Trends (arrow icons):**
${fullRecommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n') || '1. Positive trajectory\n2. Operations maturing'}

**Quick Tags (pill/badge style):**
${shortHighlights.slice(0, 3).map(h => `• ${h}`).join('\n')}
${shortTrends.slice(0, 2).map(t => `• ${t}`).join('\n')}

**Use visuals:** Trend arrows, mini charts, connecting nodes, flowchart elements

=== FOOTER (small) ===
"Powered by AI Rocket"

=== DESIGN RULES ===
1. LESS TEXT - use icons and visuals to convey meaning
2. Clear hierarchy: Header > Snapshot > Insights
3. Lots of white space
4. Every icon serves a purpose
5. Premium, clean aesthetic
6. DO NOT include any percentage labels or numbers like "60%" or "40%" anywhere in the design

=== DO NOT ===
- NO human faces
- NO walls of text - keep it visual
- NO purple/indigo colors
- NO cluttered layouts
- NO percentage labels (like "60%" or "40%") in section headers`;
  };

  const getCustomFocusPrompt = (): string => {
    return `Create an infographic for "${teamName}" Team Pulse report based on USER-PROVIDED CUSTOM INSTRUCTIONS.
${styleInstructions}
THEME: ${themeContext}
COLORS: ${accentStyle}.

=== CRITICAL: CUSTOM FOCUS MODE ===
The user has provided specific instructions for what they want to see. Follow their instructions exactly.
Do NOT use any predefined layout structure. Let the user's instructions drive the content and layout.

=== USER'S CUSTOM INSTRUCTIONS ===
${designOptions?.custom_instructions || 'Create a balanced overview of the team'}

=== SPECS ===
- Landscape 1920x1080 (16:9)
- Mostly graphics/icons with minimal text
- NO photographs or human faces
- Clean, modern, professional aesthetic

=== HEADER (compact, top) ===
"${teamName}: Team Pulse" | ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} | Appropriate icon based on content

=== AVAILABLE DATA TO DRAW FROM ===
Use this data as source material, showing only what the user's instructions request:

**Team Overview:**
- ${memberCount} members
- Focus areas: ${focusAreas || 'Building and growing'}
- Active projects: ${activeProjects || 'Multiple initiatives'}

**Key Details:**
- Recent decisions: ${recentDecisions || 'Strategic planning'}
- Upcoming: ${upcomingDeadlines || 'Milestones tracked'}
${financialStatus && financialStatus !== 'Not specified' ? `- Financial: ${financialStatus}` : ''}

**Snapshot Summary:**
${teamSnapshot}

**Available Highlights:**
${fullHighlights.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'Building momentum'}

**Available Trends:**
${fullRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'Positive trajectory'}

=== FOOTER (small) ===
"Powered by AI Rocket"

=== DESIGN RULES ===
1. FOLLOW THE USER'S CUSTOM INSTRUCTIONS as the primary directive
2. Only show what the user asked for
3. Use icons and visuals appropriate to the content requested
4. Premium, clean aesthetic
5. DO NOT include content the user didn't ask for

=== DO NOT ===
- NO human faces
- NO purple/indigo colors
- NO cluttered layouts
- NO percentage labels`;
  };

  const getPromptByFocusMode = (): string => {
    switch (focusMode) {
      case 'big3':
        return getBig3OnlyPrompt();
      case 'highlights':
        return getHighlightsOnlyPrompt();
      case 'custom':
        return getCustomFocusPrompt();
      case 'full_canvas':
      default:
        return getFullCanvasPrompt();
    }
  };

  const prompt = getPromptByFocusMode();

  console.log('[Image Gen] Creative direction:', { themeContext, accentStyle });

  try {
    console.log('[Image Gen] Starting infographic generation for team:', teamName);

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
      console.error('[Image Gen] API error response:', errorText);
      return { error: `Image API error: ${response.status} - ${errorText.substring(0, 200)}` };
    }

    const result = await response.json();
    console.log('[Image Gen] Response received, checking for image parts...');
    console.log('[Image Gen] Candidates count:', result.candidates?.length || 0);

    if (result.candidates?.[0]?.content?.parts) {
      console.log('[Image Gen] Parts in response:', result.candidates[0].content.parts.length);
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
      console.log('[Image Gen] Image found! Size:', imagePart.inlineData.data.length, 'bytes');
      return { base64: imagePart.inlineData.data };
    }

    console.log('[Image Gen] No image found in response');
    console.log('[Image Gen] Full response structure:', JSON.stringify(result, null, 2).substring(0, 1000));
    return { error: 'No image generated in response' };
  } catch (error) {
    console.error('[Image Gen] Error generating infographic:', error);
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
  let team_id: string | null = null;
  let generationError: string | null = null;

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
    team_id = body.team_id;
    const generation_type = body.generation_type || 'manual';
    const custom_instructions = body.custom_instructions;
    const design_style = body.design_style;
    const design_description = body.design_description;
    const focus_mode = (body.focus_mode as FocusMode) || 'highlights';

    if (!team_id) {
      return new Response(
        JSON.stringify({ error: 'team_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating Team Pulse for team ${team_id}`, {
      design_style,
      focus_mode,
      has_custom_instructions: !!custom_instructions,
      has_design_description: !!design_description
    });

    await supabase
      .from('team_pulse_settings')
      .update({
        generation_in_progress: true,
        generation_started_at: new Date().toISOString(),
        generation_error: null
      })
      .eq('team_id', team_id);

    try {
      const { data: pulseData, error: dataError } = await supabase.rpc('get_team_pulse_data', {
        p_team_id: team_id
      });

    if (dataError) {
      console.error('Error getting pulse data:', dataError);
      return new Response(
        JSON.stringify({ error: 'Failed to get team data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamData = pulseData as TeamPulseData;
    console.log(`Got team data for ${teamData.team_info.team_name}`);

    console.log(`Step 1: Analyzing with Flash model (gemini-3-flash-preview) - Focus Mode: ${focus_mode}...`);
    const analysis = await analyzeWithFlash(teamData, geminiApiKey, focus_mode);
    console.log('Analysis complete. Team snapshot generated.');

    console.log(`Step 2: Generating infographic with gemini-3-pro-image-preview - Focus Mode: ${focus_mode}...`);
    const designOptions: DesignOptions = {
      design_style: design_style || null,
      focus_mode: focus_mode,
      design_description: design_description || null,
      custom_instructions: custom_instructions || null
    };

    const infographicResult = await generateInfographic(
      teamData.team_info.team_name,
      analysis,
      teamData.member_info.total_members,
      geminiApiKey,
      designOptions
    );
    console.log('Infographic result:', {
      hasBase64: !!infographicResult.base64,
      hasUrl: !!infographicResult.url,
      error: infographicResult.error
    });

    let infographicUrl: string | null = null;
    let infographicBase64: string | null = null;
    let infographicError: string | null = infographicResult.error || null;

    if (infographicResult.base64) {
      try {
        const fileName = `${team_id}/${Date.now()}.png`;
        const imageBuffer = Uint8Array.from(atob(infographicResult.base64), c => c.charCodeAt(0));
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('team-pulse-infographics')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('team-pulse-infographics')
            .getPublicUrl(fileName);
          infographicUrl = urlData.publicUrl;
          console.log('Infographic uploaded to storage');
        } else {
          console.error('Upload error:', uploadError);
          infographicBase64 = infographicResult.base64;
        }
      } catch (uploadErr) {
        console.error('Storage upload failed:', uploadErr);
        infographicBase64 = infographicResult.base64;
      }
    } else if (infographicResult.error) {
      console.error('Infographic generation error:', infographicResult.error);
    }

    await supabase
      .from('team_pulse_snapshots')
      .update({ is_current: false })
      .eq('team_id', team_id)
      .eq('is_current', true);

    const snapshotDesignStyle = design_style || (design_description ? 'custom' : null);

    const { data: snapshot, error: snapshotError } = await supabase
      .from('team_pulse_snapshots')
      .insert({
        team_id,
        health_score: 0,
        health_explanation: analysis.team_snapshot,
        health_factors: {},
        infographic_url: infographicUrl,
        infographic_base64: infographicBase64,
        source_data_summary: {
          category_summary: teamData.category_summary,
          member_info: teamData.member_info,
          key_metrics: analysis.key_metrics
        },
        sections: {
          mission: {
            team_name: teamData.team_info.team_name,
            members: teamData.member_info.total_members
          },
          key_metrics: analysis.key_metrics
        },
        insights_and_trends: {
          score_trend: 'stable',
          score_change: 0,
          factor_trends: {},
          highlights: analysis.highlights,
          recommendations: analysis.recommendations,
          trends_vs_previous: analysis.trends_vs_previous
        },
        generated_by_user_id: user.id,
        generation_type,
        is_current: true,
        design_style: snapshotDesignStyle
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError);
      return new Response(
        JSON.stringify({ error: 'Failed to save snapshot' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const nextMonday = new Date(now);
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(8, 0, 0, 0);

    const settingsUpdate: Record<string, unknown> = {
      last_generated_at: new Date().toISOString(),
      next_generation_at: nextMonday.toISOString(),
      updated_at: new Date().toISOString(),
      generation_in_progress: false,
      generation_error: null
    };

    if (design_style) {
      settingsUpdate.last_used_style = design_style;
    }

    await supabase
      .from('team_pulse_settings')
      .update(settingsUpdate)
      .eq('team_id', team_id);

    console.log('Team Pulse generation complete');

    return new Response(
      JSON.stringify({
        success: true,
        snapshot: {
          id: snapshot.id,
          team_snapshot: analysis.team_snapshot,
          infographic_url: snapshot.infographic_url,
          has_infographic: !!(snapshot.infographic_url || snapshot.infographic_base64),
          infographic_error: infographicError,
          generated_at: snapshot.generated_at,
          highlights: analysis.highlights,
          recommendations: analysis.recommendations
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    } catch (innerError) {
      generationError = innerError instanceof Error ? innerError.message : 'Generation failed';
      throw innerError;
    }
  } catch (error) {
    console.error('Error in generate-team-pulse:', error);

    if (team_id) {
      await supabase
        .from('team_pulse_settings')
        .update({
          generation_in_progress: false,
          generation_error: generationError || (error instanceof Error ? error.message : 'Unknown error'),
          updated_at: new Date().toISOString()
        })
        .eq('team_id', team_id);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});