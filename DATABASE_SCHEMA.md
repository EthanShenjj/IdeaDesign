# 数据库表结构文档

## 数据库类型
- SQLite (默认)
- 数据库文件路径: `data/ideaDesign.db`

---

## 表结构

### 1. assets (素材表)

存储用户分析的图片素材及其分析结果。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 素材ID（自增主键） |
| title | TEXT | NOT NULL | 素材标题（AI生成的风格名称） |
| image_url | TEXT | NOT NULL | 图片URL |
| prompt | TEXT | NOT NULL | AI生成的提示词 |
| colors | TEXT | NOT NULL | 颜色数据（JSON格式） |
| tags | TEXT | NULL | 标签列表（JSON格式） |
| analysis | TEXT | NULL | 分析结果（JSON格式，模块化结构） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引:**
- `idx_assets_title`: 标题索引
- `idx_assets_created`: 创建时间索引（降序）

**colors 字段 JSON 结构:**
```json
[
  {
    "hex": "#XXXXXX",
    "rgb": {"r": 0, "g": 0, "b": 0},
    "percentage": 25.5,
    "pixel_count": 1000
  }
]
```

**tags 字段 JSON 结构:**
```json
["Minimalist", "Modern", "Geometric"]
```

**analysis 字段 JSON 结构（模块化）:**
```json
{
  "style": {
    "composition": "布局描述",
    "art_style": "艺术风格描述",
    "lighting": "光线描述",
    "mood": "氛围描述",
    "medium": "媒介类型",
    "technical": "技术细节",
    "elements": "视觉元素"
  },
  "colors": {
    "color_palette": "色彩方案描述",
    "color_classification": {
      "primary": "#XXXXXX",
      "secondary": "#XXXXXX",
      "tertiary": "#XXXXXX",
      "neutral": "#XXXXXX"
    }
  },
  "prompt": {
    "ai_prompt": "AI生成的Midjourney风格提示词",
    "style_tags": "风格标签（逗号分隔）",
    "style_name": "风格名称（如：极简主义海报）"
  },
  "metadata": {
    "model": "使用的AI模型名称",
    "success": true
  }
}
```

---

### 2. tags (标签表)

存储所有使用过的标签及其使用次数。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 标签ID（自增主键） |
| name | TEXT | UNIQUE NOT NULL | 标签名称（唯一） |
| count | INTEGER | DEFAULT 1 | 使用次数 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. users (用户表)

存储用户账号信息。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 用户ID（自增主键） |
| username | TEXT | UNIQUE NOT NULL | 用户名（唯一，最少3位） |
| password_hash | TEXT | NOT NULL | 密码哈希（SHA-256，32位十六进制） |
| avatar | TEXT | NOT NULL | 头像（用户名首字母） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 注册时间 |
| last_login | TIMESTAMP | NULL | 最后登录时间 |

**索引:**
- `idx_username`: 用户名索引

**默认管理员账号:**
- 用户名: `admin`
- 密码: `admin123456`

**密码要求:**
- 最少6位
- 必须包含字母和数字

---

## 数据流程

### 图片分析流程

1. **用户上传图片** → 前端 `/analyze` 页面
2. **颜色提取** → 后端 `/api/extract-colors` 接口
3. **AI分析** → 后端 `/api/analyze` 接口
   - 调用 Vision API 分析图片风格
   - 解析返回的结构化数据
   - 提取风格名称、AI提示词、色彩分类等
4. **保存到数据库** → 后端 `/api/assets` 接口 (POST)
   - title: AI生成的风格名称
   - prompt: AI生成的提示词
   - colors: 提取的颜色数据
   - tags: AI生成的风格标签
   - analysis: 模块化的分析结果
5. **展示结果** → 前端 `/detail/[id]` 页面

### 数据展示优先级

**标题显示:**
```
analysis.prompt.style_name 
→ analysis.parsed.style_name (兼容旧格式)
→ analysis.parsed.project_name (兼容旧格式)
→ title (后备)
```

**提示词显示:**
```
analysis.prompt.ai_prompt 
→ analysis.parsed.ai_prompt (兼容旧格式)
→ prompt (后备)
```

---

## 数据迁移说明

如果需要从旧格式迁移到新格式，可以运行以下SQL更新：

```sql
-- 注意：这只是示例，实际需要通过Python脚本处理JSON转换
UPDATE assets 
SET analysis = json_object(
  'style', json_object(
    'composition', json_extract(analysis, '$.parsed.composition'),
    'art_style', json_extract(analysis, '$.parsed.art_style'),
    'lighting', json_extract(analysis, '$.parsed.lighting'),
    'mood', json_extract(analysis, '$.parsed.mood'),
    'medium', json_extract(analysis, '$.parsed.medium'),
    'technical', json_extract(analysis, '$.parsed.technical'),
    'elements', json_extract(analysis, '$.parsed.elements')
  ),
  'colors', json_object(
    'color_palette', json_extract(analysis, '$.parsed.color_palette'),
    'color_classification', json_extract(analysis, '$.parsed.color_classification')
  ),
  'prompt', json_object(
    'ai_prompt', json_extract(analysis, '$.parsed.ai_prompt'),
    'style_tags', json_extract(analysis, '$.parsed.style_tags'),
    'style_name', json_extract(analysis, '$.parsed.style_name')
  ),
  'metadata', json_object(
    'model', json_extract(analysis, '$.model'),
    'success', json_extract(analysis, '$.success')
  )
)
WHERE json_extract(analysis, '$.parsed') IS NOT NULL;
```

---

## 备份与恢复

### 备份数据库
```bash
cp data/ideaDesign.db data/ideaDesign_backup_$(date +%Y%m%d).db
```

### 恢复数据库
```bash
cp data/ideaDesign_backup_YYYYMMDD.db data/ideaDesign.db
```

### 导出为SQL
```bash
sqlite3 data/ideaDesign.db .dump > backup.sql
```

### 从SQL导入
```bash
sqlite3 data/ideaDesign.db < backup.sql
```
