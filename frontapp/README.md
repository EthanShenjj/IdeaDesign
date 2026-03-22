# AI Vision Style - Next.js Frontend

这是使用 Next.js 14 (App Router) 构建的前端应用，用于提取和分析图片的视觉风格。

## 功能特性

- ✅ 图片上传和风格分析
- ✅ AI 模型配置和管理
- ✅ 历史记录和素材库
- ✅ 瀑布流布局和懒加载
- ✅ 多模型对比
- ✅ 用户认证（登录/注册）
- ✅ 中英文双语支持
- ✅ 响应式设计

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **动画**: Framer Motion
- **图标**: Lucide React
- **状态管理**: React Hooks + localStorage

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
frontapp/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页（瀑布流）
│   │   ├── analyze/           # 分析页面
│   │   ├── library/           # 素材库
│   │   ├── settings/          # 设置页面
│   │   ├── login/             # 登录页面
│   │   ├── register/          # 注册页面
│   │   ├── detail/[id]/       # 详情页面（动态路由）
│   │   └── compare/           # 模型对比页面
│   ├── components/            # 可复用组件
│   │   └── Header.tsx         # 导航头部
│   ├── lib/                   # 工具函数和服务
│   │   ├── api.ts            # API 服务层
│   │   ├── utils.ts          # 工具函数
│   │   └── i18n/             # 国际化
│   │       ├── LanguageContext.tsx
│   │       └── translations.ts
│   └── types/                 # TypeScript 类型定义
│       └── index.ts
├── public/                    # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 页面说明

### 首页 (`/`)
- 搜索和图片上传
- 瀑布流展示最近工作区
- 无限滚动懒加载
- 置顶按钮

### 分析页面 (`/analyze`)
- 图片上传（文件或 URL）
- AI 模型选择
- 颜色提取
- 风格分析
- Prompt 生成
- 保存到历史记录

### 素材库 (`/library`)
- 已保存素材标签页
- 历史记录标签页
- 网格/列表视图切换
- 搜索和标签筛选

### 设置页面 (`/settings`)
- AI 模型配置
- API Key 管理
- 启用/禁用模型

### 详情页面 (`/detail/[id]`)
- 查看分析结果
- 复制 Markdown/CSS/Prompt
- 颜色面板
- 风格标签

### 对比页面 (`/compare`)
- 多模型同时生成
- 并行对比结果
- 生成时间统计

### 认证页面 (`/login`, `/register`)
- 用户登录
- 用户注册
- 密码验证

## 配置 AI 模型

1. 访问设置页面 (`/settings`)
2. 点击"添加新模型"
3. 填写模型信息：
   - 显示名称
   - 模型名称（如 `gpt-4o`）
   - Base URL（如 `https://api.openai.com/v1`）
   - API Key
4. 保存并启用

支持的模型：
- OpenAI (GPT-4o, GPT-4 Vision)
- DeepSeek
- OneAPI
- 本地 LLM

## 数据存储

应用使用 localStorage 存储：
- `ai_models`: AI 模型配置
- `analysis_history`: 分析历史记录（最多 50 条）
- `saved_assets`: 已保存的素材
- `user`: 用户信息

## 部署到 Vercel

### 方法 1: 通过 Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### 方法 2: 通过 Git

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

### 环境变量配置

在 Vercel 项目设置中添加：
- `NEXT_PUBLIC_API_URL`: 后端 API 地址

## 开发说明

### 添加新页面

1. 在 `src/app/` 下创建文件夹
2. 添加 `page.tsx` 文件
3. 使用 `'use client'` 指令（如需客户端功能）

### 添加新组件

1. 在 `src/components/` 下创建组件文件
2. 导出组件
3. 在页面中导入使用

### 添加新 API

1. 在 `src/lib/api.ts` 中添加函数
2. 使用 TypeScript 类型定义
3. 处理错误和响应

### 添加翻译

1. 编辑 `src/lib/i18n/translations.ts`
2. 添加中英文键值对
3. 使用 `t('key')` 访问

## 常见问题

### Q: 为什么图片不显示？
A: 检查图片 URL 是否正确，或者后端服务是否运行。

### Q: 如何清除历史记录？
A: 打开浏览器开发者工具，清除 localStorage。

### Q: 模型配置保存在哪里？
A: 保存在浏览器的 localStorage 中，不会上传到服务器。

### Q: 支持哪些图片格式？
A: 支持 JPG, PNG, WebP 等常见格式。

## 性能优化

- 使用 Next.js Image 组件优化图片加载
- 实现虚拟滚动减少 DOM 节点
- 使用 React.memo 避免不必要的重渲染
- 懒加载非关键组件

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
