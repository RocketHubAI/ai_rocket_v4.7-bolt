import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface IntegrationProvider {
  id: string;
  provider_slug: string;
  provider_name: string;
  provider_logo_url: string | null;
  provider_description: string | null;
  provider_category: string;
  auth_type: string;
  capabilities: string[];
  capability_descriptions: Record<string, string>;
  status: 'available' | 'beta' | 'coming_soon' | 'deprecated';
  requires_admin: boolean;
  sort_order: number;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  team_id: string | null;
  integration_id: string;
  connected_account_email: string | null;
  connected_account_name: string | null;
  status: 'active' | 'expired' | 'error' | 'disconnected' | 'pending_setup';
  last_error: string | null;
  last_used_at: string | null;
  last_synced_at: string | null;
  times_used_by_agent: number;
  created_at: string;
}

export interface IntegrationWithConnection extends IntegrationProvider {
  connection: UserIntegration | null;
}

const CATEGORY_ORDER: Record<string, number> = {
  storage: 0,
  calendar: 1,
  accounting: 2,
  communication: 3,
  crm: 4,
  project_management: 5,
  transcription: 6,
  analytics: 7,
  custom: 8
};

const CATEGORY_LABELS: Record<string, string> = {
  storage: 'Cloud Storage',
  calendar: 'Calendar',
  accounting: 'Finance & Accounting',
  communication: 'Communication',
  crm: 'CRM & Sales',
  project_management: 'Project Management',
  transcription: 'Transcription',
  analytics: 'Analytics & Marketing',
  custom: 'Advanced'
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export function getCategoryOrder(category: string): number {
  return CATEGORY_ORDER[category] ?? 99;
}

export function useIntegrations() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<UserIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamId = user?.user_metadata?.team_id;

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [registryResult, connectionsResult] = await Promise.all([
        supabase
          .from('integration_registry')
          .select('*')
          .neq('status', 'deprecated')
          .order('sort_order', { ascending: true }),
        supabase
          .from('user_integrations')
          .select('*')
          .eq('team_id', teamId)
      ]);

      if (registryResult.error) throw registryResult.error;
      if (connectionsResult.error) throw connectionsResult.error;

      setProviders(registryResult.data || []);
      setConnections(connectionsResult.data || []);
    } catch (err: any) {
      console.error('Error loading integrations:', err);
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [user, teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const integrationsWithConnections: IntegrationWithConnection[] = providers.map(provider => ({
    ...provider,
    connection: connections.find(c => c.integration_id === provider.id) || null
  }));

  const connectedCount = connections.filter(c => c.status === 'active').length;
  const availableCount = providers.filter(p => p.status === 'available').length;

  const groupedByCategory = integrationsWithConnections.reduce<Record<string, IntegrationWithConnection[]>>(
    (acc, integration) => {
      const cat = integration.provider_category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(integration);
      return acc;
    },
    {}
  );

  const sortedCategories = Object.keys(groupedByCategory).sort(
    (a, b) => getCategoryOrder(a) - getCategoryOrder(b)
  );

  const disconnectIntegration = async (integrationId: string) => {
    if (!user) return;

    const { error: deleteError } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('integration_id', integrationId);

    if (deleteError) {
      console.error('Error disconnecting:', deleteError);
      throw deleteError;
    }

    await fetchData();
  };

  return {
    providers,
    connections,
    integrationsWithConnections,
    groupedByCategory,
    sortedCategories,
    connectedCount,
    availableCount,
    loading,
    error,
    refresh: fetchData,
    disconnectIntegration
  };
}
