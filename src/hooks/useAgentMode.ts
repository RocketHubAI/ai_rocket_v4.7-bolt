import { useState, useEffect, useCallback } from 'react';
import { useFeatureFlag } from './useFeatureFlag';

const AGENT_MODE_STORAGE_KEY = 'agent_mode_enabled';
const AGENT_MODE_CHANGED_EVENT = 'agent-mode-changed';

interface UseAgentModeReturn {
  isAgentModeAvailable: boolean;
  isAgentModeEnabled: boolean;
  toggleAgentMode: () => void;
  enableAgentMode: () => void;
  disableAgentMode: () => void;
  loading: boolean;
}

function broadcastChange(value: boolean) {
  localStorage.setItem(AGENT_MODE_STORAGE_KEY, String(value));
  window.dispatchEvent(new CustomEvent(AGENT_MODE_CHANGED_EVENT, { detail: value }));
}

export function useAgentMode(): UseAgentModeReturn {
  const hasFeatureFlag = useFeatureFlag('agent_mode');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AGENT_MODE_STORAGE_KEY);
    if (stored !== null) {
      setIsEnabled(stored === 'true');
    } else if (hasFeatureFlag) {
      setIsEnabled(true);
      localStorage.setItem(AGENT_MODE_STORAGE_KEY, 'true');
    }
    setLoading(false);
  }, [hasFeatureFlag]);

  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail;
      setIsEnabled(value);
    };
    window.addEventListener(AGENT_MODE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(AGENT_MODE_CHANGED_EVENT, handler);
  }, []);

  const enableAgentMode = useCallback(() => {
    setIsEnabled(true);
    broadcastChange(true);
  }, []);

  const disableAgentMode = useCallback(() => {
    setIsEnabled(false);
    broadcastChange(false);
  }, []);

  const toggleAgentMode = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      broadcastChange(newValue);
      return newValue;
    });
  }, []);

  return {
    isAgentModeAvailable: hasFeatureFlag,
    isAgentModeEnabled: hasFeatureFlag && isEnabled,
    toggleAgentMode,
    enableAgentMode,
    disableAgentMode,
    loading
  };
}
