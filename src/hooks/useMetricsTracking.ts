import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface MetricEvent {
  type: 'message' | 'report' | 'visualization' | 'document' | 'session_start' | 'session_end';
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  chatId?: string;
  responseTimeMs: number;
  success: boolean;
  errorMessage?: string;
  mode?: string;
}

export function useMetricsTracking() {
  const { user } = useAuth();
  const sessionStartTime = useRef<number | null>(null);
  const metricsQueue = useRef<MetricEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  const queueMetric = useCallback((event: MetricEvent) => {
    metricsQueue.current.push(event);

    if (metricsQueue.current.length >= 10) {
      flushMetrics();
    } else if (!flushTimeout.current) {
      flushTimeout.current = setTimeout(flushMetrics, 60000);
    }
  }, []);

  const flushMetrics = useCallback(async () => {
    if (!user || metricsQueue.current.length === 0) return;

    const events = [...metricsQueue.current];
    metricsQueue.current = [];

    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
      flushTimeout.current = null;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      const messagesSent = events.filter(e => e.type === 'message').length;
      const reportsGenerated = events.filter(e => e.type === 'report').length;
      const visualizationsCreated = events.filter(e => e.type === 'visualization').length;
      const documentsUploaded = events.filter(e => e.type === 'document').length;

      if (messagesSent > 0) {
        await supabase.rpc('increment_daily_metric', {
          p_user_id: user.id,
          p_metric_date: today,
          p_metric_name: 'messages_sent',
          p_increment_value: messagesSent
        });
      }

      if (reportsGenerated > 0) {
        await supabase.rpc('increment_daily_metric', {
          p_user_id: user.id,
          p_metric_date: today,
          p_metric_name: 'reports_generated',
          p_increment_value: reportsGenerated
        });
      }

      if (visualizationsCreated > 0) {
        await supabase.rpc('increment_daily_metric', {
          p_user_id: user.id,
          p_metric_date: today,
          p_metric_name: 'visualizations_created',
          p_increment_value: visualizationsCreated
        });
      }

      if (documentsUploaded > 0) {
        await supabase.rpc('increment_daily_metric', {
          p_user_id: user.id,
          p_metric_date: today,
          p_metric_name: 'documents_uploaded',
          p_increment_value: documentsUploaded
        });
      }

      console.log('✅ Metrics flushed:', {
        messagesSent,
        reportsGenerated,
        visualizationsCreated,
        documentsUploaded
      });
    } catch (error) {
      console.error('❌ Error flushing metrics:', error);
      metricsQueue.current.unshift(...events);
    }
  }, [user]);

  const trackMessageSent = useCallback(async (chatId: string, mode: string = 'chat') => {
    if (!user) return;

    queueMetric({ type: 'message', metadata: { chatId, mode } });

    supabase
      .from('user_milestones')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone_type', 'first_message')
      .single()
      .then(({ data, error }) => {
        if (error && error.code === 'PGRST116') {
          return supabase.from('user_milestones').insert({
            user_id: user.id,
            milestone_type: 'first_message',
            milestone_value: { chat_id: chatId, mode, timestamp: new Date().toISOString() }
          });
        }
      })
      .catch(err => console.error('Error tracking first_message milestone:', err));
  }, [user, queueMetric]);

  const trackReportGeneration = useCallback(async (reportId: string, templateUsed?: string) => {
    if (!user) return;

    queueMetric({ type: 'report', metadata: { reportId, templateUsed } });

    supabase
      .from('user_milestones')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone_type', 'first_report')
      .single()
      .then(({ data, error }) => {
        if (error && error.code === 'PGRST116') {
          return supabase.from('user_milestones').insert({
            user_id: user.id,
            milestone_type: 'first_report',
            milestone_value: { report_id: reportId, template: templateUsed, timestamp: new Date().toISOString() }
          });
        }
      })
      .catch(err => console.error('Error tracking first_report milestone:', err));
  }, [user, queueMetric]);

  const trackVisualizationCreation = useCallback(async (chatId: string) => {
    if (!user) return;

    queueMetric({ type: 'visualization', metadata: { chatId } });

    supabase
      .from('user_milestones')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone_type', 'first_visualization')
      .single()
      .then(({ data, error }) => {
        if (error && error.code === 'PGRST116') {
          return supabase.from('user_milestones').insert({
            user_id: user.id,
            milestone_type: 'first_visualization',
            milestone_value: { chat_id: chatId, timestamp: new Date().toISOString() }
          });
        }
      })
      .catch(err => console.error('Error tracking first_visualization milestone:', err));
  }, [user, queueMetric]);

  const trackDocumentUpload = useCallback(async (documentName: string, documentSize: number) => {
    if (!user) return;

    queueMetric({ type: 'document', metadata: { documentName, documentSize } });

    supabase
      .from('user_milestones')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone_type', 'first_document_upload')
      .single()
      .then(({ data, error }) => {
        if (error && error.code === 'PGRST116') {
          return supabase.from('user_milestones').insert({
            user_id: user.id,
            milestone_type: 'first_document_upload',
            milestone_value: { document_name: documentName, timestamp: new Date().toISOString() }
          });
        }
      })
      .catch(err => console.error('Error tracking first_document_upload milestone:', err));
  }, [user, queueMetric]);

  const trackAIPerformance = useCallback(async (metric: PerformanceMetric) => {
    if (!user) return;

    try {
      supabase.from('astra_performance_logs').insert({
        user_id: user.id,
        chat_id: metric.chatId || null,
        response_time_ms: metric.responseTimeMs,
        success: metric.success,
        error_message: metric.errorMessage || null,
        mode: metric.mode || 'chat'
      }).then(({ error }) => {
        if (error) {
          console.error('Error tracking AI performance:', error);
        }
      });

      if (!metric.success) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.rpc('increment_daily_metric', {
          p_user_id: user.id,
          p_metric_date: today,
          p_metric_name: 'error_count',
          p_increment_value: 1
        });
      }
    } catch (error) {
      console.error('Error in trackAIPerformance:', error);
    }
  }, [user]);

  const trackSessionStart = useCallback(async () => {
    if (!user) return;

    sessionStartTime.current = Date.now();
    const sessionId = crypto.randomUUID();

    sessionStorage.setItem('astra_session_id', sessionId);
    sessionStorage.setItem('astra_session_start', sessionStartTime.current.toString());

    const today = new Date().toISOString().split('T')[0];

    try {
      await supabase.rpc('increment_daily_metric', {
        p_user_id: user.id,
        p_metric_date: today,
        p_metric_name: 'sessions_count',
        p_increment_value: 1
      });

      console.log('📊 Session started:', sessionId);
    } catch (error) {
      console.error('Error tracking session start:', error);
    }
  }, [user]);

  const trackSessionEnd = useCallback(async () => {
    if (!user) return;

    const sessionStart = sessionStorage.getItem('astra_session_start');
    if (!sessionStart) return;

    const durationSeconds = Math.floor((Date.now() - parseInt(sessionStart)) / 1000);
    const today = new Date().toISOString().split('T')[0];

    try {
      await supabase.rpc('increment_daily_metric', {
        p_user_id: user.id,
        p_metric_date: today,
        p_metric_name: 'total_session_duration_seconds',
        p_increment_value: durationSeconds
      });

      console.log('📊 Session ended. Duration:', durationSeconds, 'seconds');

      sessionStorage.removeItem('astra_session_id');
      sessionStorage.removeItem('astra_session_start');
    } catch (error) {
      console.error('Error tracking session end:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && !sessionStorage.getItem('astra_session_id')) {
      trackSessionStart();
    }

    const handleBeforeUnload = () => {
      trackSessionEnd();
      flushMetrics();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackSessionEnd();
        flushMetrics();
      } else if (user && !sessionStorage.getItem('astra_session_id')) {
        trackSessionStart();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
    };
  }, [user, trackSessionStart, trackSessionEnd, flushMetrics]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (metricsQueue.current.length > 0) {
        flushMetrics();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [flushMetrics]);

  return {
    trackMessageSent,
    trackReportGeneration,
    trackVisualizationCreation,
    trackDocumentUpload,
    trackAIPerformance,
    trackSessionStart,
    trackSessionEnd,
    flushMetrics
  };
}
