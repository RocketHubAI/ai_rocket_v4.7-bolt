import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles,
  Target,
  Rocket,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Menu,
  X,
  RotateCcw,
  FileText,
  Upload,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ChatContainer } from '../ChatContainer';
import AstraCreateView from '../AstraCreateView';
import { WorkshopGuidedChat } from './WorkshopGuidedChat';
import type { Goal } from './WorkshopMindsetJourney';

interface GoalWithProgress extends Goal {
  isCompleted: boolean;
  chatCount: number;
  creationCount: number;
  conversationId: string | null;
}

interface WorkshopHubProps {
  userId: string;
  registrationId: string;
  teamId: string;
  teamName: string;
  selectedGoal: Goal;
  infographicUrl?: string;
  onComplete: () => void;
  onLogout: () => void;
  onReturnToGoals?: () => void;
  onSelectGoal?: (goal: Goal) => void;
}

type HubView = 'home' | 'chat' | 'create' | 'goal' | 'updateDocument';

interface WorkshopDocument {
  id: string;
  fileName: string;
  sourceType: 'local_upload' | 'astra_created';
  createdAt: string;
}

const REQUIRED_CHATS_PER_GOAL = 1;
const REQUIRED_CREATIONS_PER_GOAL = 1;

export const WorkshopHub: React.FC<WorkshopHubProps> = ({
  userId,
  registrationId,
  teamId,
  teamName,
  selectedGoal,
  infographicUrl,
  onComplete,
  onLogout,
  onReturnToGoals,
  onSelectGoal
}) => {
  const [activeView, setActiveView] = useState<HubView>('home');
  const [daysRemaining, setDaysRemaining] = useState<number>(5);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentGoalChatCount, setCurrentGoalChatCount] = useState(0);
  const [currentGoalCreateCount, setCurrentGoalCreateCount] = useState(0);
  const [allGoals, setAllGoals] = useState<GoalWithProgress[]>([]);
  const [isCurrentGoalComplete, setIsCurrentGoalComplete] = useState(false);
  const [isAllGoalsComplete, setIsAllGoalsComplete] = useState(false);
  const [selectedChatPrompt, setSelectedChatPrompt] = useState<string | null>(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const [currentGoalConversationId, setCurrentGoalConversationId] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<WorkshopDocument | null>(null);
  const [updateDocumentOption, setUpdateDocumentOption] = useState<'upload' | 'create' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing' | 'verifying' | 'complete' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [missionStatement, setMissionStatement] = useState('');
  const [coreValues, setCoreValues] = useState('');
  const [teamGoals, setTeamGoals] = useState('');
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [isResettingChat, setIsResettingChat] = useState(false);
  const [creationJustCompleted, setCreationJustCompleted] = useState(false);
  const [showGoalResetConfirm, setShowGoalResetConfirm] = useState(false);
  const [isResettingGoal, setIsResettingGoal] = useState(false);

  const loadGoalsAndProgress = useCallback(async () => {
    try {
      const { data: goals } = await supabase
        .from('workshop_goals')
        .select('*')
        .eq('user_id', userId)
        .order('goal_number');

      if (goals) {
        const goalsWithProgress: GoalWithProgress[] = goals.map(g => ({
          goalNumber: g.goal_number,
          goalTitle: g.goal_title,
          goalDescription: g.goal_description,
          positiveImpact1: g.positive_impact_1,
          positiveImpact2: g.positive_impact_2,
          positiveImpact3: g.positive_impact_3,
          isCompleted: g.is_completed || false,
          chatCount: g.chat_count || 0,
          creationCount: g.creation_count || 0,
          conversationId: g.conversation_id || null
        }));

        setAllGoals(goalsWithProgress);

        const currentGoal = goalsWithProgress.find(g => g.goalNumber === selectedGoal.goalNumber);
        if (currentGoal) {
          setCurrentGoalCreateCount(currentGoal.creationCount);
          setIsCurrentGoalComplete(currentGoal.isCompleted);
          setCurrentGoalConversationId(currentGoal.conversationId);

          if (currentGoal.conversationId) {
            const { data: userMessages } = await supabase
              .from('astra_chats')
              .select('id, user_email')
              .eq('conversation_id', currentGoal.conversationId)
              .neq('user_email', 'astra@rockethub.ai');

            const { data: allMessages } = await supabase
              .from('astra_chats')
              .select('user_email')
              .eq('conversation_id', currentGoal.conversationId)
              .order('created_at', { ascending: true })
              .limit(1);

            const userMessageCount = userMessages?.length || 0;
            const firstMessageIsAstra = allMessages && allMessages.length > 0 && allMessages[0].user_email === 'astra@rockethub.ai';

            // Check if there's at least one Astra response (indicating chat happened)
            const { data: astraMessages } = await supabase
              .from('astra_chats')
              .select('id')
              .eq('conversation_id', currentGoal.conversationId)
              .eq('user_email', 'astra@rockethub.ai')
              .limit(1);

            const hasAstraResponse = astraMessages && astraMessages.length > 0;

            // If there's an Astra response, count it as 1 completed chat
            const totalMessageCount = hasAstraResponse ? 1 : 0;

            // If conversation exists but has no user messages at all, clear it to allow retry
            if (userMessageCount === 0 && currentGoal.conversationId && !hasAstraResponse) {
              console.log('Detected orphaned conversation with no messages, clearing it');
              await supabase
                .from('workshop_goals')
                .update({
                  conversation_id: null,
                  chat_count: 0
                })
                .eq('user_id', userId)
                .eq('goal_number', currentGoal.goalNumber);
              setCurrentGoalConversationId(null);
              setCurrentGoalChatCount(0);
            } else {
              // IMPORTANT: Only update chat_count if calculated count is HIGHER than stored count
              // This prevents overwriting the count while waiting for Astra's response
              // (The user may have clicked "Proceed" before Astra responded)
              if (totalMessageCount > currentGoal.chatCount) {
                console.log(`Updating chat count from ${currentGoal.chatCount} to ${totalMessageCount}`);
                await supabase
                  .from('workshop_goals')
                  .update({ chat_count: totalMessageCount })
                  .eq('user_id', userId)
                  .eq('goal_number', currentGoal.goalNumber);
                setCurrentGoalChatCount(totalMessageCount);
              } else {
                // Keep the stored count (it may have been manually incremented)
                setCurrentGoalChatCount(currentGoal.chatCount);
              }
            }
          } else {
            setCurrentGoalChatCount(currentGoal.chatCount);
          }
        }

        const allComplete = goalsWithProgress.every(g => g.isCompleted);
        setIsAllGoalsComplete(allComplete);
      }
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  }, [userId, selectedGoal.goalNumber]);

  const updateGoalProgress = useCallback(async (chatDelta: number, createDelta: number) => {
    try {
      const newChatCount = currentGoalChatCount + chatDelta;
      const newCreateCount = currentGoalCreateCount + createDelta;

      await supabase
        .from('workshop_goals')
        .update({
          chat_count: newChatCount,
          creation_count: newCreateCount
        })
        .eq('user_id', userId)
        .eq('goal_number', selectedGoal.goalNumber);

      setCurrentGoalChatCount(newChatCount);
      setCurrentGoalCreateCount(newCreateCount);

      if (newChatCount >= REQUIRED_CHATS_PER_GOAL && newCreateCount >= REQUIRED_CREATIONS_PER_GOAL) {
        await supabase
          .from('workshop_goals')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('goal_number', selectedGoal.goalNumber);

        setIsCurrentGoalComplete(true);
        loadGoalsAndProgress();
      }
    } catch (err) {
      console.error('Error updating goal progress:', err);
    }
  }, [userId, selectedGoal.goalNumber, currentGoalChatCount, currentGoalCreateCount, loadGoalsAndProgress]);

  useEffect(() => {
    calculateDaysRemaining();
    loadGoalsAndProgress();
  }, [userId, loadGoalsAndProgress]);

  useEffect(() => {
    if (activeView === 'home') {
      loadGoalsAndProgress();
    }
  }, [activeView, loadGoalsAndProgress]);

  const calculateDaysRemaining = async () => {
    try {
      const { data } = await supabase
        .from('workshop_registrations')
        .select('expires_at')
        .eq('id', registrationId)
        .maybeSingle();

      if (data?.expires_at) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, diffDays));
      }
    } catch (err) {
      console.error('Error calculating days:', err);
    }
  };

  const loadCurrentDocument = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workshop_documents')
        .select('id, file_name, source_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setCurrentDocument({
          id: data.id,
          fileName: data.file_name,
          sourceType: data.source_type,
          createdAt: data.created_at
        });
      }
    } catch (err) {
      console.error('Error loading document:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadCurrentDocument();
  }, [loadCurrentDocument]);

  const verifyFileInDatabase = async (uploadId: string, filename: string): Promise<string | null> => {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const startTime = Date.now();

    for (let attempt = 0; attempt < 60; attempt++) {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_id')
        .eq('team_id', teamId)
        .eq('file_name', sanitizedFilename)
        .gte('created_at', new Date(startTime - 5000).toISOString())
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0].document_id;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;

    setUploadedFile(file);
    setUploadProgress('uploading');
    setUploadError(null);

    try {
      const uploadId = crypto.randomUUID();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${teamId}/${userId}/${uploadId}/${sanitizedFilename}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('local-uploads')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      setUploadProgress('processing');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-local-file`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            storagePath: uploadData.path,
            filename: file.name,
            mimeType: file.type,
            category: 'strategy',
            teamId,
            userId,
            uploadId,
            fileSize: file.size
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      setUploadProgress('verifying');

      const docId = await verifyFileInDatabase(uploadId, file.name);
      if (!docId) {
        throw new Error('File verification timed out');
      }

      if (currentDocument?.id) {
        await supabase.from('workshop_documents').delete().eq('id', currentDocument.id);
      }

      await supabase.from('workshop_documents').insert({
        user_id: userId,
        team_id: teamId,
        document_id: docId,
        file_name: file.name,
        source_type: 'local_upload'
      });

      setUploadProgress('complete');
      await loadCurrentDocument();
      setTimeout(() => {
        setActiveView('home');
        setUpdateDocumentOption(null);
        setUploadProgress('idle');
        setUploadedFile(null);
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed');
      setUploadProgress('error');
    }
  };

  const handleCreateNewDocument = async () => {
    if (!missionStatement.trim() || !coreValues.trim() || !teamGoals.trim() || !teamId) return;

    setIsCreatingDocument(true);
    setUploadError(null);

    try {
      const documentContent = `# Team Strategy Document

## Mission Statement
${missionStatement}

## Core Values
${coreValues}

## Team Goals
${teamGoals}

## Focus Goal - "${selectedGoal.goalTitle}"
${selectedGoal.goalDescription}

### Positive Impacts of Achieving This Goal
1. ${selectedGoal.positiveImpact1}
2. ${selectedGoal.positiveImpact2}
3. ${selectedGoal.positiveImpact3}

---
Generated via AI-preneur Workshop
Date: ${new Date().toLocaleDateString()}
`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-workshop-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            teamId,
            userId,
            fileName: 'team-strategy-document.md',
            content: documentContent,
            category: 'strategy'
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Document creation failed: ${errorText}`);
      }

      const result = await response.json();
      const docId = result.documentId;

      if (!docId) {
        throw new Error('Failed to get document ID');
      }

      console.log('Document created in chunks, ID:', docId);

      if (currentDocument?.id) {
        console.log('Deleting old workshop document record:', currentDocument.id);
        const { error: deleteError } = await supabase
          .from('workshop_documents')
          .delete()
          .eq('id', currentDocument.id);

        if (deleteError) {
          console.error('Error deleting old document:', deleteError);
        }
      }

      console.log('Inserting new workshop document record...');
      const { data: insertData, error: insertError } = await supabase
        .from('workshop_documents')
        .insert({
          user_id: userId,
          team_id: teamId,
          document_id: docId,
          file_name: 'team-strategy-document.md',
          source_type: 'astra_created'
        })
        .select();

      if (insertError) {
        console.error('Failed to save workshop document reference:', insertError);
        throw new Error(`Failed to save document reference: ${insertError.message}`);
      }

      console.log('Workshop document saved successfully:', insertData);
      setUploadProgress('complete');
      await loadCurrentDocument();
      setTimeout(() => {
        setActiveView('home');
        setUpdateDocumentOption(null);
        setUploadProgress('idle');
        setMissionStatement('');
        setCoreValues('');
        setTeamGoals('');
      }, 1500);
    } catch (err: any) {
      console.error('Create document error:', err);
      setUploadError(err.message || 'Failed to create document');
    } finally {
      setIsCreatingDocument(false);
    }
  };

  const handleGoalComplete = () => {
    if (onReturnToGoals) {
      onReturnToGoals();
    }
  };

  const handleChatComplete = async () => {
    await updateGoalProgress(1, 0);
  };

  const handleCreateComplete = () => {
    updateGoalProgress(0, 1);
    setCreationJustCompleted(true);
  };

  const getProgressPercentage = (current: number, required: number) => {
    return Math.min(100, Math.round((current / required) * 100));
  };

  const renderProgressBar = (current: number, required: number, color: string) => {
    const percentage = getProgressPercentage(current, required);
    const isComplete = current >= required;

    return (
      <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    );
  };

  const completedGoalsCount = allGoals.filter(g => g.isCompleted).length;

  const renderHome = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isCurrentGoalComplete ? 'Goal Complete!' : 'Workshop Your Goal'}
          </h1>
          <p className="text-gray-400">
            {isCurrentGoalComplete
              ? completedGoalsCount < 3
                ? `Great work! Select your next goal to continue. ${completedGoalsCount}/3 goals completed.`
                : 'All goals completed! Get your launch code below.'
              : `Complete ${REQUIRED_CHATS_PER_GOAL} chats and ${REQUIRED_CREATIONS_PER_GOAL} creation for this goal`}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          {allGoals.map((goal, index) => {
            const isCompleted = goal.isCompleted;
            const isCurrent = goal.goalNumber === selectedGoal.goalNumber;
            const isNextAvailable = isCurrentGoalComplete && !isCompleted && index === allGoals.findIndex(g => !g.isCompleted);
            const canClick = (isCompleted || isNextAvailable) && onSelectGoal;
            return (
              <button
                key={goal.goalNumber}
                onClick={() => canClick && onSelectGoal(goal)}
                disabled={!canClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isCompleted
                    ? isCurrent
                      ? 'bg-green-500/30 border-2 border-green-500/50 cursor-pointer hover:bg-green-500/40'
                      : 'bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 cursor-pointer'
                    : isNextAvailable
                      ? 'bg-cyan-500/30 border-2 border-cyan-500 cursor-pointer hover:bg-cyan-500/40 animate-pulse'
                      : isCurrent
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-gray-800 border border-gray-700 cursor-default'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : isNextAvailable ? (
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                ) : isCurrent ? (
                  <Target className="w-4 h-4 text-cyan-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                )}
                <span className={`text-sm font-medium ${
                  isCompleted ? 'text-green-400' : isNextAvailable ? 'text-cyan-400' : isCurrent ? 'text-cyan-400' : 'text-gray-500'
                }`}>
                  {isNextAvailable ? 'Start Goal ' : 'Goal '}{goal.goalNumber}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`rounded-2xl p-6 mb-6 ${
          isCurrentGoalComplete
            ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30'
            : 'bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/30'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isCurrentGoalComplete
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : 'bg-gradient-to-br from-cyan-500 to-teal-500'
            }`}>
              {isCurrentGoalComplete ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <Target className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className={`text-xs uppercase tracking-wider mb-1 ${isCurrentGoalComplete ? 'text-green-400' : 'text-cyan-400'}`}>
                {isCurrentGoalComplete ? 'Completed Goal' : 'Currently Working On'}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {selectedGoal.goalTitle}
              </h2>
              <p className="text-gray-300 text-sm">
                {selectedGoal.goalDescription}
              </p>
            </div>
          </div>
        </div>

        {isCurrentGoalComplete && completedGoalsCount < 3 && onReturnToGoals && (
          <div className="mb-8 bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-2 border-green-500/50 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Goal {selectedGoal.goalNumber} Complete!</h3>
                <p className="text-gray-400">Great work! You're ready for the next goal.</p>
              </div>
            </div>
            <button
              onClick={handleGoalComplete}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium text-lg transition-all shadow-lg"
            >
              <ArrowRight className="w-5 h-5" />
              Continue to Goal {completedGoalsCount + 1}
            </button>
          </div>
        )}

        {isCurrentGoalComplete && completedGoalsCount >= 3 && onReturnToGoals && (
          <div className="mb-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/50 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">All Goals Complete!</h3>
                <p className="text-gray-400">Congratulations! You've completed all 3 goals.</p>
              </div>
            </div>
            <button
              onClick={handleGoalComplete}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium text-lg transition-all shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              Return to Goals Overview
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
            {currentGoalChatCount >= REQUIRED_CHATS_PER_GOAL ? (
              <div className="bg-gray-800/50 border border-green-500/30 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-green-300 mb-2">
                  Astra Guided Prompt
                </h3>
                <p className="text-gray-400 text-sm">
                  You've completed your guided prompt for this goal.
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (currentGoalChatCount > 0) {
                    setIsChatActive(true);
                  }
                  setActiveView('chat');
                }}
                className="bg-gray-800 border-2 border-cyan-500/50 rounded-2xl p-6 text-left hover:border-cyan-500 hover:bg-gray-800/80 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                    <ArrowRight className="w-4 h-4" />
                    Start Here
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  Astra Guided Prompt
                </h3>
                <p className="text-gray-400 text-sm">
                  Choose a guided prompt to discuss strategies for this goal.
                </p>
              </button>
            )}

            {currentGoalChatCount >= REQUIRED_CHATS_PER_GOAL ? (
              currentGoalCreateCount >= REQUIRED_CREATIONS_PER_GOAL ? (
                <div className="bg-gray-800/50 border border-green-500/30 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-green-300 mb-2">
                    Create with Astra
                  </h3>
                  <p className="text-gray-400 text-sm">
                    You've created a visualization for this goal.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setActiveView('create')}
                  className="bg-gray-800 border-2 border-teal-500/50 rounded-2xl p-6 text-left hover:border-teal-500 hover:bg-gray-800/80 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-full text-sm font-medium">
                      <ArrowRight className="w-4 h-4" />
                      Next Step
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-teal-400 transition-colors">
                    Create with Astra
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Generate a visualization for this goal.
                  </p>
                </button>
              )
            ) : (
              <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6 opacity-60">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-gray-500" />
                  </div>
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 text-gray-500 rounded-full text-sm font-medium">
                    Locked
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  Create with Astra
                </h3>
                <p className="text-gray-600 text-sm">
                  Complete Astra Guided Prompt first to unlock this step.
                </p>
              </div>
            )}
          </div>

        {(currentGoalChatCount > 0 || currentGoalCreateCount > 0) && !isCurrentGoalComplete && (
          <div className="mb-6">
            <button
              onClick={() => setShowGoalResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear & Restart This Goal
            </button>
          </div>
        )}

        {showGoalResetConfirm && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-400 font-medium mb-1">Reset Goal {selectedGoal.goalNumber}?</p>
                <p className="text-gray-400 text-sm mb-3">
                  This will clear your guided prompt and creation progress for this goal. You'll need to start over.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGoalResetConfirm(false)}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetGoal}
                    disabled={isResettingGoal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:bg-gray-600"
                  >
                    {isResettingGoal ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    Confirm Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentDocument && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400">Your Strategy Document</p>
                  <p className="text-white font-medium truncate">{currentDocument.fileName}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveView('updateDocument')}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Update
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Workshop Progress
                </h3>
                <p className="text-sm text-gray-400">
                  {completedGoalsCount}/3 goals completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{daysRemaining} days left</span>
            </div>
          </div>

          <div className="mt-4 bg-gray-900/50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4">
              {allGoals.map((goal) => (
                <div key={goal.goalNumber} className="flex items-center gap-2">
                  {goal.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                  )}
                  <span className={goal.isCompleted ? 'text-green-400 text-sm' : 'text-gray-300 text-sm'}>
                    Goal {goal.goalNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onReturnToGoals && (
            <button
              onClick={onReturnToGoals}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Return to Goals Overview
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderGoalView = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Hub
        </button>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          {infographicUrl ? (
            <img
              src={infographicUrl}
              alt="Your Impossible Goal"
              className="w-full h-auto"
            />
          ) : (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedGoal.goalTitle}
                </h2>
                <p className="text-gray-400 max-w-lg mx-auto">
                  {selectedGoal.goalDescription}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: 'Impact 1', value: selectedGoal.positiveImpact1 },
                  { label: 'Impact 2', value: selectedGoal.positiveImpact2 },
                  { label: 'Impact 3', value: selectedGoal.positiveImpact3 }
                ].map((impact, i) => (
                  <div
                    key={i}
                    className="bg-gray-700/50 border border-gray-600 rounded-xl p-4"
                  >
                    <div className="text-xs text-cyan-400 uppercase tracking-wider mb-2">
                      {impact.label}
                    </div>
                    <p className="text-white text-sm">{impact.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleBackFromChat = async () => {
    if (isChatActive) {
      await handleChatComplete();
      // Small delay to ensure database update has propagated
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setSelectedChatPrompt(null);
    setIsChatActive(false);
    setActiveView('home');
  };

  const handleSelectChatPrompt = (prompt: string) => {
    setSelectedChatPrompt(prompt);
    setIsChatActive(true);
  };

  const handleConversationChange = async (conversationId: string) => {
    if (conversationId && conversationId !== currentGoalConversationId) {
      setCurrentGoalConversationId(conversationId);
      await supabase
        .from('workshop_goals')
        .update({ conversation_id: conversationId })
        .eq('user_id', userId)
        .eq('goal_number', selectedGoal.goalNumber);
    }
  };

  const handleRestartChat = async () => {
    setIsResettingChat(true);
    try {
      await supabase
        .from('workshop_goals')
        .update({
          chat_count: 0,
          conversation_id: null
        })
        .eq('user_id', userId)
        .eq('goal_number', selectedGoal.goalNumber);

      setCurrentGoalChatCount(0);
      setCurrentGoalConversationId(null);
      setIsChatActive(false);
      setSelectedChatPrompt(null);
      setShowRestartConfirm(false);

      loadGoalsAndProgress();
    } catch (err) {
      console.error('Error resetting chat:', err);
    } finally {
      setIsResettingChat(false);
    }
  };

  const handleResetGoal = async () => {
    setIsResettingGoal(true);
    try {
      await supabase
        .from('workshop_goals')
        .update({
          chat_count: 0,
          creation_count: 0,
          conversation_id: null,
          is_completed: false,
          completed_at: null
        })
        .eq('user_id', userId)
        .eq('goal_number', selectedGoal.goalNumber);

      setCurrentGoalChatCount(0);
      setCurrentGoalCreateCount(0);
      setCurrentGoalConversationId(null);
      setIsCurrentGoalComplete(false);
      setIsChatActive(false);
      setSelectedChatPrompt(null);
      setShowGoalResetConfirm(false);

      loadGoalsAndProgress();
    } catch (err) {
      console.error('Error resetting goal:', err);
    } finally {
      setIsResettingGoal(false);
    }
  };

  const renderChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedChatPrompt(null);
                setIsChatActive(false);
                setActiveView('home');
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-white">
                {isChatActive ? 'Astra Guided Prompt' : 'Choose a Prompt'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isChatActive && currentGoalChatCount > 0 && (
              <button
                onClick={() => setShowRestartConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Start Over</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showRestartConfirm && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Start over? This will clear your chat history for this goal.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartChat}
                disabled={isResettingChat}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:bg-gray-600"
              >
                {isResettingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {isChatActive ? (
          <>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatContainer
                sidebarOpen={false}
                onCloseSidebar={() => {}}
                onOpenSidebar={() => {}}
                conversationToLoad={currentGoalConversationId}
                shouldStartNewChat={!currentGoalConversationId}
                onConversationLoaded={() => {}}
                onNewChatStarted={() => {}}
                onConversationChange={handleConversationChange}
                guidedPromptToSubmit={selectedChatPrompt}
                onGuidedPromptSubmitted={() => setSelectedChatPrompt(null)}
              />
            </div>
            <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={handleBackFromChat}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium text-lg transition-all shadow-lg"
                >
                  <Check className="w-5 h-5" />
                  Proceed to Next Step
                </button>
                <p className="text-center text-gray-500 text-sm mt-2">
                  Click to complete Astra Guided Prompt and unlock Create with Astra
                </p>
              </div>
            </div>
          </>
        ) : (
          <WorkshopGuidedChat
            goal={selectedGoal}
            onSelectPrompt={handleSelectChatPrompt}
          />
        )}
      </div>
    </div>
  );

  const handleProceedFromCreate = () => {
    setCreationJustCompleted(false);
    setActiveView('home');
  };

  const renderCreate = () => (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setCreationJustCompleted(false);
                setActiveView('home');
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-white">Create with Astra</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <AstraCreateView
          onGenerationComplete={handleCreateComplete}
          workshopMode={true}
          workshopGoal={selectedGoal}
          workshopConversationId={currentGoalConversationId}
          workshopTeamId={teamId}
          onBackFromResult={handleProceedFromCreate}
        />
      </div>

      {creationJustCompleted && (
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleProceedFromCreate}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium text-lg transition-all shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              Proceed to Next Step
            </button>
            <p className="text-center text-gray-500 text-sm mt-2">
              Click to complete your creation and unlock the next goal
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderUpdateDocument = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            setActiveView('home');
            setUpdateDocumentOption(null);
            setUploadProgress('idle');
            setUploadError(null);
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Hub
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Update Your Document</h2>
          <p className="text-gray-400">
            Replace your existing strategy document with a new one
          </p>
        </div>

        {currentDocument && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-400">Current Document</p>
                <p className="text-white font-medium">{currentDocument.fileName}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-400 capitalize">
                {currentDocument.sourceType === 'astra_created' ? 'Created with Astra' : 'Uploaded'}
              </span>
            </div>
          </div>
        )}

        {!updateDocumentOption && (
          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => setUpdateDocumentOption('upload')}
              className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-cyan-500 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload New Document</h3>
              <p className="text-gray-400 text-sm">
                Upload a new strategy document from your device
              </p>
            </button>

            <button
              onClick={() => setUpdateDocumentOption('create')}
              className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-teal-500 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Create with Astra</h3>
              <p className="text-gray-400 text-sm">
                Generate a new strategy document with AI assistance
              </p>
            </button>
          </div>
        )}

        {updateDocumentOption === 'upload' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <button
              onClick={() => {
                setUpdateDocumentOption(null);
                setUploadProgress('idle');
                setUploadError(null);
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Choose different option
            </button>

            <h3 className="text-lg font-semibold text-white mb-2">Upload New Document</h3>
            <p className="text-gray-400 text-sm mb-4">
              This will replace your current document with a new one.
            </p>

            {uploadProgress === 'idle' && (
              <label className="block w-full p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-cyan-500 transition-colors cursor-pointer text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 font-medium">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT, MD (max 50MB)</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>
            )}

            {(uploadProgress === 'uploading' || uploadProgress === 'processing' || uploadProgress === 'verifying') && (
              <div className="p-6 bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-white font-medium">{uploadedFile?.name}</span>
                </div>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'uploading' ? 'text-cyan-400' : 'text-gray-500'}`}>
                    {uploadProgress === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-400" />}
                    Uploading file...
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'processing' ? 'text-cyan-400' : uploadProgress === 'verifying' || uploadProgress === 'complete' ? 'text-gray-500' : 'text-gray-600'}`}>
                    {uploadProgress === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : uploadProgress === 'verifying' || uploadProgress === 'complete' ? <Check className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4" />}
                    Processing document...
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${uploadProgress === 'verifying' ? 'text-cyan-400' : uploadProgress === 'complete' ? 'text-gray-500' : 'text-gray-600'}`}>
                    {uploadProgress === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : uploadProgress === 'complete' ? <Check className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4" />}
                    Syncing with Astra...
                  </div>
                </div>
              </div>
            )}

            {uploadProgress === 'complete' && (
              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Check className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium">Document updated successfully!</p>
                    <p className="text-gray-400 text-sm">Returning to hub...</p>
                  </div>
                </div>
              </div>
            )}

            {uploadProgress === 'error' && (
              <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="text-red-400 font-medium">Upload failed</p>
                    <p className="text-gray-400 text-sm">{uploadError}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadProgress('idle');
                    setUploadError(null);
                  }}
                  className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {updateDocumentOption === 'create' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <button
              onClick={() => {
                setUpdateDocumentOption(null);
                setUploadProgress('idle');
                setUploadError(null);
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Choose different option
            </button>

            <h3 className="text-lg font-semibold text-white mb-2">Create New Strategy Document</h3>
            <p className="text-gray-400 text-sm mb-4">
              Answer these questions to generate a new strategy document.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Your Mission Statement</label>
                <textarea
                  value={missionStatement}
                  onChange={(e) => setMissionStatement(e.target.value)}
                  placeholder="What is your team's purpose? Why do you exist?"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Core Values (list 3-5)</label>
                <textarea
                  value={coreValues}
                  onChange={(e) => setCoreValues(e.target.value)}
                  placeholder="What principles guide your team's decisions and behavior?"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Team Goals</label>
                <textarea
                  value={teamGoals}
                  onChange={(e) => setTeamGoals(e.target.value)}
                  placeholder="What are you trying to achieve in the next 12 months?"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <p className="text-cyan-400 text-sm font-medium mb-1">Your Selected Goal Will Be Included</p>
                <p className="text-gray-300 text-sm">"{selectedGoal.goalTitle}"</p>
              </div>

              {uploadProgress !== 'complete' && (
                <button
                  onClick={handleCreateNewDocument}
                  disabled={!missionStatement.trim() || !coreValues.trim() || !teamGoals.trim() || isCreatingDocument}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isCreatingDocument ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Document...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Strategy Document
                    </>
                  )}
                </button>
              )}

              {uploadProgress === 'complete' && (
                <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Check className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-green-400 font-medium">Document updated successfully!</p>
                      <p className="text-gray-400 text-sm">Returning to hub...</p>
                    </div>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{uploadError}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white">{teamName}</h1>
              <p className="text-xs text-gray-400">AI-preneur Workshop</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400">{daysRemaining} days left</span>
            </div>
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
          <div className="md:hidden mt-4 pt-4 border-t border-gray-700 space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400">{daysRemaining} days remaining</span>
            </div>
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

      {activeView === 'home' && renderHome()}
      {activeView === 'chat' && renderChat()}
      {activeView === 'create' && renderCreate()}
      {activeView === 'goal' && renderGoalView()}
      {activeView === 'updateDocument' && renderUpdateDocument()}
    </div>
  );
};
