---
title: "Astro 6 入门：构建高性能个人博客"
published: 2026-05-20
updated: 2026-06-02
description: "从零开始，使用 Astro 6 构建一个高性能、功能完整的个人博客网站。完整的技术栈选择和架构设计指南。"
tags: ["Astro", "前端", "教程"]
category: "技术"
---

## 为什么选择 Astro？

Astro 是一个专为内容驱动网站设计的现代前端框架。它的核心理念是 **"零 JS 在前端"**：

```
传统框架（Next.js / Nuxt）
  → 页面包含大量 JS Bundle
  → 首屏加载重

Astro
  → 默认渲染纯 HTML
  → 仅在需要时加载 JS
  → Lighthouse 满分
```

## 项目初始化

### 1. 创建项目

```bash
npm create astro@latest my-blog
# 选择: Empty project, TypeScript
```

### 2. 添加集成

```bash
npx astro add mdx        # MDX 支持
npx astro add sitemap    # 站点地图
npx astro add tailwind   # Tailwind CSS
npx astro add svelte     # Svelte 组件支持
```

### 3. 目录结构

```
src/
├── components/     # 组件
│   ├── Header.astro
│   ├── Footer.astro
│   └── PostCard.astro
├── layouts/        # 布局
│   └── BlogLayout.astro
├── pages/          # 路由页面
│   ├── index.astro
│   ├── posts/
│   │   └── [...slug].astro
│   ├── archive.astro
│   └── rss.xml.ts
├── content/        # 内容集合
│   └── posts/
│       └── hello-world.md
├── styles/         # 全局样式
│   └── global.css
└── config/         # 站点配置
    └── siteConfig.ts
```

## 内容集合 (Content Collections)

Astro 的内容集合系统提供了类型安全的内容管理：

```typescript
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const postsCollection = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/posts",
  }),
  schema: z.object({
    title: z.string(),
    published: z.date(),
    tags: z.array(z.string()).default([]),
    description: z.string().default(""),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
  }),
});

export const collections = { posts: postsCollection };
```

## 路由设计

| 路由 | 功能 | 文件 |
|------|------|------|
| `/` | 首页（文章列表） | `index.astro` |
| `/posts/[slug]/` | 文章详情 | `posts/[...slug].astro` |
| `/archive/` | 文章归档 | `archive.astro` |
| `/tags/` | 标签列表 | `tags/index.astro` |
| `/tags/[tag]/` | 按标签筛选 | `tags/[tag].astro` |
| `/about/` | 关于页面 | `about.astro` |
| `/rss.xml` | RSS 订阅 | `rss.xml.ts` |

## 主题系统

使用 CSS 自定义属性实现主题切换：

```css
:root {
  --color-bg: hsl(250, 5%, 98%);
  --color-text: hsl(250, 5%, 15%);
  --color-primary: hsl(250, 80%, 60%);
}

.dark {
  --color-bg: hsl(250, 10%, 10%);
  --color-text: hsl(250, 10%, 90%);
  --color-primary: hsl(250, 70%, 55%);
}
```

```javascript
// 主题切换脚本
const theme = localStorage.getItem("theme") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark" : "light");

document.documentElement.classList.toggle("dark", theme === "dark");
```

## 搜索实现

客户端搜索可以在构建时生成 JSON 索引：

```typescript
// src/pages/api/search.json.ts
export async function GET() {
  const posts = await getCollection("posts");
  const data = posts.map((p) => ({
    title: p.data.title,
    slug: p.id,
    description: p.data.description,
    tags: p.data.tags,
  }));
  return new Response(JSON.stringify(data));
}
```

## 性能优化建议

1. **图片优化** — 使用 Astro 内置的 Image 组件
2. **字体优化** — 使用 `fontsource` + 子集化
3. **预加载** — 在 `<head>` 中使用 `<link rel="prefetch">`
4. **静态生成** — 默认 output: "static"

## 部署

### Vercel（推荐）

```bash
npm i -g vercel
vercel
```

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
- name: Build
  run: npm run build
- name: Deploy
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
```

## 总结

通过 Astro，我们可以在很短的时间内搭建出一个功能完整、性能优异的个人博客。它特别适合技术人员用于记录和分享知识。

下一步可以添加：
- 评论系统 (Giscus)
- 阅读统计
- 友情链接页面
- OG Image 自动生成

Happy blogging! 🚀
