import React, { useState, useEffect } from 'react';
import {
  Rocket, Users, BarChart3, Download, Search,
  ChevronDown, ChevronUp, CheckCircle, Clock, XCircle,
  TrendingUp, Calendar, ArrowRight, UserPlus, Target, PieChart as PieChartIcon,
  Trophy, Star, AlertCircle, Minus, RefreshCw, Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

type TabView = 'registrations' | 'metrics';

interface Registration {
  id: string;
  name: string;
  email: string;
  team_name: string;
  industry: string;
  created_at: string;
  source: string | null;
  team_id: string | null;
  user_id: string | null;
  onboarding_started: boolean;
  onboarding_completed: boolean;
  challenge_started_at: string | null;
  converted_at: string | null;
  updated_at: string | null;
  survey_response?: {
    current_ai_usage: string;
    ai_use_cases: string[];
    monthly_ai_spend: string;
    connected_data: string;
    biggest_pain_points: string;
    industry: string | null;
    email: string | null;
    mastermind_groups: string[];
  };
  invite_code?: {
    code: string;
    is_redeemed: boolean;
    redeemed_at?: string;
    valid_from?: string;
    expires_at?: string;
  };
  email_sequence?: Array<{
    email_type: string;
    scheduled_for: string;
    sent_at: string | null;
  }>;
}

interface MoonshotStats {
  totalRegistrations: number;
  newEntries: number;
  redeemedCodes: number;
  existingUserRegistrations: number;
  convertedToTeam: number;
  onboardingStarted: number;
  onboardingCompleted: number;
  pendingInviteCodes: number;
  expiredInviteCodes: number;
  registrationsByIndustry: Record<string, number>;
  registrationsByAiUsage: Record<string, number>;
  registrationsBySpend: Record<string, number>;
  registrationsByConnectedData: Record<string, number>;
  registrationsByUseCases: Record<string, number>;
  painPointsBreakdown: Record<string, number>;
  painPointsList: Array<{ email: string; text: string }>;
  registrationsByDay: Array<{ date: string; count: number }>;
  registrationsBySource: Record<string, number>;
  registrationsByMastermindGroups: Record<string, number>;
  surveyResponseCount: number;
}

interface ChallengeStanding {
  team_id: string;
  team_name: string;
  industry: string | null;
  current_astra_score: number;
  run_indicator: string;
  build_indicator: string;
  grow_indicator: string;
  launch_points_indicator: string;
  overall_indicator: string;
  percentile_rank: number;
  is_top_25_percent: boolean;
  last_calculated_at: string | null;
}

interface ChallengeMetrics {
  totalParticipants: number;
  top25Count: number;
  averageScore: number;
  scoreDistribution: { range: string; count: number }[];
  indicatorBreakdown: {
    run: { strong: number; moderate: number; needsImprovement: number };
    build: { strong: number; moderate: number; needsImprovement: number };
    grow: { strong: number; moderate: number; needsImprovement: number };
    launchPoints: { strong: number; moderate: number; needsImprovement: number };
  };
  standings: ChallengeStanding[];
  lastCalculatedAt: string | null;
}

const PIE_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#eab308', '#ec4899',
  '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f59e0b'
];

interface PieChartProps {
  data: Record<string, number>;
  labels?: Record<string, string>;
  size?: number;
}

const SimplePieChart: React.FC<PieChartProps> = ({ data, labels = {}, size = 160 }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-gray-500 text-sm">No data</span>
      </div>
    );
  }

  let cumulativePercent = 0;
  const slices = entries.map(([key, count], index) => {
    const percent = (count / total) * 100;
    const startAngle = cumulativePercent * 3.6;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 3.6;
    const largeArc = percent > 50 ? 1 : 0;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const radius = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const pathData = percent === 100
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.001} ${cy - radius} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      key,
      count,
      percent,
      color: PIE_COLORS[index % PIE_COLORS.length],
      path: pathData
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-0">
        {slices.map((slice) => (
          <path
            key={slice.key}
            d={slice.path}
            fill={slice.color}
            stroke="#1f2937"
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <title>{`${labels[slice.key] || slice.key}: ${slice.count} (${slice.percent.toFixed(1)}%)`}</title>
          </path>
        ))}
        <circle cx={size / 2} cy={size / 2} r={size / 4} fill="#1f2937" />
        <text x={size / 2} y={size / 2 - 8} textAnchor="middle" className="fill-white text-lg font-bold">
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-gray-400 text-xs">
          responses
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs max-h-32 overflow-y-auto w-full">
        {slices.slice(0, 8).map((slice) => (
          <div key={slice.key} className="flex items-center gap-1.5 truncate">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: slice.color }} />
            <span className="text-gray-400 truncate">{labels[slice.key] || slice.key}</span>
            <span className="text-white font-medium ml-auto">{slice.count}</span>
          </div>
        ))}
        {slices.length > 8 && (
          <div className="text-gray-500 col-span-2 text-center">+{slices.length - 8} more</div>
        )}
      </div>
    </div>
  );
};

export const MoonshotAnalyticsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('registrations');
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<MoonshotStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'email' | 'industry'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [challengeMetrics, setChallengeMetrics] = useState<ChallengeMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [calculatingScores, setCalculatingScores] = useState(false);

  useEffect(() => {
    fetchData();
    fetchChallengeMetrics();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: regs, error: regsError } = await supabase
        .from('moonshot_registrations')
        .select(`
          id,
          name,
          email,
          team_name,
          industry,
          created_at,
          source,
          team_id,
          user_id,
          onboarding_started,
          onboarding_completed,
          challenge_started_at,
          converted_at,
          updated_at,
          moonshot_survey_responses (
            current_ai_usage,
            ai_use_cases,
            monthly_ai_spend,
            connected_data,
            biggest_pain_points,
            industry,
            email,
            mastermind_groups
          ),
          moonshot_invite_codes (
            code,
            is_redeemed,
            redeemed_at,
            valid_from,
            expires_at
          ),
          moonshot_email_sequence (
            email_type,
            scheduled_for,
            sent_at
          )
        `)
        .order('created_at', { ascending: false });

      if (regsError) throw regsError;

      const now = new Date();
      const registrationsData: Registration[] = (regs || []).map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        team_name: r.team_name,
        industry: r.industry,
        created_at: r.created_at,
        source: r.source,
        team_id: r.team_id,
        user_id: r.user_id,
        onboarding_started: r.onboarding_started || false,
        onboarding_completed: r.onboarding_completed || false,
        challenge_started_at: r.challenge_started_at,
        converted_at: r.converted_at,
        updated_at: r.updated_at,
        survey_response: r.moonshot_survey_responses?.[0] || undefined,
        invite_code: r.moonshot_invite_codes?.[0] || undefined,
        email_sequence: r.moonshot_email_sequence || []
      }));

      setRegistrations(registrationsData);

      const newEntries = registrationsData.filter(r => r.source === 'new').length;
      const redeemedCodes = registrationsData.filter(r => r.invite_code?.is_redeemed).length;
      const existingUserRegistrations = registrationsData.filter(r => r.source === 'existing').length;
      const convertedToTeam = registrationsData.filter(r => r.team_id !== null).length;
      const onboardingStarted = registrationsData.filter(r => r.onboarding_started).length;
      const onboardingCompleted = registrationsData.filter(r => r.onboarding_completed).length;

      const pendingInviteCodes = registrationsData.filter(r =>
        r.invite_code &&
        !r.invite_code.is_redeemed &&
        r.invite_code.expires_at &&
        new Date(r.invite_code.expires_at) > now
      ).length;

      const expiredInviteCodes = registrationsData.filter(r =>
        r.invite_code &&
        !r.invite_code.is_redeemed &&
        r.invite_code.expires_at &&
        new Date(r.invite_code.expires_at) <= now
      ).length;

      const industryCount: Record<string, number> = {};
      const aiUsageCount: Record<string, number> = {};
      const spendCount: Record<string, number> = {};
      const connectedDataCount: Record<string, number> = {};
      const useCasesCount: Record<string, number> = {};
      const painPointsBreakdown: Record<string, number> = {};
      const painPointsList: Array<{ email: string; text: string }> = [];
      const dayCount: Record<string, number> = {};
      const sourceCount: Record<string, number> = {};
      const mastermindGroupsCount: Record<string, number> = {};
      let surveyResponseCount = 0;

      registrationsData.forEach(r => {
        const sourceLabel = r.source || 'unknown';
        sourceCount[sourceLabel] = (sourceCount[sourceLabel] || 0) + 1;

        if (r.survey_response) {
          surveyResponseCount++;
          if (r.survey_response.industry) {
            industryCount[r.survey_response.industry] = (industryCount[r.survey_response.industry] || 0) + 1;
          }

          if (r.survey_response.current_ai_usage) {
            aiUsageCount[r.survey_response.current_ai_usage] =
              (aiUsageCount[r.survey_response.current_ai_usage] || 0) + 1;
          }
          if (r.survey_response.monthly_ai_spend) {
            spendCount[r.survey_response.monthly_ai_spend] =
              (spendCount[r.survey_response.monthly_ai_spend] || 0) + 1;
          }
          if (r.survey_response.connected_data) {
            connectedDataCount[r.survey_response.connected_data] =
              (connectedDataCount[r.survey_response.connected_data] || 0) + 1;
          }
          if (r.survey_response.ai_use_cases && Array.isArray(r.survey_response.ai_use_cases)) {
            r.survey_response.ai_use_cases.forEach(useCase => {
              useCasesCount[useCase] = (useCasesCount[useCase] || 0) + 1;
            });
          }
          if (r.survey_response.biggest_pain_points && r.survey_response.biggest_pain_points.trim()) {
            painPointsList.push({
              email: r.email,
              text: r.survey_response.biggest_pain_points
            });
            const individualPainPoints = r.survey_response.biggest_pain_points
              .split(';')
              .map(p => p.trim())
              .filter(p => p.length > 0);
            individualPainPoints.forEach(painPoint => {
              painPointsBreakdown[painPoint] = (painPointsBreakdown[painPoint] || 0) + 1;
            });
          }
          if (r.survey_response.mastermind_groups && Array.isArray(r.survey_response.mastermind_groups)) {
            r.survey_response.mastermind_groups.forEach(group => {
              mastermindGroupsCount[group] = (mastermindGroupsCount[group] || 0) + 1;
            });
          }
        }

        const day = format(new Date(r.created_at), 'yyyy-MM-dd');
        dayCount[day] = (dayCount[day] || 0) + 1;
      });

      const registrationsByDay = Object.entries(dayCount)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setStats({
        totalRegistrations: registrationsData.length,
        newEntries,
        redeemedCodes,
        existingUserRegistrations,
        convertedToTeam,
        onboardingStarted,
        onboardingCompleted,
        pendingInviteCodes,
        expiredInviteCodes,
        registrationsByIndustry: industryCount,
        registrationsByAiUsage: aiUsageCount,
        registrationsBySpend: spendCount,
        registrationsByConnectedData: connectedDataCount,
        registrationsByUseCases: useCasesCount,
        painPointsBreakdown,
        painPointsList,
        registrationsByDay,
        registrationsBySource: sourceCount,
        registrationsByMastermindGroups: mastermindGroupsCount,
        surveyResponseCount
      });
    } catch (err) {
      console.error('Error fetching moonshot data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengeMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const { data: standings, error } = await supabase
        .from('moonshot_challenge_standings')
        .select('*')
        .order('current_astra_score', { ascending: false });

      if (error) throw error;

      if (!standings || standings.length === 0) {
        setChallengeMetrics({
          totalParticipants: 0,
          top25Count: 0,
          averageScore: 0,
          scoreDistribution: [],
          indicatorBreakdown: {
            run: { strong: 0, moderate: 0, needsImprovement: 0 },
            build: { strong: 0, moderate: 0, needsImprovement: 0 },
            grow: { strong: 0, moderate: 0, needsImprovement: 0 },
            launchPoints: { strong: 0, moderate: 0, needsImprovement: 0 },
          },
          standings: [],
          lastCalculatedAt: null,
        });
        return;
      }

      const top25Count = standings.filter(s => s.is_top_25_percent).length;
      const avgScore = standings.reduce((sum, s) => sum + (s.current_astra_score || 0), 0) / standings.length;

      const distribution = [
        { range: '80-100', count: 0 },
        { range: '60-79', count: 0 },
        { range: '40-59', count: 0 },
        { range: '20-39', count: 0 },
        { range: '0-19', count: 0 },
      ];

      const indicatorBreakdown = {
        run: { strong: 0, moderate: 0, needsImprovement: 0 },
        build: { strong: 0, moderate: 0, needsImprovement: 0 },
        grow: { strong: 0, moderate: 0, needsImprovement: 0 },
        launchPoints: { strong: 0, moderate: 0, needsImprovement: 0 },
      };

      let lastCalc: string | null = null;

      standings.forEach(s => {
        const score = s.current_astra_score || 0;
        if (score >= 80) distribution[0].count++;
        else if (score >= 60) distribution[1].count++;
        else if (score >= 40) distribution[2].count++;
        else if (score >= 20) distribution[3].count++;
        else distribution[4].count++;

        const countIndicator = (indicator: string, target: { strong: number; moderate: number; needsImprovement: number }) => {
          if (indicator === 'Strong') target.strong++;
          else if (indicator === 'Moderate') target.moderate++;
          else target.needsImprovement++;
        };

        countIndicator(s.run_indicator || 'Needs Improvement', indicatorBreakdown.run);
        countIndicator(s.build_indicator || 'Needs Improvement', indicatorBreakdown.build);
        countIndicator(s.grow_indicator || 'Needs Improvement', indicatorBreakdown.grow);
        countIndicator(s.launch_points_indicator || 'Needs Improvement', indicatorBreakdown.launchPoints);

        if (s.last_calculated_at && (!lastCalc || s.last_calculated_at > lastCalc)) {
          lastCalc = s.last_calculated_at;
        }
      });

      setChallengeMetrics({
        totalParticipants: standings.length,
        top25Count,
        averageScore: Math.round(avgScore * 100) / 100,
        scoreDistribution: distribution,
        indicatorBreakdown,
        standings: standings as ChallengeStanding[],
        lastCalculatedAt: lastCalc,
      });
    } catch (err) {
      console.error('Error fetching challenge metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const calculateScores = async () => {
    setCalculatingScores(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/calculate-moonshot-rbg-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        await fetchChallengeMetrics();
      } else {
        console.error('Error calculating scores:', result.error);
      }
    } catch (err) {
      console.error('Error calling score calculation:', err);
    } finally {
      setCalculatingScores(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getIndustry = (r: Registration) => r.survey_response?.industry || '';

  const filteredRegistrations = registrations
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.team_name.toLowerCase().includes(q) ||
        getIndustry(r).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal: string, bVal: string;
      switch (sortField) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'email': aVal = a.email; bVal = b.email; break;
        case 'industry': aVal = getIndustry(a); bVal = getIndustry(b); break;
        default: aVal = a.created_at; bVal = b.created_at;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

  const exportToCSV = () => {
    const headers = [
      'Name', 'Email', 'Team', 'Industry', 'Source', 'Registered',
      'Invite Code', 'Code Redeemed', 'Team Converted', 'Onboarding Started',
      'Onboarding Completed', 'Challenge Started', 'Converted At',
      'AI Usage', 'Monthly Spend', 'Pain Points', 'Mastermind Groups'
    ];
    const rows = registrations.map(r => [
      r.name,
      r.email,
      r.team_name,
      getIndustry(r),
      r.source || '',
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      r.invite_code?.code || '',
      r.invite_code?.is_redeemed ? 'Yes' : 'No',
      r.team_id ? 'Yes' : 'No',
      r.onboarding_started ? 'Yes' : 'No',
      r.onboarding_completed ? 'Yes' : 'No',
      r.challenge_started_at ? format(new Date(r.challenge_started_at), 'yyyy-MM-dd') : '',
      r.converted_at ? format(new Date(r.converted_at), 'yyyy-MM-dd') : '',
      r.survey_response?.current_ai_usage || '',
      r.survey_response?.monthly_ai_spend || '',
      r.survey_response?.biggest_pain_points?.replace(/"/g, '""') || '',
      r.survey_response?.mastermind_groups?.join(', ') || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moonshot-registrations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const AI_USAGE_LABELS: Record<string, string> = {
    none: 'Not using AI yet',
    experimenting: 'Experimenting',
    regular: 'Regular user',
    integrated: 'Integrated',
    advanced: 'Advanced'
  };

  const SPEND_LABELS: Record<string, string> = {
    '0': '$0',
    '1-100': '$1-100',
    '100-500': '$100-500',
    '500-1000': '$500-1000',
    '1000+': '$1000+'
  };

  const CONNECTED_DATA_LABELS: Record<string, string> = {
    none: 'None',
    manual: 'Manual uploads',
    documents: 'Documents (Google Drive, Dropbox, etc.)',
    crm_meetings: 'CRM / Meetings Data',
    multiple: 'Multiple sources'
  };

  const USE_CASE_LABELS: Record<string, string> = {
    documents: 'Documents',
    meetings: 'Meetings',
    crm_meetings: 'CRM/Meetings',
    manual: 'Manual Entry',
    multiple: 'Multiple Sources',
    financial: 'Financial',
    email: 'Email',
    research: 'Research',
    writing: 'Writing',
    coding: 'Coding',
    analysis: 'Analysis',
    customer_support: 'Customer Support',
    marketing: 'Marketing',
    sales: 'Sales',
    operations: 'Operations',
    hr: 'HR',
    legal: 'Legal',
    other: 'Other'
  };

  const getIndicatorIcon = (indicator: string) => {
    switch (indicator) {
      case 'Strong': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'Moderate': return <Minus className="w-4 h-4 text-amber-400" />;
      default: return <AlertCircle className="w-4 h-4 text-orange-400" />;
    }
  };

  const getIndicatorColor = (indicator: string) => {
    switch (indicator) {
      case 'Strong': return 'text-emerald-400';
      case 'Moderate': return 'text-amber-400';
      default: return 'text-orange-400';
    }
  };

  if (loading && activeTab === 'registrations') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Rocket className="w-6 h-6 text-orange-400" />
          $5M AI Moonshot Challenge
        </h2>
      </div>

      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'registrations'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Challenge Registrations
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'metrics'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Challenge Metrics
        </button>
      </div>

      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={fetchChallengeMetrics}
                disabled={loadingMetrics}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={calculateScores}
                disabled={calculatingScores}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <Play className={`w-4 h-4 ${calculatingScores ? 'animate-pulse' : ''}`} />
                {calculatingScores ? 'Calculating...' : 'Calculate Scores Now'}
              </button>
            </div>
            {challengeMetrics?.lastCalculatedAt && (
              <span className="text-xs text-gray-500">
                Last calculated: {format(new Date(challengeMetrics.lastCalculatedAt), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </div>

          {loadingMetrics ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : challengeMetrics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Users className="w-4 h-4" />
                    Participating Teams
                  </div>
                  <div className="text-3xl font-bold text-white">{challengeMetrics.totalParticipants}</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Trophy className="w-4 h-4" />
                    Top 25% Teams
                  </div>
                  <div className="text-3xl font-bold text-amber-400">{challengeMetrics.top25Count}</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <TrendingUp className="w-4 h-4" />
                    Average Astra Score
                  </div>
                  <div className="text-3xl font-bold text-emerald-400">{challengeMetrics.averageScore}</div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Star className="w-4 h-4" />
                    Qualification Rate
                  </div>
                  <div className="text-3xl font-bold text-orange-400">
                    {challengeMetrics.totalParticipants > 0
                      ? `${Math.round((challengeMetrics.top25Count / challengeMetrics.totalParticipants) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Score Distribution
                  </h3>
                  <div className="space-y-3">
                    {challengeMetrics.scoreDistribution.map(({ range, count }) => {
                      const maxCount = Math.max(...challengeMetrics.scoreDistribution.map(d => d.count), 1);
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div key={range}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">{range}</span>
                            <span className="text-white font-medium">{count} teams</span>
                          </div>
                          <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    RBG Dimension Breakdown
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'RUN (Operations)', data: challengeMetrics.indicatorBreakdown.run },
                      { label: 'BUILD (Capabilities)', data: challengeMetrics.indicatorBreakdown.build },
                      { label: 'GROW (Alignment)', data: challengeMetrics.indicatorBreakdown.grow },
                      { label: 'Launch Points', data: challengeMetrics.indicatorBreakdown.launchPoints },
                    ].map(({ label, data }) => (
                      <div key={label}>
                        <div className="text-xs text-gray-400 mb-1">{label}</div>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-emerald-500/20 rounded px-2 py-1 text-center">
                            <span className="text-emerald-400 text-xs font-medium">{data.strong} Strong</span>
                          </div>
                          <div className="flex-1 bg-amber-500/20 rounded px-2 py-1 text-center">
                            <span className="text-amber-400 text-xs font-medium">{data.moderate} Moderate</span>
                          </div>
                          <div className="flex-1 bg-orange-500/20 rounded px-2 py-1 text-center">
                            <span className="text-orange-400 text-xs font-medium">{data.needsImprovement} Needs Work</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-xl border border-gray-600">
                <div className="p-4 border-b border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-300">
                    All Teams Standings ({challengeMetrics.standings.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-800">
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">#</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">Team</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">Industry</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">Score</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">RUN</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">BUILD</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">GROW</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">Points</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {challengeMetrics.standings.map((team, idx) => (
                        <tr key={team.team_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 px-4 text-sm text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-4 text-sm text-white font-medium">{team.team_name}</td>
                          <td className="py-2 px-4 text-sm text-gray-400">{team.industry || '-'}</td>
                          <td className="py-2 px-4 text-sm font-semibold text-orange-400">{team.current_astra_score}</td>
                          <td className="py-2 px-4">
                            <span className={`flex items-center gap-1 text-xs ${getIndicatorColor(team.run_indicator)}`}>
                              {getIndicatorIcon(team.run_indicator)}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <span className={`flex items-center gap-1 text-xs ${getIndicatorColor(team.build_indicator)}`}>
                              {getIndicatorIcon(team.build_indicator)}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <span className={`flex items-center gap-1 text-xs ${getIndicatorColor(team.grow_indicator)}`}>
                              {getIndicatorIcon(team.grow_indicator)}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <span className={`flex items-center gap-1 text-xs ${getIndicatorColor(team.launch_points_indicator)}`}>
                              {getIndicatorIcon(team.launch_points_indicator)}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            {team.is_top_25_percent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                                <Star className="w-3 h-3" />
                                Top 25%
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {challengeMetrics.standings.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-gray-400">
                            No teams in standings yet. Click "Calculate Scores Now" to populate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              No challenge metrics data available
            </div>
          )}
        </div>
      )}

      {activeTab === 'registrations' && (
        <>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={fetchData}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Users className="w-4 h-4" />
            Total Registrations
          </div>
          <div className="text-3xl font-bold text-white">{stats?.totalRegistrations || 0}</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <UserPlus className="w-4 h-4" />
            New Entries
          </div>
          <div className="text-3xl font-bold text-blue-400">{stats?.newEntries || 0}</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Users className="w-4 h-4" />
            Existing Users
          </div>
          <div className="text-3xl font-bold text-cyan-400">{stats?.existingUserRegistrations || 0}</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Conversion Rate
          </div>
          <div className="text-3xl font-bold text-orange-400">
            {stats && stats.totalRegistrations > 0
              ? `${Math.round((stats.convertedToTeam / stats.totalRegistrations) * 100)}%`
              : '0%'
            }
          </div>
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Conversion Funnel
        </h3>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          <div className="flex-1 min-w-[100px] text-center">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">{stats?.totalRegistrations || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Registered</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-[100px] text-center">
            <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-cyan-400">{stats?.convertedToTeam || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Converted to Team</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-[100px] text-center">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">{stats?.onboardingStarted || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Started Onboarding</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-[100px] text-center">
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">{stats?.onboardingCompleted || 0}</div>
              <div className="text-xs text-gray-400 mt-1">Launched</div>
            </div>
          </div>
        </div>
        {stats && stats.totalRegistrations > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-600 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <span className="text-gray-500">Conv. Rate</span>
              <span className="block text-cyan-400 font-medium">
                {Math.round((stats.convertedToTeam / stats.totalRegistrations) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Onboard Rate</span>
              <span className="block text-yellow-400 font-medium">
                {stats.convertedToTeam > 0 ? Math.round((stats.onboardingStarted / stats.convertedToTeam) * 100) : 0}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Launch Rate</span>
              <span className="block text-emerald-400 font-medium">
                {stats.onboardingStarted > 0 ? Math.round((stats.onboardingCompleted / stats.onboardingStarted) * 100) : 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <CheckCircle className="w-4 h-4" />
            Codes Redeemed
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats?.redeemedCodes || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Successfully activated</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Clock className="w-4 h-4" />
            Pending Codes
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats?.pendingInviteCodes || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Not yet redeemed</div>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <XCircle className="w-4 h-4" />
            Expired Codes
          </div>
          <div className="text-2xl font-bold text-red-400">{stats?.expiredInviteCodes || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Codes expired</div>
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Survey Response Breakdown
          </h3>
          <span className="text-sm text-gray-400">
            {stats?.surveyResponseCount || 0} of {stats?.totalRegistrations || 0} completed survey
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">1. Industry</h4>
            <SimplePieChart data={stats?.registrationsByIndustry || {}} size={140} />
          </div>
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">2. AI Usage Level</h4>
            <SimplePieChart data={stats?.registrationsByAiUsage || {}} labels={AI_USAGE_LABELS} size={140} />
          </div>
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">3. Monthly Spend</h4>
            <SimplePieChart data={stats?.registrationsBySpend || {}} labels={SPEND_LABELS} size={140} />
          </div>
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">4. Connected Data</h4>
            <SimplePieChart data={stats?.registrationsByConnectedData || {}} labels={CONNECTED_DATA_LABELS} size={140} />
          </div>
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">5. AI Use Cases</h4>
            <SimplePieChart data={stats?.registrationsByUseCases || {}} labels={USE_CASE_LABELS} size={140} />
          </div>
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">6. Pain Points</h4>
            <SimplePieChart data={stats?.painPointsBreakdown || {}} size={140} />
          </div>
          <div className="flex flex-col items-center">
            <h4 className="text-xs font-medium text-gray-400 mb-2">7. Mastermind Groups</h4>
            <SimplePieChart data={stats?.registrationsByMastermindGroups || {}} size={140} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Industry Breakdown
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.registrationsByIndustry || {})
              .sort((a, b) => b[1] - a[1])
              .map(([industry, count]) => (
                <div key={industry} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{industry}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.registrationsByIndustry || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            AI Usage Breakdown
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.registrationsByAiUsage || {})
              .sort((a, b) => b[1] - a[1])
              .map(([usage, count]) => (
                <div key={usage} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{AI_USAGE_LABELS[usage] || usage}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.registrationsByAiUsage || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Monthly Spend Breakdown
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.registrationsBySpend || {})
              .sort((a, b) => b[1] - a[1])
              .map(([spend, count]) => (
                <div key={spend} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{SPEND_LABELS[spend] || spend}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.registrationsBySpend || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Connected Data Breakdown
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.registrationsByConnectedData || {})
              .sort((a, b) => b[1] - a[1])
              .map(([data, count]) => (
                <div key={data} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{CONNECTED_DATA_LABELS[data] || data}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.registrationsByConnectedData || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            AI Use Cases Breakdown
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.registrationsByUseCases || {})
              .sort((a, b) => b[1] - a[1])
              .map(([useCase, count]) => (
                <div key={useCase} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{USE_CASE_LABELS[useCase] || useCase}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.registrationsByUseCases || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Top Pain Points
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.painPointsBreakdown || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([painPoint, count]) => (
                <div key={painPoint} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate" title={painPoint}>{painPoint}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.painPointsBreakdown || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Mastermind Groups
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats?.registrationsByMastermindGroups || {})
              .sort((a, b) => b[1] - a[1])
              .map(([group, count]) => (
                <div key={group} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{group}</span>
                  <span className="text-white font-medium ml-2">{count}</span>
                </div>
              ))}
            {Object.keys(stats?.registrationsByMastermindGroups || {}).length === 0 && (
              <div className="text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>
      </div>

      {stats?.painPointsBreakdown && Object.keys(stats.painPointsBreakdown).length > 0 && (
        <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Pain Points Breakdown ({Object.keys(stats.painPointsBreakdown).length} unique challenges)
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.painPointsBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([painPoint, count]) => {
                const maxCount = Math.max(...Object.values(stats.painPointsBreakdown));
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={painPoint} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-300 truncate flex-1 mr-2" title={painPoint}>{painPoint}</span>
                      <span className="text-white font-medium flex-shrink-0">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Registrations Over Time
        </h3>
        <div className="flex items-end gap-1 h-24">
          {stats?.registrationsByDay.slice(-30).map((day, idx) => {
            const maxCount = Math.max(...(stats?.registrationsByDay.map(d => d.count) || [1]));
            const height = (day.count / maxCount) * 100;
            return (
              <div
                key={day.date}
                className="flex-1 bg-orange-500 rounded-t hover:bg-orange-400 transition-colors"
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${day.date}: ${day.count} registrations`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Last 30 days</span>
          <span>Today</span>
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-xl border border-gray-600">
        <div className="p-4 border-b border-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-300">
            All Registrations ({filteredRegistrations.length})
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('name')}
                >
                  Name
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('email')}
                >
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Team</th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('industry')}
                >
                  Industry
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Groups</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Onboarding</th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('created_at')}
                >
                  Registered
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map(reg => (
                <React.Fragment key={reg.id}>
                  <tr
                    className="border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === reg.id ? null : reg.id)}
                  >
                    <td className="py-3 px-4 text-sm text-white">{reg.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{reg.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{reg.team_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{getIndustry(reg) || <span className="text-gray-500">-</span>}</td>
                    <td className="py-3 px-4">
                      {reg.survey_response?.mastermind_groups && reg.survey_response.mastermind_groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {reg.survey_response.mastermind_groups.slice(0, 2).map((group, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs truncate max-w-[70px]" title={group}>
                              {group}
                            </span>
                          ))}
                          {reg.survey_response.mastermind_groups.length > 2 && (
                            <span className="text-gray-500 text-xs">+{reg.survey_response.mastermind_groups.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {reg.team_id ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : reg.invite_code?.is_redeemed ? (
                        <span className="inline-flex items-center gap-1 text-cyan-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Redeemed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {reg.onboarding_completed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                          Complete
                        </span>
                      ) : reg.onboarding_started ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          In Progress
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Not Started</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {format(new Date(reg.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      {expandedRow === reg.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {expandedRow === reg.id && (
                    <tr className="bg-gray-800/50">
                      <td colSpan={9} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 mb-1">Invite Code</div>
                            <div className="text-orange-400 font-mono">{reg.invite_code?.code || 'No code'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Code Status</div>
                            <div className="text-white">
                              {reg.invite_code?.is_redeemed
                                ? `Redeemed ${reg.invite_code.redeemed_at ? format(new Date(reg.invite_code.redeemed_at), 'MMM d') : ''}`
                                : reg.invite_code?.expires_at && new Date(reg.invite_code.expires_at) <= new Date()
                                  ? 'Expired'
                                  : 'Pending'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Challenge Started</div>
                            <div className="text-white">
                              {reg.challenge_started_at ? format(new Date(reg.challenge_started_at), 'MMM d, yyyy') : 'Not started'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Converted At</div>
                            <div className="text-white">
                              {reg.converted_at ? format(new Date(reg.converted_at), 'MMM d, yyyy') : '-'}
                            </div>
                          </div>
                          {reg.survey_response && (
                            <>
                              <div>
                                <div className="text-gray-500 mb-1">AI Usage Level</div>
                                <div className="text-white">{AI_USAGE_LABELS[reg.survey_response.current_ai_usage] || reg.survey_response.current_ai_usage}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">Monthly Spend</div>
                                <div className="text-white">{SPEND_LABELS[reg.survey_response.monthly_ai_spend] || reg.survey_response.monthly_ai_spend}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">Connected Data</div>
                                <div className="text-white">{CONNECTED_DATA_LABELS[reg.survey_response.connected_data] || reg.survey_response.connected_data}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">AI Use Cases</div>
                                <div className="flex flex-wrap gap-1">
                                  {reg.survey_response.ai_use_cases?.slice(0, 3).map((uc, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                                      {uc}
                                    </span>
                                  ))}
                                  {(reg.survey_response.ai_use_cases?.length || 0) > 3 && (
                                    <span className="text-gray-500 text-xs">+{reg.survey_response.ai_use_cases!.length - 3} more</span>
                                  )}
                                </div>
                              </div>
                              {reg.survey_response.biggest_pain_points && (
                                <div className="md:col-span-2 lg:col-span-4">
                                  <div className="text-gray-500 mb-1">Pain Points</div>
                                  <div className="text-gray-300 bg-gray-700/50 p-3 rounded-lg">
                                    {reg.survey_response.biggest_pain_points}
                                  </div>
                                </div>
                              )}
                              {reg.survey_response.mastermind_groups && reg.survey_response.mastermind_groups.length > 0 && (
                                <div className="md:col-span-2 lg:col-span-4">
                                  <div className="text-gray-500 mb-1">Mastermind Groups</div>
                                  <div className="flex flex-wrap gap-1">
                                    {reg.survey_response.mastermind_groups.map((group, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs border border-blue-500/30">
                                        {group}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {reg.email_sequence && reg.email_sequence.length > 0 && (
                            <div className="md:col-span-2 lg:col-span-4">
                              <div className="text-gray-500 mb-2">Email Sequence</div>
                              <div className="flex flex-wrap gap-2">
                                {reg.email_sequence.map((email, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs ${
                                      email.sent_at
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-gray-700 text-gray-400'
                                    }`}
                                  >
                                    {email.email_type} {email.sent_at ? '(Sent)' : `(${format(new Date(email.scheduled_for), 'MMM d')})`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    {searchQuery ? 'No registrations match your search' : 'No registrations yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
