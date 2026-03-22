# AI 视觉风格提取与管理平台 - 后端 API

Flask 后端服务，提供图片分析、色彩提取、AI 模型调用和素材管理功能。

## 技术栈

- **Flask** - Web 框架
- **MySQL** - 数据库
- **Pillow + extcolors** - 图像处理和色彩提取
- **OpenAI SDK** - AI 模型集成（支持兼容接口）

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置数据库

创建 MySQL 数据库：

```sql
CREATE DATABASE ai_vision_style CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

复制环境变量配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的数据库配置。

### 3. 启动服务

```bash
python app.py
```

服务将在 `http://localhost:5000` 启动。

## API 接口文档

### 健康检查

```
GET /api/health
```

### 图片风格分析

```
POST /api/analyze
Content-Type: multipart/form-data

参数：
- image: 图片文件（或 image_url）
- api_key: OpenAI API Key
- base_url: API 基础 URL（可选，默认 OpenAI）
- model_name: 模型名称（可选，默认 gpt-4o）

返回：
{
  "success": true,
  "analysis": {
    "raw_text": "...",
    "parsed": {
      "composition": "...",
      "color_palette": "...",
      "art_style": "...",
      ...
    }
  }
}
```

### 色彩提取

```
POST /api/extract-colors
Content-Type: multipart/form-data

参数：
- image: 图片文件
- 或 image_url: 图片 URL
- 或 image_base64: Base64 编码图片

返回：
{
  "success": true,
  "colors": [
    {
      "hex": "#6D5E00",
      "rgb": {"r": 109, "g": 94, "b": 0},
      "percentage": 40.5,
      "pixel_count": 12345
    },
    ...
  ]
}
```

### AI 生图

```
POST /api/generate
Content-Type: application/json

{
  "api_key": "your_api_key",
  "base_url": "https://api.openai.com/v1",
  "model_name": "dall-e-3",
  "prompt": "your prompt",
  "size": "1024x1024",
  "quality": "standard"
}
```

### 素材管理

#### 获取素材列表

```
GET /api/assets?tag=Minimalist&search=keyword&limit=50
```

#### 保存素材

```
POST /api/assets
Content-Type: application/json

{
  "title": "Chromatic Ethereal",
  "image_url": "https://...",
  "prompt": "Abstract colorful...",
  "colors": [...],
  "tags": ["Gradient", "3D"],
  "analysis": {...}
}
```

#### 删除素材

```
DELETE /api/assets?id=123
```

### 多模型对比

```
POST /api/compare-models
Content-Type: application/json

{
  "prompt": "your prompt",
  "models": [
    {
      "name": "gpt-4o",
      "api_key": "...",
      "base_url": "..."
    },
    {
      "name": "claude-3-5-sonnet",
      "api_key": "...",
      "base_url": "..."
    }
  ]
}
```

## 项目结构

```
backend/
├── app.py                      # Flask 主应用
├── requirements.txt            # Python 依赖
├── .env.example               # 环境变量示例
├── utils/
│   ├── color_extractor.py     # 色彩提取工具
│   ├── vision_analyzer.py     # 视觉分析工具
│   └── prompt_generator.py    # Prompt 生成工具
└── database/
    └── db_manager.py          # 数据库管理
```

## 兼容的 AI 接口

本后端支持所有 OpenAI 兼容的 API 接口：

- OpenAI 官方 API
- OneAPI
- DeepSeek
- 本地部署的 LLM（如 Ollama + LiteLLM）
- 其他兼容 OpenAI 格式的服务

只需在请求时指定 `base_url` 和 `api_key` 即可。

## 开发建议

1. 使用 Postman 或 curl 测试 API
2. 查看 Flask 控制台日志排查问题
3. 数据库连接失败时会自动尝试创建数据库
4. 图片上传限制为 16MB

## 部署

生产环境建议使用 Gunicorn：

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
