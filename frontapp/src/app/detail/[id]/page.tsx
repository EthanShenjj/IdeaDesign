'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Save, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { saveAsset as saveAssetToAPI, getHistory, saveHistoryToLibrary, unsaveHistoryFromLibrary, getFullUrl } from '@/lib/api';
import ColorCard from '@/components/ColorCard';
import type { HistoryItem } from '@/types';

export default function DetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { t } = useLanguage();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [result, setResult] = useState<HistoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 格式化日期时间
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      return dateString;
    }
  };

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const data = await getHistory({ id });
        
        if (data.success && data.history) {
          // 后端可能返回单个对象或包含一个对象的数组
          const history = Array.isArray(data.history) ? data.history[0] : data.history;
          
          if (history) {
            const fullData = {
              id: history.id.toString(),
              title: history.title,
              imageUrl: getFullUrl(history.image_url),
              prompt: history.prompt,
              colors: history.colors,
              tags: history.tags,
              analysis: history.analysis,
              timestamp: history.created_at,
              created_at: history.created_at,
              updated_at: history.updated_at
            };
            setResult(fullData);
            setIsSaved(history.is_saved || false);
          } else {
            console.error('History not found in response');
          }
        } else {
          console.error('History search failed or empty response');
        }
      } catch (error) {
        console.error('Failed to fetch from API:', error);
      }
    };

    fetchAnalysisData();
  }, [id]);

  const handleSaveToLibrary = async () => {
    if (!result || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        // 取消收藏
        const data = await unsaveHistoryFromLibrary(result.id);
        
        if (data.success) {
          setIsSaved(false);
        } else {
          alert(t('detail.saveFailed'));
        }
      } else {
        // 收藏
        const data = await saveHistoryToLibrary(result.id);
        
        if (data.success) {
          setIsSaved(true);
        } else {
          alert(t('detail.saveFailed'));
        }
      }
    } catch (error) {
      console.error('Failed to toggle save status:', error);
      alert(t('detail.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink/40">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const copyPrompt = () => {
    const promptText = result.analysis?.prompt?.ai_prompt || result.analysis?.parsed?.ai_prompt || result.prompt;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
          {/* Left Content */}
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-ink/60 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Title */}
            <div>
              <h1 className="font-headline font-bold text-3xl tracking-tight mb-2">
                {result.analysis?.prompt?.style_name || result.analysis?.parsed?.style_name || result.analysis?.parsed?.project_name || result.title}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-ink/40 text-sm">
                  {t('detail.aiGenerated')}
                </p>
                {(result.updated_at || result.created_at) && (
                  <>
                    <span className="text-ink/20">•</span>
                    <p className="text-ink/40 text-sm">
                      {formatDateTime(result.updated_at || result.created_at)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={handleSaveToLibrary}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isSaved
                    ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                    : 'bg-tertiary text-white hover:bg-tertiary/90 shadow-sm'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm">{isSaving ? t('common.loading') : t('detail.saved')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span className="text-sm">{isSaving ? t('common.loading') : t('detail.saveToLibrary')}</span>
                  </>
                )}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all">
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">{t('detail.copyMarkdown')}</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all">
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">{t('detail.copyCss')}</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all">
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">{t('detail.copyPrompt')}</span>
              </button>
            </div>

            {/* Generated Prompt */}
            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline font-bold text-xl">{t('detail.generatedPrompt')}</h2>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-all"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{t('common.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">{t('common.copy')}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-canvas rounded-xl p-4">
                <p className="font-mono text-sm text-ink/70 leading-relaxed">
                  {result.analysis?.prompt?.ai_prompt || result.analysis?.parsed?.ai_prompt || result.prompt}
                </p>
              </div>
            </div>

            {/* Style Description */}
            {result.analysis && (
              <div className="bg-white rounded-2xl p-6 border border-black/5">
                <h2 className="font-headline font-bold text-xl mb-4">{t('detail.styleDescription')}</h2>
                <div className="text-sm text-ink/70 leading-relaxed space-y-3">
                  {/* 显示解析后的各个字段，排除色彩相关内容 */}
                  {(() => {
                    // 兼容新旧格式
                    const style = result.analysis?.style || result.analysis?.parsed || {};
                    return (
                      <>
                        {style.composition && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.composition')}:</h3>
                            <p>{style.composition}</p>
                          </div>
                        )}
                        {style.art_style && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.artStyle')}:</h3>
                            <p>{style.art_style}</p>
                          </div>
                        )}
                        {style.lighting && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.lighting')}:</h3>
                            <p>{style.lighting}</p>
                          </div>
                        )}
                        {style.mood && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.mood')}:</h3>
                            <p>{style.mood}</p>
                          </div>
                        )}
                        {style.medium && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.medium')}:</h3>
                            <p>{style.medium}</p>
                          </div>
                        )}
                        {style.technical && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.technical')}:</h3>
                            <p>{style.technical}</p>
                          </div>
                        )}
                        {style.elements && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.elements')}:</h3>
                            <p>{style.elements}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  
                  {/* 如果没有任何风格描述，显示提示信息 */}
                  {(() => {
                    const style = result.analysis?.style || result.analysis?.parsed || {};
                    return !style.composition && 
                           !style.art_style && 
                           !style.lighting && 
                           !style.mood && 
                           !style.medium ? (
                      <p className="text-ink/40 italic">{t('detail.noStyleDescription')}</p>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Colors */}
            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <h2 className="font-headline font-bold text-xl mb-5">{t('detail.colors')}</h2>
              
              {/* AI Color Scheme Description */}
              {(() => {
                const colorDesc = 
                  result.analysis?.colors?.color_description || 
                  result.analysis?.parsed?.color_description;
                
                if (!colorDesc) return null;
                
                return (
                  <div className="mb-6 p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20">
                    <h3 className="font-bold text-sm text-ink/80 mb-2 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t('detail.colorAnalysis')}
                    </h3>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      {colorDesc}
                    </p>
                  </div>
                );
              })()}

              {/* AI Color Classification */}
              {(() => {
                // 兼容多层嵌套结构：
                // 1. result.analysis.colors.color_classification (新推荐格式)
                // 2. result.analysis.parsed.color_classification (API 直接返回格式)
                // 3. result.analysis.color_classification (旧格式)
                const colorClassification = 
                  result.analysis?.colors?.color_classification || 
                  result.analysis?.parsed?.color_classification || 
                  result.analysis?.color_classification;

                if (!colorClassification || !Object.keys(colorClassification).length) return null;

                // 检查是否至少有一个颜色存在
                const hasColors = colorClassification.primary || 
                                 colorClassification.secondary || 
                                 colorClassification.tertiary || 
                                 colorClassification.neutral;

                if (!hasColors) return null;

                return (
                  <div className="mb-6">
                    <h3 className="font-bold text-sm text-ink/60 mb-3 uppercase tracking-wider">
                      {t('detail.aiColorClassification')}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Primary Color */}
                      {colorClassification.primary && (
                        <ColorCard
                          labelKey="primaryColor"
                          color={colorClassification.primary}
                        />
                      )}
                      
                      {/* Secondary Color */}
                      {colorClassification.secondary && (
                        <ColorCard
                          labelKey="secondaryColor"
                          color={colorClassification.secondary}
                        />
                      )}
                      
                      {/* Tertiary Color */}
                      {colorClassification.tertiary && (
                        <ColorCard
                          labelKey="tertiaryColor"
                          color={colorClassification.tertiary}
                        />
                      )}
                      
                      {/* Neutral Color */}
                      {colorClassification.neutral && (
                        <ColorCard
                          labelKey="neutralColor"
                          color={colorClassification.neutral}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Color Palette - Gradient Swatches */}
              <div className="mb-6">
                <h3 className="font-bold text-sm text-ink/60 mb-3 uppercase tracking-wider">
                  {t('detail.colorPalette')}
                </h3>
                <div className="flex gap-1 h-12 rounded-lg overflow-hidden shadow-sm">
                  {result.colors.map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 hover:flex-[1.5] transition-all cursor-pointer"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.hex} - ${color.percentage}%`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Color Grid with Details */}
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {result.colors.map((color, i) => (
                  <div key={i} className="group">
                    <div
                      className="aspect-square rounded-xl mb-2 shadow-sm group-hover:scale-105 transition-transform cursor-pointer"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.hex} - ${color.percentage}%`}
                    />
                    <div className="text-center">
                      <p className="font-mono text-[10px] font-bold text-ink mb-0.5 truncate">
                        {color.hex}
                      </p>
                      <p className="text-[10px] text-ink/40">
                        {color.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <h2 className="font-headline font-bold text-xl mb-4">{t('detail.tags')}</h2>
              <div className="flex flex-wrap gap-2">
                {result.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-canvas rounded-full text-sm font-medium border border-black/5 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Image Card */}
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5 sticky top-24">
              <img
                src={result.imageUrl}
                alt={result.title}
                className="w-full aspect-square object-cover"
              />
              
              <div className="p-5">
                {result.analysis?.source_url && (
                  <a 
                    href={result.analysis.source_url as string} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mb-4 w-full bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-ink/50 uppercase mb-0.5">来源网页</p>
                      <p className="text-sm text-ink truncate group-hover:text-accent transition-colors">
                        {result.analysis.source_url as string}
                      </p>
                    </div>
                  </a>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-ink/40">{t('detail.original')}</span>
                  <span className="text-xs text-ink/40">{t('detail.handPickedStyle')}</span>
                </div>

                {/* Color Swatches */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {result.colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {result.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-canvas rounded-lg text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
