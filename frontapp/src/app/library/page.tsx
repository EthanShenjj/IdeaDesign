'use client';

import React, { useState, useEffect } from 'react';
import { Library as LibraryIcon, Search, Grid, List, Trash2, Download, Copy, Check, Clock, Bookmark, X, Save } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import BackgroundLights from '@/components/BackgroundLights';
import { getAssets, getHistory, deleteAsset as deleteAssetFromAPI, deleteHistory, saveHistoryToLibrary, unsaveHistoryFromLibrary, getFullUrl } from '@/lib/api';
import type { Asset, HistoryItem } from '@/types';

export default function LibraryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'library' | 'history'>('library');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [assetToRemove, setAssetToRemove] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);
  const [savedAssetIds, setSavedAssetIds] = useState<Set<string>>(new Set());

  // 读取 URL 参数并设置默认标签
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, [searchParams]);

  useEffect(() => {
    loadAssets();
    loadHistory();
  }, []);

  useEffect(() => {
    console.log('savedAssetIds changed:', Array.from(savedAssetIds));
  }, [savedAssetIds]);

  const loadAssets = async () => {
    try {
      const data = await getAssets();
      if (data.success) {
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      setAssets([]);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getHistory({ limit: 100 });
      if (data.success && data.history) {
        const formattedHistory = data.history.map((item: any) => ({
          id: item.id,
          title: item.title,
          timestamp: new Date(item.updated_at || item.created_at).toLocaleDateString(),
          imageUrl: getFullUrl(item.image_url),
          tags: item.tags || [],
          colors: item.colors || [],
          prompt: item.prompt || '',
          analysis: item.analysis,
          is_saved: item.is_saved === 1 || item.is_saved === true
        }));
        setHistoryItems(formattedHistory);
        
        // 同步已收藏的状态
        const savedIds = new Set<string>(
          formattedHistory
            .filter((item: any) => item.is_saved)
            .map((item: any) => item.id.toString())
        );
        setSavedAssetIds(savedIds);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const removeAsset = async (id: string) => {
    console.log('Removing asset:', id);
    
    try {
      const data = await deleteAssetFromAPI(id);
      
      if (data.success) {
        // 更新 UI
        setAssets(assets.filter(a => a.id !== id));
        setSavedAssetIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        console.error('Failed to delete asset from backend');
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
      
    setShowRemoveConfirm(false);
    setAssetToRemove(null);
  };

  const handleRemoveClick = (id: string) => {
    setAssetToRemove(id);
    setShowRemoveConfirm(true);
  };

  const deleteAsset = async (id: string) => {
    setAssetToRemove(id);
    setShowRemoveConfirm(true);
  };

  const handleDeleteHistoryClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteHistory = async () => {
    if (!historyToDelete) return;

    try {
      const data = await deleteHistory(historyToDelete);
      if (data.success) {
        setHistoryItems(prev => prev.filter(item => item.id !== historyToDelete));
        setShowDeleteConfirm(false);
        setHistoryToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  const cancelDeleteHistory = () => {
    setShowDeleteConfirm(false);
    setHistoryToDelete(null);
  };

  const copyPrompt = (asset: Asset) => {
    // 兼容新旧格式
    const promptText = asset.analysis?.prompt?.ai_prompt || asset.analysis?.parsed?.ai_prompt || asset.prompt;
    navigator.clipboard.writeText(promptText);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadImage = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.jpg`;
    link.click();
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchQuery || 
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !selectedTag || asset.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const filteredHistory = historyItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !selectedTag || item.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const allTags = activeTab === 'library' 
    ? Array.from(new Set(assets.flatMap(a => a.tags)))
    : Array.from(new Set(historyItems.flatMap(h => h.tags)));

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <BackgroundLights />
      
      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 card-shadow">
            <h3 className="font-headline font-bold text-xl mb-4">{t('library.removeFromLibrary')}</h3>
            <p className="text-ink/60 mb-6">{t('library.removeConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setAssetToRemove(null);
                }}
                className="flex-1 px-6 py-3 rounded-full bg-canvas hover:bg-black/5 transition-all font-headline font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => assetToRemove && removeAsset(assetToRemove)}
                className="flex-1 px-6 py-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all font-headline font-bold"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LibraryIcon className="w-7 h-7 text-tertiary" />
              <h1 className="font-headline font-bold text-3xl tracking-tight">{t('library.title')}</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? 'bg-accent text-ink'
                    : 'bg-white text-ink/40 hover:text-ink'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? 'bg-accent text-ink'
                    : 'bg-white text-ink/40 hover:text-ink'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setActiveTab('library');
                setSearchQuery('');
                setSelectedTag(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-headline font-bold text-base transition-all ${
                activeTab === 'library'
                  ? 'bg-ink text-white shadow-lg'
                  : 'bg-white text-ink/60 hover:bg-white/80'
              }`}
            >
              <Bookmark className="w-5 h-5" />
              <span>{t('library.savedAssets')}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setSearchQuery('');
                setSelectedTag(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-headline font-bold text-base transition-all ${
                activeTab === 'history'
                  ? 'bg-ink text-white shadow-lg'
                  : 'bg-white text-ink/60 hover:bg-white/80'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>{t('library.history')}</span>
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-white rounded-2xl p-2 flex items-center gap-3 card-shadow">
              <Search className="w-5 h-5 text-ink/30 ml-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('library.searchPlaceholder')}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg"
              />
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !selectedTag ? 'bg-accent text-ink' : 'bg-white text-ink/60 hover:bg-accent/20'
                }`}
              >
                {t('common.all')}
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTag === tag
                      ? 'bg-accent text-ink'
                      : 'bg-white text-ink/60 hover:bg-accent/20'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'library' ? (
          filteredAssets.length === 0 ? (
            <div className="text-center py-20">
              <LibraryIcon className="w-16 h-16 text-ink/20 mx-auto mb-4" />
              <h3 className="font-headline font-bold text-xl text-ink/40 mb-2">{t('library.noAssets')}</h3>
              <p className="text-ink/30">{t('library.startAnalyzing')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className="bg-white rounded-3xl overflow-hidden card-shadow border border-black/5 group hover:shadow-xl transition-all"
                >
                  <div className="relative aspect-square overflow-hidden bg-zinc-100">
                    <img
                      src={getFullUrl(asset.image_url)}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => downloadImage(asset.image_url, asset.title)}
                        className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                        title={t('library.copyPrompt')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveClick(asset.id)}
                        className="p-2 rounded-full bg-red-500/90 hover:bg-red-500 text-white transition-colors"
                        title={t('library.removeFromLibrary')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-headline font-bold text-xl mb-2 truncate">
                      {(() => {
                        // 优先使用 style_name，如果 title 是时间戳格式则忽略
                        const styleName = asset.analysis?.prompt?.style_name || 
                                         asset.analysis?.parsed?.style_name || 
                                         asset.analysis?.parsed?.project_name;
                        
                        // 如果有 style_name，使用它
                        if (styleName && styleName.trim()) {
                          return styleName;
                        }
                        
                        // 如果 title 不是时间戳格式（不包含默认前缀或日期格式），使用 title
                        const defaultPrefix = t('library.defaultAnalysisTitle');
                        if (asset.title && !asset.title.includes(defaultPrefix) && !/\d{4}\/\d{1,2}\/\d{1,2}/.test(asset.title)) {
                          return asset.title;
                        }
                        
                        // 否则返回默认标题
                        return asset.title;
                      })()}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {asset.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs font-label font-bold text-ink/40 uppercase"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-1 mb-4">
                      {asset.colors.slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="h-8 flex-1 rounded-lg"
                          style={{ backgroundColor: color.hex }}
                          title={color.hex}
                        />
                      ))}
                    </div>

                    <div className="bg-canvas rounded-xl p-3 mb-4">
                      <p className="text-xs font-mono text-ink/60 line-clamp-2">
                        {asset.analysis?.prompt?.ai_prompt || asset.analysis?.parsed?.ai_prompt || asset.prompt}
                      </p>
                    </div>

                    <button
                      onClick={() => copyPrompt(asset)}
                      className="w-full py-2 rounded-full bg-accent text-ink font-headline font-bold text-sm hover:brightness-105 transition-all flex items-center justify-center gap-2"
                    >
                      {copiedId === asset.id ? (
                        <><Check className="w-4 h-4" /><span>{t('common.copied')}</span></>
                      ) : (
                        <><Copy className="w-4 h-4" /><span>{t('library.copyPrompt')}</span></>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className="bg-white rounded-3xl p-6 card-shadow border border-black/5 flex gap-6 hover:shadow-xl transition-all"
                >
                  <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-100">
                    <img
                      src={getFullUrl(asset.image_url)}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-xl mb-2">
                      {(() => {
                        // 优先使用 style_name，如果 title 是时间戳格式则忽略
                        const styleName = asset.analysis?.prompt?.style_name || 
                                         asset.analysis?.parsed?.style_name || 
                                         asset.analysis?.parsed?.project_name;
                        
                        // 如果有 style_name，使用它
                        if (styleName && styleName.trim()) {
                          return styleName;
                        }
                        
                        // 如果 title 不是时间戳格式，使用 title
                        const defaultPrefix = t('library.defaultAnalysisTitle');
                        if (asset.title && !asset.title.includes(defaultPrefix) && !/\d{4}\/\d{1,2}\/\d{1,2}/.test(asset.title)) {
                          return asset.title;
                        }
                        
                        // 否则返回默认标题
                        return asset.title;
                      })()}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {asset.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-canvas rounded-full text-xs font-label font-bold text-ink/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-sm text-ink/60 font-mono mb-3 line-clamp-2">
                      {asset.analysis?.prompt?.ai_prompt || asset.analysis?.parsed?.ai_prompt || asset.prompt}
                    </p>

                    <div className="flex gap-2">
                      {asset.colors.slice(0, 8).map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: color.hex }}
                          title={`${color.hex} (${color.percentage}%)`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => copyPrompt(asset)}
                      className="p-3 rounded-xl bg-accent hover:brightness-105 transition-all"
                    >
                      {copiedId === asset.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => downloadImage(asset.image_url, asset.title)}
                      className="p-3 rounded-xl bg-canvas hover:bg-black/5 transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveClick(asset.id)}
                      className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                      title={t('library.removeFromLibrary')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredHistory.length === 0 ? (
            <div className="text-center py-20">
              <Clock className="w-16 h-16 text-ink/20 mx-auto mb-4" />
              <h3 className="font-headline font-bold text-xl text-ink/40 mb-2">{t('library.noHistory')}</h3>
              <p className="text-ink/30">{t('library.historyEmpty')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredHistory.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 card-shadow border border-black/5 hover:shadow-xl transition-all cursor-pointer group relative"
                >
                  {/* Top Right Actions */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteHistoryClick(item.id, e)}
                      className="p-1.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('library.deleteHistory')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Saved Badge */}
                    {savedAssetIds.has(item.id) && (
                      <div className="bg-tertiary text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                        <Save className="w-2.5 h-2.5" />
                        <span>{t('library.saved')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div onClick={() => router.push(`/detail/${item.id}`)}>
                    <div className="flex -space-x-1.5 mb-3">
                      {item.colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>

                    <h3 className="font-sans font-bold text-base mb-2 truncate group-hover:text-tertiary transition-colors">
                      {(() => {
                        const styleName = item.analysis?.prompt?.style_name || 
                                         item.analysis?.parsed?.style_name || 
                                         item.analysis?.parsed?.project_name;
                        const defaultPrefix = t('library.defaultAnalysisTitle');
                        if (styleName && styleName.trim()) return styleName;
                        if (item.title && !item.title.includes(defaultPrefix) && !/\d{4}\/\d{1,2}\/\d{1,2}/.test(item.title)) {
                          return item.title;
                        }
                        return item.title;
                      })()}
                    </h3>

                    <p className="text-xs text-ink/50 font-sans mb-3">
                      {item.timestamp}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-canvas rounded-md text-[10px] font-medium text-ink/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 card-shadow border border-black/5 hover:shadow-xl transition-all cursor-pointer group relative"
                >
                  {/* Top Right Actions */}
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteHistoryClick(item.id, e)}
                      className="p-2 rounded-full bg-red-500/90 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('library.deleteHistory')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Saved Badge */}
                    {savedAssetIds.has(item.id) && (
                      <div className="bg-tertiary text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                        <Save className="w-3 h-3" />
                        <span>{t('library.saved')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div onClick={() => router.push(`/detail/${item.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1.5">
                        {item.colors.slice(0, 3).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-sans font-bold text-lg mb-1 truncate group-hover:text-tertiary transition-colors">
                          {(() => {
                            const styleName = item.analysis?.prompt?.style_name || 
                                             item.analysis?.parsed?.style_name || 
                                             item.analysis?.parsed?.project_name;
                            const defaultPrefix = t('library.defaultAnalysisTitle');
                            if (styleName && styleName.trim()) return styleName;
                            if (item.title && !item.title.includes(defaultPrefix) && !/\d{4}\/\d{1,2}\/\d{1,2}/.test(item.title)) {
                              return item.title;
                            }
                            return item.title;
                          })()}
                        </h3>
                        <p className="text-sm text-ink/50 font-sans">
                          {item.timestamp}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {item.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 bg-canvas rounded-lg text-xs font-medium text-ink/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-4 border border-black/10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-headline font-bold text-lg">{t('library.deleteHistory')}</h3>
            </div>
            <p className="text-ink/70 mb-6">{t('library.deleteHistoryConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteHistory}
                className="flex-1 px-4 py-2.5 rounded-lg border border-black/10 hover:bg-black/5 transition-all font-medium"
              >
                {t('library.cancelDelete')}
              </button>
              <button
                onClick={confirmDeleteHistory}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all font-medium shadow-sm"
              >
                {t('library.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
