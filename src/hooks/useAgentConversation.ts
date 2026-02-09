import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  message: string;
  metadata: {
    appContext?: Record<string, unknown>;
    action?: AgentAction;
    onboardingStep?: string;
    timestamp?: string;
  };
  createdAt: string;
}

export interface AgentAction {
  type: 'navigate' | 'open_modal' | 'highlight' | 'run_report' | 'trigger_sync' | 'send_to_agent' | 'schedule_task' | 'overnight_detail' | 'overnight_visualization' | 'overnight_create' | 'none';
  target?: string;
  prompt?: string;
  params?: Record<string, unknown>;
}

interface UseAgentConversationReturn {
  messages: AgentMessage[];
  loading: boolean;
  sending: boolean;
  addUserMessage: (message: string, metadata?: Record<string, unknown>) => Promise<AgentMessage>;
  addAgentMessage: (message: string, metadata?: Record<string, unknown>) => Promise<AgentMessage>;
  clearConversation: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

const CONVERSATION_TIMEOUT_HOURS = 24;

export function useAgentConversation(): UseAgentConversationReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const teamId = user?.user_metadata?.team_id;

  const fetchMessages = useCallback(async () => {
    if (!user?.id || !teamId) {
      setLoading(false);
      return;
    }

    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - CONVERSATION_TIMEOUT_HOURS);

      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role,
          message: m.message,
          metadata: m.metadata || {},
          createdAt: m.created_at
        })));
      }
    } catch (err) {
      console.error('Error fetching agent messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, teamId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user?.id || !teamId) return;

    const channel = supabase
      .channel(`agent_conversations_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage: AgentMessage = {
            id: payload.new.id,
            role: payload.new.role,
            message: payload.new.message,
            metadata: payload.new.metadata || {},
            createdAt: payload.new.created_at
          };
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, teamId]);

  const addUserMessage = useCallback(async (
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AgentMessage> => {
    if (!user?.id || !teamId) {
      throw new Error('User not authenticated');
    }

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .insert({
          user_id: user.id,
          team_id: teamId,
          role: 'user',
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage: AgentMessage = {
        id: data.id,
        role: 'user',
        message: data.message,
        metadata: data.metadata || {},
        createdAt: data.created_at
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      return newMessage;
    } finally {
      setSending(false);
    }
  }, [user?.id, teamId]);

  const addAgentMessage = useCallback(async (
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AgentMessage> => {
    if (!user?.id || !teamId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .insert({
          user_id: user.id,
          team_id: teamId,
          role: 'agent',
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage: AgentMessage = {
        id: data.id,
        role: 'agent',
        message: data.message,
        metadata: data.metadata || {},
        createdAt: data.created_at
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      return newMessage;
    } catch (err) {
      console.error('Error adding agent message:', err);
      throw err;
    }
  }, [user?.id, teamId]);

  const clearConversation = useCallback(async () => {
    if (!user?.id || !teamId) return;

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('team_id', teamId);

      if (error) throw error;

      setMessages([]);
    } catch (err) {
      console.error('Error clearing conversation:', err);
      throw err;
    }
  }, [user?.id, teamId]);

  return {
    messages,
    loading,
    sending,
    addUserMessage,
    addAgentMessage,
    clearConversation,
    refreshMessages: fetchMessages
  };
}
