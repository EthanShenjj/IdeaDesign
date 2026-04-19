/**
 * 工具函数
 */

import type { AnalysisData, ColorData } from '@/types';

/**
 * 从分析结果生成 Prompt
 */
export function generatePromptFromAnalysis(analysis: AnalysisData, colors: ColorData[]): string {
  const parsed = analysis.parsed || {};
  const parts = [];

  if (parsed.composition) parts.push(parsed.composition.split('.')[0]);
  if (parsed.art_style) parts.push(parsed.art_style.split('.')[0]);
  if (parsed.lighting) parts.push(parsed.lighting.split('.')[0]);

  return parts.join(', ') + ' --ar 16:9 --v 6.0';
}

/**
 * 从分析结果提取标签
 */
export function extractTags(analysis: AnalysisData): string[] {
  const allText = [
    analysis.parsed?.art_style || '',
    analysis.parsed?.composition || '',
    analysis.parsed?.mood || '',
    analysis.parsed?.medium || '',
    analysis.raw_text || ''
  ].join(' ').toLowerCase();
  
  const keywords = [
    'minimalist', 'minimalism',
    'abstract', 'abstraction',
    'geometric', 'geometry',
    '3d', 'three-dimensional',
    'gradient', 'gradients',
    'vintage', 'retro',
    'modern', 'contemporary',
    'brutalist', 'brutalism',
    'surreal', 'surrealism',
    'organic', 'fluid',
    'flat', 'flat design',
    'editorial', 'magazine',
    'cinematic', 'film',
    'ethereal', 'dreamy',
    'grainy', 'textured',
    'colorful', 'vibrant',
    'monochrome', 'black and white',
    'pastel', 'soft',
    'bold', 'striking',
    'playful', 'whimsical',
    'elegant', 'sophisticated',
    'rustic', 'natural'
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
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString('zh-CN', { 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * 类名合并工具
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 安全地保存到 localStorage，处理配额超限问题
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`localStorage quota exceeded for key: ${key}`, error);
    
    // 尝试清理旧数据
    if (key === 'analysis_history') {
      try {
        localStorage.removeItem(key);
        // 如果是数组，只保留最新的几条
        if (Array.isArray(value)) {
          const reduced = value.slice(0, 10);
          localStorage.setItem(key, JSON.stringify(reduced));
          return true;
        }
      } catch (e) {
        console.error('Failed to save even after clearing:', e);
      }
    }
    
    return false;
  }
}

/**
 * 创建轻量级历史记录项（不包含大数据）
 */
export function createLightHistoryItem(fullItem: any) {
  return {
    id: fullItem.id,
    timestamp: fullItem.timestamp,
    image: fullItem.image,
    colors: fullItem.colors,
  };
}

/**
 * 获取 localStorage 使用情况（估算）
 */
export function getLocalStorageSize(): { used: number; total: number } {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  
  // 大多数浏览器限制在 5-10MB
  const estimatedLimit = 5 * 1024 * 1024; // 5MB
  
  return {
    used: total,
    total: estimatedLimit
  };
}
