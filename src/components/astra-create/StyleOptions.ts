export interface StyleOption {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: 'presentation' | 'image';
  bestFor: string;
}

export const PRESENTATION_STYLES: StyleOption[] = [
  {
    id: 'infographic',
    name: 'Infographic',
    shortDescription: 'Clean, professional business intelligence view',
    fullDescription: 'A clean, professional design focused on clarity and data comprehension. Uses structured layouts, clear hierarchies, and professional typography.',
    category: 'presentation',
    bestFor: 'Executive summaries, team updates, stakeholder presentations'
  },
  {
    id: 'pixel_power',
    name: 'Pixel Power',
    shortDescription: '8-Bit Arcade style with retro gaming aesthetics',
    fullDescription: 'Uses retro gaming aesthetics to show progress, scores, and targets through gamification with health bars, XP bars, and leaderboards.',
    category: 'presentation',
    bestFor: 'Sales competitions, quarterly target tracking, tech presentations'
  },
  {
    id: 'blueprint',
    name: 'The Blueprint',
    shortDescription: 'Technical sketch framing data as business architecture',
    fullDescription: 'A construction theme that frames your data as the architecture of the business, implying stability, planning, and structural integrity.',
    category: 'presentation',
    bestFor: 'Product roadmaps, strategy rollouts, infrastructure explanations'
  },
  {
    id: 'botanical_garden',
    name: 'Botanical Garden',
    shortDescription: 'Organic growth using nature as a gentle metaphor',
    fullDescription: 'Uses nature as a gentle, pleasing metaphor for data - tree rings for growth, root systems for analysis, blooming flowers for market share.',
    category: 'presentation',
    bestFor: 'Sustainability reports, HR analytics, long-term growth visualization'
  },
  {
    id: 'interstellar_voyage',
    name: 'Interstellar Voyage',
    shortDescription: 'Space & Sci-Fi theme for moonshots and the unknown',
    fullDescription: 'For businesses focusing on moonshots or navigating the unknown, with high contrast dark mode, planetary sizes, and constellation connections.',
    category: 'presentation',
    bestFor: 'Tech startups, big picture vision decks, global data'
  },
  {
    id: 'papercraft_popup',
    name: 'Papercraft Pop-Up',
    shortDescription: '3D collage with tactile, crafted feel',
    fullDescription: 'A tactile, artistic style that looks like cut construction paper layered to create depth, making data feel tangible.',
    category: 'presentation',
    bestFor: 'Creative agencies, marketing summaries, demographic breakdowns'
  },
  {
    id: 'neon_noir',
    name: 'Neon Noir',
    shortDescription: 'Cyberpunk city with futuristic, high-energy style',
    fullDescription: 'A futuristic, high-energy style that frames data as the pulse of a city with neon pinks and teals, glowing lines.',
    category: 'presentation',
    bestFor: 'IT security reports, real-time analytics, urban planning data'
  },
  {
    id: 'modern_superhero',
    name: 'Modern Superhero',
    shortDescription: 'Comic book bold with heroic narrative framing',
    fullDescription: 'Frames your business data as a heroic narrative with deep shadows, halftone dots, bold action lines.',
    category: 'presentation',
    bestFor: 'Competitive analysis, crushing quarterly goals, pitch decks'
  },
  {
    id: 'animal_kingdom',
    name: 'Animal Kingdom',
    shortDescription: 'Natural world ecosystem for complex relationships',
    fullDescription: 'Leverages the natural world to explain complex business relationships - food chains, migration maps, herd sizes.',
    category: 'presentation',
    bestFor: 'Market ecosystem analysis, HR structure, ESG reports'
  },
  {
    id: 'vintage_board_game',
    name: 'Vintage Board Game',
    shortDescription: 'Path to success with game journey visualization',
    fullDescription: 'Turns a business process into a visual journey with isometric views, wooden game pieces, winding paths.',
    category: 'presentation',
    bestFor: 'Project management, customer journey mapping, strategic roadmaps'
  },
  {
    id: 'pop_art',
    name: 'Pop Art',
    shortDescription: 'Warhol-inspired with repetition and high saturation',
    fullDescription: 'Uses repetition and high-saturation colors like Andy Warhol and Roy Lichtenstein to make data stand out.',
    category: 'presentation',
    bestFor: 'Marketing impact reports, brand awareness studies, social media data'
  },
  {
    id: 'expedition_map',
    name: 'Expedition Map',
    shortDescription: 'Antique cartography for discovery and exploration',
    fullDescription: 'Frames data as a discovery with parchment textures, hand-drawn ink lines, compass roses, and nautical illustrations.',
    category: 'presentation',
    bestFor: 'Strategic expansion plans, global logistics, risk landscapes'
  }
];

export const IMAGE_STYLES: StyleOption[] = [
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    shortDescription: 'Lifelike imagery with natural lighting',
    fullDescription: 'Creates highly realistic images that look like photographs with natural lighting, textures, and detail.',
    category: 'image',
    bestFor: 'Professional presentations, executive communications, formal reports'
  },
  {
    id: 'digital_art',
    name: 'Digital Art',
    shortDescription: 'Modern digital illustration style',
    fullDescription: 'Clean, modern digital illustration with vibrant colors and crisp lines. Contemporary and polished.',
    category: 'image',
    bestFor: 'Marketing materials, social media, modern brand presentations'
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    shortDescription: 'Soft, artistic watercolor aesthetic',
    fullDescription: 'Soft washes of color with organic edges, creating an artistic and approachable feel.',
    category: 'image',
    bestFor: 'Creative teams, wellness content, human-centered topics'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    shortDescription: 'Clean, simple, focused design',
    fullDescription: 'Stripped-down aesthetic with maximum impact through simplicity. Clean lines, ample whitespace.',
    category: 'image',
    bestFor: 'Executive summaries, key metrics, focused messaging'
  },
  {
    id: '3d_render',
    name: '3D Render',
    shortDescription: 'Dimensional, polished 3D visualization',
    fullDescription: 'Three-dimensional renders with depth, shadows, and realistic materials. Modern and premium feel.',
    category: 'image',
    bestFor: 'Product showcases, tech companies, innovation topics'
  },
  {
    id: 'sketch',
    name: 'Sketch / Hand-drawn',
    shortDescription: 'Organic, approachable illustration',
    fullDescription: 'Hand-drawn look with visible strokes and imperfections. Warm, human, and relatable.',
    category: 'image',
    bestFor: 'Team updates, brainstorming summaries, informal communications'
  },
  {
    id: 'vintage_retro',
    name: 'Vintage / Retro',
    shortDescription: 'Classic, nostalgic aesthetic',
    fullDescription: 'Draws from mid-century design with muted colors, classic typography, and nostalgic elements.',
    category: 'image',
    bestFor: 'Heritage content, anniversaries, retrospectives'
  },
  {
    id: 'abstract',
    name: 'Abstract',
    shortDescription: 'Conceptual, artistic interpretation',
    fullDescription: 'Non-representational imagery that evokes emotion and concepts through shape, color, and form.',
    category: 'image',
    bestFor: 'Vision statements, conceptual content, inspiration pieces'
  }
];

export const ALL_STYLES = [...PRESENTATION_STYLES, ...IMAGE_STYLES];

export interface TextIntegrationOption {
  id: string;
  name: string;
  description: string;
  promptGuidance: string;
}

export const TEXT_INTEGRATION_OPTIONS: TextIntegrationOption[] = [
  {
    id: 'integrated',
    name: 'Integrated',
    description: 'Text is naturally embedded within the image composition',
    promptGuidance: 'Integrate the text naturally INTO the image composition itself. The text should feel like it belongs in the scene - perhaps on signs, buildings, screens, or as part of the environment. Make text an organic part of the visual story rather than an overlay.'
  },
  {
    id: 'overlay',
    name: 'Overlay',
    description: 'Clean text overlay on top of the image',
    promptGuidance: 'Create a striking background image with designated areas for clean text overlays. Include semi-transparent overlay zones or natural areas of negative space where text can be placed with good readability.'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Image-focused with only essential text (title/footer)',
    promptGuidance: 'Create a powerful standalone image that tells the story visually. Only include a small title at the top and footer at the bottom - let the imagery convey the main message. The image itself should be the hero.'
  },
  {
    id: 'caption',
    name: 'Caption Style',
    description: 'Image with text in a dedicated caption area below',
    promptGuidance: 'Create the main image in the upper portion (approximately 70% of the canvas) with a dedicated caption/text zone at the bottom. The caption area should have a contrasting background color that complements the image.'
  }
];

export function getTextIntegrationOption(id: string): TextIntegrationOption | undefined {
  return TEXT_INTEGRATION_OPTIONS.find(opt => opt.id === id);
}

export function getStyle(id: string): StyleOption | undefined {
  return ALL_STYLES.find(s => s.id === id);
}

export function getStylesByCategory(category: 'presentation' | 'image'): StyleOption[] {
  return ALL_STYLES.filter(s => s.category === category);
}
