/**
 * API 服务 - 统一管理后端接口调用
 */

import type { ColorData, AnalysisData, Asset, ModelConfig } from '@/types';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
// 归一化處理：去掉末尾的斜杠和 /api，因为后续请求会手动添加 /api
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '').replace(/\/api$/, '');
const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * 带超时的 fetch 包装函数
 */
async function fetchWithTimeout(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<any> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/health`, { timeout: 5000 });
  return response.json();
}

/**
 * 获取完整 URL（针对上传文件等）
 */
export function getFullUrl(path: string): string {
  if (!path) return '';
  // 如果是 base64 数据或完整 URL，直接返回
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * 提取图片颜色
 */
export async function extractColors(
  imageFile?: File,
  imageUrl?: string
): Promise<{ success: boolean; colors: ColorData[] }> {
  const formData = new FormData();
  
  if (imageFile) {
    formData.append('image', imageFile);
  } else if (imageUrl) {
    formData.append('image_url', imageUrl);
  } else {
    throw new Error('Either imageFile or imageUrl must be provided');
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/extract-colors`, {
    method: 'POST',
    body: formData,
    timeout: 30000
  });

  if (!response.ok) {
    throw new Error(`Color extraction failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 分析图片风格
 */
export async function analyzeImage(
  imageFile: File | null,
  imageUrl: string | null,
  modelConfig: ModelConfig,
  language: string = 'zh'
): Promise<{ 
  success: boolean; 
  analysis: { 
    raw_text: string; 
    parsed: any;
    model?: string;
    success?: boolean;
  }; 
  image_url?: string;
  source_url?: string;
}> {
  const formData = new FormData();
  
  if (imageFile) {
    formData.append('image', imageFile);
  } else if (imageUrl) {
    formData.append('image_url', imageUrl);
  } else {
    throw new Error('Either imageFile or imageUrl must be provided');
  }

  formData.append('api_key', modelConfig.apiKey);
  formData.append('base_url', modelConfig.baseUrl);
  formData.append('model_name', modelConfig.name);
  formData.append('language', language);

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
    timeout: 120000
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 生成图片
 */
export async function generateImage(
  prompt: string,
  modelConfig: ModelConfig,
  options?: {
    size?: string;
    quality?: string;
    n?: number;
  }
): Promise<any> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: modelConfig.apiKey,
      base_url: modelConfig.baseUrl,
      model_name: modelConfig.name,
      prompt,
      ...options
    })
  });

  if (!response.ok) {
    throw new Error(`Generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取素材列表
 */
export async function getAssets(filters?: {
  tag?: string;
  search?: string;
  color?: string;
  limit?: number;
}): Promise<{ success: boolean; assets: Asset[]; count: number }> {
  const params = new URLSearchParams();
  
  if (filters?.tag) params.append('tag', filters.tag);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.color) params.append('color', filters.color);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/assets?${params}`, { timeout: 30000 });

  if (!response.ok) {
    throw new Error(`Failed to fetch assets: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 根据 ID 获取单个素材/分析结果
 */
export async function getAssetById(assetId: string): Promise<{ success: boolean; asset: Asset }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/assets?id=${assetId}`, { timeout: 30000 });

  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 保存素材
 */
export async function saveAsset(asset: Omit<Asset, 'id' | 'created_at'>): Promise<{ success: boolean; asset_id: string }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(asset)
  });

  if (!response.ok) {
    throw new Error(`Failed to save asset: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 删除素材
 */
export async function deleteAsset(assetId: string): Promise<{ success: boolean }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/assets?id=${assetId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Failed to delete asset: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 多模型对比生成
 */
export async function compareModels(
  prompt: string,
  models: ModelConfig[],
  options?: {
    size?: string;
  }
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  const modelsData = models.map(m => ({
    name: m.name,
    api_key: m.apiKey,
    base_url: m.baseUrl
  }));

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/compare-models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      models: modelsData,
      ...options
    })
  });

  if (!response.ok) {
    throw new Error(`Model comparison failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取历史记录
 */
export async function getHistory(filters?: {
  tag?: string;
  search?: string;
  limit?: number;
  id?: string;
}): Promise<{ success: boolean; history: any[]; count: number }> {
  const params = new URLSearchParams();
  
  if (filters?.tag) params.append('tag', filters.tag);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.id) params.append('id', filters.id);

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/history?${params}`, { timeout: 30000 });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 删除历史记录
 */
export async function deleteHistory(historyId: string): Promise<{ success: boolean }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/history?id=${historyId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Failed to delete history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 保存到历史记录
 */
export async function saveToHistory(data: {
  title: string;
  image_url: string;
  prompt: string;
  colors: any[];
  tags: string[];
  analysis: any;
}): Promise<{ success: boolean; history_id: string }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * 收藏历史记录
 */
export async function saveHistoryToLibrary(historyId: string): Promise<{ success: boolean; asset_id: string }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/history/${historyId}/save`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to save history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 取消收藏历史记录
 */
export async function unsaveHistoryFromLibrary(historyId: string): Promise<{ success: boolean }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/history/${historyId}/unsave`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to unsave history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 用户注册
 */
export async function register(
  username: string,
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: data.error || 'Registration failed' };
  }

  return data;
}

/**
 * 用户登录
 */
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: data.error || 'Login failed' };
  }

  return data;
}

// Note: Model storage functions have been moved to hooks/useModels.ts
// Re-exporting for backward compatibility
export { getStoredModels, saveModels, getDefaultModel } from '@/hooks/useModels';

/**
 * 获取当前登录用户
 */
export function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * 退出登录
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
}

/**
 * 获取设计灵感列表
 */
export async function getDesigns(filters?: {
  search?: string;
  category?: string;
}): Promise<{ success: boolean; designs: any[]; count: number }> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.category) params.append('category', filters.category);

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/designs?${params}`, { timeout: 30000 });
  if (!response.ok) {
    throw new Error(`Failed to fetch designs: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 根据 slug 获取设计详情
 */
export async function getDesignBySlug(slug: string): Promise<{ success: boolean; design: any }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/designs/${slug}`, { timeout: 30000 });
  if (!response.ok) {
    throw new Error(`Failed to fetch design detail: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
