'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Download, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { compareModels, getFullUrl } from '@/lib/api';
import BackgroundLights from '@/components/BackgroundLights';
import type { ModelConfig } from '@/types';

interface ModelResult {
  modelName: string;
  imageUrl: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
  generationTime?: number;
}

export default function ComparePage() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('ai_models');
    if (saved) {
      const models = JSON.parse(saved);
      setAvailableModels(models.filter((m: ModelConfig) => m.enabled && m.apiKey));
    }
  }, []);

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const generateImages = async () => {
    if (!prompt || selectedModels.length === 0) return;

    setIsGenerating(true);
    const initialResults: ModelResult[] = selectedModels.map(modelId => {
      const model = availableModels.find(m => m.id === modelId);
      return {
        modelName: model?.displayName || 'Unknown',
        imageUrl: '',
        status: 'generating' as const
      };
    });
    setResults(initialResults);

    const promises = selectedModels.map(async (modelId, index) => {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) return;

      const startTime = Date.now();

      try {
        const result = await compareModels(prompt, [model], { size: '1024x1024' });
        const generationTime = Date.now() - startTime;

        if (result.success && result.results && result.results[0]) {
          const modelResult = result.results[0];
          setResults(prev => {
            const newResults = [...prev];
            newResults[index] = {
              ...newResults[index],
              status: 'success',
              imageUrl: modelResult.url,
              generationTime
            };
            return newResults;
          });
        } else {
          throw new Error(result.error || t('compare.generationFailed'));
        }
      } catch (error: any) {
        setResults(prev => {
          const newResults = [...prev];
          newResults[index] = {
            ...newResults[index],
            status: 'error',
            error: error.message
          };
          return newResults;
        });
      }
    });

    await Promise.all(promises);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <BackgroundLights />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-7 h-7 text-tertiary" />
            <h1 className="font-headline font-bold text-3xl tracking-tight">{t('compare.title')}</h1>
          </div>
          <p className="text-ink/60 text-base">{t('compare.subtitle')}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 card-shadow border border-black/5 mb-8">
          <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-3">
            {t('compare.prompt')}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('compare.promptPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none"
            rows={4}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 card-shadow border border-black/5 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-xl">{t('compare.selectModels')}</h3>
            <span className="text-sm text-ink/40">
              {selectedModels.length} {t('compare.selected')}
            </span>
          </div>

          {availableModels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-ink/40 mb-4">{t('compare.noModels')}</p>
              <a href="/settings" className="inline-block px-6 py-3 bg-accent text-ink rounded-full font-headline font-bold hover:brightness-105 transition-all">
                {t('compare.configureModels')}
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    selectedModels.includes(model.id)
                      ? 'border-accent bg-accent/10'
                      : 'border-black/10 hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-headline font-bold text-lg">{model.displayName}</h4>
                    {selectedModels.includes(model.id) && (
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-mono text-ink/60">{model.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={generateImages}
          disabled={isGenerating || !prompt || selectedModels.length === 0}
          className="w-full bg-ink text-white py-6 rounded-full font-headline font-bold text-lg hover:bg-ink/90 transition-all shadow-xl shadow-ink/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-12"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>{t('compare.generating')}</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>{t('compare.generateButton')} {selectedModels.length} {selectedModels.length !== 1 ? t('compare.models') : t('compare.model')}</span>
            </>
          )}
        </button>

        {results.length > 0 && (
          <div>
            <h3 className="font-headline font-bold text-2xl mb-6">{t('compare.results')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl overflow-hidden card-shadow border border-black/5"
                >
                  <div className="aspect-square bg-zinc-100 relative">
                    {result.status === 'generating' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Sparkles className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
                          <p className="text-ink/40 font-medium">{t('compare.generating')}</p>
                        </div>
                      </div>
                    )}

                    {result.status === 'success' && result.imageUrl && (
                      <>
                        <img
                          src={getFullUrl(result.imageUrl)}
                          alt={result.modelName}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = result.imageUrl;
                            link.download = `${result.modelName}.png`;
                            link.click();
                          }}
                          className="absolute top-4 right-4 p-3 rounded-full bg-white/90 hover:bg-white transition-all shadow-lg"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {result.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="text-center">
                          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <p className="text-red-500 font-medium mb-2">{t('compare.generationFailed')}</p>
                          <p className="text-xs text-ink/40">{result.error}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h4 className="font-headline font-bold text-xl mb-2">{result.modelName}</h4>
                    
                    {result.status === 'success' && result.generationTime && (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <span className="font-label uppercase text-xs">{t('compare.time')}:</span>
                        <span className="font-mono">{(result.generationTime / 1000).toFixed(2)}s</span>
                      </div>
                    )}

                    {result.status === 'generating' && (
                      <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                        <div className="h-full bg-accent animate-pulse w-2/3" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
