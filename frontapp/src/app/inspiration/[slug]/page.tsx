'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Save, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { saveHistoryToLibrary, unsaveHistoryFromLibrary } from '@/lib/api';
import type { HistoryItem } from '@/types';
import designsData from '@/data/designs.json';

export default function InspirationDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { t } = useLanguage();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedDesign, setCopiedDesign] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [copiedBasePrompt, setCopiedBasePrompt] = useState(false);
  const [result, setResult] = useState<HistoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 生成色卡渐变色
  const generateColorShades = (hexColor: string): string[] => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    
    const shades: string[] = [];
    
    for (let i = 0; i <= 10; i++) {
      let newR, newG, newB;
      
      if (i < 5) {
        const darkFactor = i / 5;
        newR = Math.round(r * darkFactor);
        newG = Math.round(g * darkFactor);
        newB = Math.round(b * darkFactor);
      } else {
        const lightFactor = (i - 5) / 5;
        newR = Math.round(r + (255 - r) * lightFactor);
        newG = Math.round(g + (255 - g) * lightFactor);
        newB = Math.round(b + (255 - b) * lightFactor);
      }
      
      const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      shades.push(newHex.toUpperCase());
    }
    
    return shades;
  };

  const ColorCard = ({ labelKey, color }: { labelKey: string; color: string }) => {
    const shades = generateColorShades(color);
    
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-black/5 shadow-sm">
        <div className="mb-2">
          <h4 className="font-bold text-sm text-ink">{t(`detail.${labelKey}`)}</h4>
        </div>
        
        <div 
          className="w-full h-20 rounded-lg mb-2 shadow-md"
          style={{ backgroundColor: color }}
        />
        
        <p className="font-mono font-bold text-xs text-ink text-center mb-2">{color}</p>
        
        <div className="flex gap-0.5 rounded overflow-hidden shadow-sm">
          {shades.map((shade, i) => (
            <div
              key={i}
              className="flex-1 h-6 hover:h-8 transition-all cursor-pointer group relative"
              style={{ backgroundColor: shade }}
              title={shade}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[6px] font-mono font-bold text-white mix-blend-difference">
                  {shade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const design = designsData.find(d => d.slug === slug);
    if (!design) return;

    // Convert string array ["#111", ...] to [{hex, percentage}]
    const mappedColors = (design.colors || []).map((c: string) => ({ hex: c, percentage: Math.round(100 / (design.colors?.length || 1)) }));

    const mappedResult: HistoryItem = {
      id: `insp-${design.id}`,
      title: design.name,
      imageUrl: '', // No direct image URL
      prompt: design.summary || '',
      colors: mappedColors,
      tags: design.keyCharacteristics || [],
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      analysis: {
        parsed: {
          style_name: design.name,
          ai_prompt: design.overview?.join('\n\n') || '',
          color_description: "提取自 " + design.name + " 品牌色板",
          color_classification: {
             primary: design.colors?.[0] || '',
             secondary: design.colors?.[1] || '',
             tertiary: design.colors?.[2] || '',
             neutral: design.colors?.[3] || ''
          },
          composition: design.categoryLabelZh,
          art_style: design.categoryLabelEn,
          lighting: design.keyCharacteristics?.join(', ') || '',
          mood: design.summary || ''
        }
      }
    };
    
    setResult(mappedResult);
    setIsSaved(false); // Can be enhanced later to check user's saved items if needed
  }, [slug]);

  const handleSaveToLibrary = async () => {
    alert('灵感库暂不支持收藏功能。');
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

  const copyMarkdown = () => {
    if (!result) return;
    const promptText = result.analysis?.prompt?.ai_prompt || result.analysis?.parsed?.ai_prompt || result.prompt;
    const markdown = `
# ${result.title}
## Style Overview
${promptText}

## Visual Specs
- **Category:** ${result.analysis?.parsed?.composition}
- **Mood:** ${result.analysis?.parsed?.mood}
- **Colors:** ${result.colors.map(c => c.hex).join(', ')}
    `.trim();
    navigator.clipboard.writeText(markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const copyCss = () => {
    if (!result) return;
    const css = `
:root {
  --style-name: "${result.title}";
  --primary-color: ${result.colors[0]?.hex || '#000'};
  --secondary-color: ${result.colors[1]?.hex || '#fff'};
  --accent-color: ${result.colors[2]?.hex || '#ccc'};
}
    `.trim();
    navigator.clipboard.writeText(css);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const copyBasePrompt = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.prompt);
    setCopiedBasePrompt(true);
    setTimeout(() => setCopiedBasePrompt(false), 2000);
  };

  const copyDesignMd = async () => {
    try {
      const designData = designsData.find(d => d.slug === slug);
      if (designData?.files?.design) {
        const response = await fetch(`http://vibeui.top/${designData.files.design}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        await navigator.clipboard.writeText(text);
        setCopiedDesign(true);
        setTimeout(() => setCopiedDesign(false), 2000);
      } else {
        alert("Design.md file path not found");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to copy design.md. Ensure there is no cross-origin issue or network failure.");
    }
  };

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
          <div className="space-y-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-ink/60 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="font-headline font-bold text-3xl tracking-tight mb-2">
                {result.title}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-ink/40 text-sm">
                  {t('detail.aiGenerated') || 'AI Generated'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={copyMarkdown}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all outline-none"
              >
                {copiedMarkdown ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm font-medium">{copiedMarkdown ? t('common.copied') : t('detail.copyMarkdown')}</span>
              </button>
              <button 
                onClick={copyCss}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all outline-none"
              >
                {copiedCss ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm font-medium">{copiedCss ? t('common.copied') : t('detail.copyCss')}</span>
              </button>
              <button 
                onClick={copyBasePrompt}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all outline-none"
              >
                {copiedBasePrompt ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm font-medium">{copiedBasePrompt ? t('common.copied') : t('detail.copyPrompt')}</span>
              </button>
              <button 
                onClick={copyDesignMd}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-all outline-none"
              >
                {copiedDesign ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm font-medium">{copiedDesign ? (t('common.copied') || '已复制') : (t('detail.copyDesignMd') || 'Copy DESIGN.md')}</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline font-bold text-xl">{t('detail.generatedPrompt') || 'Overview'}</h2>
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
                <p className="font-mono text-sm text-ink/70 leading-relaxed whitespace-pre-wrap">
                  {result.analysis?.prompt?.ai_prompt || result.analysis?.parsed?.ai_prompt || result.prompt}
                </p>
              </div>
            </div>

            {result.analysis && (
              <div className="bg-white rounded-2xl p-6 border border-black/5">
                <h2 className="font-headline font-bold text-xl mb-4">{t('detail.styleDescription') || 'Style'}</h2>
                <div className="text-sm text-ink/70 leading-relaxed space-y-3">
                  {(() => {
                    const style = result.analysis?.style || result.analysis?.parsed || {};
                    return (
                      <>
                        {style.composition && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.composition') || 'Category'}:</h3>
                            <p>{style.composition}</p>
                          </div>
                        )}
                        {style.art_style && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.artStyle') || 'Category (EN)'}:</h3>
                            <p>{style.art_style}</p>
                          </div>
                        )}
                        {style.lighting && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.lighting') || 'Characteristics'}:</h3>
                            <p>{style.lighting}</p>
                          </div>
                        )}
                        {style.mood && (
                          <div>
                            <h3 className="font-bold text-ink mb-1">{t('detail.mood') || 'Summary'}:</h3>
                            <p>{style.mood}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <h2 className="font-headline font-bold text-xl mb-5">{t('detail.colors')}</h2>
              
              {(() => {
                const colorDesc = result.analysis?.colors?.color_description || result.analysis?.parsed?.color_description;
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

              {(() => {
                const colorClassification = result.analysis?.colors?.color_classification || result.analysis?.parsed?.color_classification || result.analysis?.color_classification;
                if (!colorClassification || !Object.keys(colorClassification).length) return null;
                const hasColors = colorClassification.primary || colorClassification.secondary || colorClassification.tertiary || colorClassification.neutral;
                if (!hasColors) return null;

                return (
                  <div className="mb-6">
                    <h3 className="font-bold text-sm text-ink/60 mb-3 uppercase tracking-wider">
                      {t('detail.aiColorClassification') || 'Color Palette'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {colorClassification.primary && <ColorCard labelKey="primaryColor" color={colorClassification.primary} />}
                      {colorClassification.secondary && <ColorCard labelKey="secondaryColor" color={colorClassification.secondary} />}
                      {colorClassification.tertiary && <ColorCard labelKey="tertiaryColor" color={colorClassification.tertiary} />}
                      {colorClassification.neutral && <ColorCard labelKey="neutralColor" color={colorClassification.neutral} />}
                    </div>
                  </div>
                );
              })()}

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

          <div className="space-y-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5 sticky top-24">
              <div 
                className="w-full aspect-square"
                style={{ 
                   background: `linear-gradient(135deg, ${result.colors[0]?.hex || '#eee'}, ${result.colors[1]?.hex || '#ccc'})`
                }}
              />
              
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-ink/40">{t('detail.original') || 'Original'}</span>
                  <span className="text-xs text-ink/40">{t('detail.handPickedStyle') || 'Style'}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {result.colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>

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
