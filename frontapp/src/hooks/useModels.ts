'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ModelConfig } from '@/types';

const STORAGE_KEY = 'ai_models';

interface UseModelsReturn {
  models: ModelConfig[];
  enabledModels: ModelConfig[];
  selectedModel: ModelConfig | null;
  setSelectedModel: (model: ModelConfig | null) => void;
  loading: boolean;
  refreshModels: () => void;
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadModels = useCallback(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setModels(parsed);
        const enabled = parsed.filter((m: ModelConfig) => m.enabled && m.apiKey);
        if (enabled.length > 0 && !selectedModel) {
          setSelectedModel(enabled[0]);
        }
      } catch (error) {
        console.error('Failed to parse models from localStorage:', error);
      }
    }
    setLoading(false);
  }, [selectedModel]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const enabledModels = models.filter((m) => m.enabled && m.apiKey);

  const refreshModels = useCallback(() => {
    loadModels();
  }, [loadModels]);

  return {
    models,
    enabledModels,
    selectedModel,
    setSelectedModel,
    loading,
    refreshModels,
  };
}

export function getStoredModels(): ModelConfig[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveModels(models: ModelConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

export function getDefaultModel(): ModelConfig | null {
  const models = getStoredModels();
  return models.find((m) => m.enabled && m.apiKey) || null;
}
