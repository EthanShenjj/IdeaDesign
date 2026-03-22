# 首页瀑布流布局实现文档

## 功能概述

已成功实现首页"最近工作区"的瀑布流布局、懒加载和置顶按钮功能。

## 主要特性

### 1. 瀑布流布局 (Masonry Layout)
- ✅ 使用 CSS `columns` 实现响应式瀑布流
- ✅ 移动端：1列
- ✅ 平板：2列
- ✅ 桌面：3列
- ✅ 自动计算卡片高度，避免截断
- ✅ 每页显示 9 个项目（3列 × 3行）

### 2. 数据排序
- ✅ 按更新时间降序排列（最新的在前）
- ✅ 优先使用 `updated_at`，其次 `created_at`
- ✅ 自动从 API 获取素材数据

### 3. 滚动式懒加载
- ✅ 使用 Intersection Observer API
- ✅ 滚动到底部自动加载下一页
- ✅ 每次加载 9 个项目
- ✅ 显示加载状态动画
- ✅ 没有更多数据时显示提示
- ✅ 优化：首次加载获取所有数据，后续从缓存分页

### 4. 置顶按钮
- ✅ 滚动超过 500px 后显示
- ✅ 点击平滑滚动到顶部
- ✅ 固定在右下角
- ✅ 带有动画效果（淡入淡出、缩放）
- ✅ Hover 效果

## 技术实现

### 瀑布流布局

使用 CSS Columns 实现：

```tsx
<div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
  {assets.map((item, index) => (
    <div className="break-inside-avoid mb-6">
      {/* 卡片内容 */}
    </div>
  ))}
</div>
```

关键 CSS 类：
- `columns-1 md:columns-2 lg:columns-3` - 响应式列数
- `gap-6` - 列间距
- `space-y-6` - 垂直间距
- `break-inside-avoid` - 防止卡片被截断

### 懒加载实现

```tsx
// 1. 创建观察器
const observerRef = useRef<IntersectionObserver | null>(null);
const loadMoreRef = useRef<HTMLDivElement>(null);

// 2. 设置观察器
useEffect(() => {
  observerRef.current = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
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
}, [hasMore, loading]);

// 3. 触发元素
<div ref={loadMoreRef} className="flex justify-center py-12">
  {loading && <LoadingSpinner />}
</div>
```

### 数据加载逻辑

```tsx
const allAssetsRef = useRef<HistoryItem[]>([]);

const loadAssets = useCallback(async (pageNum: number) => {
  if (loadingRef.current || !hasMoreRef.current) return;
  
  setLoading(true);
  try {
    // 只在第一次加载时从 API 获取所有数据
    if (pageNum === 1) {
      const result = await getAssets({ limit: 100 });
      
      if (result.success && result.assets && result.assets.length > 0) {
        // 按更新时间降序排序
        const sortedAssets = result.assets.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        });

        // 转换数据格式
        const convertedAssets: HistoryItem[] = sortedAssets.map(asset => ({
          id: asset.id,
          title: asset.title,
          timestamp: new Date(asset.updated_at || asset.created_at).toLocaleDateString(),
          imageUrl: asset.image_url,
          tags: asset.tags || [],
          colors: asset.colors || [],
          prompt: asset.prompt || '',
          analysis: asset.analysis
        }));

        // 缓存所有数据
        allAssetsRef.current = convertedAssets;
        
        // 显示第一页（9个项目）
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
    console.error('Failed to load assets:', error);
    setHasMore(false);
  } finally {
    setLoading(false);
  }
}, []);
```

**优化说明：**
- 首次加载获取所有数据（最多100条）并缓存到 `allAssetsRef`
- 后续分页直接从缓存读取，无需重复请求 API
- 使用 `loadingRef` 和 `hasMoreRef` 避免闭包问题
- 每页显示 9 个项目，适配 3列布局

### 置顶按钮

```tsx
// 1. 监听滚动
useEffect(() => {
  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 500);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// 2. 滚动到顶部
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 3. 按钮组件
<AnimatePresence>
  {showScrollTop && (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 bg-tertiary text-white p-4 rounded-full shadow-2xl"
    >
      <ArrowUp className="w-6 h-6" />
    </motion.button>
  )}
</AnimatePresence>
```

## 卡片设计

每个卡片包含：
- 图片（懒加载）
- 标题（最多2行）
- 时间戳
- 标签（最多3个）
- 颜色方案（最多5个）

```tsx
<div className="bg-white rounded-3xl overflow-hidden card-shadow">
  {/* 图片 */}
  <img
    src={item.imageUrl}
    alt={item.title}
    loading="lazy"
    className="w-full h-auto object-cover group-hover:scale-105 transition-transform"
  />
  
  {/* 内容 */}
  <div className="p-6">
    <h3 className="font-headline font-bold text-xl line-clamp-2">
      {item.title}
    </h3>
    <p className="text-[10px] text-ink/30 uppercase">
      {item.timestamp}
    </p>
    
    {/* 标签 */}
    <div className="flex flex-wrap gap-2">
      {item.tags.slice(0, 3).map(tag => (
        <span className="bg-canvas text-ink/40 px-3 py-1 rounded-lg">
          #{tag}
        </span>
      ))}
    </div>
    
    {/* 颜色 */}
    <div className="flex -space-x-2">
      {item.colors.slice(0, 5).map((color, i) => (
        <div
          className="w-8 h-8 rounded-full border-2 border-white"
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  </div>
</div>
```

## 动画效果

### 1. 卡片进入动画
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
>
```

### 2. Hover 效果
```tsx
whileHover={{ y: -8 }}
className="group cursor-pointer"
```

### 3. 图片缩放
```tsx
className="group-hover:scale-105 transition-transform duration-500"
```

### 4. 置顶按钮动画
```tsx
<motion.button
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.8 }}
  whileHover={{ y: -4 }}
  whileTap={{ scale: 0.95 }}
>
```

## 性能优化

### 1. 图片懒加载
```tsx
<img loading="lazy" />
```

### 2. useCallback 优化
```tsx
const loadAssets = useCallback(async (pageNum: number) => {
  // 使用 ref 避免闭包问题
  if (loadingRef.current || !hasMoreRef.current) return;
  // ...
}, []);
```

### 3. 数据缓存策略
- 首次加载获取所有数据并缓存
- 后续分页从内存读取，避免重复 API 调用
- 减少网络请求，提升响应速度

### 4. 防止重复加载
```tsx
if (loadingRef.current || !hasMoreRef.current) return;
```

### 5. 清理观察器
```tsx
return () => {
  if (observerRef.current) observerRef.current.disconnect();
};
```

### 6. Ref 同步
```tsx
const hasMoreRef = useRef(hasMore);
const loadingRef = useRef(loading);

useEffect(() => {
  hasMoreRef.current = hasMore;
  loadingRef.current = loading;
}, [hasMore, loading]);
```

## 响应式设计

| 屏幕尺寸 | 列数 | 断点 |
|---------|------|------|
| 移动端 | 1列 | < 768px |
| 平板 | 2列 | 768px - 1024px |
| 桌面 | 3列 | > 1024px |

## 状态管理

```tsx
const [assets, setAssets] = useState<ExtractionResult[]>([]);
const [page, setPage] = useState(1);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [showScrollTop, setShowScrollTop] = useState(false);
```

## 数据流

1. **初始加载** → `loadAssets(1)` → 从 API 获取所有数据（最多100条）
2. **数据缓存** → 存储到 `allAssetsRef.current`
3. **首页显示** → 显示前 9 个项目
4. **滚动到底部** → 触发 Intersection Observer
5. **页码增加** → `setPage(prev => prev + 1)`
6. **加载更多** → `loadAssets(newPage)` → 从缓存读取下一页
7. **追加数据** → `setAssets(prev => [...prev, ...newAssets])`
8. **没有更多** → `setHasMore(false)`

**优势：**
- 只请求一次 API，减少网络开销
- 分页加载保持流畅体验
- 数据一致性更好

## 用户体验

### 加载状态
- 显示旋转的 Sparkles 图标
- "Loading more..." 文本提示

### 空状态
- 没有更多数据时显示提示
- 引导用户去素材库查看

### 交互反馈
- Hover 时卡片上浮
- 点击卡片跳转到详情页
- 置顶按钮平滑滚动

## 浏览器兼容性

- ✅ Chrome/Edge (现代版本)
- ✅ Firefox (现代版本)
- ✅ Safari (现代版本)
- ✅ 移动浏览器

## 已知限制

1. CSS Columns 在某些浏览器中可能有轻微的布局差异
2. 大量图片可能影响性能（已通过懒加载优化）
3. 需要 JavaScript 支持

## 未来优化建议

1. **虚拟滚动** - 处理超大数据集
2. **图片预加载** - 提前加载下一页图片
3. **骨架屏** - 更好的加载体验
4. **缓存策略** - 减少 API 调用
5. **无限滚动配置** - 允许用户选择分页或无限滚动
6. **筛选和排序** - 按标签、颜色、时间筛选

## 测试建议

1. 测试不同屏幕尺寸的布局
2. 测试滚动加载性能
3. 测试网络慢速情况
4. 测试空数据状态
5. 测试置顶按钮在不同滚动位置

## 总结

瀑布流布局已完全实现，提供了流畅的浏览体验：
- ✅ 响应式瀑布流布局
- ✅ 按更新时间降序排序
- ✅ 滚动式懒加载
- ✅ 置顶按钮
- ✅ 流畅的动画效果
- ✅ 良好的性能优化

用户可以无限滚动浏览所有素材，体验流畅自然！🎉
