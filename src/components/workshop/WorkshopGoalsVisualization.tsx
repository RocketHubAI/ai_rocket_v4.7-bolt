import React, { useState, useEffect } from 'react';
import { Target, Sparkles, Check, ArrowRight, Loader2, CheckCircle2, Circle, LogOut, Clock, Image, Download, MessageSquare, Lightbulb, Send, FlaskConical, Rocket, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Goal } from './WorkshopMindsetJourney';

interface GoalWithProgress extends Goal {
  isCompleted: boolean;
  chatCount: number;
  creationCount: number;
  conversationId?: string | null;
}

interface WorkshopGoalsVisualizationProps {
  userId: string;
  registrationId: string;
  teamId?: string;
  initialGoals?: Goal[];
  onComplete: (selectedGoal: Goal) => void;
  onOpenGallery?: () => void;
  onOpenAllGoalsCreate?: () => void;
  onOpenBuildLab?: () => void;
  onLogout?: () => void;
}

const REQUIRED_CHATS_PER_GOAL = 1;
const REQUIRED_CREATIONS_PER_GOAL = 1;

export const WorkshopGoalsVisualization: React.FC<WorkshopGoalsVisualizationProps> = ({
  userId,
  registrationId,
  teamId,
  initialGoals,
  onComplete,
  onOpenGallery,
  onOpenAllGoalsCreate,
  onOpenBuildLab,
  onLogout
}) => {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [selectedGoalNumber, setSelectedGoalNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(7);
  const [allGoalsCreationCompleted, setAllGoalsCreationCompleted] = useState(false);
  const [showWhatsNext, setShowWhatsNext] = useState(false);
  const [wishes, setWishes] = useState({ wish1: '', wish2: '', wish3: '' });
  const [savingWishes, setSavingWishes] = useState(false);
  const [wishesSubmitted, setWishesSubmitted] = useState(false);
  const [exportingChat, setExportingChat] = useState(false);
  const [restartingGoal, setRestartingGoal] = useState<number | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadGoals();
    loadRegistrationStatus();
    calculateDaysRemaining();
    checkWishesStatus();
  }, [userId]);

  const calculateDaysRemaining = async () => {
    try {
      const { data: registration } = await supabase
        .from('workshop_registrations')
        .select('access_expires_at')
        .eq('id', registrationId)
        .maybeSingle();

      if (registration?.access_expires_at) {
        const expiresAt = new Date(registration.access_expires_at);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, diffDays));
      }
    } catch (err) {
      console.error('Error calculating days:', err);
    }
  };

  const loadRegistrationStatus = async () => {
    try {
      const { data } = await supabase
        .from('workshop_registrations')
        .select('all_goals_creation_completed')
        .eq('id', registrationId)
        .maybeSingle();

      if (data) {
        setAllGoalsCreationCompleted(data.all_goals_creation_completed || false);
      }
    } catch (err) {
      console.error('Error loading registration:', err);
    }
  };

  const checkWishesStatus = async () => {
    try {
      const { data } = await supabase
        .from('workshop_wishes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && (data.wish_1 || data.wish_2 || data.wish_3)) {
        setWishes({
          wish1: data.wish_1 || '',
          wish2: data.wish_2 || '',
          wish3: data.wish_3 || ''
        });
        setWishesSubmitted(true);
      }
    } catch (err) {
      console.error('Error checking wishes:', err);
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('workshop_goals')
        .select('*')
        .eq('user_id', userId)
        .order('goal_number', { ascending: true });

      if (error) throw error;

      if (data) {
        const loadedGoals: GoalWithProgress[] = data.map(g => ({
          goalNumber: g.goal_number,
          goalTitle: g.goal_title,
          goalDescription: g.goal_description,
          positiveImpact1: g.positive_impact_1,
          positiveImpact2: g.positive_impact_2,
          positiveImpact3: g.positive_impact_3,
          isCompleted: g.is_completed || false,
          chatCount: g.chat_count || 0,
          creationCount: g.creation_count || 0,
          conversationId: g.conversation_id
        }));
        setGoals(loadedGoals);

        const selected = data.find(g => g.is_selected && !g.is_completed);
        if (selected) {
          setSelectedGoalNumber(selected.goal_number);
        } else {
          const firstIncomplete = loadedGoals.find(g => !g.isCompleted);
          if (firstIncomplete) {
            setSelectedGoalNumber(firstIncomplete.goalNumber);
          }
        }
      }
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAndLaunchGoal = async (goalNumber: number) => {
    if (saving) return;
    const goal = goals.find(g => g.goalNumber === goalNumber);
    if (!goal) return;

    setSaving(true);

    try {
      await supabase
        .from('workshop_goals')
        .update({ is_selected: false })
        .eq('user_id', userId);

      await supabase
        .from('workshop_goals')
        .update({ is_selected: true })
        .eq('user_id', userId)
        .eq('goal_number', goalNumber);

      await supabase
        .from('workshop_registrations')
        .update({ current_step: 'goal_selection' })
        .eq('id', registrationId);

      onComplete(goal);
    } catch (err) {
      console.error('Error selecting goal:', err);
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedGoalNumber) return;

    setSaving(true);

    try {
      await supabase
        .from('workshop_registrations')
        .update({ current_step: 'goal_selection' })
        .eq('id', registrationId);

      const selectedGoal = goals.find(g => g.goalNumber === selectedGoalNumber);
      if (selectedGoal) {
        onComplete(selectedGoal);
      }
    } catch (err) {
      console.error('Error updating step:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportChat = async () => {
    setExportingChat(true);
    try {
      const allMessages: { goal: string; messages: { role: string; content: string; timestamp: string }[] }[] = [];

      for (const goal of goals) {
        if (goal.conversationId) {
          const { data: messages } = await supabase
            .from('astra_chats')
            .select('user_email, message, created_at')
            .eq('conversation_id', goal.conversationId)
            .order('created_at', { ascending: true });

          if (messages && messages.length > 0) {
            allMessages.push({
              goal: `Goal ${goal.goalNumber}: ${goal.goalTitle}`,
              messages: messages.map(m => ({
                role: m.user_email === 'astra@rockethub.ai' ? 'Astra' : 'You',
                content: m.message,
                timestamp: new Date(m.created_at).toLocaleString()
              }))
            });
          }
        }
      }

      let exportText = `Workshop Chat Export\n`;
      exportText += `Exported on: ${new Date().toLocaleString()}\n`;
      exportText += `${'='.repeat(60)}\n\n`;

      for (const goalChat of allMessages) {
        exportText += `\n${goalChat.goal}\n`;
        exportText += `${'-'.repeat(40)}\n\n`;

        for (const msg of goalChat.messages) {
          exportText += `[${msg.timestamp}] ${msg.role}:\n`;
          exportText += `${msg.content}\n\n`;
        }
      }

      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workshop-chat-export-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting chat:', err);
    } finally {
      setExportingChat(false);
    }
  };

  const handleRestartGoalChat = async (goalNumber: number) => {
    setRestartingGoal(goalNumber);
    setShowRestartConfirm(null);

    try {
      const goal = goals.find(g => g.goalNumber === goalNumber);
      if (!goal) return;

      if (goal.conversationId) {
        await supabase
          .from('astra_chats')
          .delete()
          .eq('conversation_id', goal.conversationId);
      }

      const newConversationId = crypto.randomUUID();

      await supabase
        .from('workshop_goals')
        .update({
          conversation_id: newConversationId,
          chat_count: 0,
          is_completed: false
        })
        .eq('user_id', userId)
        .eq('goal_number', goalNumber);

      setGoals(prev => prev.map(g => {
        if (g.goalNumber === goalNumber) {
          return {
            ...g,
            conversationId: newConversationId,
            chatCount: 0,
            isCompleted: false
          };
        }
        return g;
      }));

    } catch (err) {
      console.error('Error restarting goal chat:', err);
    } finally {
      setRestartingGoal(null);
    }
  };

  const handleSaveWishes = async () => {
    if (!wishes.wish1 && !wishes.wish2 && !wishes.wish3) return;

    setSavingWishes(true);
    try {
      const { data: existing } = await supabase
        .from('workshop_wishes')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('workshop_wishes')
          .update({
            wish_1: wishes.wish1,
            wish_2: wishes.wish2,
            wish_3: wishes.wish3,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('workshop_wishes')
          .insert({
            user_id: userId,
            registration_id: registrationId,
            wish_1: wishes.wish1,
            wish_2: wishes.wish2,
            wish_3: wishes.wish3
          });
      }

      setWishesSubmitted(true);
      setTimeout(() => {
        setShowWhatsNext(false);
      }, 1500);
    } catch (err) {
      console.error('Error saving wishes:', err);
    } finally {
      setSavingWishes(false);
    }
  };

  const getGradientForGoal = (index: number) => {
    const gradients = [
      'from-cyan-500 to-blue-500',
      'from-teal-500 to-emerald-500',
      'from-amber-500 to-orange-500'
    ];
    return gradients[index % gradients.length];
  };

  const getBgGradientForGoal = (index: number) => {
    const gradients = [
      'from-cyan-500/10 to-blue-500/10',
      'from-teal-500/10 to-emerald-500/10',
      'from-amber-500/10 to-orange-500/10'
    ];
    return gradients[index % gradients.length];
  };

  const getGoalLabel = (index: number) => {
    const labels = ['Business Goal', 'Personal Goal', 'Team Goal'];
    return labels[index] || `Goal ${index + 1}`;
  };

  const completedCount = goals.filter(g => g.isCompleted).length;
  const allCompleted = completedCount === 3;
  const hasIncompleteGoals = completedCount < 3;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your goals...</p>
        </div>
      </div>
    );
  }

  if (showWhatsNext) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {onLogout && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Logout</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowWhatsNext(false)}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Goals
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">What's Next?</h1>
              <p className="text-gray-400">
                You've completed all 3 goals! Now tell us - what 3 things do you wish AI could do to help you achieve your goals?
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  1. What's the first thing you wish AI could help you with?
                </label>
                <textarea
                  value={wishes.wish1}
                  onChange={(e) => setWishes(prev => ({ ...prev, wish1: e.target.value }))}
                  placeholder="Describe what you'd love AI to help you accomplish..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={wishesSubmitted}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  2. What's the second thing?
                </label>
                <textarea
                  value={wishes.wish2}
                  onChange={(e) => setWishes(prev => ({ ...prev, wish2: e.target.value }))}
                  placeholder="Another way AI could support your journey..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={wishesSubmitted}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  3. And the third thing?
                </label>
                <textarea
                  value={wishes.wish3}
                  onChange={(e) => setWishes(prev => ({ ...prev, wish3: e.target.value }))}
                  placeholder="One more AI wish for achieving your goals..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={wishesSubmitted}
                />
              </div>

              {!wishesSubmitted ? (
                <button
                  onClick={handleSaveWishes}
                  disabled={savingWishes || (!wishes.wish1 && !wishes.wish2 && !wishes.wish3)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
                >
                  {savingWishes ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Your Wishes
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-medium text-lg mb-1">Wishes Submitted!</p>
                  <p className="text-gray-400 text-sm">Redirecting to Build Lab access...</p>
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mx-auto mt-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {completedCount === 0 ? 'Your Impossible Goals' : `${completedCount}/3 Goals Completed`}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {allCompleted
              ? 'All Goals Completed!'
              : completedCount > 0
                ? 'Continue Your Journey'
                : "Let's Workshop Your Goals"}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {allCompleted
              ? 'Congratulations! You\'ve completed all three goals. Click on any goal to continue working on it, or explore the options below.'
              : completedCount > 0
                ? `Great progress! You've completed ${completedCount} goal${completedCount > 1 ? 's' : ''}. Select your next goal to continue.`
                : 'We\'ll work through each goal one at a time. Select which goal you\'d like to workshop first. All the insights from your initial conversation will be used throughout this process.'}
          </p>

          {allCompleted && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={onOpenGallery}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                <Image className="w-4 h-4" />
                View Gallery
              </button>
              <button
                onClick={handleExportChat}
                disabled={exportingChat}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                {exportingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Chats
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {allCompleted && allGoalsCreationCompleted && onOpenBuildLab && (
            <div className="mb-8 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-2 border-cyan-500/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                  <FlaskConical className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Ready for Build Lab</h3>
                  <p className="text-sm text-gray-400">Transform your ideas into working prototypes</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                The Build Lab will help you create interactive prototypes and exportable blueprints you can use with Claude, ChatGPT, Gemini, or any AI assistant to build your tools.
              </p>
              <button
                onClick={onOpenBuildLab}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium text-lg transition-all"
              >
                <Rocket className="w-5 h-5" />
                Enter Build Lab
              </button>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {goals.map((goal, index) => {
              const isCompleted = goal.isCompleted;
              const isSelected = selectedGoalNumber === goal.goalNumber;
              const canClick = !saving;

              return (
                <button
                  key={goal.goalNumber}
                  onClick={() => canClick && handleSelectAndLaunchGoal(goal.goalNumber)}
                  disabled={!canClick}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-500/50 bg-green-500/5 hover:border-green-500 hover:bg-green-500/10 cursor-pointer'
                      : isSelected
                        ? `border-cyan-500 bg-gradient-to-br ${getBgGradientForGoal(index)} scale-[1.02]`
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800 cursor-pointer'
                  }`}
                >
                  {isCompleted ? (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  ) : isSelected ? (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  ) : null}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${isCompleted ? 'from-green-500 to-emerald-500' : getGradientForGoal(index)} flex items-center justify-center mb-4`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <Target className="w-6 h-6 text-white" />
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      {getGoalLabel(index)}
                    </div>
                    {isCompleted && (
                      <span className="text-xs text-green-400 font-medium">Completed</span>
                    )}
                  </div>

                  <h3 className={`text-lg font-semibold mb-2 line-clamp-2 ${isCompleted ? 'text-green-300' : 'text-white'}`}>
                    {goal.goalTitle}
                  </h3>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {goal.goalDescription}
                  </p>

                  {!isCompleted && (
                    <div className="space-y-2 pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {goal.chatCount >= REQUIRED_CHATS_PER_GOAL ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span className={goal.chatCount >= REQUIRED_CHATS_PER_GOAL ? 'text-green-400' : 'text-gray-500'}>
                            Chats: {goal.chatCount}/{REQUIRED_CHATS_PER_GOAL}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {goal.creationCount >= REQUIRED_CREATIONS_PER_GOAL ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span className={goal.creationCount >= REQUIRED_CREATIONS_PER_GOAL ? 'text-green-400' : 'text-gray-500'}>
                            Creations: {goal.creationCount}/{REQUIRED_CREATIONS_PER_GOAL}
                          </span>
                        </div>
                      </div>
                      {goal.chatCount > 0 && (
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRestartConfirm(goal.goalNumber);
                            }}
                            disabled={restartingGoal === goal.goalNumber}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                            title="Restart this goal chat"
                          >
                            {restartingGoal === goal.goalNumber ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Restart Chat
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!isCompleted && showRestartConfirm === goal.goalNumber && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 bg-gray-900/95 rounded-2xl flex flex-col items-center justify-center p-4 z-10"
                    >
                      <RotateCcw className="w-8 h-8 text-amber-400 mb-3" />
                      <p className="text-white text-center text-sm mb-4">
                        Restart this goal chat? All previous messages will be cleared.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRestartConfirm(null);
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestartGoalChat(goal.goalNumber);
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Restart Chat
                        </button>
                      </div>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="space-y-2 pt-3 border-t border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-green-400/80">
                          {REQUIRED_CHATS_PER_GOAL} chats & {REQUIRED_CREATIONS_PER_GOAL} creation completed
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRestartConfirm(goal.goalNumber);
                          }}
                          disabled={restartingGoal === goal.goalNumber}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                          title="Restart this goal chat"
                        >
                          {restartingGoal === goal.goalNumber ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Restart
                        </button>
                      </div>
                    </div>
                  )}

                  {showRestartConfirm === goal.goalNumber && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 bg-gray-900/95 rounded-2xl flex flex-col items-center justify-center p-4 z-10"
                    >
                      <RotateCcw className="w-8 h-8 text-amber-400 mb-3" />
                      <p className="text-white text-center text-sm mb-4">
                        Restart this goal chat? All previous messages will be cleared.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRestartConfirm(null);
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestartGoalChat(goal.goalNumber);
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Restart Chat
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {hasIncompleteGoals && (
            <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">How This Works</h3>
                  <p className="text-gray-400 text-sm">
                    For each goal, you'll have AI-powered conversations and create a visualization.
                    Complete {REQUIRED_CHATS_PER_GOAL} chats and {REQUIRED_CREATIONS_PER_GOAL} creation per goal.
                    Once all 3 goals are workshopped, you'll unlock bonus features!
                  </p>
                </div>
              </div>
            </div>
          )}

          {allCompleted && (
            <div className={`mt-8 rounded-2xl ${allGoalsCreationCompleted ? 'bg-gray-800/50 border border-gray-700 p-4' : 'bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-2 border-cyan-500/50 p-6'}`}>
              <div className={`flex items-center justify-between ${allGoalsCreationCompleted ? '' : 'mb-4'}`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center ${allGoalsCreationCompleted ? 'w-10 h-10' : 'w-12 h-12'}`}>
                    <Sparkles className={`text-white ${allGoalsCreationCompleted ? 'w-5 h-5' : 'w-6 h-6'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-white ${allGoalsCreationCompleted ? 'text-base' : 'text-lg'}`}>Create with Astra</h3>
                    <p className="text-sm text-gray-400">
                      {allGoalsCreationCompleted ? 'Create another visualization' : 'Generate a visualization using all 3 goals'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{daysRemaining} days left</span>
                </div>
              </div>
              {!allGoalsCreationCompleted && (
                <p className="text-gray-400 text-sm mb-4">
                  Create an image or presentation that combines insights from all three of your goals.
                  This visualization will use context from all your chats and goal information.
                </p>
              )}
              <button
                onClick={onOpenAllGoalsCreate}
                className={`w-full flex items-center justify-center gap-2 px-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all ${allGoalsCreationCompleted ? 'mt-3 py-2.5 text-sm' : 'py-3'}`}
              >
                <Sparkles className={allGoalsCreationCompleted ? 'w-4 h-4' : 'w-5 h-5'} />
                {allGoalsCreationCompleted ? 'Create Another Visualization' : 'Create Combined Visualization'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!allCompleted && (
        <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedGoalNumber ? (
                <span className="text-cyan-400">
                  Selected: {goals.find(g => g.goalNumber === selectedGoalNumber)?.goalTitle}
                </span>
              ) : (
                'Select a goal to workshop'
              )}
            </div>
            <button
              onClick={handleContinue}
              disabled={!selectedGoalNumber || saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {completedCount > 0 ? 'Continue with Goal' : 'Start with Goal'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
