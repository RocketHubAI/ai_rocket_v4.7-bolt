import React, { useState, useEffect } from 'react';
import { X, BarChart, Loader2, CheckCircle, Sparkles, TrendingUp, Eye, Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatAstraMessage } from '../../utils/formatAstraMessage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../lib/supabase';
import { SupportMenu } from '../SupportMenu';

interface VisualizationBoosterModalProps {
  onClose: () => void;
  onComplete: () => void;
  astraResponse?: string;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

export const VisualizationBoosterModal: React.FC<VisualizationBoosterModalProps> = ({
  onClose,
  onComplete,
  astraResponse,
  onOpenHelpCenter
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'loading' | 'show_message' | 'generating' | 'showing_viz'>('loading');
  const [visualizationHtml, setVisualizationHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fetchedAstraResponse, setFetchedAstraResponse] = useState<string>('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [hasRestoredState, setHasRestoredState] = useState(false);

  useEffect(() => {
    const savedStep = sessionStorage.getItem('viz_booster_step');
    const savedHtml = sessionStorage.getItem('viz_booster_html');
    const savedError = sessionStorage.getItem('viz_booster_error');

    if (savedStep === 'generating') {
      setStep('generating');
      setHasRestoredState(true);
    } else if (savedStep === 'showing_viz' && savedHtml) {
      setVisualizationHtml(savedHtml);
      setStep('showing_viz');
      setHasRestoredState(true);
    } else if (savedError) {
      setError(savedError);
      setStep('show_message');
      setHasRestoredState(true);
    }
  }, []);

  const carouselItems = [
    {
      icon: Eye,
      title: 'See Patterns Instantly',
      description: 'Transform complex data into clear visual insights that reveal patterns you might miss in text.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor trends and changes over time with interactive charts and graphs.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Zap,
      title: 'Make Faster Decisions',
      description: 'Quickly identify key metrics and make data-driven decisions with confidence.',
      color: 'from-orange-500 to-yellow-500'
    },
    {
      icon: BarChart,
      title: 'Share With Your Team',
      description: 'Create compelling visualizations that communicate insights effectively to stakeholders.',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  // Rotate carousel during generation
  useEffect(() => {
    if (step === 'generating') {
      const interval = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
      }, 3000); // Change every 3 seconds

      return () => clearInterval(interval);
    }
  }, [step]);

  // Fetch the most recent Astra chat response from database
  useEffect(() => {
    const fetchLatestAstraResponse = async () => {
      if (!user) return;

      try {
        // Fetch the most recent Astra response from astra_chats
        // Note: astra_chats uses user_id and message_type, not team_id and sender
        const { data: chatData, error: chatError } = await supabase
          .from('astra_chats')
          .select('message')
          .eq('user_id', user.id)
          .eq('message_type', 'astra')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (chatError) {
          console.error('Error fetching Astra chat:', chatError);
        }

        if (chatData?.message) {
          console.log('✅ Fetched Astra response from database:', chatData.message.substring(0, 200));
          setFetchedAstraResponse(chatData.message);
        } else {
          console.log('No Astra response found in database, using prop or fallback');
        }

        setStep('show_message');
      } catch (err) {
        console.error('Error in fetchLatestAstraResponse:', err);
        setStep('show_message');
      }
    };

    if (step === 'loading') {
      fetchLatestAstraResponse();
    }
  }, [user, step]);

  const handleCreateVisualization = async () => {
    if (!user) return;

    // Priority: fetched from database > prop > fallback
    const messageText = fetchedAstraResponse || astraResponse || 'Create a visualization showing key insights from recent data';

    console.log('Creating visualization with message length:', messageText.length);
    console.log('Message source:', fetchedAstraResponse ? 'database' : astraResponse ? 'prop' : 'fallback');

    setStep('generating');
    setError(null);
    sessionStorage.setItem('viz_booster_step', 'generating');
    sessionStorage.removeItem('viz_booster_html');
    sessionStorage.removeItem('viz_booster_error');

    try {
      // Get API key from environment
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: {
          temperature: 1.0,
          topK: 64,
          topP: 0.95,
          maxOutputTokens: 100000,
        }
      });

      const baseDesign = `DESIGN REQUIREMENTS:
- Use a dark theme with gray-900 (#111827) background
- Use gray-800 (#1f2937) and gray-700 (#374151) for card backgrounds
- Use white (#ffffff) and gray-300 (#d1d5db) for text
- Use blue (#3b82f6), purple (#8b5cf6), and cyan (#06b6d4) for accents and highlights
- Match the visual style of a modern dark dashboard
- Include proper spacing, rounded corners, and subtle shadows
- Use responsive layouts with flexbox or CSS grid
- Ensure all content fits within containers without overflow`;

      const prompt = `Create a comprehensive visual dashboard to help understand the information in the message below.

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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let cleanedContent = response.text();

      // Clean up the response - remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

      // Ensure it starts with DOCTYPE if it's a complete HTML document
      if (!cleanedContent.toLowerCase().includes('<!doctype') && !cleanedContent.toLowerCase().includes('<html')) {
        cleanedContent = `<!DOCTYPE html>
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
        /* Prevent text overflow in all elements */
        h1, h2, h3, h4, h5, h6, p, div, span {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }
        /* Enforce maximum font sizes */
        h1 { font-size: clamp(1.5rem, 4vw, 1.875rem) !important; }
        h2 { font-size: clamp(1.25rem, 3.5vw, 1.5rem) !important; }
        h3 { font-size: clamp(1.125rem, 3vw, 1.25rem) !important; }
        /* Responsive images */
        img {
            max-width: 100%;
            height: auto;
        }
        /* Ensure all containers have proper padding and prevent overflow */
        [class*="card"], [class*="container"], [class*="box"], [style*="padding"] {
            padding: 1rem !important;
            overflow: hidden;
        }
    </style>
</head>
<body>
    ${cleanedContent}
</body>
</html>`;
      }

      setVisualizationHtml(cleanedContent);
      setStep('showing_viz');
      sessionStorage.setItem('viz_booster_step', 'showing_viz');
      sessionStorage.setItem('viz_booster_html', cleanedContent);
      sessionStorage.removeItem('viz_booster_error');
    } catch (err: any) {
      console.error('Error creating visualization:', err);
      let errorMsg = err.message || 'Failed to create visualization';

      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exhausted') || errorMsg.includes('Resource has been')) {
        errorMsg = 'API rate limit reached (429). The visualization service is temporarily unavailable due to high demand.';
      }

      setError(errorMsg);
      setStep('show_message');
      sessionStorage.setItem('viz_booster_error', errorMsg);
      sessionStorage.removeItem('viz_booster_step');
    }
  };

  const handleProceed = () => {
    sessionStorage.removeItem('viz_booster_step');
    sessionStorage.removeItem('viz_booster_html');
    sessionStorage.removeItem('viz_booster_error');
    onComplete();
  };

  const handleSkipStep = () => {
    sessionStorage.removeItem('viz_booster_step');
    sessionStorage.removeItem('viz_booster_html');
    sessionStorage.removeItem('viz_booster_error');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <BarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Data Visualizations</h2>
              <p className="text-sm text-gray-300">Turn insights into visuals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading Step */}
          {step === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-300">Loading your data...</p>
              </div>
            </div>
          )}

          {/* Step 1: Show Astra's previous message */}
          {step === 'show_message' && (
            <div className="space-y-6">
              {(fetchedAstraResponse || astraResponse) && (
                <div className="bg-purple-900/10 border border-purple-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <p className="text-sm text-gray-400">Astra's Previous Insights:</p>
                  </div>
                  <div className="text-white prose prose-invert max-w-none">
                    {formatAstraMessage(fetchedAstraResponse || astraResponse || '')}
                  </div>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BarChart className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-300 font-medium mb-1">
                      Ready to Visualize?
                    </p>
                    <p className="text-sm text-gray-300">
                      Click below to transform Astra's insights into an interactive visualization. This helps you spot trends and patterns at a glance!
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-300 font-medium mb-1">
                        {error.includes('429') || error.includes('quota') || error.includes('exhausted')
                          ? 'API Rate Limit Reached'
                          : 'Error Creating Visualization'
                        }
                      </p>
                      <p className="text-red-400 text-sm mb-3">
                        {error.includes('429') || error.includes('quota') || error.includes('exhausted')
                          ? 'The visualization service is temporarily unavailable due to high demand. You can try again in a few minutes or skip this step for now.'
                          : error
                        }
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateVisualization}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={handleSkipStep}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                        >
                          Skip for Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Generating visualization - compact */}
          {step === 'generating' && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">Creating Visualization</h3>
                <p className="text-sm text-gray-400 mb-2">Generating a visual dashboard from your data...</p>
                <div className="flex items-center justify-center gap-2 text-orange-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Please keep this window open</span>
                </div>
              </div>

              {/* Compact Benefits Carousel */}
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4 relative h-24">
                {carouselItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className={`absolute inset-0 p-4 flex items-center justify-center gap-4 transition-all duration-500 ${
                        index === carouselIndex
                          ? 'opacity-100 translate-x-0'
                          : index < carouselIndex
                          ? 'opacity-0 -translate-x-full'
                          : 'opacity-0 translate-x-full'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-gray-400">{item.description}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Carousel Indicators */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {carouselItems.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === carouselIndex ? 'w-4 bg-cyan-400' : 'w-1.5 bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Show visualization */}
          {step === 'showing_viz' && visualizationHtml && (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-sm text-green-300 font-medium">Visualization Created!</p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: visualizationHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50 flex justify-end items-center gap-3 flex-shrink-0">
          {step === 'show_message' && (
            <button
              onClick={handleCreateVisualization}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl font-medium min-h-[44px]"
            >
              <BarChart className="w-5 h-5" />
              Create Visualization
            </button>
          )}

          {step === 'showing_viz' && (
            <button
              onClick={handleProceed}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl font-medium min-h-[44px]"
            >
              <CheckCircle className="w-5 h-5" />
              Proceed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
