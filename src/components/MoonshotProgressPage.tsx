import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  Users,
  Gift
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

const IndicatorBadge: React.FC<{ indicator: string; label: string; icon: React.ElementType }> = ({
  indicator,
  label,
  icon: Icon
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
        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${styles.text}`} />
            <span className={`text-sm font-semibold ${styles.text}`}>{indicator}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MoonshotProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamIndicators, setTeamIndicators] = useState<TeamIndicators | null>(null);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [showTop25Only, setShowTop25Only] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [teamId, setTeamId] = useState<string | null>(null);

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

        const { data: indicators } = await supabase
          .rpc('get_team_rbg_indicators', { p_team_id: userData.team_id });

        if (indicators && indicators.length > 0) {
          setTeamIndicators(indicators[0]);
        }

        const { data: standingsData } = await supabase
          .rpc('get_moonshot_standings', { p_top_25_only: false });

        if (standingsData) {
          setStandings(standingsData);
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

  const myTeamStanding = standings.find(s => s.team_id === teamId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading challenge progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gradient-to-b from-slate-800 to-gray-900 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Mission Control</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">$5M AI Moonshot Challenge</h1>
              <p className="text-slate-400 text-sm">Track your team's progress and see how you compare</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {teamIndicators && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Your Team's Progress</h2>
                  <p className="text-slate-400 text-sm">{teamName}</p>
                </div>
              </div>
              {myTeamStanding?.is_top_25_percent && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-full px-4 py-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-semibold text-sm">Top 25%</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-slate-400 text-sm">Overall Status:</span>
                <span className={`text-lg font-bold ${
                  teamIndicators.overall_indicator === 'Strong' ? 'text-emerald-400' :
                  teamIndicators.overall_indicator === 'Moderate' ? 'text-amber-400' : 'text-orange-400'
                }`}>
                  {teamIndicators.overall_indicator}
                </span>
              </div>
              {teamIndicators.last_calculated_at && (
                <p className="text-xs text-slate-500">
                  Last updated: {new Date(teamIndicators.last_calculated_at).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IndicatorBadge
                indicator={teamIndicators.run_indicator}
                label="RUN - Operations"
                icon={Target}
              />
              <IndicatorBadge
                indicator={teamIndicators.build_indicator}
                label="BUILD - Capabilities"
                icon={TrendingUp}
              />
              <IndicatorBadge
                indicator={teamIndicators.grow_indicator}
                label="GROW - Alignment"
                icon={Users}
              />
              <IndicatorBadge
                indicator={teamIndicators.launch_points_indicator}
                label="Launch Points"
                icon={Zap}
              />
            </div>

            <div className="mt-6 p-4 bg-slate-700/30 rounded-xl">
              <h4 className="text-white font-medium mb-2">How to Improve Your Scores</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {teamIndicators.run_indicator !== 'Strong' && (
                  <li className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-white">RUN:</strong> Connect more data sources and ensure regular team engagement with Astra</span>
                  </li>
                )}
                {teamIndicators.build_indicator !== 'Strong' && (
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-white">BUILD:</strong> Track goals and projects in your Team Dashboard with progress updates</span>
                  </li>
                )}
                {teamIndicators.grow_indicator !== 'Strong' && (
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-white">GROW:</strong> Define your mission statement and core values in strategic documents</span>
                  </li>
                )}
                {teamIndicators.launch_points_indicator !== 'Strong' && (
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-white">Launch Points:</strong> Complete more achievements and engage daily with the platform</span>
                  </li>
                )}
                {teamIndicators.overall_indicator === 'Strong' && (
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Great work! Keep up the momentum to maintain your strong standing.</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {!teamIndicators && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Scores Coming Soon</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Your team's RBG scores are being calculated. Check back soon to see how your team is performing in the challenge!
            </p>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Challenge Standings</h2>
                  <p className="text-slate-400 text-sm">{standings.length} teams competing</p>
                </div>
              </div>

              <button
                onClick={() => setShowTop25Only(!showTop25Only)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  showTop25Only
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {showTop25Only ? 'Showing Top 25%' : 'Show Top 25% Only'}
                </span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-700/50">
            {filteredStandings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400">No teams to display</p>
              </div>
            ) : (
              filteredStandings.map((standing, index) => {
                const isMyTeam = standing.team_id === teamId;
                return (
                  <div
                    key={standing.team_id}
                    className={`px-6 py-4 flex items-center gap-4 ${
                      isMyTeam ? 'bg-orange-500/10' : 'hover:bg-slate-700/30'
                    } transition-colors`}
                  >
                    <div className="w-8 text-center">
                      <span className="text-slate-500 text-sm font-mono">{index + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isMyTeam ? 'text-orange-400' : 'text-white'}`}>
                          {standing.team_name}
                        </span>
                        {isMyTeam && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                            Your Team
                          </span>
                        )}
                      </div>
                      {standing.industry && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{standing.industry}</span>
                        </div>
                      )}
                    </div>

                    {standing.is_top_25_percent && (
                      <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full px-3 py-1">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 text-xs font-semibold">Top 25%</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-2">Challenge Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300">
                    <strong className="text-white">Jan 15 - Apr 5:</strong> Challenge Period
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300">
                    <strong className="text-white">Apr 6-10:</strong> Prize Application Window
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300">
                    <strong className="text-white">Apr 15:</strong> Winners Announced
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                Submit your Prize Application during Apr 6-10. Winners selected by Advisory Committee: Impact Statement (25%), RBG Summaries (25%), Astra Score (50%).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
