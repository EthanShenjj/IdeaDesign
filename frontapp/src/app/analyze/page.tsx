'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Sparkles, Copy, Check, Save, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { saveAsset as saveAssetToAPI, extractColors, analyzeImage as analyzeImageFromAPI, getFullUrl, saveToHistory } from '@/lib/api';
import BackgroundLights from '@/components/BackgroundLights';
import type { AnalysisResult, ModelConfig } from '@/types';

export default function AnalyzePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ai_models');
    if (saved) {
      const models = JSON.parse(saved);
      const enabledModels = models.filter((m: ModelConfig) => m.enabled && m.apiKey);
      setAvailableModels(enabledModels);
      
      if (enabledModels.length > 0 && !selectedModel) {
        setSelectedModel(enabledModels[0]);
      }
    }
  }, [selectedModel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImageFile(null);
    setImagePreview(url);
  };

  const generateTitleFromAnalysis = (analysis: any) => {
    const parsed = analysis.parsed;
    
    // 尝试从不同字段提取关键词来生成标题
    const titleParts = [];
    
    // 从艺术风格提取
    if (parsed.art_style) {
      const styleMatch = parsed.art_style.match(/(minimalist|abstract|geometric|surreal|vintage|modern|brutalist|organic|cinematic|editorial|ethereal)/i);
      if (styleMatch) titleParts.push(styleMatch[1]);
    }
    
    // 从媒介提取
    if (parsed.medium) {
      const mediumMatch = parsed.medium.match(/(photography|illustration|3d render|digital art|painting|graphic design)/i);
      if (mediumMatch) titleParts.push(mediumMatch[1]);
    }
    
    // 从色彩提取
    if (parsed.color_palette) {
      const colorMatch = parsed.color_palette.match(/(vibrant|pastel|monochrome|colorful|muted|bold|warm|cool|neutral)/i);
      if (colorMatch) titleParts.push(colorMatch[1]);
    }
    
    // 从构图提取主题
    if (parsed.composition && titleParts.length < 2) {
      const words = parsed.composition.split(' ').slice(0, 3);
      const cleanWords = words.filter((w: string) => w.length > 3 && !/^(the|and|with|from)$/i.test(w));
      if (cleanWords.length > 0) titleParts.push(cleanWords[0]);
    }
    
    // 如果提取到了关键词，组合成标题
    if (titleParts.length > 0) {
      return titleParts.slice(0, 3).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // 如果没有提取到，使用默认格式
    return `${t('library.defaultAnalysisTitle')} ${new Date().toLocaleDateString()}`;
  };

  const analyzeImage = async () => {
    if (!selectedModel) {
      alert(t('analyze.configureModel'));
      return;
    }

    if (!imageFile && !imageUrl) {
      alert(t('analyze.provideImage'));
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const colorData = await extractColors(imageFile || undefined, imageUrl || undefined);
      
      if (!colorData.success) {
        throw new Error('Color extraction failed');
      }

      const analysisData = await analyzeImageFromAPI(imageFile, imageUrl, selectedModel, language);
      
      if (!analysisData.success) {
        throw new Error('Analysis failed');
      }

      console.log('[DEBUG] Analysis data received:', analysisData);
      console.log('[DEBUG] Analysis raw_text:', analysisData.analysis?.raw_text);
      console.log('[DEBUG] Analysis parsed:', analysisData.analysis?.parsed);
      console.log('[DEBUG] Image URL from backend:', analysisData.image_url);

      // 优先使用后端返回的图片 URL（相对于 API 的路径）
      const rawImageUrl = analysisData.image_url || imageUrl || '';
      const finalImageUrl = getFullUrl(rawImageUrl);

      // 优先使用 AI 生成的提示词，如果没有则生成
      const prompt = analysisData.analysis?.parsed?.ai_prompt 
        ? analysisData.analysis.parsed.ai_prompt 
        : generatePromptFromAnalysis(analysisData.analysis, colorData.colors);
      
      // 优先使用 AI 生成的标签，如果没有则提取
      let tags = [];
      if (analysisData.analysis?.parsed?.style_tags) {
        // 解析 AI 返回的标签（可能是逗号分隔的字符串）
        tags = analysisData.analysis.parsed.style_tags
          .split(/[,，、]/)
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0)
          .slice(0, 8);
      } else {
        tags = extractTags(analysisData.analysis);
      }
      
      // 优先使用 AI 生成的风格名称，如果没有则生成
      const title = analysisData.analysis?.parsed?.style_name
        ? analysisData.analysis.parsed.style_name.trim()
        : (analysisData.analysis?.parsed?.project_name
          ? analysisData.analysis.parsed.project_name.trim()
          : generateTitleFromAnalysis(analysisData.analysis));

      setResult({
        colors: colorData.colors,
        analysis: analysisData.analysis,
        prompt,
        tags
      });

      const historyItem = {
        id: Date.now().toString(),
        title: title,
        timestamp: new Date().toLocaleString('zh-CN', { 
          month: 'numeric', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        // 使用原始 URL (可能是相对路径)，避免保存绝对路径到数据库中
        imageUrl: rawImageUrl,
        tags,
        colors: colorData.colors.slice(0, 8), // 只保存前8个颜色
        prompt: prompt.substring(0, 500), // 限制提示词长度
        analysis: {
          style: {
            composition: analysisData.analysis.parsed?.composition || '',
            art_style: analysisData.analysis.parsed?.art_style || '',
            lighting: analysisData.analysis.parsed?.lighting || '',
            mood: analysisData.analysis.parsed?.mood || '',
            medium: analysisData.analysis.parsed?.medium || '',
            technical: analysisData.analysis.parsed?.technical || '',
            elements: analysisData.analysis.parsed?.elements || ''
          },
          colors: {
            color_palette: analysisData.analysis.parsed?.color_palette || '',
            color_classification: analysisData.analysis.parsed?.color_classification || {}
          },
          prompt: {
            ai_prompt: analysisData.analysis.parsed?.ai_prompt || '',
            style_tags: analysisData.analysis.parsed?.style_tags || '',
            style_name: analysisData.analysis.parsed?.style_name || analysisData.analysis.parsed?.project_name || ''
          },
          metadata: {
            model: analysisData.analysis.model || '',
            success: analysisData.analysis.success || true
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // 直接保存到后端历史记录
      try {
        const savedHistory = await saveToHistory({
          title: historyItem.title,
          image_url: historyItem.imageUrl,
          prompt: historyItem.prompt,
          colors: historyItem.colors,
          tags: historyItem.tags,
          analysis: historyItem.analysis
        });
        console.log('Analysis saved to history:', savedHistory);
        
        // 使用后端返回的 ID 跳转到详情页
        if (savedHistory.history_id) {
          router.push(`/detail/${savedHistory.history_id}`);
        } else {
          router.push(`/detail/${historyItem.id}`);
        }
      } catch (backendError) {
        console.error('Failed to save to backend:', backendError);
        alert(t('analyze.saveFailed') || 'Failed to save analysis');
      }

    } catch (error: any) {
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('大模型加载超时') || errorMessage.includes('timeout')) {
        alert(t('analyze.modelTimeout'));
      } else {
        alert(`${t('analyze.analysisFailed')}: ${errorMessage}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePromptFromAnalysis = (analysis: any, colors: any[]) => {
    const parsed = analysis.parsed;
    const parts = [];

    // 提取主要描述元素
    if (parsed.composition) {
      const comp = parsed.composition.split('.')[0].trim();
      if (comp) parts.push(comp);
    }
    
    if (parsed.art_style) {
      const style = parsed.art_style.split('.')[0].trim();
      if (style) parts.push(style);
    }
    
    if (parsed.medium) {
      const medium = parsed.medium.split('.')[0].trim();
      if (medium) parts.push(medium);
    }
    
    if (parsed.lighting) {
      const lighting = parsed.lighting.split('.')[0].trim();
      if (lighting) parts.push(lighting);
    }
    
    if (parsed.color_palette) {
      const colorDesc = parsed.color_palette.split('.')[0].trim();
      if (colorDesc) parts.push(colorDesc);
    }
    
    if (parsed.mood) {
      const mood = parsed.mood.split('.')[0].trim();
      if (mood) parts.push(mood);
    }

    // 如果没有提取到任何内容，使用原始文本的前200个字符
    if (parts.length === 0 && analysis.raw_text) {
      const rawText = analysis.raw_text.replace(/\n/g, ' ').trim();
      return rawText.substring(0, 200) + (rawText.length > 200 ? '...' : '');
    }

    return parts.join(', ');
  };

  const extractTags = (analysis: any) => {
    const allText = [
      analysis.parsed?.art_style || '',
      analysis.parsed?.composition || '',
      analysis.parsed?.mood || '',
      analysis.parsed?.medium || '',
      analysis.parsed?.color_palette || '',
      analysis.raw_text || ''
    ].join(' ').toLowerCase();
    
    console.log('[DEBUG] Extracting tags from text:', allText.substring(0, 200));
    
    const keywords = [
      // 风格关键词
      'minimalist', 'minimalism', 'abstract', 'geometric', '3d', 'gradient', 
      'vintage', 'retro', 'modern', 'contemporary', 'brutalist', 'brutalism',
      'surreal', 'surrealism', 'organic', 'fluid', 'flat', 'editorial', 
      'cinematic', 'ethereal', 'grainy', 'clean', 'bold', 'playful', 
      'elegant', 'rustic', 'industrial', 'futuristic', 'nostalgic',
      // 色彩关键词
      'colorful', 'monochrome', 'pastel', 'vibrant', 'muted', 'warm', 'cool',
      // 媒介关键词
      'photography', 'illustration', 'digital', 'painting', 'render',
      // 中文关键词
      '极简', '抽象', '几何', '复古', '现代', '超现实', '有机', '扁平',
      '电影', '空灵', '颗粒', '简洁', '大胆', '优雅', '工业', '未来',
      '摄影', '插画', '数字艺术', '绘画', '渲染'
    ];
    
    const foundTags = new Set<string>();
    
    keywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        // 标准化标签名称
        let tagName = keyword;
        
        // 处理变体（如 minimalist -> Minimalist）
        if (keyword.endsWith('ist') || keyword.endsWith('ism')) {
          tagName = keyword.replace(/ism$/, 'ist');
        }
        
        // 首字母大写
        const capitalizedTag = tagName.charAt(0).toUpperCase() + tagName.slice(1);
        foundTags.add(capitalizedTag);
      }
    });
    
    const tags = Array.from(foundTags).slice(0, 8);
    console.log('[DEBUG] Extracted tags:', tags);
    
    return tags;
  };

  const copyPrompt = () => {
    if (result?.prompt) {
      navigator.clipboard.writeText(result.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const saveAsset = async () => {
    if (!result) return;

    // 优先使用 AI 生成的风格名称
    const title = result.analysis?.parsed?.style_name
      ? result.analysis.parsed.style_name.trim()
      : (result.analysis?.parsed?.project_name
        ? result.analysis.parsed.project_name.trim()
        : (result.analysis?.prompt?.style_name
          ? result.analysis.prompt.style_name.trim()
          : generateTitleFromAnalysis(result.analysis)));

    // 统一数据结构，确保与历史记录一致
    const formattedAnalysis = result.analysis?.style ? result.analysis : {
      style: {
        composition: result.analysis.parsed?.composition || '',
        art_style: result.analysis.parsed?.art_style || '',
        lighting: result.analysis.parsed?.lighting || '',
        mood: result.analysis.parsed?.mood || '',
        medium: result.analysis.parsed?.medium || '',
        technical: result.analysis.parsed?.technical || '',
        elements: result.analysis.parsed?.elements || ''
      },
      colors: {
        color_palette: result.analysis.parsed?.color_palette || '',
        color_classification: result.analysis.parsed?.color_classification || {}
      },
      prompt: {
        ai_prompt: result.analysis.parsed?.ai_prompt || '',
        style_tags: result.analysis.parsed?.style_tags || '',
        style_name: result.analysis.parsed?.style_name || result.analysis.parsed?.project_name || ''
      },
      metadata: {
        model: result.analysis.model || '',
        success: result.analysis.success || true
      },
      parsed: result.analysis.parsed
    };

    const asset = {
      title: title,
      image_url: imageUrl || imagePreview,
      prompt: result.prompt,
      colors: result.colors ? result.colors.map(c => ({
        hex: c.hex,
        rgb: c.rgb,
        percentage: c.percentage,
        pixel_count: 0
      })) : [],
      tags: result.tags || [],
      analysis: formattedAnalysis
    };

    try {
      const response = await saveAssetToAPI(asset);
      
      if (response.success) {
        alert(t('analyze.assetSaved'));
      } else {
        throw new Error('API save failed');
      }
    } catch (error) {
      console.error('Failed to save asset:', error);
      alert(t('analyze.saveFailed') || 'Failed to save asset');
    }
  };

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <BackgroundLights />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-7 h-7 text-tertiary" />
            <h1 className="font-headline font-bold text-3xl tracking-tight">{t('analyze.title')}</h1>
          </div>
          <p className="text-ink/60 text-base mb-6">{t('analyze.subtitle')}</p>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-label text-ink/30 uppercase tracking-wider">
              {t('common.model')}:
            </span>
            <div className="relative" ref={dropdownRef}>
              {availableModels.length > 0 ? (
                <>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="px-4 py-2 text-ink font-bold text-sm uppercase tracking-wide hover:text-ink/70 focus:outline-none transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>{selectedModel?.displayName.toUpperCase()}</span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`}>
                      <path d="M1 1L5 5L9 1" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {showModelDropdown && (
                    <div className="absolute z-50 left-0 mt-2 min-w-[200px] bg-white rounded-xl border border-black/10 shadow-lg overflow-hidden">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model);
                            setShowModelDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-bold uppercase tracking-wide transition-colors ${
                            selectedModel?.id === model.id
                              ? 'bg-accent text-ink'
                              : 'bg-white text-ink/60 hover:bg-canvas'
                          }`}
                        >
                          {model.displayName.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <a href="/settings" className="text-sm text-red-500 hover:underline font-medium">
                  {t('analyze.configureFirst')}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-white rounded-3xl p-12 card-shadow border-2 border-dashed border-black/10 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={getFullUrl(imagePreview)}
                    alt="Preview"
                    className="w-full rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                    <p className="text-white font-headline font-bold">{t('analyze.changeImage')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-16 h-16 text-ink/20 mx-auto mb-4 group-hover:text-accent transition-colors" />
                  <h3 className="font-headline font-bold text-xl mb-2">{t('analyze.uploadImage')}</h3>
                  <p className="text-ink/40 text-sm">{t('analyze.uploadHint')}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 card-shadow">
              <label className="block text-xs font-label font-bold text-ink/40 uppercase mb-3">
                {t('analyze.orPasteUrl')}
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-sm"
              />
            </div>

            <button
              onClick={analyzeImage}
              disabled={isAnalyzing || (!imageFile && !imageUrl) || !selectedModel}
              className="w-full bg-ink text-white py-6 rounded-full font-headline font-bold text-lg hover:bg-ink/90 transition-all shadow-xl shadow-ink/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>{t('analyze.analyzing')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{t('analyze.analyzeButton')}</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {result ? (
              <>
                <div className="bg-white rounded-3xl p-6 card-shadow">
                  <h3 className="font-headline font-bold text-xl mb-4">{t('analyze.colorPalette')}</h3>
                  <div className="space-y-3">
                    {result.colors.slice(0, 6).map((color, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl shadow-sm"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-sm font-bold">{color.hex}</span>
                            <span className="text-xs text-ink/40">{color.percentage}%</span>
                          </div>
                          <div className="h-1 bg-black/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${color.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.tags.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 card-shadow">
                    <h3 className="font-headline font-bold text-xl mb-4">{t('analyze.styleTags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-4 py-2 bg-canvas rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-3xl p-6 card-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-headline font-bold text-xl">{t('analyze.generatedPrompt')}</h3>
                    <button onClick={copyPrompt} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent hover:brightness-105 transition-all">
                      {copiedPrompt ? (
                        <><Check className="w-4 h-4" /><span className="text-sm font-bold">{t('common.copied')}</span></>
                      ) : (
                        <><Copy className="w-4 h-4" /><span className="text-sm font-bold">{t('common.copy')}</span></>
                      )}
                    </button>
                  </div>
                  <div className="bg-canvas p-4 rounded-xl">
                    <p className="font-mono text-sm leading-relaxed text-ink/70">
                      {result.prompt}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 card-shadow">
                  <h3 className="font-headline font-bold text-xl mb-4">{t('analyze.analysisDetails')}</h3>
                  <div className="space-y-4 text-sm">
                    {Object.entries(result.analysis.parsed).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <div key={key}>
                          <h4 className="text-xs font-label font-bold text-ink/40 uppercase mb-1">
                            {key.replace('_', ' ')}
                          </h4>
                          <p className="text-ink/70 leading-relaxed">{value as string}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={saveAsset}
                  className="w-full py-4 rounded-full border-2 border-ink/10 hover:bg-black/5 transition-all flex items-center justify-center gap-2 font-headline font-bold"
                >
                  <Save className="w-5 h-5" />
                  <span>{t('analyze.saveToLibrary')}</span>
                </button>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-12 card-shadow text-center">
                <ImageIcon className="w-16 h-16 text-ink/20 mx-auto mb-4" />
                <h3 className="font-headline font-bold text-xl text-ink/40 mb-2">
                  {t('analyze.noAnalysis')}
                </h3>
                <p className="text-ink/30">{t('analyze.uploadToStart')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
