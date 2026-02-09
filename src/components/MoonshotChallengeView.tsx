import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Rocket,
  Target,
  TrendingUp,
  Zap,
  Star,
  Filter,
  Award,
  Building2,
  CheckCircle2,
  AlertCircle,
  Minus,
  Loader2,
  Calendar,
  Gift,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Wrench
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TeamIndicators {
  run_indicator: string;
  build_indicator: string;
  grow_indicator: string;
  launch_points_indicator: string;
  overall_indicator: string;
  is_top_25_percent: boolean;
  last_calculated_at: string | null;
}

interface TeamStanding {
  team_id: string;
  team_name: string;
  industry: string | null;
  is_top_25_percent: boolean;
  created_at: string;
}

type ChallengeTab = 'standings' | 'timeline';

interface MoonshotChallengeViewProps {
  onOpenDetails?: () => void;
}

const IndicatorBadge: React.FC<{ indicator: string; label: string; fullLabel: string; icon: React.ElementType; description: string }> = ({
  indicator,
  label,
  fullLabel,
  icon: Icon,
  description
}) => {
  const getIndicatorStyles = () => {
    switch (indicator) {
      case 'Strong':
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          icon: CheckCircle2,
        };
      case 'Moderate':
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          icon: Minus,
        };
      default:
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/40',
          text: 'text-orange-400',
          icon: AlertCircle,
        };
    }
  };

  const styles = getIndicatorStyles();
  const StatusIcon = styles.icon;

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 ${styles.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${styles.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-xs text-slate-500 hidden sm:block">{fullLabel}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${styles.text}`} />
          <span className={`text-sm font-semibold ${styles.text}`}>{indicator}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">{description}</p>
    </div>
  );
};

export const MoonshotChallengeView: React.FC<MoonshotChallengeViewProps> = ({ onOpenDetails }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamIndicators, setTeamIndicators] = useState<TeamIndicators | null>(null);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [showTop25Only, setShowTop25Only] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChallengeTab>('standings');
  const [showAllStandings, setShowAllStandings] = useState(false);
  const [totalTeamsCount, setTotalTeamsCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!userData?.team_id) {
          setLoading(false);
          return;
        }

        setTeamId(userData.team_id);

        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', userData.team_id)
          .maybeSingle();

        if (teamData) {
          setTeamName(teamData.name);
        }

        const { count: teamsCount } = await supabase
          .from('teams')
          .select('id', { count: 'exact', head: true });

        setTotalTeamsCount(teamsCount || 0);

        const { data: indicators } = await supabase
          .rpc('get_team_rbg_indicators', { p_team_id: userData.team_id });

        if (indicators && indicators.length > 0) {
          setTeamIndicators(indicators[0]);
        }

        const { data: standingsData } = await supabase
          .rpc('get_moonshot_standings', { p_top_25_only: false });

        if (standingsData) {
          const sortedStandings = [...standingsData].sort((a, b) =>
            a.team_name.toLowerCase().localeCompare(b.team_name.toLowerCase())
          );
          setStandings(sortedStandings);
        }

      } catch (error) {
        console.error('Error fetching moonshot data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredStandings = showTop25Only
    ? standings.filter(s => s.is_top_25_percent)
    : standings;

  const displayedStandings = showAllStandings
    ? filteredStandings
    : filteredStandings.slice(0, 20);

  const myTeamStanding = standings.find(s => s.team_id === teamId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading challenge data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-emerald-500/10 border border-orange-500/40 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-tr-full" />

        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">$5M AI Moonshot Challenge</h1>
                <button
                  onClick={onOpenDetails}
                  className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                >
                  <span>Full Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Transform your team to AI-Powered. Free & Unlimited Access to the Most Powerful AI-Suite for Work.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">$5M</div>
              <div className="text-xs text-slate-400">Total Prize Pool</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-bold text-white">{totalTeamsCount}/300</div>
              <div className="text-xs text-slate-400">Teams Registered</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-bold text-white">90</div>
              <div className="text-xs text-slate-400">Days Unlimited</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-2xl font-bold text-emerald-400">10</div>
              <div className="text-xs text-slate-400">Prize Winners</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full text-xs border border-slate-700/50">
              <Calendar className="w-3 h-3 text-orange-400" />
              <span className="text-slate-300">Jan 15 - Apr 15, 2026</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full text-xs border border-slate-700/50">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="text-slate-300">Top 10 Win Equity Prizes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full text-xs border border-slate-700/50">
              <Gift className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">Lifetime Ultra Plan for Winners</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Team's Progress</h2>
              <p className="text-slate-400 text-sm">{teamName || 'Your team'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myTeamStanding?.is_top_25_percent && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-full px-3 py-1.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm">Top 25%</span>
              </div>
            )}
          </div>
        </div>

        {teamIndicators ? (
          <>
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-700/30 rounded-xl">
              <span className="text-slate-400 text-sm">Overall Status:</span>
              <span className={`text-xl font-bold ${
                teamIndicators.overall_indicator === 'Strong' ? 'text-emerald-400' :
                teamIndicators.overall_indicator === 'Moderate' ? 'text-amber-400' : 'text-orange-400'
              }`}>
                {teamIndicators.overall_indicator}
              </span>
              {teamIndicators.last_calculated_at && (
                <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated: {new Date(teamIndicators.last_calculated_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <IndicatorBadge
                indicator={teamIndicators.run_indicator}
                label="RUN"
                fullLabel="Operations"
                icon={Zap}
                description="AI-powered daily operations"
              />
              <IndicatorBadge
                indicator={teamIndicators.build_indicator}
                label="BUILD"
                fullLabel="Capabilities"
                icon={Wrench}
                description="Custom AI tools & workflows"
              />
              <IndicatorBadge
                indicator={teamIndicators.grow_indicator}
                label="GROW"
                fullLabel="Alignment"
                icon={TrendingUp}
                description="Revenue & growth with AI"
              />
              <IndicatorBadge
                indicator={teamIndicators.launch_points_indicator}
                label="POINTS"
                fullLabel="Launch Points"
                icon={Star}
                description="Platform engagement score"
              />
            </div>

            <div className="bg-slate-700/30 rounded-xl p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                How to Improve Your Scores
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {teamIndicators.run_indicator !== 'Strong' && (
                  <div className="flex items-start gap-2 bg-slate-800/50 p-3 rounded-lg">
                    <Zap className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white font-medium">RUN:</span>
                      <span className="text-slate-400 ml-1">Connect more data sources and engage daily with Astra</span>
                    </div>
                  </div>
                )}
                {teamIndicators.build_indicator !== 'Strong' && (
                  <div className="flex items-start gap-2 bg-slate-800/50 p-3 rounded-lg">
                    <Wrench className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white font-medium">BUILD:</span>
                      <span className="text-slate-400 ml-1">Create reports, visualizations, and AI workflows</span>
                    </div>
                  </div>
                )}
                {teamIndicators.grow_indicator !== 'Strong' && (
                  <div className="flex items-start gap-2 bg-slate-800/50 p-3 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white font-medium">GROW:</span>
                      <span className="text-slate-400 ml-1">Define mission, goals, and strategic documents</span>
                    </div>
                  </div>
                )}
                {teamIndicators.launch_points_indicator !== 'Strong' && (
                  <div className="flex items-start gap-2 bg-slate-800/50 p-3 rounded-lg">
                    <Star className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white font-medium">POINTS:</span>
                      <span className="text-slate-400 ml-1">Complete achievements and engage daily</span>
                    </div>
                  </div>
                )}
                {teamIndicators.overall_indicator === 'Strong' && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg col-span-full">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Great work! Keep up the momentum to maintain your strong standing.</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Scores Coming Soon</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
              Your team's RBG scores are being calculated. Scores are updated daily at 6 AM UTC.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>Check back soon to see your progress!</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="border-b border-slate-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'standings'
                  ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Award className="w-4 h-4" />
                <span>Challenge Standings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'timeline'
                  ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Challenge Timeline</span>
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'standings' && (
          <>
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <span className="text-slate-400 text-sm">{filteredStandings.length} teams {showTop25Only ? 'in top 25%' : 'competing'}</span>
              <button
                onClick={() => setShowTop25Only(!showTop25Only)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  showTop25Only
                    ? 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-white'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{showTop25Only ? 'All Teams' : 'Top 25%'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-700/50">
              {displayedStandings.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400">No teams to display</p>
                </div>
              ) : (
                displayedStandings.map((standing) => {
                  const isMyTeam = standing.team_id === teamId;
                  return (
                    <div
                      key={standing.team_id}
                      className={`px-4 py-3 flex items-center gap-3 ${
                        isMyTeam ? 'bg-orange-500/10' : 'hover:bg-slate-700/30'
                      } transition-colors`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${isMyTeam ? 'text-orange-400' : 'text-white'} truncate`}>
                            {standing.team_name}
                          </span>
                          {isMyTeam && (
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        {standing.industry && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span className="text-xs text-slate-500 truncate">{standing.industry}</span>
                          </div>
                        )}
                      </div>

                      {standing.is_top_25_percent && (
                        <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full px-2 py-0.5">
                          <Star className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400 text-[10px] font-semibold">Top 25%</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {filteredStandings.length > 20 && (
              <div className="p-3 border-t border-slate-700/50">
                <button
                  onClick={() => setShowAllStandings(!showAllStandings)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {showAllStandings ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>Show Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>View All {filteredStandings.length} Teams</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'timeline' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-xl border-l-4 border-blue-500">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Challenge Period</h4>
                <p className="text-slate-400 text-sm">January 15 - April 15, 2026</p>
                <p className="text-xs text-slate-500 mt-1">90 days of free unlimited AI access. Build your Astra Score by using AI Rocket to transform your business across Run, Build, and Grow dimensions.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-xl border-l-4 border-amber-500">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Prize Application Window</h4>
                <p className="text-slate-400 text-sm">April 6-10, 2026</p>
                <p className="text-xs text-slate-500 mt-1">Submit your Prize Application with Impact Statement and RBG Matrix summaries (100 words each for Run, Build, Grow).</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-xl border-l-4 border-emerald-500">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Winners Announced</h4>
                <p className="text-slate-400 text-sm">April 13-16, 2026</p>
                <p className="text-xs text-slate-500 mt-1">Apr 13: Metrics & non-winners announced. Apr 14: 3rd place. Apr 15: 2nd place. Apr 16: 1st place & Full App Launch!</p>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-400" />
                Scoring Criteria
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">25%</div>
                  <div className="text-xs text-slate-400 mt-1">Impact Statement</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">25%</div>
                  <div className="text-xs text-slate-400 mt-1">RBG Summaries</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">50%</div>
                  <div className="text-xs text-slate-400 mt-1">Astra Score</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-orange-400" />
                <h4 className="text-white font-semibold">Top 10 Prize Winners</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center mb-4">
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-amber-400 font-bold">1st</div>
                  <div className="text-sm font-bold text-white">$2M</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-300 font-bold">2nd</div>
                  <div className="text-sm font-bold text-white">$1M</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-orange-400 font-bold">3rd</div>
                  <div className="text-sm font-bold text-white">$600K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">4th</div>
                  <div className="text-sm font-bold text-white">$400K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">5th</div>
                  <div className="text-sm font-bold text-white">$300K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">6th</div>
                  <div className="text-sm font-bold text-white">$225K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">7th</div>
                  <div className="text-sm font-bold text-white">$175K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">8th</div>
                  <div className="text-sm font-bold text-white">$125K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">9th</div>
                  <div className="text-sm font-bold text-white">$100K</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">10th</div>
                  <div className="text-sm font-bold text-white">$75K</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                All 10 winners receive <span className="text-emerald-400 font-semibold">Lifetime Ultra Plan</span> subscriptions.
                Equity prizes in RocketHub.AI based on $250M valuation target.
              </p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <Gift className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-emerald-400 font-semibold">Participation Bonus</h4>
              <p className="text-sm text-slate-300 mt-1">
                All teams that submit valid prize applications receive a <span className="text-white font-semibold">1-year unlimited subscription</span> to AI Rocket!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
