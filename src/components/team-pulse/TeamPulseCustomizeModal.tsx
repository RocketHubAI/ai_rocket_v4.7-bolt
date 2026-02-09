import { useState, useEffect } from 'react';
import { X, Sparkles, Palette, Target, Check, Shuffle, PenTool, Zap, Layers, LayoutGrid, MessageSquare } from 'lucide-react';

export interface DesignStyle {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  vibe: string;
  dataVisualization: string[];
  bestFor: string;
}

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: 'infographic',
    name: 'Infographic',
    shortDescription: 'Clean, professional business intelligence view',
    fullDescription: 'Infographic (Business Intelligence) - A clean, professional design focused on clarity and data comprehension. Uses structured layouts, clear hierarchies, and professional typography to present business insights in an educational format.',
    vibe: 'Professional, clean, structured, and data-focused with modern corporate aesthetics.',
    dataVisualization: [
      'Clean bar charts and pie charts with clear labels',
      'Structured sections with visual hierarchy',
      'Icon-based callouts for key metrics',
      'Professional color palette with strong contrast'
    ],
    bestFor: 'Executive summaries, team updates, stakeholder presentations, and general business reporting.'
  },
  {
    id: 'pixel_power',
    name: 'Pixel Power',
    shortDescription: '8-Bit Arcade style with retro gaming aesthetics',
    fullDescription: 'Pixel Power (8-Bit Arcade) - Uses retro gaming aesthetics to show progress, scores, and targets through gamification.',
    vibe: 'Nostalgic, blocky, vibrant, and digital-first.',
    dataVisualization: [
      'Health Bars represent budget or resource depletion',
      'Experience Points (XP) bars track revenue progress toward a goal',
      'Leaderboards replace standard ranked lists for sales or team performance'
    ],
    bestFor: 'Internal sales competitions, quarterly target tracking, or tech-focused presentations.'
  },
  {
    id: 'blueprint',
    name: 'The Blueprint',
    shortDescription: 'Technical sketch framing data as business architecture',
    fullDescription: 'The Blueprint (Technical Sketch) - A construction theme that frames your data as the architecture of the business, implying stability, planning, and structural integrity.',
    vibe: 'Indigo or dark blue backgrounds, stark white grid lines, hand-written technical annotations.',
    dataVisualization: [
      'Foundation blocks represent base revenue or core customers',
      'Pillars represent key growth drivers',
      'Schematic arrows show workflow processes or customer journeys'
    ],
    bestFor: 'Product roadmaps, strategy rollouts, or explaining complex backend infrastructure.'
  },
  {
    id: 'botanical_garden',
    name: 'Botanical Garden',
    shortDescription: 'Organic growth using nature as a gentle metaphor',
    fullDescription: 'Botanical Garden (Organic Growth) - Uses nature as a gentle, pleasing metaphor for data, perfect for talking about growth, roots, and ecosystems.',
    vibe: 'Soft greens, earthy tones, floral illustrations, and watercolor textures.',
    dataVisualization: [
      'Tree Rings show year-over-year expansion',
      'Root Systems visualize underlying causes (Root Cause Analysis)',
      'Blooming Flowers where petal size represents market share or diversity'
    ],
    bestFor: 'Sustainability reports, HR/People Analytics, or long-term growth visualization.'
  },
  {
    id: 'interstellar_voyage',
    name: 'Interstellar Voyage',
    shortDescription: 'Space & Sci-Fi theme for moonshots and the unknown',
    fullDescription: 'Interstellar Voyage (Space & Sci-Fi) - For businesses focusing on moonshots or navigating the unknown, with high contrast Dark Mode.',
    vibe: 'Deep blacks/purples, neon highlights, constellations, and planetary orbits.',
    dataVisualization: [
      'Planetary Size compares market cap or project budgets',
      'Orbits track recurring revenue or customer lifecycles',
      'Constellations connect disparate data points to show relationships'
    ],
    bestFor: 'Tech startups, Big Picture vision decks, or wide-reaching global data.'
  },
  {
    id: 'papercraft_popup',
    name: 'Papercraft Pop-Up',
    shortDescription: '3D collage with tactile, crafted feel',
    fullDescription: 'Papercraft Pop-Up (3D Collage) - A tactile, artistic style that looks like cut construction paper layered to create depth, making data feel tangible.',
    vibe: 'Textured shadows, distinct layers, matte colors, playful but clean.',
    dataVisualization: [
      'Stacked Layers work perfectly for bar charts and accumulation data',
      'Unfolding Paper visuals reveal step-by-step processes',
      'Cut-outs highlight key metrics against contrasting backgrounds'
    ],
    bestFor: 'Creative agencies, marketing summaries, or user demographic breakdowns.'
  },
  {
    id: 'neon_noir',
    name: 'Neon Noir',
    shortDescription: 'Cyberpunk city with futuristic, high-energy style',
    fullDescription: 'Neon Noir (Cyberpunk City) - A futuristic, high-energy style that frames data as the pulse of a city, feeling fast and sophisticated.',
    vibe: 'Rain-slicked streets, neon pinks and teals, glowing lines, high contrast.',
    dataVisualization: [
      'Traffic flows representing web traffic or conversion funnels',
      'Skyscraper heights for competitive analysis',
      'Glowing circuitry maps show API connections or logistics routes'
    ],
    bestFor: 'IT security reports, real-time analytics monitoring, or urban planning data.'
  },
  {
    id: 'retro_cartoon',
    name: 'Retro Cartoon',
    shortDescription: '1930s rubber hose animation style',
    fullDescription: 'Retro Cartoon (Rubber Hose Style) - Inspired by 1930s animation, incredibly high-energy and makes even boring data feel approachable and alive.',
    vibe: 'Bouncy rubber hose limbs, pie-eyed characters, and grainy vintage film textures.',
    dataVisualization: [
      'Anthropomorphic Charts: Bar charts that flex like muscles',
      'Classic Callouts: Speech bubbles and Bang/Pow clouds for milestones',
      'Whimsical Icons: Old-school telephone or clock icons for metrics'
    ],
    bestFor: 'Internal morale boosts, lighthearted performance reviews, or onboarding tutorials.'
  },
  {
    id: 'modern_superhero',
    name: 'Modern Superhero',
    shortDescription: 'Comic book bold with heroic narrative framing',
    fullDescription: 'Modern Superhero (Comic Book Bold) - Frames your business data as a heroic narrative about power, impact, and overcoming villains like churn.',
    vibe: 'Deep shadows, halftone dots (Ben-Day dots), bold action lines, heroic perspective angles.',
    dataVisualization: [
      'Power Meters: Circular gauges like superhero energy cores',
      'Action Sequences: Multi-panel layout showing battles between past and present',
      'Heroic Portraits: High-contrast icons for top performers'
    ],
    bestFor: 'Competitive analysis, crushing quarterly goals, and high-impact pitch decks.'
  },
  {
    id: 'animal_kingdom',
    name: 'Animal Kingdom',
    shortDescription: 'Natural world ecosystem for complex relationships',
    fullDescription: 'Animal Kingdom (Ecosystem Logic) - Leverages the natural world to explain complex business relationships and hierarchies.',
    vibe: 'High-quality wildlife photography or detailed woodcut illustrations; earthy, natural textures.',
    dataVisualization: [
      'Food Chain/Pyramid for market hierarchy or organizational structure',
      'Migration Maps tracking user movement or market shifts',
      'Herd Size comparing company scale or customer segments'
    ],
    bestFor: 'Market ecosystem analysis, HR structure, or environmental/social governance (ESG) reports.'
  },
  {
    id: 'vintage_board_game',
    name: 'Vintage Board Game',
    shortDescription: 'Path to success with game journey visualization',
    fullDescription: 'Vintage Board Game (The Path to Success) - Turns a business process into a visual journey, making data feel like a game being won.',
    vibe: 'Isometric views, wooden game pieces, winding paths, and Chance/Community Chest style cards.',
    dataVisualization: [
      'The Winding Path: Classic Start to Finish board game track for project lifecycle',
      'Property Cards: Individual product or department KPIs as collectible cards',
      'Dice/Tokens: Game tokens representing budget allocations or investments'
    ],
    bestFor: 'Project management updates, customer journey mapping, or long-term strategic roadmaps.'
  },
  {
    id: 'pop_art',
    name: 'Pop Art',
    shortDescription: 'Warhol-inspired with repetition and high saturation',
    fullDescription: 'Pop Art (The Warhol Report) - Uses repetition and high-saturation colors like Andy Warhol and Roy Lichtenstein to make data stand out.',
    vibe: 'Neon color palettes, repetitive patterns, heavy black outlines, Commercial Art aesthetics.',
    dataVisualization: [
      'Icon Grids: Repeating icons in different colors for market saturation',
      'High-Contrast Callouts: Vibrant clashing colors for outlier data',
      'Stylized Portraits: Data owners as colorful pop-art avatars'
    ],
    bestFor: 'Marketing impact reports, brand awareness studies, or high-energy social media data sharing.'
  },
  {
    id: 'expedition_map',
    name: 'Expedition Map',
    shortDescription: 'Antique cartography for discovery and exploration',
    fullDescription: 'The Expedition Map (Antique Cartography) - Frames data as a discovery, perfect for businesses exploring new markets or navigating uncertain waters.',
    vibe: 'Parchment textures, hand-drawn ink lines, compass roses, and nautical sea monster illustrations.',
    dataVisualization: [
      'Archipelago of Data: Business units as islands with size indicating revenue',
      'Trade Routes: Dashed lines and ink-wash arrows for capital or logistics flow',
      'The Unknown: Fading map into clouds for projected forecasts'
    ],
    bestFor: 'Strategic expansion plans, global logistics, or navigating complex risk landscapes.'
  }
];

interface TeamPulseCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: {
    custom_instructions: string | null;
    design_style: string | null;
    design_description: string | null;
    rotate_random: boolean;
    apply_to_future: boolean;
  };
  onSave: (settings: {
    custom_instructions: string | null;
    design_style: string | null;
    design_description: string | null;
    rotate_random: boolean;
    apply_to_future: boolean;
  }) => Promise<void>;
  onGenerate: (settings: {
    custom_instructions: string | null;
    design_style: string | null;
    design_description: string | null;
    focus_mode: 'big3' | 'highlights' | 'full_canvas' | 'custom';
  }) => void;
}

type TabType = 'focus' | 'design';

type SelectionMode = 'random' | 'preset' | 'custom';

type FocusMode = 'big3' | 'highlights' | 'full_canvas' | 'custom';

const FOCUS_OPTIONS: { id: FocusMode; name: string; icon: typeof Zap; description: string; requiresInstructions?: boolean }[] = [
  {
    id: 'big3',
    name: 'Big 3',
    icon: Zap,
    description: 'Three big insights from your team\'s data - concise and impactful'
  },
  {
    id: 'highlights',
    name: 'Highlights',
    icon: Layers,
    description: 'A range of 5-7 of the most notable things from your team\'s data'
  },
  {
    id: 'full_canvas',
    name: 'Full Canvas',
    icon: LayoutGrid,
    description: 'A broad overview of your team\'s key data across categories'
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: MessageSquare,
    description: 'Define your own focus with custom instructions below',
    requiresInstructions: true
  }
];

export function TeamPulseCustomizeModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  onGenerate
}: TeamPulseCustomizeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('design');
  const [customInstructions, setCustomInstructions] = useState(currentSettings.custom_instructions || '');
  const [focusMode, setFocusMode] = useState<FocusMode>('highlights');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(currentSettings.design_style || 'infographic');
  const [designDescription, setDesignDescription] = useState(currentSettings.design_description || '');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => {
    if (currentSettings.design_description) return 'custom';
    if (currentSettings.design_style) return 'preset';
    if (currentSettings.rotate_random) return 'random';
    return 'preset';
  });
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomInstructions(currentSettings.custom_instructions || '');
      setSelectedStyle(currentSettings.design_style || 'infographic');
      setDesignDescription(currentSettings.design_description || '');
      if (currentSettings.design_description) {
        setSelectionMode('custom');
      } else if (currentSettings.design_style) {
        setSelectionMode('preset');
      } else if (currentSettings.rotate_random) {
        setSelectionMode('random');
      } else {
        setSelectionMode('preset');
      }
      setApplyToFuture(false);
      setSaved(false);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    setSelectionMode('preset');
  };

  const handleRotateRandomSelect = () => {
    setSelectionMode('random');
    setSelectedStyle(null);
  };

  const handleCustomDesignSelect = () => {
    setSelectionMode('custom');
    setSelectedStyle(null);
  };

  const canGenerate = () => {
    if (selectionMode === 'custom') {
      return designDescription.trim().length > 0;
    }
    if (focusMode === 'custom') {
      return customInstructions.trim().length > 0;
    }
    return true;
  };

  const getFocusInstruction = (): string => {
    switch (focusMode) {
      case 'big3':
        return 'FOCUS: Big 3 - Generate exactly THREE big, impactful insights from the team data. Keep it concise and high-impact.';
      case 'highlights':
        return 'FOCUS: Highlights - Generate 5-7 of the most notable things from the team data. Balance breadth with key insights.';
      case 'full_canvas':
        return 'FOCUS: Full Canvas - Generate a broad overview of key team data across categories. Cover the most important metrics while keeping content readable and focused.';
      default:
        return '';
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate()) return;

    setSaving(true);
    try {
      const additionalInstructions = customInstructions.trim();

      const settings = {
        custom_instructions: additionalInstructions || null,
        design_style: selectionMode === 'preset' ? selectedStyle : null,
        design_description: selectionMode === 'custom' ? designDescription.trim() : null,
        rotate_random: selectionMode === 'random',
        apply_to_future: applyToFuture
      };

      if (applyToFuture) {
        await onSave(settings);
      }

      onGenerate({
        custom_instructions: settings.custom_instructions,
        design_style: settings.design_style,
        design_description: settings.design_description,
        focus_mode: focusMode
      });

      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error generating:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedStyleData = selectedStyle ? DESIGN_STYLES.find(s => s.id === selectedStyle) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Customize Team Pulse</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('design')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'design'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            Design Style
          </button>
          <button
            onClick={() => setActiveTab('focus')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'focus'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            Focus
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'design' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-4">
                  Choose a visual style for your Team Pulse infographic.
                </p>

                <button
                  onClick={() => handleStyleSelect('infographic')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all mb-3 ${
                    selectedStyle === 'infographic' && selectionMode === 'preset'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedStyle === 'infographic' && selectionMode === 'preset' ? 'bg-cyan-500/20' : 'bg-gray-700'
                    }`}>
                      <Layers className={`w-4 h-4 ${selectedStyle === 'infographic' && selectionMode === 'preset' ? 'text-cyan-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${selectedStyle === 'infographic' && selectionMode === 'preset' ? 'text-cyan-400' : 'text-white'}`}>
                          Infographic
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-500/20 text-teal-400 border border-teal-500/30">
                          Default
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Clean, professional business intelligence view
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedStyle === 'infographic' && selectionMode === 'preset' ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'
                  }`}>
                    {selectedStyle === 'infographic' && selectionMode === 'preset' && <Check className="w-3 h-3 text-gray-900" />}
                  </div>
                </button>

                <button
                  onClick={handleCustomDesignSelect}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all mb-4 ${
                    selectionMode === 'custom'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectionMode === 'custom' ? 'bg-cyan-500/20' : 'bg-gray-700'
                    }`}>
                      <PenTool className={`w-4 h-4 ${selectionMode === 'custom' ? 'text-cyan-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectionMode === 'custom' ? 'text-cyan-400' : 'text-white'}`}>
                        Custom Design
                      </p>
                      <p className="text-xs text-gray-500">
                        Describe your own unique visual style
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectionMode === 'custom' ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'
                  }`}>
                    {selectionMode === 'custom' && <Check className="w-3 h-3 text-gray-900" />}
                  </div>
                </button>

                {selectionMode === 'custom' && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <textarea
                      value={designDescription}
                      onChange={(e) => setDesignDescription(e.target.value)}
                      placeholder="Describe your custom design style in detail...

Example: A minimalist corporate style with clean lines, muted blue and gray tones, subtle gradients, and modern sans-serif typography."
                      rows={4}
                      autoFocus
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:border-cyan-500 focus:outline-none resize-none"
                    />
                    {selectionMode === 'custom' && !designDescription.trim() && (
                      <p className="text-xs text-amber-400 mt-2">
                        Please describe your custom design to continue
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {DESIGN_STYLES.filter(style => style.id !== 'infographic').map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleStyleSelect(style.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        selectedStyle === style.id && selectionMode === 'preset'
                          ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                      }`}
                    >
                      {selectedStyle === style.id && selectionMode === 'preset' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-gray-900" />
                        </div>
                      )}
                      <p className={`text-sm font-medium mb-1 pr-6 ${
                        selectedStyle === style.id && selectionMode === 'preset' ? 'text-cyan-400' : 'text-white'
                      }`}>
                        {style.name}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {style.shortDescription}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRotateRandomSelect}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all mt-4 ${
                    selectionMode === 'random'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectionMode === 'random' ? 'bg-cyan-500/20' : 'bg-gray-700'
                    }`}>
                      <Shuffle className={`w-4 h-4 ${selectionMode === 'random' ? 'text-cyan-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectionMode === 'random' ? 'text-cyan-400' : 'text-white'}`}>
                        Rotate Random
                      </p>
                      <p className="text-xs text-gray-500">
                        Automatically cycle through different styles each generation
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectionMode === 'random' ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'
                  }`}>
                    {selectionMode === 'random' && <Check className="w-3 h-3 text-gray-900" />}
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'focus' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Content Focus
                </label>
                <div className="space-y-2">
                  {FOCUS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = focusMode === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setFocusMode(option.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-cyan-500/20' : 'bg-gray-700'
                        }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                            {option.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {option.description}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-gray-900" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`border-t border-gray-700 pt-4 ${focusMode === 'custom' ? 'bg-cyan-500/5 -mx-4 px-4 pb-4 rounded-b-lg' : ''}`}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom Instructions {focusMode === 'custom' ? (
                    <span className="text-cyan-400 font-normal">(required for Custom focus)</span>
                  ) : (
                    <span className="text-gray-500 font-normal">(optional)</span>
                  )}
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={focusMode === 'custom'
                    ? "Describe exactly what you want to see in your Team Pulse...\n\nExample: Show only our Q1 sales achievements and top 3 client wins with revenue impact."
                    : "Add specific guidance for your Team Pulse...\n\nExample: Emphasize sales metrics, highlight project milestones, or focus on customer success patterns..."}
                  rows={4}
                  autoFocus={focusMode === 'custom'}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 text-sm focus:border-cyan-500 focus:outline-none resize-none ${
                    focusMode === 'custom' ? 'border-cyan-500/50' : 'border-gray-600'
                  }`}
                />
                {focusMode === 'custom' && !customInstructions.trim() && (
                  <p className="text-xs text-amber-400 mt-2">
                    Please provide custom instructions to define your focus
                  </p>
                )}
                {focusMode !== 'custom' && (
                  <p className="text-xs text-gray-500 mt-1">
                    These instructions are added to the focus setting above for additional customization.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 space-y-3">
          {selectionMode === 'preset' && selectedStyleData && (
            <div className="flex items-center gap-2 text-xs text-cyan-400/80 bg-cyan-500/10 px-3 py-2 rounded-lg">
              <Palette className="w-3 h-3" />
              <span>Selected: {selectedStyleData.name}</span>
            </div>
          )}

          {selectionMode === 'random' && (
            <div className="flex items-center gap-2 text-xs text-cyan-400/80 bg-cyan-500/10 px-3 py-2 rounded-lg">
              <Shuffle className="w-3 h-3" />
              <span>Will rotate through all 12 design styles</span>
            </div>
          )}

          {selectionMode === 'custom' && designDescription.trim() && (
            <div className="flex items-center gap-2 text-xs text-cyan-400/80 bg-cyan-500/10 px-3 py-2 rounded-lg">
              <PenTool className="w-3 h-3" />
              <span>Using custom design description</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={applyToFuture}
                onChange={(e) => setApplyToFuture(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
              Apply to all future generations
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={saving || !canGenerate()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Done!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate with Style
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
