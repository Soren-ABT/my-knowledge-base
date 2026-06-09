---
title: "Astro 6 入门：构建高性能个人博客"
published: 2026-05-20
updated: 2026-06-09
description: "从零开始，使用 Astro 6 构建一个高性能、功能完整的个人博客网站。完整的技术栈选择和架构设计指南。"
tags: ["Astro", "前端", "教程"]
category: "技术"
---

## 为什么选择 Astro？

在开始写代码之前，先想清楚一个问题：**你的博客到底需不需要一个前端框架？**

大多数个人博客本质上就是文字 + 图片 + 少量交互。用 React/Vue 做一个博客，就像用卡车送一封信——卡车本身比信还重。

Astro 的核心理念是 **"零 JS 在前端"（Islands Architecture）**：

```
传统框架（Next.js / Nuxt）
  → 页面包含大量 JS Bundle（React/Vue 运行时）
  → 即使用户只阅读文字，也要下载 ~130KB JS
  → Lighthouse 评分受影响

Astro
  → 构建时渲染为纯 HTML + CSS
  → 只在需要交互的地方加载 JS（如搜索框、音乐播放器）
  → 每个"交互孤岛"独立加载，互不影响
  → Lighthouse 轻松满分
```

### Astro 适合谁？

- 个人博客、文档站、内容网站 — **完美适配**
- 需要 Markdown/MDX 写作 — **一等公民支持**
- 需要嵌入 React/Vue/Svelte 组件 — **按需引入**
- 复杂的全栈应用（实时协作等）— 不太适合，选 Next.js

对于学生来说，Astro 还有额外的好处：**学习曲线平缓**。你只需要懂 HTML、CSS 和一点 JavaScript，就能搭建出功能完整的网站。

## 项目初始化

### 环境准备

首先确保你已经安装了 Node.js（推荐 18+，LTS 版本最佳）：

```bash
node --version   # 检查 Node 版本
npm --version    # 检查 npm 版本
```

### 创建项目

```bash
npm create astro@latest my-blog
```

创建过程中会提示选择配置：

- **模板**：推荐选择 "Empty project"（从空白开始，理解每个文件的作用）
- **TypeScript**：建议开启，类型检查能避免很多低级错误
- **依赖安装**：选择 Yes

```bash
cd my-blog
npm run dev     # 启动开发服务器，默认 http://localhost:4321
```

打开浏览器访问 `http://localhost:4321`，你应该能看到 Astro 的默认欢迎页面。

### 添加集成

Astro 的集成系统让你按需添加功能：

```bash
npx astro add mdx        # MDX 支持（Markdown 中嵌入组件）
npx astro add sitemap    # 自动生成站点地图
npx astro add tailwind   # Tailwind CSS
```

每个 `astro add` 命令会自动安装依赖并更新配置文件。

### 项目目录结构

```
my-blog/
├── astro.config.ts          # Astro 配置（核心大脑）
├── package.json
├── tsconfig.json
├── public/                  # 静态资源（直接复制到构建产物）
│   ├── favicon.svg
│   └── assets/
│       └── images/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── PostCard.astro
│   ├── layouts/             # 页面布局
│   │   └── BlogLayout.astro
│   ├── pages/               # 路由页面（文件即路由）
│   │   ├── index.astro      # 首页
│   │   ├── posts/
│   │   │   └── [...slug].astro  # 动态路由
│   │   ├── archive.astro
│   │   ├── tags/
│   │   │   ├── index.astro
│   │   │   └── [tag].astro
│   │   └── rss.xml.ts
│   ├── content/             # 内容集合
│   │   └── posts/
│   │       └── hello-world.md
│   └── styles/              # 全局样式
│       └── global.css
```

理解这个结构很重要：**`src/pages/` 决定路由，`src/content/` 存放文章，`src/components/` 存放组件**。

## 内容集合：类型安全的文章管理

Astro 的内容集合系统让你以**类型安全**的方式管理 Markdown 文章。

### 定义 Schema

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
    updated: z.date().optional(),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
  }),
});

export const collections = { posts: postsCollection };
```

### Frontmatter 示例

每篇文章的顶部使用 YAML 格式的元数据：

```yaml
---
title: "我的第一篇文章"
published: 2026-06-09
description: "这是一篇示例文章"
tags: ["技术", "前端"]
category: "技术"
draft: false
---
```

### 查询文章

```astro
---
// src/pages/index.astro
import { getCollection } from "astro:content";

const allPosts = await getCollection("posts");
const publishedPosts = allPosts
  .filter(post => !post.data.draft)
  .sort((a, b) => b.data.published - a.data.published);
---

<!-- 渲染文章列表 -->
{ publishedPosts.map(post => (
  <article>
    <h2><a href={`/posts/${post.id}/`}>{post.data.title}</a></h2>
    <time>{post.data.published.toLocaleDateString()}</time>
  </article>
)) }
```

## 路由设计

Astro 使用**文件即路由**的约定。下表是一个典型博客的路由规划：

| 路由 | 文件 | 功能 |
|------|------|------|
| `/` | `pages/index.astro` | 首页（文章列表） |
| `/posts/[slug]/` | `pages/posts/[...slug].astro` | 文章详情 |
| `/archive/` | `pages/archive.astro` | 文章归档 |
| `/tags/` | `pages/tags/index.astro` | 标签云 |
| `/tags/[tag]/` | `pages/tags/[tag].astro` | 按标签筛选 |
| `/about/` | `pages/about.astro` | 关于页面 |
| `/rss.xml` | `pages/rss.xml.ts` | RSS 订阅源 |

### 动态路由

`[...slug].astro` 是 Astro 的动态路由语法，配合 `getStaticPaths()` 为每篇文章生成独立页面：

```astro
---
// src/pages/posts/[...slug].astro
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map(post => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>
  <Content />
</article>
```

## 主题系统

### CSS 自定义属性方案

使用 CSS 变量管理颜色，实现明暗主题切换：

```css
:root {
  --color-bg: hsl(250, 5%, 98%);
  --color-text: hsl(250, 5%, 15%);
  --color-primary: hsl(250, 80%, 60%);
  --color-card: hsl(0, 0%, 100%);
  --color-border: hsl(250, 10%, 90%);
}

.dark {
  --color-bg: hsl(250, 10%, 10%);
  --color-text: hsl(250, 10%, 90%);
  --color-primary: hsl(250, 70%, 55%);
  --color-card: hsl(250, 12%, 16%);
  --color-border: hsl(250, 10%, 20%);
}
```

使用变量而不是硬编码颜色值的好处是：主题切换只需要改变 CSS 类名，所有使用了变量的元素自动跟随。

### OKLCH 进阶方案

如果你想让主题色可以动态变化（比如用户自己选择色调），用 OKLCH 色彩空间比 HSL 更优：

```css
:root {
  --hue: 250; /* 一个变量控制全站色调 */
  --primary: oklch(65% 0.25 var(--hue));
  --page-bg: oklch(98% 0.005 var(--hue));
  --text: oklch(15% 0.02 var(--hue));
}
```

OKLCH 的优势是**感知均匀**——改变 `--hue` 时，颜色亮度不会突变，视觉效果自然。

### 主题切换脚本

```javascript
// 页面加载时读取用户偏好
const saved = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = saved ? saved === "dark" : prefersDark;

document.documentElement.classList.toggle("dark", isDark);

// 切换函数
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}
```

关键细节：**首次访问时尊重系统主题偏好，之后保存用户手动选择**。

## 搜索实现

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| Pagefind | 零成本、隐私友好、构建时索引 | 仅静态搜索 |
| Algolia | 功能强大、支持模糊搜索 | 需要注册、有请求限制 |
| 客户端过滤 | 最简单 | 文章多了性能差 |

对于个人博客，**Pagefind 是最佳选择**——免费、隐私友好、中文支持好。

### Pagefind 配置

```bash
npm install pagefind
```

构建后运行索引：

```bash
npx pagefind --site dist
```

`pagefind.yml` 配置：

```yaml
exclude_selectors:
  - pre        # 排除代码块
  - code
  - nav        # 排除导航
  - footer     # 排除页脚
```

### 搜索页面实现

```astro
---
// src/pages/search.astro
---

<div id="search">
  <input type="text" id="search-input" placeholder="搜索文章..." />
  <div id="search-results"></div>
</div>

<script>
  import("/pagefind/pagefind.js").then(async ({ Pagefind }) => {
    const pagefind = await Pagefind.create();
    const input = document.getElementById("search-input");

    input.addEventListener("input", async () => {
      const search = await pagefind.search(input.value);
      const results = await Promise.all(
        search.results.slice(0, 20).map(r => r.data())
      );
      // 渲染搜索结果...
    });
  });
</script>
```

## 性能优化

### 静态生成（默认）

Astro 默认 `output: "static"`，构建时生成纯 HTML。这意味着：
- 首屏加载极快（没有 JS 运行时）
- 可以部署到任何静态托管（GitHub Pages、Vercel、Netlify）
- SEO 友好（搜索引擎能直接抓取完整内容）

### 图片优化

使用 Astro 内置的 Image 组件：

```astro
---
import { Image } from "astro:assets";
import heroImage from "../assets/hero.jpg";
---

<Image src={heroImage} alt="Hero" widths={[400, 800, 1200]} loading="lazy" />
```

Astro 会自动生成多种尺寸的 WebP/AVIF 格式，并在 HTML 中使用 `<picture>` + `srcset`。

### 字体优化

```css
@font-face {
  font-family: 'MyFont';
  src: url('/assets/font/MyFont.woff2') format('woff2');
  font-display: swap;    /* 先用系统字体，加载完再无缝替换 */
  font-weight: 400;
}
```

- **woff2** 格式压缩率最高（比 woff 小 30%+）
- **font-display: swap** 防止文字不可见的白屏（FOIT）
- **自托管** 避免 Google Fonts 的额外 DNS 查询

### 构建产物分析

运行 `npm run build` 后检查 `dist/` 目录大小。如果单个 HTML 页面超过 50KB，检查是否内联了过多 CSS/JS。

## 部署

### GitHub Pages（免费）

GitHub Pages 是学生党最友好的选择——免费、无限流量、支持自定义域名。

**1. 配置 Astro：**

```typescript
// astro.config.ts
export default defineConfig({
  site: "https://你的用户名.github.io",
  base: "/",  // 如果是用户站点用 "/"，如果是项目站点用 "/仓库名/"
});
```

**2. 创建 GitHub Actions 工作流：**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build

      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**3. 仓库设置：**
- Settings → Pages → Source 选择 `gh-pages` 分支
- 等待几分钟，访问 `https://你的用户名.github.io`

### Vercel（推荐）

Vercel 提供了更好的 CDN 加速和自动 HTTPS：

```bash
npm i -g vercel
vercel
```

按照提示登录并关联仓库即可。后续每次 `git push` 会自动部署。

Vercel 免费额度对个人博客来说绰绰有余（100GB 带宽/月）。

## 常见问题与踩坑

### 开发服务器卡顿

**现象**：`npm run dev` 后页面加载很慢，甚至超时。

**可能原因**：
1. `public/` 目录下有大量大文件（如图片、音频）。Vite 会监听这些文件的变化，文件太多会导致性能问题。
2. 某个 Vite 插件与 Node 版本不兼容。

**解决**：
- 将大文件移到 `public/` 外，构建时用脚本复制
- 检查 Node 版本（推荐 20 LTS）

### View Transitions 后 JS 不生效

Astro 的 `<ClientRouter />` 在页面切换时替换 DOM 但不会重新执行 `<script>` 标签。

**解决**：监听 `astro:after-swap` 事件，在回调中重新初始化：

```javascript
document.addEventListener('astro:after-swap', () => {
  // 重新绑定事件、初始化组件等
  initSearch();
  initThemeToggle();
});
```

### 部署后图片 404

**原因**：路径问题。`/public/assets/img.png` 在代码中应该引用为 `/assets/img.png`（不含 `public`）。

**原则**：`public/` 下的文件在构建后会被复制到站点根目录，引用路径从根开始。

## 进阶方向

当你把基础博客跑起来后，可以考虑这些进阶功能：

1. **评论系统** — 使用 Giscus（基于 GitHub Discussions，免费且隐私友好）
2. **阅读统计** — 在 frontmatter 中注入字数和阅读时间
3. **OG Image 自动生成** — 使用 Satori 在构建时生成社交分享图片
4. **友情链接页面** — 手动维护一个 JSON 文件
5. **RSS 订阅** — `@astrojs/rss` 一行配置即可
6. **自定义 404 页面** — `src/pages/404.astro`

## 总结

Astro 是目前搭建内容网站的最佳选择之一，尤其适合技术人员写博客。它的零 JS 默认输出意味着优异的性能，而 Islands Architecture 让你在需要交互时也不受限制。

对于本科生来说，用 Astro 搭建个人博客不仅是一个技术实践项目，更是一个长期的知识管理工具。花一个周末搭建好，接下来的四年你可以专注于内容创作，而不是折腾工具。

下一步建议：
1. 先用默认模板搭一个能跑的版本
2. 写一两篇文章，熟悉 Content Collections 的工作流
3. 逐步添加功能（搜索 → 标签 → 主题切换 → 评论区）
4. 不要一开始就追求完美——先上线，再迭代
