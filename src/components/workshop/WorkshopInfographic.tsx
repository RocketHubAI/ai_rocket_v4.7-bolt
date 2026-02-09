import React, { useState, useEffect } from 'react';
import { Sparkles, Download, RefreshCw, ArrowRight, Loader2, Target, Lightbulb, Rocket, Star, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Goal } from './WorkshopMindsetJourney';

interface WorkshopInfographicProps {
  userId: string;
  registrationId: string;
  selectedGoal: Goal;
  onComplete: () => void;
  onLogout?: () => void;
}

interface MissionValues {
  mission: string;
  coreValues: string[];
  visionStatement: string;
}

interface VisualizationData {
  imageUrl?: string;
  imageBase64?: string;
  teamName: string;
  goal: Goal;
  missionValues: MissionValues;
}

export const WorkshopInfographic: React.FC<WorkshopInfographicProps> = ({
  userId,
  registrationId,
  selectedGoal,
  onComplete,
  onLogout
}) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [visualization, setVisualization] = useState<VisualizationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkExistingVisualization();
  }, [userId]);

  const checkExistingVisualization = async () => {
    try {
      const { data: existing } = await supabase
        .from('workshop_visualizations')
        .select('*')
        .eq('user_id', userId)
        .eq('visualization_type', 'goal_infographic')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setVisualization({
          imageUrl: existing.image_url,
          imageBase64: existing.image_base64,
          teamName: existing.visualization_data?.teamName || '',
          goal: existing.visualization_data?.goal || selectedGoal,
          missionValues: existing.visualization_data?.missionValues || {
            mission: '',
            coreValues: [],
            visionStatement: ''
          }
        });
        setLoading(false);
      } else {
        generateInfographic();
      }
    } catch (err) {
      console.error('Error checking visualization:', err);
      generateInfographic();
    }
  };

  const generateInfographic = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workshop-infographic`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ registration_id: registrationId })
        }
      );

      const result = await response.json();

      if (result.success && result.visualization) {
        setVisualization(result.visualization);
      } else if (result.fallback) {
        setVisualization({
          teamName: result.fallback.teamName,
          goal: result.fallback.goal,
          missionValues: result.fallback.missionValues
        });
        setError('Image generation unavailable. Showing text summary instead.');
      } else {
        throw new Error(result.error || 'Failed to generate infographic');
      }
    } catch (err) {
      console.error('Error generating infographic:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate infographic');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!visualization) return;

    try {
      let imageUrl = visualization.imageUrl;

      if (!imageUrl && visualization.imageBase64) {
        imageUrl = `data:image/png;base64,${visualization.imageBase64}`;
      }

      if (imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${visualization.teamName}-impossible-goal.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading:', err);
    }
  };

  const handleContinue = async () => {
    try {
      await supabase
        .from('workshop_registrations')
        .update({ current_step: 'infographic' })
        .eq('id', registrationId);

      onComplete();
    } catch (err) {
      console.error('Error updating step:', err);
      onComplete();
    }
  };

  const getImageSrc = () => {
    if (visualization?.imageUrl) return visualization.imageUrl;
    if (visualization?.imageBase64) return `data:image/png;base64,${visualization.imageBase64}`;
    return null;
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Creating Your Vision
          </h2>
          <p className="text-gray-400 mb-6">
            We're generating a personalized infographic that captures your impossible goal and the transformation ahead...
          </p>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-cyan-400">Generating...</span>
          </div>
        </div>
      </div>
    );
  }

  const imageSrc = getImageSrc();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {onLogout && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      )}
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Your Transformation Vision
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Impossible Goal Visualized</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            This infographic captures your mission, your selected goal, and the positive impacts you'll create.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {imageSrc ? (
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
              <img
                src={imageSrc}
                alt="Your Impossible Goal Infographic"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {visualization?.teamName || 'Your Team'}
                </h2>
                <p className="text-gray-400">
                  {visualization?.missionValues?.mission || 'Your mission drives everything'}
                </p>
              </div>

              {visualization?.missionValues?.coreValues && visualization.missionValues.coreValues.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {visualization.missionValues.coreValues.map((value, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-cyan-400 uppercase tracking-wider mb-1">
                      Your Impossible Goal
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {selectedGoal.goalTitle}
                    </h3>
                    <p className="text-gray-300">
                      {selectedGoal.goalDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { impact: selectedGoal.positiveImpact1, icon: Lightbulb },
                  { impact: selectedGoal.positiveImpact2, icon: Star },
                  { impact: selectedGoal.positiveImpact3, icon: Target }
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-gray-700/50 border border-gray-600 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-teal-400" />
                      </div>
                      <span className="text-sm text-gray-400">Impact {i + 1}</span>
                    </div>
                    <p className="text-white text-sm">{item.impact}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="text-amber-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {imageSrc && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
            <button
              onClick={generateInfographic}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Save this vision - it represents your transformation journey
          </div>
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all"
          >
            Continue to Workshop Hub
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
