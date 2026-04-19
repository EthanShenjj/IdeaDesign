'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Check, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import BackgroundLights from '@/components/BackgroundLights';
import { useToast } from '@/components/Toast';
import type { ModelConfig } from '@/types';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    const saved = localStorage.getItem('ai_models');
    if (saved) {
      setModels(JSON.parse(saved));
    } else {
      const defaultModels = [
        {
          id: '1',
          name: 'gpt-4o',
          displayName: 'GPT-4o (OpenAI)',
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          enabled: true
        }
      ];
      setModels(defaultModels);
      localStorage.setItem('ai_models', JSON.stringify(defaultModels));
    }
  }, []);

  const MODEL_PRESETS = [
    { name: 'gpt-4o', displayName: 'GPT-4o (OpenAI)', baseUrl: 'https://api.openai.com/v1' },
    { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', baseUrl: 'https://api.openai.com/v1' },
    { name: 'deepseek-chat', displayName: 'DeepSeek Chat', baseUrl: 'https://api.deepseek.com/v1' },
    { name: 'claude-3-5-sonnet-20240620', displayName: 'Claude 3.5 Sonnet', baseUrl: 'https://api.anthropic.com/v1' },
    { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
    { name: 'llama-3.1-70b-versatile', displayName: 'Groq Llama 3.1 70B', baseUrl: 'https://api.groq.com/openai/v1' },
    { name: 'doubao-1.5-pro', displayName: '豆包 Doubao-1.5 Pro', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
    { name: 'qwen-vl-max', displayName: '通义千问 Qwen-VL-Max', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  ];

  const saveModels = (newModels: ModelConfig[]) => {
    setModels(newModels);
    localStorage.setItem('ai_models', JSON.stringify(newModels));
  };

  const addModel = () => {
    const newModel: ModelConfig = {
      id: Date.now().toString(),
      name: '',
      displayName: '',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true
    };
    saveModels([...models, newModel]);
    setEditingModel(newModel.id);
    // 滚动到最下方
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const validateModel = (model: ModelConfig) => {
    const errors: string[] = [];
    if (!model.displayName.trim()) errors.push('displayName');
    if (!model.name.trim()) errors.push('name');
    if (!model.apiKey.trim()) errors.push('apiKey');
    
    setValidationError(prev => ({ ...prev, [model.id]: errors }));
    return errors.length === 0;
  };

  const finishEditing = (id: string) => {
    const model = models.find(m => m.id === id);
    if (!model) return;

    if (validateModel(model)) {
      setEditingModel(null);
      showToast(t('common.success') || '保存成功', 'success');
    } else {
      showToast(t('analyze.configureModel') || '请填写必填字段', 'error');
    }
  };

  const updateModel = (id: string, updates: Partial<ModelConfig>) => {
    const newModels = models.map(m => m.id === id ? { ...m, ...updates } : m);
    setModels(newModels);
    localStorage.setItem('ai_models', JSON.stringify(newModels));
    
    // 如果正在校验，实时清除错误提示
    if (validationError[id]) {
      const model = newModels.find(m => m.id === id);
      if (model) validateModel(model);
    }
  };

  const applyPreset = (id: string, preset: typeof MODEL_PRESETS[0]) => {
    updateModel(id, {
      name: preset.name,
      displayName: preset.displayName,
      baseUrl: preset.baseUrl
    });
  };

  const deleteModel = (id: string) => {
    saveModels(models.filter(m => m.id !== id));
    showToast(t('common.delete') || '已删除', 'success');
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

        <div className="space-y-8">
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

          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="font-headline font-bold text-2xl tracking-tight">{t('settings.model') || '模型配置'}</h2>
          </div>

          {/* Model Configurations */}
          {models.map((model) => (
            <div
              key={model.id}
              className={`bg-white rounded-3xl p-8 card-shadow border transition-all ${
                editingModel === model.id ? 'border-accent ring-4 ring-accent/5 scale-[1.01]' : 'border-black/5'
              }`}
            >
              {editingModel === model.id ? (
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-accent rounded-full" />
                      <h3 className="font-headline font-bold text-xl">{t('settings.editModel')}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => finishEditing(model.id)}
                        className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-200 active:scale-95"
                        title={t('common.confirm')}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingModel(null);
                          setValidationError(prev => {
                            const next = { ...prev };
                            delete next[model.id];
                            return next;
                          });
                          if (!model.name || !model.apiKey) {
                            // 如果是新建的且为空，则直接移除
                            if (model.id.length > 10) deleteModel(model.id);
                          }
                        }}
                        className="p-3 rounded-full bg-canvas text-ink/40 hover:bg-black/5 transition-all active:scale-95"
                        title={t('common.cancel')}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-canvas/50 p-6 rounded-2xl border border-black/5">
                    <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-4 flex items-center gap-2">
                      <Plus className="w-3 h-3" />
                      {t('settings.quickPick')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MODEL_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(model.id, preset)}
                          className="px-4 py-2 bg-white rounded-xl text-xs font-bold border border-black/5 hover:border-accent hover:text-accent transition-all card-shadow-sm active:scale-95"
                        >
                          {preset.displayName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2 flex justify-between">
                          {t('settings.displayName')}
                          {validationError[model.id]?.includes('displayName') && (
                            <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />必填</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={model.displayName}
                          onChange={(e) => updateModel(model.id, { displayName: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl border transition-all ${
                            validationError[model.id]?.includes('displayName') 
                              ? 'border-red-300 bg-red-50 focus:ring-red-200' 
                              : 'border-black/10 focus:border-accent focus:ring-accent/20'
                          } focus:ring-2`}
                          placeholder={t('settings.displayNamePlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2 flex justify-between">
                          {t('settings.modelName')}
                          {validationError[model.id]?.includes('name') && (
                            <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />必填</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={model.name}
                          onChange={(e) => updateModel(model.id, { name: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl border font-mono text-sm transition-all ${
                            validationError[model.id]?.includes('name') 
                              ? 'border-red-300 bg-red-50 focus:ring-red-200' 
                              : 'border-black/10 focus:border-accent focus:ring-accent/20'
                          } focus:ring-2`}
                          placeholder={t('settings.modelNamePlaceholder')}
                        />
                      </div>
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
                      <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-2 flex justify-between">
                        {t('settings.apiKey')}
                        {validationError[model.id]?.includes('apiKey') && (
                          <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />请配置此项以在首页显示</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey[model.id] ? "text" : "password"}
                          value={model.apiKey}
                          onChange={(e) => updateModel(model.id, { apiKey: e.target.value })}
                          className={`w-full px-4 py-3 pr-12 rounded-xl border font-mono text-sm transition-all ${
                            validationError[model.id]?.includes('apiKey') 
                              ? 'border-red-300 bg-red-50 focus:ring-red-200' 
                              : 'border-black/10 focus:border-accent focus:ring-accent/20'
                          } focus:ring-2`}
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
                      <p className="mt-2 text-[10px] text-ink/30 italic">
                        {t('analyze.configureModel') === '请先在设置中配置模型' 
                          ? '* 只有填写了 API 密钥的模型才会出现在首页的下拉列表中。' 
                          : '* Only models with an API Key will appear in the home page dropdown.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-headline font-bold text-xl">{model.displayName || t('settings.addNewModel')}</h3>
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
                        <span className="text-ink/40 font-label uppercase text-xs w-20">{t('settings.model')}:</span>
                        <span className="font-mono text-ink/70">{model.name || t('settings.notSet')}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-ink/40 font-label uppercase text-xs w-20">{t('settings.url')}:</span>
                        <span className="font-mono text-ink/70 truncate max-w-[300px]">{model.baseUrl}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-ink/40 font-label uppercase text-xs w-20">{t('settings.apiKey')}:</span>
                        <span className={`font-mono ${model.apiKey ? 'text-ink/70' : 'text-red-400 font-bold italic text-xs'}`}>
                          {model.apiKey ? '••••••••••••' : t('settings.notSet')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[100px]">
                    <button
                      onClick={() =>
                        updateModel(model.id, { enabled: !model.enabled })
                      }
                      className={`px-4 py-2 rounded-full text-xs font-label font-bold transition-all ${
                        model.enabled ? 'bg-canvas text-ink/60 hover:bg-black/5' : 'bg-accent text-ink hover:brightness-105'
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
                      className="p-2 rounded-full hover:bg-red-50 text-red-400 transition-colors flex items-center justify-center"
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
            className="w-full bg-white rounded-3xl p-8 border-2 border-dashed border-black/10 hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-3 group active:scale-[0.99]"
          >
            <Plus className="w-5 h-5 text-ink/40 group-hover:text-accent transition-colors" />
            <span className="font-headline font-bold text-ink/40 group-hover:text-accent transition-colors">
              {t('settings.addNewModel')}
            </span>
          </button>
        </div>

        <div className="mt-12 bg-white/40 backdrop-blur-md rounded-3xl p-10 border border-white/20">
          <h3 className="font-headline font-bold text-2xl mb-6">{t('settings.quickSetup')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-4">
              <div>
                <p className="font-bold text-ink mb-1">OpenAI</p>
                <code className="bg-black/5 px-2 py-1 rounded text-xs break-all">https://api.openai.com/v1</code>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">DeepSeek</p>
                <code className="bg-black/5 px-2 py-1 rounded text-xs break-all">https://api.deepseek.com/v1</code>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Anthropic (Claude)</p>
                <code className="bg-black/5 px-2 py-1 rounded text-xs break-all">https://api.anthropic.com/v1</code>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-ink mb-1">Groq</p>
                <code className="bg-black/5 px-2 py-1 rounded text-xs break-all">https://api.groq.com/openai/v1</code>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Local (Ollama)</p>
                <code className="bg-black/5 px-2 py-1 rounded text-xs break-all">http://localhost:11434/v1</code>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Volcano Engine (Ark)</p>
                <code className="bg-black/5 px-2 py-1 rounded text-xs break-all">https://ark.cn-beijing.volces.com/api/v3</code>
              </div>
            </div>
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
