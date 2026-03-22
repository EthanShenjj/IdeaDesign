# 大模型输出字段文档

## 概述

系统使用 Vision API（如 GPT-4o）分析图片的视觉风格，大模型会按照预定义的格式返回结构化的分析结果。

---

## 大模型输出的字段列表

### 1. **构图 (Composition)**
- **字段名**: `composition`
- **描述**: 图片的布局、平衡、焦点
- **格式**: 1-2句话的简洁描述
- **示例**: "中心对称构图，主体位于画面中央，周围留白营造平衡感。"

### 2. **色彩方案 (Color Palette)**
- **字段名**: `color_palette`
- **描述**: 主色调、情绪、色温的描述
- **格式**: 1-2句话的简洁描述
- **示例**: "高对比度配色以明亮黄和珊瑚红为主，搭配纯黑描边与文字，营造出复古又现代的活力感，色温偏暖且饱和度极高。"
- **展示位置**: 色彩模块

### 3. **色彩分类 (Color Classification)**
- **字段名**: `color_classification`
- **描述**: AI识别的四种主要颜色角色
- **格式**: JSON对象，包含4个十六进制颜色代码
- **必需字段**:
  - `primary`: 主题色 (Primary Color)
  - `secondary`: 辅助色 (Secondary Color)
  - `tertiary`: 第三色 (Tertiary Color)
  - `neutral`: 中性色 (Neutral Color)
- **示例**:
  ```json
  {
    "primary": "#FF6B6B",
    "secondary": "#FFD93D",
    "tertiary": "#000000",
    "neutral": "#FFFDF5"
  }
  ```
- **展示位置**: 色彩模块（带色卡渐变）

### 4. **光线 (Lighting)**
- **字段名**: `lighting`
- **描述**: 光源、阴影、对比度
- **格式**: 1-2句话的简洁描述
- **示例**: "自然光从左侧照射，产生柔和的阴影，整体对比度适中。"
- **展示位置**: 风格描述模块

### 5. **艺术风格 (Art Style)**
- **字段名**: `art_style`
- **描述**: 流派、运动、影响
- **格式**: 1-2句话的简洁描述
- **示例**: "受包豪斯运动影响的现代主义风格，强调几何形状和功能性。"
- **展示位置**: 风格描述模块

### 6. **媒介 (Medium)**
- **字段名**: `medium`
- **描述**: 创作媒介类型
- **格式**: 1句话
- **可能值**: 摄影、数字艺术、插画、3D渲染、绘画、平面设计等
- **示例**: "数字插画，使用矢量图形工具创作。"
- **展示位置**: 风格描述模块

### 7. **氛围与情绪 (Mood & Atmosphere)**
- **字段名**: `mood`
- **描述**: 情感基调、感觉
- **格式**: 1-2句话的简洁描述
- **示例**: "充满活力和乐观情绪，传达出积极向上的氛围。"
- **展示位置**: 风格描述模块

### 8. **技术细节 (Technical Details)**
- **字段名**: `technical`
- **描述**: 纹理、深度、透视
- **格式**: 1-2句话的简洁描述
- **示例**: "扁平化设计，无透视感，使用简单的几何形状和纯色填充。"
- **展示位置**: 风格描述模块

### 9. **关键视觉元素 (Key Visual Elements)**
- **字段名**: `elements`
- **描述**: 形状、图案、主体
- **格式**: 1-2句话的简洁描述
- **示例**: "主要元素包括圆形、三角形和矩形的组合，形成抽象的几何图案。"
- **展示位置**: 风格描述模块

### 10. **AI生成提示词 (AI Generation Prompt)**
- **字段名**: `ai_prompt`
- **描述**: Midjourney风格的生成提示词
- **格式**: 50-100词的简洁提示词
- **示例**: "minimalist poster design, bold geometric shapes, vibrant yellow and coral red color scheme, black outlines, retro modern aesthetic, flat design, high contrast, clean composition, centered layout, --ar 1:1 --style raw"
- **展示位置**: 生成的提示词模块（独立展示）

### 11. **风格标签 (Style Tags)**
- **字段名**: `style_tags`
- **描述**: 关键风格标签
- **格式**: 5-8个关键词，逗号分隔
- **示例**: "Geometric, Minimalist, Bold, Retro, Modern, Flat, Vibrant"
- **用途**: 用于搜索和分类

### 12. **风格名称 (Style Name)**
- **字段名**: `style_name`
- **描述**: 简短的风格描述性名称
- **格式**: 2-4个词
- **示例**: 
  - "极简主义海报"
  - "赛博朋克插画"
  - "复古摄影"
  - "抽象几何设计"
  - "Minimalist Poster"
  - "Cyberpunk Illustration"
- **用途**: 作为项目标题显示
- **展示位置**: 页面标题、卡片标题

---

## 提示词模板

### 中文提示词
```
请分析这张图片的视觉风格。

重要：请严格按照以下格式回答，每个部分都必须包含：

**构图**
[简洁描述布局、平衡、焦点，1-2句话]

**色彩方案**
[简洁描述主色调、情绪、色温，1-2句话]

**色彩分类**
Primary: #XXXXXX
Secondary: #XXXXXX
Tertiary: #XXXXXX
Neutral: #XXXXXX

**光线**
[简洁描述光源、阴影、对比度，1-2句话]

**艺术风格**
[简洁描述流派、运动、影响，1-2句话]

**媒介**
[简洁说明：摄影、数字艺术、插画等，1句话]

**氛围与情绪**
[简洁描述情感基调、感觉，1-2句话]

**技术细节**
[简洁描述纹理、深度、透视，1-2句话]

**关键视觉元素**
[简洁描述形状、图案、主体，1-2句话]

**AI生成提示词**
[生成简洁的Midjourney风格提示词，50-100词]

**风格标签**
[5-8个关键词，逗号分隔]

**风格名称**
[根据图片的主要视觉风格特征，生成一个2-4个词的描述性名称]

注意：
1. 色彩分类必须提供4个十六进制颜色代码（格式：#XXXXXX）
2. 所有描述保持简洁，只关注风格相关的核心特征
3. 风格名称要准确反映图片的艺术风格和媒介类型
```

### 英文提示词
```
Analyze this image's visual style.

IMPORTANT: Follow this exact format, all sections required:

**Composition**
[Brief description of layout, balance, focal points - 1-2 sentences]

**Color Palette**
[Brief description of dominant colors, mood, temperature - 1-2 sentences]

**Color Classification**
Primary: #XXXXXX
Secondary: #XXXXXX
Tertiary: #XXXXXX
Neutral: #XXXXXX

**Lighting**
[Brief description of light source, shadows, contrast - 1-2 sentences]

**Art Style**
[Brief description of genre, movement, influences - 1-2 sentences]

**Medium**
[Brief statement: Photography, digital art, illustration, etc. - 1 sentence]

**Mood & Atmosphere**
[Brief description of emotional tone, feeling - 1-2 sentences]

**Technical Details**
[Brief description of texture, depth, perspective - 1-2 sentences]

**Key Visual Elements**
[Brief description of shapes, patterns, subjects - 1-2 sentences]

**AI Generation Prompt**
[Generate concise Midjourney-style prompt, 50-100 words]

**Style Tags**
[5-8 keywords, comma-separated]

**Style Name**
[Based on the main visual style characteristics, create a descriptive 2-4 word name]

NOTE:
1. Color Classification MUST provide 4 hex color codes (format: #XXXXXX)
2. Keep all descriptions concise, focusing only on core style-related features
3. Style Name should accurately reflect the image's artistic style and medium type
```

---

## 数据处理流程

### 1. 大模型返回原始文本
```
**构图**
中心对称构图，主体位于画面中央...

**色彩方案**
高对比度配色以明亮黄和珊瑚红为主...

**色彩分类**
Primary: #FF6B6B
Secondary: #FFD93D
...
```

### 2. 后端解析 (parse_analysis)
将原始文本解析为结构化数据：
```python
{
    'composition': '中心对称构图...',
    'color_palette': '高对比度配色...',
    'color_classification': {
        'primary': '#FF6B6B',
        'secondary': '#FFD93D',
        'tertiary': '#000000',
        'neutral': '#FFFDF5'
    },
    'lighting': '...',
    'art_style': '...',
    'medium': '...',
    'mood': '...',
    'technical': '...',
    'elements': '...',
    'ai_prompt': '...',
    'style_tags': 'Geometric, Minimalist, Bold...',
    'style_name': '极简主义海报'
}
```

### 3. 保存到数据库（模块化结构）
```json
{
  "style": {
    "composition": "...",
    "art_style": "...",
    "lighting": "...",
    "mood": "...",
    "medium": "...",
    "technical": "...",
    "elements": "..."
  },
  "colors": {
    "color_palette": "...",
    "color_classification": {...}
  },
  "prompt": {
    "ai_prompt": "...",
    "style_tags": "...",
    "style_name": "..."
  },
  "metadata": {
    "model": "gpt-4o",
    "success": true
  }
}
```

### 4. 前端展示
- **页面标题**: `style_name`
- **生成的提示词**: `ai_prompt`
- **色彩模块**: `color_palette` + `color_classification`
- **风格描述**: `composition`, `art_style`, `lighting`, `mood`, `medium`, `technical`, `elements`
- **标签**: `style_tags`

---

## 字段映射关系

| 大模型输出字段 | 数据库存储位置 | 前端展示位置 |
|---------------|---------------|-------------|
| composition | analysis.style.composition | 风格描述 - 构图 |
| color_palette | analysis.colors.color_palette | 色彩模块 - AI色彩方案描述 |
| color_classification | analysis.colors.color_classification | 色彩模块 - AI色彩分类 |
| lighting | analysis.style.lighting | 风格描述 - 光线 |
| art_style | analysis.style.art_style | 风格描述 - 艺术风格 |
| medium | analysis.style.medium | 风格描述 - 媒介 |
| mood | analysis.style.mood | 风格描述 - 氛围与情绪 |
| technical | analysis.style.technical | 风格描述 - 技术细节 |
| elements | analysis.style.elements | 风格描述 - 关键视觉元素 |
| ai_prompt | analysis.prompt.ai_prompt | 生成的提示词（独立模块） |
| style_tags | analysis.prompt.style_tags | 标签列表 |
| style_name | analysis.prompt.style_name | 页面标题、卡片标题 |

---

## 注意事项

1. **色彩分类是必需的**: 大模型必须返回4个十六进制颜色代码
2. **风格名称很重要**: 这是用户看到的第一印象，应该准确且有吸引力
3. **AI提示词要实用**: 应该能直接用于 Midjourney 等工具生成类似风格的图片
4. **保持简洁**: 所有描述都应该简洁明了，避免冗长
5. **语言一致性**: 根据用户选择的语言（中文/英文）返回对应语言的内容
