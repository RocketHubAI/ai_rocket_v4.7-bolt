import React, { useState, useEffect } from 'react';
import {
  Rocket, Users, BarChart3, Search,
  CheckCircle, Clock, XCircle, Target,
  ArrowRight, Lightbulb, TrendingUp,
  Award, ChevronDown, ChevronUp, Sparkles,
  Brain, RefreshCw, Loader2, Zap, Building2,
  Heart, UsersRound, Wand2, ChevronLeft, ChevronRight,
  Save, Image, Presentation, Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WorkshopRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  team_name: string;
  registration_code: string;
  status: string;
  current_step: string;
  access_expires_at: string;
  created_at: string;
  completed_at: string | null;
  goals_count: number;
  goals_completed: number;
  has_wishes: boolean;
}

interface WorkshopStats {
  totalRegistrations: number;
  activeWorkshops: number;
  completedWorkshops: number;
  expiredWorkshops: number;
  avgCompletionRate: number;
  stepDistribution: Record<string, number>;
  totalGoals: number;
  completedGoals: number;
  totalWishes: number;
}

interface GoalData {
  goal_title: string;
  goal_description: string;
  user_name: string;
  team_name: string;
  is_completed: boolean;
  is_selected: boolean;
}

interface WishData {
  user_name: string;
  team_name: string;
  wish_1: string;
  wish_2: string;
  wish_3: string;
}

interface PrototypeData {
  wish_number: number;
  wish_text: string;
  prototype_title: string;
  tools_required: string[];
  status: string;
  user_name: string;
  team_name: string;
}

interface InsightCategory {
  title: string;
  icon: 'business' | 'personal' | 'team' | 'wish' | 'trend';
  insights: string[];
  examples: string[];
}

interface AIInsights {
  summary: string;
  goalCategories: InsightCategory[];
  wishTrends: InsightCategory[];
  prototypeTrends: InsightCategory[];
  recommendations: string[];
  generatedAt: Date;
}

interface SlideData {
  slideNumber: number;
  title: string;
  content: string;
  keyPoints: string[];
  visualDescription: string;
}

interface SlideImage {
  slideIndex: number;
  imageUrl: string | null;
  imageBase64: string | null;
  error?: string;
}

interface StoredInsight {
  id: string;
  insight_type: 'goals' | 'wishes' | 'plans';
  title: string;
  summary: string;
  insights_data: {
    insights: string[];
    examples: string[];
    categories?: InsightCategory[];
    recommendations: string[];
  };
  slides: SlideData[];
  slide_images?: SlideImage[];
  generated_at: string;
}

type InsightType = 'goals' | 'wishes' | 'plans';

const STEP_LABELS: Record<string, string> = {
  'registered': 'Registered',
  'onboarding': 'Onboarding',
  'mindset_journey': 'AI Mindset Journey',
  'journey': 'AI Mindset Journey',
  'goals': 'Goals Identified',
  'goal_selection': 'Goal Selected',
  'document_sync': 'Document Sync',
  'documents': 'Document Sync',
  'infographic': 'Infographic Created',
  'hub': 'Workshop Hub',
  'completed': 'Completed'
};

const STEP_ORDER = [
  'registered',
  'onboarding',
  'mindset_journey',
  'goals',
  'goal_selection',
  'document_sync',
  'hub',
  'completed'
];

export const WorkshopAnalyticsPanel: React.FC = () => {
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [wishes, setWishes] = useState<WishData[]>([]);
  const [prototypes, setPrototypes] = useState<PrototypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'goals' | 'wishes' | 'insights'>('overview');
  const [expandedWish, setExpandedWish] = useState<number | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [storedInsights, setStoredInsights] = useState<Record<InsightType, StoredInsight | null>>({
    goals: null,
    wishes: null,
    plans: null
  });
  const [generatingType, setGeneratingType] = useState<InsightType | null>(null);
  const [activeSlide, setActiveSlide] = useState<Record<InsightType, number>>({
    goals: 0,
    wishes: 0,
    plans: 0
  });
  const [expandedInsight, setExpandedInsight] = useState<InsightType | null>(null);
  const [slideImages, setSlideImages] = useState<Record<InsightType, SlideImage[]>>({
    goals: [],
    wishes: [],
    plans: []
  });
  const [generatingSlideImages, setGeneratingSlideImages] = useState<InsightType | null>(null);
  const [slideImageProgress, setSlideImageProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    loadData();
    loadStoredInsights();
  }, []);

  const loadStoredInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('workshop_admin_insights')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('Error loading stored insights:', error);
        return;
      }

      const insightsMap: Record<InsightType, StoredInsight | null> = {
        goals: null,
        wishes: null,
        plans: null
      };

      const imagesMap: Record<InsightType, SlideImage[]> = {
        goals: [],
        wishes: [],
        plans: []
      };

      data?.forEach(insight => {
        if (insight.insight_type in insightsMap) {
          insightsMap[insight.insight_type as InsightType] = insight as StoredInsight;
          if (insight.slide_images) {
            imagesMap[insight.insight_type as InsightType] = insight.slide_images;
          }
        }
      });

      setStoredInsights(insightsMap);
      setSlideImages(imagesMap);
    } catch (err) {
      console.error('Error loading stored insights:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRegistrations(),
        loadGoals(),
        loadWishes(),
        loadPrototypes()
      ]);
    } catch (err) {
      console.error('Error loading workshop data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: regs } = await supabase
        .from('workshop_registrations')
        .select('*');

      const { count: goalsCount } = await supabase
        .from('workshop_goals')
        .select('*', { count: 'exact', head: true });

      const { count: completedGoalsCount } = await supabase
        .from('workshop_goals')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', true);

      const { count: wishesCount } = await supabase
        .from('workshop_wishes')
        .select('*', { count: 'exact', head: true });

      const now = new Date();
      const active = regs?.filter(r => !r.completed_at && new Date(r.access_expires_at) > now).length || 0;
      const completed = regs?.filter(r => r.completed_at).length || 0;
      const expired = regs?.filter(r => !r.completed_at && new Date(r.access_expires_at) <= now).length || 0;

      const stepDist: Record<string, number> = {};
      regs?.forEach(r => {
        const step = r.current_step || 'registered';
        stepDist[step] = (stepDist[step] || 0) + 1;
      });

      setStats({
        totalRegistrations: regs?.length || 0,
        activeWorkshops: active,
        completedWorkshops: completed,
        expiredWorkshops: expired,
        avgCompletionRate: regs?.length ? Math.round((completed / regs.length) * 100) : 0,
        stepDistribution: stepDist,
        totalGoals: goalsCount || 0,
        completedGoals: completedGoalsCount || 0,
        totalWishes: wishesCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadRegistrations = async () => {
    try {
      const { data: regs, error } = await supabase
        .from('workshop_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading registrations:', error);
        return;
      }

      const enrichedRegs: WorkshopRegistration[] = await Promise.all(
        (regs || []).map(async (reg) => {
          const { count: goalsCount } = await supabase
            .from('workshop_goals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', reg.user_id);

          const { count: completedGoalsCount } = await supabase
            .from('workshop_goals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', reg.user_id)
            .eq('is_completed', true);

          const { data: wishData } = await supabase
            .from('workshop_wishes')
            .select('id')
            .eq('user_id', reg.user_id)
            .limit(1)
            .maybeSingle();

          return {
            id: reg.id,
            user_id: reg.user_id,
            email: reg.email,
            full_name: reg.full_name || 'Unknown',
            team_name: reg.team_name || 'Unknown',
            registration_code: reg.registration_code || '',
            status: reg.status || 'active',
            current_step: reg.current_step || 'registered',
            access_expires_at: reg.access_expires_at,
            created_at: reg.created_at,
            completed_at: reg.completed_at,
            goals_count: goalsCount || 0,
            goals_completed: completedGoalsCount || 0,
            has_wishes: !!wishData
          };
        })
      );

      setRegistrations(enrichedRegs);
    } catch (err) {
      console.error('Error loading registrations:', err);
    }
  };

  const loadGoals = async () => {
    try {
      const { data: goalsData, error } = await supabase
        .from('workshop_goals')
        .select(`
          goal_title,
          goal_description,
          is_completed,
          is_selected,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading goals:', error);
        return;
      }

      const userIds = [...new Set(goalsData?.map(g => g.user_id) || [])];
      const { data: regsData } = await supabase
        .from('workshop_registrations')
        .select('user_id, full_name, team_name')
        .in('user_id', userIds);

      const userMap = new Map(regsData?.map(r => [r.user_id, r]) || []);

      const enrichedGoals: GoalData[] = (goalsData || []).map(goal => {
        const reg = userMap.get(goal.user_id);
        return {
          goal_title: goal.goal_title,
          goal_description: goal.goal_description,
          user_name: reg?.full_name || 'Unknown',
          team_name: reg?.team_name || 'Unknown',
          is_completed: goal.is_completed,
          is_selected: goal.is_selected
        };
      });

      setGoals(enrichedGoals);
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  };

  const loadWishes = async () => {
    try {
      const { data: wishesData, error } = await supabase
        .from('workshop_wishes')
        .select('user_id, wish_1, wish_2, wish_3')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading wishes:', error);
        return;
      }

      const userIds = [...new Set(wishesData?.map(w => w.user_id) || [])];
      const { data: regsData } = await supabase
        .from('workshop_registrations')
        .select('user_id, full_name, team_name')
        .in('user_id', userIds);

      const userMap = new Map(regsData?.map(r => [r.user_id, r]) || []);

      const enrichedWishes: WishData[] = (wishesData || []).map(wish => {
        const reg = userMap.get(wish.user_id);
        return {
          user_name: reg?.full_name || 'Unknown',
          team_name: reg?.team_name || 'Unknown',
          wish_1: wish.wish_1,
          wish_2: wish.wish_2,
          wish_3: wish.wish_3
        };
      });

      setWishes(enrichedWishes);
    } catch (err) {
      console.error('Error loading wishes:', err);
    }
  };

  const loadPrototypes = async () => {
    try {
      const { data: prototypeData, error } = await supabase
        .from('build_lab_prototypes')
        .select('user_id, wish_number, wish_text, prototype_title, tools_required, status')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading prototypes:', error);
        return;
      }

      const userIds = [...new Set(prototypeData?.map(p => p.user_id) || [])];
      const { data: regsData } = await supabase
        .from('workshop_registrations')
        .select('user_id, full_name, team_name')
        .in('user_id', userIds);

      const userMap = new Map(regsData?.map(r => [r.user_id, r]) || []);

      const enrichedPrototypes: PrototypeData[] = (prototypeData || []).map(proto => {
        const reg = userMap.get(proto.user_id);
        return {
          wish_number: proto.wish_number,
          wish_text: proto.wish_text,
          prototype_title: proto.prototype_title || 'Untitled',
          tools_required: proto.tools_required || [],
          status: proto.status,
          user_name: reg?.full_name || 'Unknown',
          team_name: reg?.team_name || 'Unknown'
        };
      });

      setPrototypes(enrichedPrototypes);
    } catch (err) {
      console.error('Error loading prototypes:', err);
    }
  };

  const generateInsights = async () => {
    if (goals.length === 0 && wishes.length === 0) {
      setInsightsError('No data available to analyze. Goals and wishes data is required.');
      return;
    }

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const goalsData = goals.map(g => ({
        title: g.goal_title,
        description: g.goal_description,
        completed: g.is_completed,
        selected: g.is_selected
      }));

      const wishesData = wishes.flatMap(w => [w.wish_1, w.wish_2, w.wish_3].filter(Boolean));

      const prototypesData = prototypes.map(p => ({
        title: p.prototype_title,
        wish: p.wish_text,
        tools: p.tools_required,
        status: p.status
      }));

      const prompt = `You are an AI data analyst for a workshop platform. Analyze the following workshop data and provide insights in JSON format.

DATA TO ANALYZE:
=================

GOALS (${goals.length} total):
${JSON.stringify(goalsData, null, 2)}

AI WISHES (${wishesData.length} total):
${JSON.stringify(wishesData, null, 2)}

PROTOTYPES/PLANS (${prototypes.length} total):
${JSON.stringify(prototypesData, null, 2)}

ANALYSIS INSTRUCTIONS:
1. Categorize goals into Business, Personal, and Team themes
2. Identify common patterns and trends in what users want to achieve
3. Analyze AI wishes to understand what automation/AI capabilities users desire
4. Look at prototype/plan data to understand implementation preferences
5. Provide actionable recommendations

Return ONLY valid JSON in this exact format:
{
  "summary": "A 2-3 sentence executive summary of the key findings",
  "goalCategories": [
    {
      "title": "Business Goals Trends",
      "icon": "business",
      "insights": ["insight 1", "insight 2", "insight 3"],
      "examples": ["specific goal example 1", "specific goal example 2"]
    },
    {
      "title": "Personal Goals Trends",
      "icon": "personal",
      "insights": ["insight 1", "insight 2"],
      "examples": ["specific goal example"]
    },
    {
      "title": "Team Goals Trends",
      "icon": "team",
      "insights": ["insight 1", "insight 2"],
      "examples": ["specific goal example"]
    }
  ],
  "wishTrends": [
    {
      "title": "Top AI Automation Wishes",
      "icon": "wish",
      "insights": ["Most common wish theme 1", "Most common wish theme 2", "Most common wish theme 3"],
      "examples": ["actual wish text example 1", "actual wish text example 2"]
    },
    {
      "title": "Technology Preferences",
      "icon": "trend",
      "insights": ["insight about tools/tech preferences"],
      "examples": ["example"]
    }
  ],
  "prototypeTrends": [
    {
      "title": "Implementation Patterns",
      "icon": "trend",
      "insights": ["insight about what users are building"],
      "examples": ["prototype example"]
    }
  ],
  "recommendations": [
    "Actionable recommendation 1 based on the data",
    "Actionable recommendation 2 based on the data",
    "Actionable recommendation 3 based on the data"
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const parsedInsights = JSON.parse(jsonMatch[0]);
      setInsights({
        ...parsedInsights,
        generatedAt: new Date()
      });
    } catch (err) {
      console.error('Error generating insights:', err);
      setInsightsError('Failed to generate insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const generateTypeInsights = async (type: InsightType) => {
    setGeneratingType(type);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      let dataToAnalyze: string;
      let title: string;
      let promptContext: string;

      if (type === 'goals') {
        const goalsData = goals.map(g => ({
          title: g.goal_title,
          description: g.goal_description,
          completed: g.is_completed,
          selected: g.is_selected,
          user: g.user_name,
          team: g.team_name
        }));
        dataToAnalyze = JSON.stringify(goalsData, null, 2);
        title = 'Workshop Goals Analysis';
        promptContext = `Analyze ${goals.length} workshop goals from AI-preneurs (entrepreneurs learning to leverage AI).

CRITICAL PERSPECTIVE: What did we learn about Entrepreneurs from this data that helps us better understand our customers and how they want to use AI to achieve their goals?

Focus your analysis on:
- What types of business outcomes do entrepreneurs prioritize? (revenue, efficiency, scale, freedom)
- What personal aspirations drive their AI adoption? (more time, less stress, bigger impact)
- What patterns reveal their readiness level for AI implementation?
- What gaps exist between their goals and their current capabilities?
- What common pain points are they trying to solve with AI?
- How ambitious vs. practical are their goal-setting patterns?`;
      } else if (type === 'wishes') {
        const wishesData = wishes.flatMap(w => [
          { wish: w.wish_1, user: w.user_name, team: w.team_name },
          { wish: w.wish_2, user: w.user_name, team: w.team_name },
          { wish: w.wish_3, user: w.user_name, team: w.team_name }
        ].filter(item => item.wish));
        dataToAnalyze = JSON.stringify(wishesData, null, 2);
        title = 'AI Wishes Analysis';
        promptContext = `Analyze ${wishesData.length} AI automation wishes from AI-preneurs (entrepreneurs learning to leverage AI).

CRITICAL PERSPECTIVE: What did we learn about Entrepreneurs from this data that helps us better understand our customers and how they want to use AI to achieve their goals?

Focus your analysis on:
- What tasks do entrepreneurs most want AI to handle for them? (the "I wish AI could..." patterns)
- What does this reveal about their biggest time drains and frustrations?
- What AI capabilities do they dream about vs. what's actually possible today?
- What business functions do they want to automate first? (marketing, operations, customer service, etc.)
- What level of AI sophistication are they imagining? (simple automation vs. autonomous agents)
- What emotional drivers are behind their wishes? (fear of falling behind, excitement about possibilities, etc.)`;
      } else {
        const plansData = prototypes.map(p => ({
          title: p.prototype_title,
          wish: p.wish_text,
          tools: p.tools_required,
          status: p.status,
          user: p.user_name,
          team: p.team_name
        }));
        dataToAnalyze = JSON.stringify(plansData, null, 2);
        title = 'Build Plans Analysis';
        promptContext = `Analyze ${prototypes.length} build lab prototypes/plans from AI-preneurs (entrepreneurs learning to leverage AI).

CRITICAL PERSPECTIVE: What did we learn about Entrepreneurs from this data that helps us better understand our customers and how they want to use AI to achieve their goals?

Focus your analysis on:
- What types of AI solutions are entrepreneurs actually building? (chatbots, automation, content, analytics)
- What tools do they gravitate toward? (Claude, ChatGPT, N8N, Make, etc.) and what does this reveal?
- What complexity level matches their comfort zone? (simple vs. sophisticated)
- What's the gap between their wishes and what they're actually building?
- What patterns predict success vs. abandonment in their projects?
- What support or resources would help them complete more ambitious builds?`;
      }

      const insightsPrompt = `You are an AI researcher analyzing workshop data from AI-preneurs (entrepreneurs learning to leverage AI in their businesses). Your goal is to extract actionable customer insights.

CORE QUESTION: What did we learn about Entrepreneurs from this data that we can use to better understand our customers and how they want to use AI to achieve their goals?

${promptContext}

DATA TO ANALYZE:
${dataToAnalyze}

Create a 5-slide executive presentation that tells the story of what we learned about our entrepreneur customers.

Return ONLY valid JSON in this exact format:
{
  "summary": "A compelling 2-3 sentence executive summary focused on the key customer insights discovered - what entrepreneurs want, need, and struggle with regarding AI adoption",
  "insights": [
    "Customer insight about entrepreneur behavior/mindset 1",
    "Customer insight about what entrepreneurs want from AI 2",
    "Customer insight about entrepreneur pain points 3",
    "Customer insight about entrepreneur readiness/sophistication 4",
    "Customer insight about opportunity to serve entrepreneurs better 5"
  ],
  "examples": ["Direct quote or specific example that illustrates entrepreneur thinking 1", "Example 2", "Example 3"],
  "recommendations": [
    "How we can better serve entrepreneurs based on this data 1",
    "Product/service opportunity identified 2",
    "Support or education gap we could fill 3"
  ],
  "slides": [
    {
      "slideNumber": 1,
      "title": "What We Learned About AI-preneurs",
      "content": "Executive overview of key customer insights - who are these entrepreneurs and what drives their AI journey",
      "keyPoints": ["Key finding about entrepreneur mindset", "Key finding about their goals", "Key finding about their challenges"],
      "visualDescription": "Customer persona or journey map visual"
    },
    {
      "slideNumber": 2,
      "title": "The Entrepreneur AI Adoption Pattern",
      "content": "What patterns emerged about how entrepreneurs approach AI implementation",
      "keyPoints": ["Pattern 1 with data support", "Pattern 2 with data support", "Pattern 3 with data support"],
      "visualDescription": "Trend lines or pattern visualization"
    },
    {
      "slideNumber": 3,
      "title": "Pain Points & Opportunities",
      "content": "What frustrations and gaps did entrepreneurs reveal through their responses",
      "keyPoints": ["Major pain point discovered", "Unmet need identified", "Opportunity for better solutions"],
      "visualDescription": "Problem-solution matrix or gap analysis chart"
    },
    {
      "slideNumber": 4,
      "title": "Voice of the Customer",
      "content": "Specific examples that bring the entrepreneur perspective to life",
      "keyPoints": ["Illustrative example with context", "What this tells us about customer needs"],
      "visualDescription": "Quote cards or customer story highlights"
    },
    {
      "slideNumber": 5,
      "title": "How We Can Better Serve Them",
      "content": "Actionable recommendations for improving our value to entrepreneur customers",
      "keyPoints": ["Recommendation 1 based on insights", "Recommendation 2 based on insights", "Recommendation 3 based on insights"],
      "visualDescription": "Action roadmap or priority matrix"
    }
  ]
}`;

      const result = await model.generateContent(insightsPrompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const parsedInsights = JSON.parse(jsonMatch[0]);

      const { data: existingData } = await supabase
        .from('workshop_admin_insights')
        .select('id')
        .eq('insight_type', type)
        .maybeSingle();

      const insightRecord = {
        insight_type: type,
        title,
        summary: parsedInsights.summary,
        insights_data: {
          insights: parsedInsights.insights,
          examples: parsedInsights.examples,
          recommendations: parsedInsights.recommendations
        },
        slides: parsedInsights.slides,
        generated_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      let savedInsight: StoredInsight;

      if (existingData) {
        const { data, error } = await supabase
          .from('workshop_admin_insights')
          .update(insightRecord)
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;
        savedInsight = data as StoredInsight;
      } else {
        const { data, error } = await supabase
          .from('workshop_admin_insights')
          .insert(insightRecord)
          .select()
          .single();

        if (error) throw error;
        savedInsight = data as StoredInsight;
      }

      setStoredInsights(prev => ({
        ...prev,
        [type]: savedInsight
      }));

      setExpandedInsight(type);
      setActiveSlide(prev => ({ ...prev, [type]: 0 }));

    } catch (err) {
      console.error(`Error generating ${type} insights:`, err);
    } finally {
      setGeneratingType(null);
    }
  };

  const generateSlideInfographics = async (type: InsightType) => {
    const insight = storedInsights[type];
    if (!insight || !insight.slides || insight.slides.length === 0) {
      return;
    }

    setGeneratingSlideImages(type);
    setSlideImageProgress({ current: 0, total: insight.slides.length });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const generatedImages: SlideImage[] = [];

      for (let i = 0; i < insight.slides.length; i++) {
        setSlideImageProgress({ current: i + 1, total: insight.slides.length });

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-insights-infographic`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              insight_type: type,
              insights_data: {
                summary: insight.summary,
                insights: insight.insights_data.insights,
                examples: insight.insights_data.examples,
                recommendations: insight.insights_data.recommendations,
                slides: insight.slides
              },
              slide_index: i
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          generatedImages.push({
            slideIndex: i,
            imageUrl: null,
            imageBase64: null,
            error: errorData.error || 'Failed to generate image'
          });
          continue;
        }

        const result = await response.json();
        generatedImages.push({
          slideIndex: result.slideIndex,
          imageUrl: result.imageUrl,
          imageBase64: result.imageBase64,
          error: result.error
        });

        if (i < insight.slides.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setSlideImages(prev => ({
        ...prev,
        [type]: generatedImages
      }));

      const { error: updateError } = await supabase
        .from('workshop_admin_insights')
        .update({ slide_images: generatedImages })
        .eq('id', insight.id);

      if (updateError) {
        console.error('Error saving slide images:', updateError);
      }

    } catch (err) {
      console.error(`Error generating slide images for ${type}:`, err);
    } finally {
      setGeneratingSlideImages(null);
      setSlideImageProgress(null);
    }
  };

  const getStepColor = (step: string) => {
    const colors: Record<string, string> = {
      'registered': 'bg-gray-500',
      'onboarding': 'bg-blue-500',
      'mindset_journey': 'bg-cyan-500',
      'journey': 'bg-cyan-500',
      'goals': 'bg-amber-500',
      'goal_selection': 'bg-orange-500',
      'document_sync': 'bg-teal-500',
      'documents': 'bg-teal-500',
      'infographic': 'bg-emerald-500',
      'hub': 'bg-green-500',
      'completed': 'bg-green-600'
    };
    return colors[step] || 'bg-gray-500';
  };

  const getStatusBadge = (reg: WorkshopRegistration) => {
    if (reg.completed_at) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (new Date(reg.access_expires_at) <= new Date()) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
          <XCircle className="w-3 h-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">
        <Clock className="w-3 h-3" />
        Active
      </span>
    );
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGoals = goals.filter(goal =>
    goal.goal_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    goal.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    goal.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWishes = wishes.filter(wish =>
    wish.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wish.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wish.wish_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wish.wish_2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wish.wish_3?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Rocket className="w-6 h-6 text-cyan-400" />
          AI-preneur Workshop Analytics
        </h2>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
        {(['overview', 'insights', 'users', 'goals', 'wishes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab === 'overview' && <BarChart3 className="w-4 h-4" />}
            {tab === 'insights' && <Brain className="w-4 h-4" />}
            {tab === 'users' && <Users className="w-4 h-4" />}
            {tab === 'goals' && <Target className="w-4 h-4" />}
            {tab === 'wishes' && <Lightbulb className="w-4 h-4" />}
            {tab === 'overview' ? 'Overview' : tab === 'insights' ? 'AI Insights' : tab === 'users' ? `Users (${registrations.length})` : tab === 'goals' ? `Goals (${goals.length})` : `Wishes (${wishes.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalRegistrations}</p>
                  <p className="text-xs text-gray-400">Total Users</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.activeWorkshops}</p>
                  <p className="text-xs text-gray-400">Active</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.completedWorkshops}</p>
                  <p className="text-xs text-gray-400">Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.avgCompletionRate}%</p>
                  <p className="text-xs text-gray-400">Completion Rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Workshop Progress Distribution
              </h3>
              <div className="space-y-3">
                {STEP_ORDER.map(step => {
                  const count = stats.stepDistribution[step] || 0;
                  const percentage = stats.totalRegistrations > 0
                    ? Math.round((count / stats.totalRegistrations) * 100)
                    : 0;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStepColor(step)}`} />
                      <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                        {STEP_LABELS[step] || step}
                      </span>
                      <span className="text-sm text-white font-medium w-8 text-right">{count}</span>
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStepColor(step)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Content Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-gray-400">Total Goals</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalGoals}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.completedGoals} completed ({stats.totalGoals > 0 ? Math.round((stats.completedGoals / stats.totalGoals) * 100) : 0}%)
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-gray-400">AI Wishes</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalWishes}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.totalWishes * 3} individual wishes
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Completed</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.completedWorkshops}</p>
                  <p className="text-xs text-gray-500 mt-1">workshop journeys</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-gray-400">Expired</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.expiredWorkshops}</p>
                  <p className="text-xs text-gray-500 mt-1">need re-engagement</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Recent Goals (Top 10)
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {goals.slice(0, 10).map((goal, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    goal.is_completed
                      ? 'bg-green-500/10 border-green-500/30'
                      : goal.is_selected
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-gray-700/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{goal.goal_title}</p>
                      <p className="text-xs text-gray-400 mt-1">{goal.user_name} - {goal.team_name}</p>
                    </div>
                    {goal.is_completed && (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                AI-Powered Insights Dashboard
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Generate separate insights presentations for Goals, Wishes, and Plans
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {(['goals', 'wishes', 'plans'] as InsightType[]).map((type) => {
              const insight = storedInsights[type];
              const isExpanded = expandedInsight === type;
              const isGenerating = generatingType === type;
              const currentSlide = activeSlide[type];

              const config = {
                goals: {
                  icon: Target,
                  color: 'amber',
                  label: 'Goals Analysis',
                  description: `Analyze ${goals.length} workshop goals`,
                  bgGradient: 'from-amber-500/10 to-orange-500/10',
                  borderColor: 'border-amber-500/30',
                  iconBg: 'bg-amber-500/20',
                  iconColor: 'text-amber-400'
                },
                wishes: {
                  icon: Lightbulb,
                  color: 'cyan',
                  label: 'Wishes Analysis',
                  description: `Analyze ${wishes.length * 3} AI wishes`,
                  bgGradient: 'from-cyan-500/10 to-teal-500/10',
                  borderColor: 'border-cyan-500/30',
                  iconBg: 'bg-cyan-500/20',
                  iconColor: 'text-cyan-400'
                },
                plans: {
                  icon: Wand2,
                  color: 'emerald',
                  label: 'Plans Analysis',
                  description: `Analyze ${prototypes.length} build plans`,
                  bgGradient: 'from-emerald-500/10 to-green-500/10',
                  borderColor: 'border-emerald-500/30',
                  iconBg: 'bg-emerald-500/20',
                  iconColor: 'text-emerald-400'
                }
              }[type];

              const IconComponent = config.icon;

              return (
                <div key={type} className={`bg-gray-800 rounded-xl border ${insight ? config.borderColor : 'border-gray-700'} overflow-hidden`}>
                  <div
                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/50 transition-colors ${isExpanded ? 'border-b border-gray-700' : ''}`}
                    onClick={() => setExpandedInsight(isExpanded ? null : type)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                        <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          {config.label}
                          {insight && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1">
                              <Save className="w-3 h-3" />
                              Saved
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-400">{config.description}</p>
                        {insight && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last generated: {format(new Date(insight.generated_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateTypeInsights(type);
                        }}
                        disabled={isGenerating || generatingType !== null}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          isGenerating
                            ? 'bg-gray-600 text-gray-400'
                            : `bg-gradient-to-r ${
                                type === 'goals' ? 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' :
                                type === 'wishes' ? 'from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600' :
                                'from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600'
                              } text-white`
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Presentation className="w-4 h-4" />
                            {insight ? 'Regenerate' : 'Generate'}
                          </>
                        )}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && insight && (
                    <div className="p-4 space-y-4">
                      <div className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-xl p-4`}>
                        <div className="flex items-start gap-3">
                          <Zap className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                          <div>
                            <h5 className="font-medium text-white mb-1">Executive Summary</h5>
                            <p className="text-gray-300 text-sm">{insight.summary}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Key Insights
                          </h5>
                          <ul className="space-y-2">
                            {insight.insights_data.insights.slice(0, 5).map((ins, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                {ins}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-cyan-400" />
                            Recommendations
                          </h5>
                          <ul className="space-y-2">
                            {insight.insights_data.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="w-5 h-5 rounded-full bg-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {i + 1}
                                </span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {insight.slides && insight.slides.length > 0 && (
                        <div className="border-t border-gray-700 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="font-medium text-white flex items-center gap-2">
                              <Image className="w-4 h-4 text-teal-400" />
                              5-Slide Infographic Presentation
                            </h5>
                            <div className="flex items-center gap-3">
                              {slideImages[type]?.length === 0 && generatingSlideImages !== type && (
                                <button
                                  onClick={() => generateSlideInfographics(type)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-medium rounded-lg transition-all"
                                >
                                  <Wand2 className="w-4 h-4" />
                                  Generate Infographics
                                </button>
                              )}
                              {generatingSlideImages === type && slideImageProgress && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
                                  <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                                  <span className="text-sm text-gray-300">
                                    Generating slide {slideImageProgress.current}/{slideImageProgress.total}...
                                  </span>
                                </div>
                              )}
                              {slideImages[type]?.length > 0 && generatingSlideImages !== type && (
                                <button
                                  onClick={() => generateSlideInfographics(type)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                                  title="Regenerate infographics"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Regenerate
                                </button>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setActiveSlide(prev => ({ ...prev, [type]: Math.max(0, currentSlide - 1) }))}
                                  disabled={currentSlide === 0}
                                  className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronLeft className="w-4 h-4 text-gray-300" />
                                </button>
                                <span className="text-sm text-gray-400 min-w-[60px] text-center">
                                  {currentSlide + 1} / {insight.slides.length}
                                </span>
                                <button
                                  onClick={() => setActiveSlide(prev => ({ ...prev, [type]: Math.min(insight.slides.length - 1, currentSlide + 1) }))}
                                  disabled={currentSlide === insight.slides.length - 1}
                                  className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4 text-gray-300" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const currentSlideImage = slideImages[type]?.find(img => img.slideIndex === currentSlide);
                            const hasImage = currentSlideImage && (currentSlideImage.imageUrl || currentSlideImage.imageBase64);

                            if (hasImage) {
                              return (
                                <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
                                  <img
                                    src={currentSlideImage.imageUrl || `data:image/png;base64,${currentSlideImage.imageBase64}`}
                                    alt={`Slide ${currentSlide + 1}: ${insight.slides[currentSlide]?.title}`}
                                    className="w-full h-full object-contain"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                    <p className="text-white text-sm font-medium">
                                      {insight.slides[currentSlide]?.title}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            if (generatingSlideImages === type) {
                              return (
                                <div className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-xl p-8 aspect-video flex items-center justify-center`}>
                                  <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
                                      <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                                    </div>
                                    <p className="text-gray-300 font-medium">Generating infographic...</p>
                                    <p className="text-gray-500 text-sm mt-1">
                                      Creating slide {slideImageProgress?.current || currentSlide + 1} of {insight.slides.length}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-xl p-6 min-h-[280px]`}>
                                {insight.slides[currentSlide] && (
                                  <div className="h-full flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center text-sm font-bold ${config.iconColor}`}>
                                        {insight.slides[currentSlide].slideNumber}
                                      </span>
                                      <h6 className="text-lg font-semibold text-white">
                                        {insight.slides[currentSlide].title}
                                      </h6>
                                    </div>
                                    <p className="text-gray-300 mb-4 flex-shrink-0">
                                      {insight.slides[currentSlide].content}
                                    </p>
                                    <div className="flex-1">
                                      <ul className="space-y-2">
                                        {insight.slides[currentSlide].keyPoints.map((point, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                            <Play className={`w-3 h-3 ${config.iconColor} flex-shrink-0 mt-1`} />
                                            {point}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-600/50">
                                      <p className="text-xs text-gray-500 italic">
                                        Click "Generate Infographics" above to create visual slides with Gemini AI
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="flex justify-center gap-2 mt-3">
                            {insight.slides.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveSlide(prev => ({ ...prev, [type]: i }))}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  i === currentSlide
                                    ? type === 'goals' ? 'bg-amber-400' :
                                      type === 'wishes' ? 'bg-cyan-400' : 'bg-emerald-400'
                                    : 'bg-gray-600 hover:bg-gray-500'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {insight.insights_data.examples && insight.insights_data.examples.length > 0 && (
                        <div className="bg-gray-700/30 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Notable Examples</h5>
                          <div className="space-y-2">
                            {insight.insights_data.examples.slice(0, 3).map((ex, i) => (
                              <p key={i} className="text-sm text-gray-300 italic">"{ex}"</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isExpanded && !insight && (
                    <div className="p-8 text-center">
                      <div className={`w-16 h-16 rounded-2xl ${config.iconBg} flex items-center justify-center mx-auto mb-4`}>
                        <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
                      </div>
                      <h5 className="text-lg font-medium text-white mb-2">No Insights Generated Yet</h5>
                      <p className="text-gray-400 max-w-md mx-auto">
                        Click "Generate" to create a 5-slide presentation analyzing your {type} data with AI-powered insights.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Team</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Progress</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Goals</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Wishes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredRegistrations.map(reg => (
                    <tr key={reg.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{reg.full_name}</p>
                          <p className="text-xs text-gray-400">{reg.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">{reg.team_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(reg)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStepColor(reg.current_step)}`} />
                          <span className="text-sm text-gray-300">
                            {STEP_LABELS[reg.current_step] || reg.current_step}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-white">{reg.goals_completed}</span>
                          <span className="text-sm text-gray-500">/ {reg.goals_count}</span>
                          {reg.goals_count > 0 && reg.goals_completed === reg.goals_count && (
                            <CheckCircle className="w-4 h-4 text-green-400 ml-1" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {reg.has_wishes ? (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Lightbulb className="w-4 h-4" />
                            <span className="text-sm">Yes</span>
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-400">
                          {format(new Date(reg.created_at), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${
                          new Date(reg.access_expires_at) <= new Date()
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}>
                          {format(new Date(reg.access_expires_at), 'MMM d, yyyy')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRegistrations.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No users found matching your search.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search goals by title, user, or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map((goal, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-colors ${
                  goal.is_completed
                    ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                    : goal.is_selected
                    ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-white">{goal.goal_title}</h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {goal.is_selected && (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                        Selected
                      </span>
                    )}
                    {goal.is_completed && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">{goal.goal_description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{goal.user_name}</span>
                  <span className="text-gray-600">-</span>
                  <span>{goal.team_name}</span>
                </div>
              </div>
            ))}
          </div>
          {filteredGoals.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No goals found matching your search.
            </div>
          )}
        </div>
      )}

      {activeTab === 'wishes' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search wishes by user, team, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div className="space-y-4">
            {filteredWishes.map((wish, idx) => (
              <div
                key={idx}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedWish(expandedWish === idx ? null : idx)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">{wish.user_name}</p>
                      <p className="text-sm text-gray-400">{wish.team_name}</p>
                    </div>
                  </div>
                  {expandedWish === idx ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedWish === idx && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-bold">1</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Wish 1</span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{wish.wish_1 || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500/30 text-amber-400 flex items-center justify-center text-xs font-bold">2</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Wish 2</span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{wish.wish_2 || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-green-500/30 text-green-400 flex items-center justify-center text-xs font-bold">3</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Wish 3</span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{wish.wish_3 || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {filteredWishes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No wishes found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
