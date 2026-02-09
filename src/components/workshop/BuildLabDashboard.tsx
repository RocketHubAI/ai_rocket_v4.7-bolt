import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Download,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Loader2,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Lightbulb,
  Wrench,
  Megaphone,
  TrendingUp,
  Calculator,
  Users,
  FileText,
  Bot,
  Brain,
  Zap,
  Target,
  BarChart3,
  Mail,
  Calendar,
  Search,
  Shield,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Goal } from './WorkshopMindsetJourney';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface WishPrototype {
  id: string;
  wishNumber: number;
  wishText: string;
  prototypeTitle: string | null;
  status: 'pending' | 'generating' | 'ready' | 'error';
  mode: 'beginner' | 'advanced' | null;
  hasInfographic: boolean;
  hasBlueprint: boolean;
  createdAt: string;
  claudeExportedAt: string | null;
  chatgptExportedAt: string | null;
  toolIcon: string | null;
}

interface BuildLabProgress {
  prototypes: WishPrototype[];
}

interface BuildLabDashboardProps {
  userId: string;
  registrationId: string;
  teamId: string;
  teamName: string;
  goals: Goal[];
  wishes: {
    wish1: string;
    wish2: string;
    wish3: string;
  };
  onOpenPrototype: (wishNumber: number) => void;
  onOpenDocuments: () => void;
  onLogout: () => void;
  onBack: () => void;
}

export const BuildLabDashboard: React.FC<BuildLabDashboardProps> = ({
  userId,
  registrationId,
  teamId,
  teamName,
  goals,
  wishes: propWishes,
  onOpenPrototype,
  onOpenDocuments,
  onLogout,
  onBack
}) => {
  const [progress, setProgress] = useState<BuildLabProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWishes, setLoadingWishes] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [wishTitles, setWishTitles] = useState<Record<number, string>>({});
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [generatingWish, setGeneratingWish] = useState<number | null>(null);
  const [startingWish, setStartingWish] = useState<number | null>(null);
  const [wishes, setWishes] = useState({ wish1: '', wish2: '', wish3: '' });

  useEffect(() => {
    const loadWishesFromDb = async () => {
      setLoadingWishes(true);

      if (propWishes.wish1 || propWishes.wish2 || propWishes.wish3) {
        setWishes(propWishes);
        setLoadingWishes(false);
        return;
      }

      try {
        const { data: wishesData } = await supabase
          .from('workshop_wishes')
          .select('wish_1, wish_2, wish_3')
          .eq('user_id', userId)
          .maybeSingle();

        if (wishesData) {
          setWishes({
            wish1: wishesData.wish_1 || '',
            wish2: wishesData.wish_2 || '',
            wish3: wishesData.wish_3 || ''
          });
        } else {
          // No wishes exist - set empty wishes so Build Lab can still be used
          setWishes({
            wish1: '',
            wish2: '',
            wish3: ''
          });
        }
      } catch (err) {
        console.error('Error loading wishes from database:', err);
        // On error, still allow Build Lab to work with empty wishes
        setWishes({
          wish1: '',
          wish2: '',
          wish3: ''
        });
      } finally {
        setLoadingWishes(false);
      }
    };

    loadWishesFromDb();
  }, [userId, propWishes]);

  const generateToolConcepts = useCallback(async () => {
    setLoadingTitles(true);

    // If wishes exist, use them
    if (wishes.wish1 || wishes.wish2 || wishes.wish3) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Generate short, catchy titles (3-5 words max) for these 3 AI business wishes. Each title should capture the essence of what the AI tool will do.

Wish 1: ${wishes.wish1}
Wish 2: ${wishes.wish2}
Wish 3: ${wishes.wish3}

Return ONLY a JSON object with keys "1", "2", "3" and short title values. Example:
{"1": "Smart Sales Assistant", "2": "Customer Insight Engine", "3": "Automated Report Builder"}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setWishTitles({
            1: parsed['1'] || 'AI Tool #1',
            2: parsed['2'] || 'AI Tool #2',
            3: parsed['3'] || 'AI Tool #3'
          });
        }
      } catch (err) {
        console.error('Error generating titles:', err);
        setWishTitles({
          1: 'AI Tool #1',
          2: 'AI Tool #2',
          3: 'AI Tool #3'
        });
      } finally {
        setLoadingTitles(false);
      }
      return;
    }

    // No wishes exist - generate tool concepts based on goals
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const goalsContext = goals.map((g, i) =>
        `Goal ${i + 1}: ${g.goalTitle}\nDescription: ${g.goalDescription}\nPositive Impacts: ${g.positiveImpact1}, ${g.positiveImpact2}, ${g.positiveImpact3}`
      ).join('\n\n');

      const prompt = `Based on these business goals, generate 3 relevant AI tool concepts that would help achieve them. Consider common business AI tools like automation systems, lead generation engines, content creation tools, customer service assistants, data analysis tools, and workflow automation.

${goalsContext}

Generate 3 tool concepts with:
1. A short, catchy title (3-5 words)
2. A clear description (2-3 sentences) explaining what the tool does and how it helps achieve the goals

Return ONLY a JSON object with this structure:
{
  "1": {
    "title": "Smart Sales Assistant",
    "description": "An AI-powered assistant that automates lead qualification and follow-up, helping you focus on high-value prospects while ensuring no opportunities slip through the cracks."
  },
  "2": {
    "title": "Content Automation Engine",
    "description": "Automatically generates and schedules social media posts, blog content, and email campaigns based on your business goals and brand voice, maintaining consistent online presence without manual effort."
  },
  "3": {
    "title": "Business Insight Analyzer",
    "description": "Analyzes your business data and provides actionable insights and recommendations to optimize operations, identify growth opportunities, and track progress toward your goals."
  }
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Set titles
        setWishTitles({
          1: parsed['1']?.title || 'AI Tool #1',
          2: parsed['2']?.title || 'AI Tool #2',
          3: parsed['3']?.title || 'AI Tool #3'
        });

        // Store descriptions in wishes for use in tool generation
        setWishes({
          wish1: parsed['1']?.description || 'Create a custom AI tool based on your business needs. Click to start building your first prototype.',
          wish2: parsed['2']?.description || 'Design and plan your second AI solution. Transform your workflow with intelligent automation.',
          wish3: parsed['3']?.description || 'Build your third AI assistant. Turn your vision into actionable blueprints ready to implement.'
        });
      }
    } catch (err) {
      console.error('Error generating tool concepts:', err);
      setWishTitles({
        1: 'AI Tool Planner #1',
        2: 'AI Tool Planner #2',
        3: 'AI Tool Planner #3'
      });
    } finally {
      setLoadingTitles(false);
    }
  }, [wishes, goals]);

  const loadProgress = useCallback(async () => {
    try {
      const { data: prototypes, error } = await supabase
        .from('build_lab_prototypes')
        .select('*')
        .eq('user_id', userId)
        .order('wish_number');

      if (error) throw error;

      setProgress({
        prototypes: (prototypes || []).map((p: any) => ({
          id: p.id,
          wishNumber: p.wish_number,
          wishText: p.wish_text,
          prototypeTitle: p.prototype_title,
          status: p.status,
          mode: p.mode,
          hasInfographic: p.has_infographic,
          hasBlueprint: p.has_blueprint,
          createdAt: p.created_at,
          claudeExportedAt: p.claude_exported_at,
          chatgptExportedAt: p.chatgpt_exported_at,
          toolIcon: p.tool_icon
        }))
      });
    } catch (err) {
      console.error('Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (!loadingWishes) {
      generateToolConcepts();
    }
  }, [loadingWishes, generateToolConcepts]);

  const getWishText = (wishNumber: number): string => {
    switch (wishNumber) {
      case 1: return wishes.wish1 || 'Create a custom AI tool based on your business needs. Click to start building your first prototype.';
      case 2: return wishes.wish2 || 'Design and plan your second AI solution. Transform your workflow with intelligent automation.';
      case 3: return wishes.wish3 || 'Build your third AI assistant. Turn your vision into actionable blueprints ready to implement.';
      default: return '';
    }
  };

  const getPrototypeForWish = (wishNumber: number): WishPrototype | undefined => {
    return progress?.prototypes.find(p => p.wishNumber === wishNumber);
  };

  const handleStartBuildPlan = async (wishNumber: number) => {
    setStartingWish(wishNumber);
    setGeneratingWish(wishNumber);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const wishText = getWishText(wishNumber);

      const { data: existingPrototype } = await supabase
        .from('build_lab_prototypes')
        .select('id, status')
        .eq('user_id', userId)
        .eq('wish_number', wishNumber)
        .maybeSingle();

      if (existingPrototype?.status === 'ready') {
        onOpenPrototype(wishNumber);
        return;
      }

      let prototypeId: string;

      if (existingPrototype) {
        prototypeId = existingPrototype.id;
        await supabase
          .from('build_lab_prototypes')
          .update({
            wish_text: wishText,
            status: 'generating',
            generation_started_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', prototypeId);
      } else {
        const { data: newPrototype, error } = await supabase
          .from('build_lab_prototypes')
          .insert({
            user_id: userId,
            registration_id: registrationId,
            wish_number: wishNumber,
            wish_text: wishText,
            status: 'generating',
            generation_started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        prototypeId = newPrototype.id;
      }

      await loadProgress();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wish-prototype`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prototypeId,
            wishNumber,
            wishText,
            goals: goals.map(g => ({
              title: g.goalTitle,
              description: g.goalDescription,
              impacts: [g.positiveImpact1, g.positiveImpact2, g.positiveImpact3]
            }))
          })
        }
      );

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      await loadProgress();
      onOpenPrototype(wishNumber);
    } catch (err) {
      console.error('Error starting build plan:', err);
      await loadProgress();
    } finally {
      setGeneratingWish(null);
      setStartingWish(null);
    }
  };

  const handleDownloadAllBlueprints = async () => {
    setDownloadingAll(true);
    try {
      const { data: blueprints, error } = await supabase
        .from('build_lab_blueprints')
        .select('blueprint_title, markdown_content')
        .in('prototype_id', progress?.prototypes.filter(p => p.hasBlueprint).map(p => p.id) || [])
        .eq('status', 'ready');

      if (error) throw error;

      if (blueprints && blueprints.length > 0) {
        let combinedContent = '# Build Lab Blueprints\n\nExported from AI-preneur Workshop\n\n---\n\n';

        blueprints.forEach((bp, index) => {
          combinedContent += bp.markdown_content;
          if (index < blueprints.length - 1) {
            combinedContent += '\n\n---\n\n';
          }
        });

        const blob = new Blob([combinedContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `build-lab-blueprints-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading blueprints:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const getToolIcon = (wishNumber: number, title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('content') || titleLower.includes('marketing') || titleLower.includes('social')) {
      return <Megaphone className="w-5 h-5" />;
    }
    if (titleLower.includes('sales') || titleLower.includes('revenue') || titleLower.includes('growth')) {
      return <TrendingUp className="w-5 h-5" />;
    }
    if (titleLower.includes('finance') || titleLower.includes('budget') || titleLower.includes('accounting')) {
      return <Calculator className="w-5 h-5" />;
    }
    if (titleLower.includes('team') || titleLower.includes('hr') || titleLower.includes('employee')) {
      return <Users className="w-5 h-5" />;
    }
    if (titleLower.includes('document') || titleLower.includes('report') || titleLower.includes('write')) {
      return <FileText className="w-5 h-5" />;
    }
    if (titleLower.includes('assistant') || titleLower.includes('chat') || titleLower.includes('ai')) {
      return <Bot className="w-5 h-5" />;
    }
    if (titleLower.includes('analyze') || titleLower.includes('insight') || titleLower.includes('data')) {
      return <BarChart3 className="w-5 h-5" />;
    }
    if (titleLower.includes('email') || titleLower.includes('outreach') || titleLower.includes('communication')) {
      return <Mail className="w-5 h-5" />;
    }
    if (titleLower.includes('schedule') || titleLower.includes('calendar') || titleLower.includes('meeting')) {
      return <Calendar className="w-5 h-5" />;
    }
    if (titleLower.includes('research') || titleLower.includes('find') || titleLower.includes('search')) {
      return <Search className="w-5 h-5" />;
    }
    if (titleLower.includes('automat') || titleLower.includes('workflow') || titleLower.includes('process')) {
      return <Zap className="w-5 h-5" />;
    }
    if (titleLower.includes('goal') || titleLower.includes('strategy') || titleLower.includes('plan')) {
      return <Target className="w-5 h-5" />;
    }
    if (titleLower.includes('customer') || titleLower.includes('client') || titleLower.includes('crm')) {
      return <Briefcase className="w-5 h-5" />;
    }
    const icons = [Brain, Zap, Target, Bot, Sparkles];
    return React.createElement(icons[(wishNumber - 1) % icons.length], { className: "w-5 h-5" });
  };

  const renderWishCard = (wishNumber: number) => {
    const prototype = getPrototypeForWish(wishNumber);
    const wishText = getWishText(wishNumber);
    const generatedTitle = wishTitles[wishNumber] || `AI Tool #${wishNumber}`;
    const hasExported = !!(prototype?.claudeExportedAt || prototype?.chatgptExportedAt);
    const hasSummary = !!prototype?.prototypeTitle;

    const handleCardClick = () => {
      if (hasSummary) {
        // Prototype already exists - open it
        onOpenPrototype(wishNumber);
      } else {
        // No prototype yet - create it first with the wish text
        handleStartBuildPlan(wishNumber);
      }
    };

    return (
      <div
        key={wishNumber}
        onClick={handleCardClick}
        className="rounded-2xl border border-gray-700 bg-gray-800/50 p-5 transition-all hover:border-cyan-500/50 cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 ${
            hasExported
              ? 'bg-gradient-to-br from-green-500 to-emerald-500'
              : hasSummary
                ? 'bg-gradient-to-br from-cyan-500 to-teal-500'
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
          }`}>
            {hasExported ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : (
              <span className="text-white">{getToolIcon(wishNumber, generatedTitle)}</span>
            )}
          </div>
          {hasExported && (
            <span className="px-2 py-0.5 text-xs rounded-full text-green-400 bg-green-500/20">
              Exported
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
          {loadingTitles ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-gray-400">Loading...</span>
            </span>
          ) : (
            generatedTitle
          )}
        </h3>

        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
          {wishText}
        </p>

        <div className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
          hasSummary
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 group-hover:from-cyan-600 group-hover:to-teal-600 text-white'
            : 'bg-gray-700 group-hover:bg-gray-600 text-white'
        }`}>
          {hasSummary ? (
            <>
              <Wrench className="w-4 h-4" />
              View Build Plan
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Create Build Plan
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading || loadingWishes) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Build Lab...</p>
        </div>
      </div>
    );
  }

  const blueprintsReady = progress?.prototypes.filter(p => p.hasBlueprint).length || 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white">Build Lab</h1>
              <p className="text-xs text-gray-400">{teamName}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Lightbulb className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-white">How it works:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">1</span>
                <span className="text-sm text-gray-300">Create Build Plan</span>
              </div>
              <ArrowRight className="w-3 h-3 text-gray-600 hidden md:block" />
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-400">2</span>
                <span className="text-sm text-gray-300">Choose Claude or ChatGPT</span>
              </div>
              <ArrowRight className="w-3 h-3 text-gray-600 hidden md:block" />
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">3</span>
                <span className="text-sm text-gray-300">Follow the Guide & Export</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Your AI Tool Planners</h1>
            <p className="text-gray-400 text-sm">Plan and build AI tools for your business with Astra's guidance</p>
          </div>

          {blueprintsReady > 0 && (
            <button
              onClick={handleDownloadAllBlueprints}
              disabled={downloadingAll}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {downloadingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Download Blueprints</span>
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(wishNumber => renderWishCard(wishNumber))}
        </div>
      </main>
    </div>
  );
};
