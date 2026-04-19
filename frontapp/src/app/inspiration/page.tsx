'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, Grid, List } from 'lucide-react';
import BackgroundLights from '@/components/BackgroundLights';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getDesigns } from '@/lib/api';

export default function InspirationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [designs, setDesigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchDesigns = async () => {
      setIsLoading(true);
      try {
        const response = await getDesigns();
        if (response.success) {
          setDesigns(response.designs);
          // 提取所有标签
          const tags = Array.from(new Set(response.designs.flatMap((a: any) => a.categoryLabelZh).filter(Boolean))) as string[];
          setAllTags(tags);
        }
      } catch (err) {
        console.error('Failed to fetch designs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDesigns();
  }, []);

  const filteredAssets = designs.filter(asset => {
    const matchesSearch = !searchQuery || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.summary || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !selectedTag || asset.categoryLabelZh === selectedTag || asset.categoryLabelEn === selectedTag;
    
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-canvas pt-24 pb-20 px-6">
      <BackgroundLights />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-tertiary" />
              <h1 className="font-headline font-bold text-3xl tracking-tight">灵感库 (Inspiration)</h1>
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

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-white rounded-2xl p-2 flex items-center gap-3 card-shadow">
              <Search className="w-5 h-5 text-ink/30 ml-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('library.searchPlaceholder') || "Search Inspiration..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg outline-none"
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
                {t('common.all') || 'All'}
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-tertiary/20 border-t-tertiary rounded-full animate-spin mb-4" />
            <p className="text-ink/40">{t('common.loading')}</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-ink/20 mx-auto mb-4" />
            <h3 className="font-headline font-bold text-xl text-ink/40 mb-2">No Inspiration Found</h3>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                className="bg-white rounded-2xl p-4 card-shadow border border-black/5 hover:shadow-xl transition-all cursor-pointer group relative"
                onClick={() => router.push(`/inspiration/${asset.slug}`)}
              >
                <div className="flex -space-x-1.5 mb-3">
                  {(asset.colors || []).slice(0, 4).map((color: string, i: number) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <h3 className="font-sans font-bold text-base mb-1 truncate group-hover:text-tertiary transition-colors">
                  {asset.name}
                </h3>
                
                <p className="text-xs text-ink/50 font-sans mb-3 line-clamp-2" title={asset.summary}>
                  {asset.summary}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 bg-canvas rounded-md text-[10px] font-medium text-ink/60">
                    {asset.categoryLabelZh}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                className="bg-white rounded-2xl p-5 card-shadow border border-black/5 hover:shadow-xl transition-all cursor-pointer group relative"
                onClick={() => router.push(`/inspiration/${asset.slug}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {(asset.colors || []).slice(0, 3).map((color: string, i: number) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-sans font-bold text-lg mb-1 truncate group-hover:text-tertiary transition-colors">
                      {asset.name}
                    </h3>
                    <p className="text-sm text-ink/50 font-sans line-clamp-1">
                      {asset.summary}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-canvas rounded-lg text-xs font-medium text-ink/60">
                      {asset.categoryLabelZh}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
