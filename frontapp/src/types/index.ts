/**
 * 类型定义
 */

export interface ColorData {
  hex: string;
  rgb: { r: number; g: number; b: number };
  percentage: number;
  pixel_count: number;
}

export interface ColorClassification {
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
}

export interface AnalysisData {
  raw_text?: string;
  parsed?: {
    style_name?: string;
    project_name?: string;
    ai_prompt?: string;
    style_tags?: string;
    composition?: string;
    art_style?: string;
    lighting?: string;
    mood?: string;
    medium?: string;
    technical?: string;
    elements?: string;
    color_description?: string;
    color_palette?: string;
    color_classification?: ColorClassification | Record<string, any>;
    [key: string]: any;
  };
  style?: {
    composition: string;
    art_style: string;
    lighting: string;
    mood: string;
    medium: string;
    technical: string;
    elements: string;
  };
  colors?: {
    color_palette: string;
    color_classification?: ColorClassification | Record<string, any>;
    color_description?: string;
  };
  prompt?: {
    ai_prompt: string;
    style_tags: string;
    style_name: string;
  };
  metadata?: {
    model: string;
    success: boolean;
  };
  model?: string;
  success?: boolean;
  [key: string]: any;
}

export interface AnalysisResult {
  colors: ColorData[];
  analysis: AnalysisData;
  prompt: string;
  tags: string[];
}

export interface Asset {
  id: string;
  title: string;
  image_url: string;
  prompt: string;
  colors: ColorData[];
  tags: string[];
  analysis?: AnalysisData;
  created_at: string;
  updated_at?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: string;
  imageUrl: string;
  tags: string[];
  colors: ColorData[];
  prompt: string;
  analysis?: AnalysisData;
  created_at?: string;
  updated_at?: string;
  is_saved?: boolean;  // 是否已收藏
}

export interface User {
  id: number;
  username: string;
  avatar: string;
  created_at?: string;
  last_login?: string;
}
