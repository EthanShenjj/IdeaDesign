'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Check, X, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import BackgroundLights from '@/components/BackgroundLights';
import type { ModelConfig } from '@/types';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ai_models');
    if (saved) {
      setModels(JSON.parse(saved));
    } else {
      setModels([
        {
          id: '1',
          name: 'gpt-4o',
          displayName: 'GPT-4o (OpenAI)',
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          enabled: true
        }
      ]);
    }
  }, []);

  const saveModels = (newModels: ModelConfig[]) => {
    setModels(newModels);
    localStorage.setItem('ai_models', JSON.stringify(newModels));
  };

  const addModel = () => {
    const newModel: ModelConfig = {
      id: Date.now().toString(),
      name: '',
      displayName: t('settings.addNewModel'),
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true
    };
    saveModels([...models, newModel]);
    setEditingModel(newModel.id);
  };

  const updateModel = (id: string, updates: Partial<ModelConfig>) => {
    saveModels(models.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteModel = (id: string) => {
    saveModels(models.filter(m => m.id !== id));
  };

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <BackgroundLights />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-7 h-7 text-tertiary" />
            <h1 className="font-headline font-bold text-3xl tracking-tight">{t('settings.title')}</h1>
          </div>
          <p className="text-ink/60 text-base">{t('settings.subtitle')}</p>
        </div>

        <div className="space-y-6">
          {/* Output Language Setting */}
          <div className="bg-white rounded-3xl p-8 card-shadow border border-black/5">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-headline font-bold text-xl mb-2">
                  {t('settings.outputLanguage')}
                </h3>
                <p className="text-ink/60 text-sm">
                  {t('settings.outputLanguageDesc')}
                </p>
              </div>
            </div>
            
            <div className="bg-canvas rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink/70">
                  {t('settings.followSystem')}
                </span>
                <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm">
                  <span className="px-4 py-2 rounded-full text-xs font-bold bg-accent text-ink">
                    {t('common.success')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink/40 mt-3">
                {t('nav.home') === '首页' ? t('settings.languageChinese') : t('settings.languageEnglish')}
              </p>
            </div>
          </div>

          {/* Model Configurations */}
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-3xl p-8 card-shadow border border-black/5"
            >
              {editingModel === model.id ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="font-headline font-bold text-xl">{t('settings.editModel')}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingModel(null)}
                        className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingModel(null);
                          if (!model.name) deleteModel(model.id);
                        }}
                        className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2">
                        {t('settings.displayName')}
                      </label>
                      <input
                        type="text"
                        value={model.displayName}
                        onChange={(e) => updateModel(model.id, { displayName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder={t('settings.displayNamePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2">
                        {t('settings.modelName')}
                      </label>
                      <input
                        type="text"
                        value={model.name}
                        onChange={(e) => updateModel(model.id, { name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-sm"
                        placeholder={t('settings.modelNamePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2">
                        {t('settings.baseUrl')}
                      </label>
                      <input
                        type="text"
                        value={model.baseUrl}
                        onChange={(e) => updateModel(model.id, { baseUrl: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-sm"
                        placeholder={t('settings.baseUrlPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2">
                        {t('settings.apiKey')}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey[model.id] ? "text" : "password"}
                          value={model.apiKey}
                          onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-black/10 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-sm"
                          placeholder={t('settings.apiKeyPlaceholder')}
                        />
                        <button
                          onClick={() => toggleApiKeyVisibility(model.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded transition-colors"
                        >
                          {showApiKey[model.id] ? (
                            <EyeOff className="w-4 h-4 text-ink/40" />
                          ) : (
                            <Eye className="w-4 h-4 text-ink/40" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-headline font-bold text-xl">{model.displayName}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-label font-bold ${
                          model.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {model.enabled ? t('settings.enabled') : t('settings.disabled')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-ink/40 font-label uppercase text-xs">{t('settings.model')}:</span>
                        <span className="font-mono text-ink/70">{model.name || t('settings.notSet')}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-ink/40 font-label uppercase text-xs">{t('settings.url')}:</span>
                        <span className="font-mono text-ink/70 truncate">{model.baseUrl}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-ink/40 font-label uppercase text-xs">{t('settings.apiKey')}:</span>
                        <span className="font-mono text-ink/70">
                          {model.apiKey ? '••••••••••••' : t('settings.notSet')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateModel(model.id, { enabled: !model.enabled })
                      }
                      className={`px-4 py-2 rounded-full text-xs font-label font-bold transition-all ${
                        model.enabled ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-accent text-ink hover:brightness-105'
                      }`}
                    >
                      {model.enabled ? t('settings.disable') : t('settings.enable')}
                    </button>
                    <button
                      onClick={() => setEditingModel(model.id)}
                      className="px-4 py-2 rounded-full bg-canvas text-ink/70 hover:bg-black/5 transition-all text-xs font-label font-bold"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmId(model.id);
                      }}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addModel}
            className="w-full bg-white rounded-3xl p-8 border-2 border-dashed border-black/10 hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-3 group"
          >
            <Plus className="w-5 h-5 text-ink/40 group-hover:text-accent transition-colors" />
            <span className="font-headline font-bold text-ink/40 group-hover:text-accent transition-colors">
              {t('settings.addNewModel')}
            </span>
          </button>
        </div>

        <div className="mt-12 bg-white/40 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <h3 className="font-headline font-bold text-xl mb-4">{t('settings.quickSetup')}</h3>
          <div className="space-y-3 text-sm text-ink/70">
            <p>
              <strong>OpenAI:</strong> Use <code className="bg-black/5 px-2 py-1 rounded">https://api.openai.com/v1</code>
            </p>
            <p>
              <strong>OneAPI:</strong> Use your OneAPI instance URL
            </p>
            <p>
              <strong>DeepSeek:</strong> Use <code className="bg-black/5 px-2 py-1 rounded">https://api.deepseek.com/v1</code>
            </p>
            <p>
              <strong>Local LLM:</strong> Use your local server URL (e.g., <code className="bg-black/5 px-2 py-1 rounded">http://localhost:8000/v1</code>)
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm mx-4 border border-black/10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-full">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-headline font-bold text-xl">{t('settings.deleteConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-3 rounded-xl border border-black/10 hover:bg-black/5 transition-all font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  deleteModel(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all font-bold shadow-sm"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
