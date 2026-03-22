'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, ArrowRight, Image as ImageIcon, X, ArrowUp, Save, CloudUpload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getAssets, saveAsset as saveAssetToAPI, getHistory, extractColors, analyzeImage as analyzeImageFromAPI, saveToHistory, getFullUrl } from '@/lib/api';
import BackgroundLights from '@/components/BackgroundLights';
import type { HistoryItem, ModelConfig } from '@/types';

export default function HomePage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [assets, setAssets] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const allAssetsRef = useRef<HistoryItem[]>([]);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);

  // 保持 ref 同步
  useEffect(() => {
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
  }, [hasMore, loading]);

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
  }, []); // 只在组件挂载时运行一次

  const loadAssets = useCallback(async (pageNum: number) => {
    if (loadingRef.current || !hasMoreRef.current) return;
    
    setLoading(true);
    try {
      // 只在第一次加载时从 API 获取所有数据
      if (pageNum === 1) {
        const result = await getHistory({ limit: 100 });
        
        if (result.success && result.history && result.history.length > 0) {
          const sortedHistory = result.history.sort((a: any, b: any) => {
            const dateA = new Date(a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.updated_at || b.created_at).getTime();
            return dateB - dateA;
          });

          const convertedAssets: HistoryItem[] = sortedHistory.map((item: any) => ({
            id: item.id,
            title: item.title,
            timestamp: new Date(item.updated_at || item.created_at).toLocaleDateString(),
            imageUrl: item.image_url,
            tags: item.tags || [],
            colors: item.colors || [],
            prompt: item.prompt || '',
            analysis: item.analysis,
            is_saved: item.is_saved || false
          }));

          allAssetsRef.current = convertedAssets;
          const pageAssets = convertedAssets.slice(0, 9);
          setAssets(pageAssets);
          setHasMore(convertedAssets.length > 9);
        } else {
          setHasMore(false);
        }
      } else {
        // 后续加载从缓存中获取
        const startIndex = (pageNum - 1) * 9;
        const endIndex = startIndex + 9;
        const pageAssets = allAssetsRef.current.slice(startIndex, endIndex);

        if (pageAssets.length === 0) {
          setHasMore(false);
        } else {
          setAssets(prev => [...prev, ...pageAssets]);
          setHasMore(endIndex < allAssetsRef.current.length);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets(1);
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []); // 只在挂载时创建一次

  useEffect(() => {
    if (page > 1) {
      loadAssets(page);
    }
  }, [page, loadAssets]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile && !searchQuery) return;
    
    if (imageFile && !selectedModel) {
      alert(t('analyze.configureModel'));
      return;
    }

    setIsAnalyzing(true);

    if (imageFile) {
      // 如果有图片，执行实际分析
      try {
        // 1. 提取颜色
        const colorData = await extractColors(imageFile);
        
        if (!colorData.success) {
          throw new Error('Color extraction failed');
        }

        // 2. 分析风格
        const analysisData = await analyzeImageFromAPI(imageFile, null, selectedModel!);
        
        if (!analysisData.success) {
          throw new Error('Analysis failed');
        }

        // 3. 生成 Prompt
        const prompt = generatePromptFromAnalysis(analysisData.analysis, colorData.colors);
        const tags = extractTags(analysisData.analysis);

        // 从 AI 分析结果中提取标题
        const styleTitle = analysisData.analysis?.parsed?.style_name 
          || analysisData.analysis?.parsed?.project_name 
          || `Analysis ${new Date().toLocaleDateString()}`;

        // 保存结果到 sessionStorage 和后端历史记录
        const resultData = {
          id: Date.now().toString(),
          title: styleTitle,
          timestamp: new Date().toLocaleString('zh-CN', { 
            month: 'numeric', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          imageUrl: imagePreview,
          tags,
          colors: colorData.colors,
          prompt,
          analysis: analysisData.analysis
        };
        
        // 自动保存到后端历史记录
        try {
          const savedHistory = await saveToHistory({
            title: resultData.title,
            image_url: resultData.imageUrl,
            prompt: resultData.prompt,
            colors: resultData.colors,
            tags: resultData.tags,
            analysis: resultData.analysis
          });
          
          console.log('Analysis saved to history:', savedHistory);
          
          // 使用后端返回的 ID 跳转到详情页
          if (savedHistory.history_id) {
            router.push(`/detail/${savedHistory.history_id}`);
          } else {
            router.push(`/detail/${resultData.id}`);
          }
        } catch (backendError) {
          console.error('Failed to save to history:', backendError);
          alert('Failed to save analysis');
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
    } else {
      // 如果只有文本，跳转到分析页面
      setTimeout(() => {
        setIsAnalyzing(false);
        router.push('/analyze');
      }, 1000);
    }
  };

  const generatePromptFromAnalysis = (analysis: any, colors: any[]) => {
    const parsed = analysis.parsed;
    const parts = [];

    if (parsed.composition) parts.push(parsed.composition.split('.')[0]);
    if (parsed.art_style) parts.push(parsed.art_style.split('.')[0]);
    if (parsed.lighting) parts.push(parsed.lighting.split('.')[0]);

    return parts.join(', ') + ' --ar 16:9 --v 6.0';
  };

  const extractTags = (analysis: any) => {
    const allText = [
      analysis.parsed?.art_style || '',
      analysis.parsed?.composition || '',
      analysis.parsed?.mood || '',
      analysis.parsed?.medium || '',
      analysis.raw_text || ''
    ].join(' ').toLowerCase();
    
    const keywords = [
      'minimalist', 'abstract', 'geometric', '3d', 'gradient', 'vintage', 'modern',
      'brutalist', 'surreal', 'organic', 'flat', 'editorial', 'cinematic', 'ethereal',
      'grainy', 'colorful', 'monochrome', 'pastel', 'bold', 'playful', 'elegant', 'rustic'
    ];
    
    const foundTags = new Set<string>();
    
    keywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        const tagName = keyword.split(' ')[0];
        const capitalizedTag = tagName.charAt(0).toUpperCase() + tagName.slice(1);
        foundTags.add(capitalizedTag);
      }
    });

    return Array.from(foundTags).slice(0, 6);
  };

  return (
    <div className="min-h-screen dot-grid selection:bg-accent/30 relative overflow-hidden">
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center mb-24 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12 relative"
          >
            <h1 className="font-handwriting text-6xl md:text-8xl text-ink mb-4">
              {t('home.title') || 'Deconstruct'} <br />
              <span className="italic text-tertiary">{t('home.subtitle') || 'Aesthetics.'}</span>
            </h1>
            <p className="font-handwriting text-2xl text-tertiary/70 -rotate-1 absolute -right-4 -bottom-6 md:right-0">
              {t('home.tagline') || 'Extract style tokens in seconds'}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-3xl bg-white rounded-[2.5rem] p-4 card-shadow border border-black/5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-4 relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all shadow-lg"
                >
                  <X className="w-4 h-4 text-ink" />
                </button>
              </div>
            )}

            <div className="flex items-center bg-canvas rounded-3xl p-2 focus-within:ring-2 focus-within:ring-accent transition-all">
              <div className="flex-1 flex items-center px-4 py-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mr-4 hover:scale-110 transition-all group"
                  title={t('analyze.uploadImage')}
                >
                  {imageFile ? (
                    <div className="relative">
                      <ImageIcon className="w-7 h-7 text-accent" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                  ) : (
                    <div className="relative">
                      <CloudUpload className="w-7 h-7 text-ink/40 group-hover:text-accent transition-colors" strokeWidth={1.5} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('home.placeholder') || 'Visual Decipher'}
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-2xl font-handwriting text-ink/60 placeholder:text-ink/20"
                  disabled={!!imageFile}
                />
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!imageFile && !searchQuery)}
                className="bg-accent text-ink px-8 py-4 rounded-full font-headline font-bold text-sm hover:brightness-105 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isAnalyzing ? (t('home.analyzing') || '分析中') : (t('home.analyzeButton') || '分析')}</span>
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Model Selector - Always visible below search box */}
            <div className="mt-6 px-2">
              <div className="flex items-center gap-4">
                <span className="text-xs font-label text-ink/30 uppercase tracking-wider">
                  ENGINE:
                </span>
                <span className="text-xs font-label text-ink/30 uppercase tracking-wider">
                  MODEL
                </span>
                <div className="relative" ref={dropdownRef}>
                  {availableModels.length > 0 ? (
                    <>
                      {/* Custom Dropdown Button */}
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="px-4 py-2 text-ink font-bold text-sm uppercase tracking-wide hover:text-ink/70 focus:outline-none transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>{selectedModel?.displayName.toUpperCase()}</span>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`}>
                          <path d="M1 1L5 5L9 1" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      
                      {/* Custom Dropdown Menu */}
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
                    <a href="/settings" className="text-xs text-red-500 hover:text-red-600 hover:underline transition-colors">
                      {t('analyze.configureFirst')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 px-2">
              <span className="text-[10px] font-label uppercase tracking-widest text-ink/30 w-full mb-1">{t('home.tryStarting') || 'Try starting with:'}</span>
              {['Brutalist Editorial', 'Soft Minimalism', 'Bauhaus Geometric', 'Grainy Nostalgia'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  disabled={!!imageFile}
                  className="bg-canvas text-ink/60 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-accent/20 transition-colors border border-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tag}
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Recent Workspace - 瀑布流布局 */}
        <section className="w-full">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-headline font-bold text-4xl tracking-tight">{t('home.recentWorkspace') || 'Recent Workspace'}</h2>
              <p className="text-ink/50 mt-1">{t('home.latestExtractions') || 'Your latest style extractions'}</p>
            </div>
            <button 
              onClick={() => router.push('/library?tab=history')}
              className="text-tertiary font-headline font-bold underline underline-offset-8 decoration-2 flex items-center gap-2 group"
            >
              {t('home.viewArchive')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* 瀑布流网格 */}
          <div className="columns-1 md:columns-2 lg:columns-5 gap-6">
            {assets.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8 }}
                onClick={() => router.push(`/detail/${item.id}`)}
                className="break-inside-avoid mb-6 group cursor-pointer"
              >
                <div className="bg-white rounded-3xl overflow-hidden card-shadow border border-black/5 hover:border-tertiary/20 transition-all relative">
                  {/* 收藏标记 */}
                  {item.is_saved && (
                    <div className="absolute top-4 right-4 z-10 bg-tertiary text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      <span>{t('library.saved')}</span>
                    </div>
                  )}
                  
                  <div className={`relative overflow-hidden ${
                    index % 3 === 0 ? 'min-h-[150px]' : 
                    index % 3 === 1 ? 'min-h-[230px]' : 
                    'min-h-[190px]'
                  }`}>
                    <img
                      src={getFullUrl(item.imageUrl)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="p-5">
                    <h3 className="font-headline font-bold text-xl tracking-tight mb-2 line-clamp-2">
                      {item.analysis?.prompt?.style_name || item.analysis?.parsed?.style_name || item.analysis?.parsed?.project_name || item.title}
                    </h3>
                    <p className="text-[10px] text-ink/30 font-label font-bold tracking-widest uppercase mb-4">
                      {item.timestamp}
                    </p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(item.tags || []).slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="bg-canvas text-ink/40 px-3 py-1 rounded-lg text-[9px] font-label font-bold tracking-wider uppercase border border-black/5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* 颜色 */}
                    <div className="flex -space-x-2">
                      {(item.colors || []).slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.hex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 加载更多触发器 */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-12">
              {loading && (
                <div className="flex items-center gap-3 text-ink/40">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span className="font-headline text-sm">{t('common.loading')}</span>
                </div>
              )}
            </div>
          )}

          {/* 没有更多数据 */}
          {!hasMore && assets.length > 0 && (
            <div className="text-center py-12">
              <p className="text-ink/30 font-headline text-sm">
                {t('library.noAssets')}
              </p>
            </div>
          )}
        </section>

        {/* 置顶按钮 */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 z-50 bg-tertiary text-white p-4 rounded-full shadow-2xl hover:bg-tertiary/90 transition-all hover:scale-110"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowUp className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      <BackgroundLights />
    </div>
  );
}
