---
title: 博客写作与图片接入指南
published: 2026-06-13
draft: true
---

# 博客写作与图片接入指南

## 目录

- [一、文章写作规范](#一文章写作规范)
  - [1.1 目录结构](#11-目录结构)
  - [1.2 Frontmatter 字段说明](#12-frontmatter-字段说明)
  - [1.3 标题层级与可检索性](#13-标题层级与可检索性)
  - [1.4 描述（description）—— 搜索命中的关键](#14-描述description--搜索命中的关键)
  - [1.5 标签与分类](#15-标签与分类)
  - [1.6 草稿与置顶](#16-草稿与置顶)
  - [1.7 Markdown 扩展语法一览](#17-markdown-扩展语法一览)
- [二、图片接入](#二图片接入)
  - [2.1 封面图（cover image）](#21-封面图cover-image)
  - [2.2 正文内嵌图片](#22-正文内嵌图片)
  - [2.3 图片存放位置](#23-图片存放位置)
  - [2.4 图片格式与大小建议](#24-图片格式与大小建议)
  - [2.5 图片宽度控制](#25-图片宽度控制)
  - [2.6 图片灯箱](#26-图片灯箱)
- [三、检索原理](#三检索原理)
  - [3.1 Pagefind 全文检索](#31-pagefind-全文检索)
  - [3.2 哪些内容会被索引](#32-哪些内容会被索引)
  - [3.3 SEO 与 Open Graph](#33-seo-与-open-graph)
- [附录：快速检查清单](#附录快速检查清单)

---

## 一、文章写作规范

### 1.1 目录结构

文章存放在 `src/content/posts/` 目录下，支持 `.md` 和 `.mdx` 两种格式。

```
src/content/posts/
├── hello-world.md              # 直接放在根目录
├── my-article/
│   ├── index.md                # 或者放在子目录，用 index.md
│   └── cover.jpg               # 文章专属图片可以放在同目录
└── ...
```

> **约定**：文件名即 slug（URL 路径的一部分）。`hello-world.md` → `/posts/hello-world/`，`my-article/index.md` → `/posts/my-article/`。

### 1.2 Frontmatter 字段说明

每篇文章顶部必须有 YAML 格式的 frontmatter，用 `---` 包裹。完整字段如下：

```yaml
---
title: "文章标题"                          # 必填 — 显示在页面标题、卡片、搜索结果中
published: 2026-06-12                      # 必填 — 发布日期，影响排序
updated: 2026-06-12                        # 可选 — 最后更新日期
description: "一句话概括文章内容"            # 重要 — 显示在卡片摘要和搜索结果中
image: "/assets/posts/my-cover.webp"       # 可选 — 封面图 URL
tags: ["标签1", "标签2"]                    # 可选 — 标签数组，用于分类和检索
category: "技术"                           # 可选 — 主分类（一个文章只能属于一个分类）
draft: false                              # 可选 — true 则在生产环境不显示
pinned: false                             # 可选 — true 则置顶显示
---
```

**字段详解：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | **必填** | 文章标题。越具体越好，包含关键词。 |
| `published` | date | **必填** | 发布日期，格式 `YYYY-MM-DD`。影响首页和归档排序。 |
| `updated` | date | 无 | 最后修改日期。显示为"最后更新于"。 |
| `description` | string | `""` | 文章摘要。**直接影响搜索命中**，见 [1.4 节](#14-描述description--搜索命中的关键)。 |
| `image` | string | `""` | 封面图路径。显示在卡片和文章顶部。详见 [2.1 节](#21-封面图cover-image)。 |
| `tags` | string[] | `[]` | 标签列表，用于 `/tags/` 页面聚合。 |
| `category` | string | `""` | 主分类。用于分类筛选和归档页河流的颜色编码。 |
| `draft` | boolean | `false` | 草稿。`true` 时在 `npm run build` 中不输出（dev 模式仍可见）。 |
| `pinned` | boolean | `false` | 置顶。`true` 的文章排在首页最前面。 |

### 1.3 标题层级与可检索性

文章正文内的标题层级直接影响搜索效果：

- **`# 一级标题`** — 等于文章标题，不要在正文中重复使用
- **`## 二级标题`** — 文章的主要章节（H2）。Pagefind 会给 H2 内容更高权重
- **`### 三级标题`** — 子章节（H3），同样被索引
- **`#### 四级标题`** — 细节标题，权重较低

**可检索性最佳实践：**

1. **标题要包含关键词** — 避免"介绍""总结"这类泛化标题；用"Pagefind 静态搜索原理"而非"搜索原理"
2. **H2/H3 划分清晰** — 搜索引擎按段落分组，层级越分明，检索精度越高
3. **首段包含摘要** — 第一个段落会被 Pagefind 作为上下文提取
4. **代码块内的文字不会被索引** — 不要在代码块中藏关键信息

### 1.4 描述（description）—— 搜索命中的关键

`description` 是**最重要的检索优化字段**，出现在四个位置：

1. **文章卡片** — 列表页和首页的卡片摘要
2. **页面 `<meta name="description">`** — 搜索引擎结果页的摘要文字
3. **Pagefind 搜索结果** — 搜索命中时显示的 excerpt
4. **Open Graph** — 社交媒体分享时的描述

**怎么写好 description：**

```yaml
# 差 — 太泛，没有信息量
description: "本文介绍了相关知识"

# 好 — 具体，包含关键词，描述内容
description: "用 Pagefind 为 Astro 静态博客添加全文搜索，包括索引配置、搜索框集成和中文分词优化"
```

- 长度控制在 **50-160 字**
- 包含 **2-3 个核心关键词**（用户可能搜索的词）
- **不要**照抄标题，而是补充标题没有的信息

### 1.5 标签与分类

**标签（tags）** 和 **分类（category）** 的区别：

| | 标签 | 分类 |
|---|---|---|
| 数量 | 一篇文章可有多个 | 一篇文章只有一个 |
| 用途 | 跨领域交叉索引 | 领域归属 |
| 页面 | `/tags/标签名/` | `/archive/?category=xxx` |
| 建议 | 2-5 个 | 从固定列表中选择 |

**推荐的分类列表**（与归档页时间河流的颜色编码一致）：

| 分类 | 颜色 | 适用内容 |
|------|------|---------|
| `技术` | cyan | 编程、工具、框架 |
| `生活` | violet | 日常记录、随笔 |
| `学术` | amber | 课程笔记、论文 |
| `随笔` | pink | 读书笔记、感想 |
| `项目` | emerald | 项目总结、复盘 |
| `教程` | blue | 入门教程、指南 |

标签可以自由设置，建议保持一致性（例如统一使用中文标签）。

### 1.6 草稿与置顶

```yaml
# 草稿 — dev 可见，构建时隐藏
draft: true

# 置顶 — 首页排在最前（多个置顶按日期倒序）
pinned: true
```

工作流建议：写文章时先设 `draft: true`，完成后改为 `false` 或直接删除该行。

### 1.7 Markdown 扩展语法一览

本博客在标准 Markdown 基础上支持以下扩展：

| 功能 | 语法 | 说明 |
|------|------|------|
| **提示框** | `:::note` / `:::warning` / `:::tip` / `:::danger` | 用 `:::` 包裹，以 `:::` 结束 |
| **数学公式** | `$E=mc^2$` (行内) / `$$...$$` (块级) | LaTeX 语法，KaTeX 渲染 |
| **Mermaid 图表** | ` ```mermaid ` 代码块 | 流程图、时序图、甘特图等 |
| **代码高亮** | ` ```lang ` 代码块 | 支持行号、diff 高亮、复制按钮 |
| **图片宽高** | `![描述 w-400 center](url)` | 自定义宽度和居中，见 [2.5 节](#25-图片宽度控制) |
| **脚注** | `[^1]` / `[^1]: 注释内容` | 自动渲染为页面底部脚注 |
| **表格** | `\| 列1 \| 列2 \|` | 标准 GFM 表格 |

---

## 二、图片接入

### 2.1 封面图（cover image）

每篇文章可以设置一张封面图，通过 `image` frontmatter 字段指定：

```yaml
image: "/assets/posts/my-article-cover.webp"
```

**封面图会在以下位置显示：**

1. **首页 / 文章列表** — 文章卡片上的缩略图（带 hover 放大效果）
2. **文章页顶部** — 标题下方的 banner 横幅（最大高度 420px）
3. **映像页（/gallery/）** — 照片墙的卡片图片，带倾斜相框效果
4. **Open Graph** — 社交媒体分享时的预览图
5. **JSON-LD 结构化数据** — 搜索引擎可提取

**如果文章没有封面图：**
- 文章卡片不显示图片区域
- 文章页顶部直接显示标题（无 banner）
- Open Graph 使用自动生成的 OG 图片（Satori 渲染）
- `/gallery/` 页不会收录该文章

### 2.2 正文内嵌图片

在 Markdown 正文中插入图片使用标准语法：

```markdown
![图片描述](/assets/posts/diagram.png)
```

**alt 文字（图片描述）很重要**——它会：
- 在图片加载失败时显示为替代文字
- 被 Pagefind 索引（图片附近的文字可被搜索）
- 被屏幕阅读器读取（无障碍访问）

**不推荐**直接使用外部图床 URL，原因：
- 外部链接可能失效，导致图片无法显示
- 拖慢页面加载速度
- 搜索引擎无法保证索引

### 2.3 图片存放位置

所有图片放在 `public/` 目录下。推荐按以下结构组织：

```
public/
├── assets/
│   ├── wallpaper/           # 壁纸（桌面端 + 移动端 webp）
│   │   ├── 1.webp
│   │   └── 1-mobile.webp
│   ├── font/                # 字体文件
│   ├── music/               # 音乐播放器相关
│   │   ├── cover/           # 专辑封面
│   │   └── url/             # 音频文件
│   └── posts/               # ★ 文章图片推荐放这里
│       ├── hello-world/
│       │   ├── cover.webp          # 封面图
│       │   ├── diagram.png         # 正文配图
│       │   └── screenshot.webp
│       └── getting-started/
│           └── cover.webp
└── favicon.svg
```

**路径引用规则：**

| 图片位置 | 引用路径 | 说明 |
|---------|---------|------|
| `public/assets/posts/xxx/cover.webp` | `/assets/posts/xxx/cover.webp` | **注意：不要包含 `public/` 前缀** |
| `public/favicon.svg` | `/favicon.svg` | |
| `public/assets/wallpaper/1.webp` | `/assets/wallpaper/1.webp` | |

> `public/` 目录的文件在构建时会被复制到网站根目录，所以引用路径从根 `/` 开始，**不写成 `/public/xxx`**。

**操作建议：**

1. 为每篇文章在 `public/assets/posts/<slug>/` 下创建专属文件夹
2. 封面图命名为 `cover.webp` 或 `cover.jpg`
3. 正文配图按内容命名（如 `architecture.png`、`result.webp`）
4. 路径中的 slug 和文章文件名保持一致

### 2.4 图片格式与大小建议

| 用途 | 推荐格式 | 推荐尺寸 | 推荐大小 |
|------|---------|---------|---------|
| 封面图 | WebP 或 JPEG | 宽 1200px，高任意（建议 630px 以上） | < 200KB |
| 正文配图 | WebP 或 PNG | 宽 800-1200px | < 150KB |
| 截图 | PNG | 原尺寸（不要放大） | < 300KB |
| 壁纸 | WebP | 桌面 1920x1080，移动 750x1334 | < 300KB |
| 图标/Logo | SVG | 矢量 | < 10KB |

**格式选择：**
- **WebP** — 首选，同等质量下体积最小（约 JPEG 的 60%）
- **JPEG** — 照片类图片，不透明
- **PNG** — 需要透明背景或精确像素时（如截图、图表）
- **SVG** — 图标、Logo、简单图形

**转换工具推荐：**

```bash
# 将 PNG/JPEG 转为 WebP（需要安装 ImageMagick 或 cwebp）
magick input.png -quality 85 output.webp       # ImageMagick
cwebp -q 85 input.png -o output.webp           # cwebp

# 调整图片尺寸
magick input.png -resize 1200x output.webp     # 宽度 1200px，高度自适应
```

### 2.5 图片宽度控制

本博客支持通过 alt 文字控制图片宽度和居中对齐（由 `rehype-image-width` 插件处理）：

```markdown
# 固定宽度（像素）
![描述 w-400](/assets/posts/diagram.png)

# 百分比宽度
![描述 w-80%](/assets/posts/screenshot.png)

# 居中显示
![描述 center](/assets/posts/image.png)

# 组合使用（宽度 + 居中）
![描述 w-600 center](/assets/posts/diagram.png)
![描述 w-70% center](/assets/posts/screenshot.png)
```

**渲染效果：**

`![描述 w-400 center](/assets/posts/diagram.png)` 会渲染为：

```html
<figure>
  <img src="/assets/posts/diagram.png" alt="描述"
       style="width: 400px; display: block; margin: 0 auto;" />
</figure>
```

> **提示**：如果 alt 文字中包含 `title` 属性（如 `![描述](url "这是标题")`），插件会将标题渲染为 `<figcaption>`。

### 2.6 图片灯箱

正文中的图片点击后会自动弹出灯箱（lightbox）查看大图：

- **打开** — 点击文章正文中的任意图片
- **关闭** — 点击背景、按 `Esc` 键、或点击关闭按钮
- **导航** — 灯箱打开时可用 ← → 方向键切换同一文章中所有图片
- **移动端** — 支持左右滑动切换

**不需要任何额外配置**，这是博客的全局功能。

---

## 三、检索原理

### 3.1 Pagefind 全文检索

本博客使用 **Pagefind** 作为静态全文搜索引擎。工作流程：

```
npm run build
    ↓
1. astro build  → 生成 dist/*.html 静态页面
    ↓
2. npx pagefind --site dist  → 扫描 HTML，建立搜索索引
    ↓
3. 索引文件写入 dist/pagefind/
    ↓
4. 部署到 GitHub Pages 后，浏览器端搜索（无需后端）
```

**搜索入口：**
- 导航栏搜索图标（放大镜）
- 快捷键 `Ctrl+K`
- `/search/` 页面

### 3.2 哪些内容会被索引

Pagefind 扫描构建后的 HTML 文件，**以下内容会被索引**：

- 标题文字（`<h1>` ~ `<h4>`）
- 正文段落（`<p>`）
- 列表文字（`<li>`）
- 表格内容（`<td>`, `<th>`）
- 图片的 alt 文字

**以下内容会被排除**（在 `pagefind.yml` 中配置）：

- 代码块内的文字（`<code>`, `<pre>`）
- 导航栏、页脚（`<nav>`, `<footer>`）
- Mermaid 图表渲染结果
- 音乐播放器面板
- 搜索弹窗自身

**这也就意味着：**

- 不要期待用户能搜到代码块中的变量名 → 在正文中用自然语言说明
- Mermaid 图中的文字不可搜索 → 关键结论要在正文中复述
- 导航和页脚文字不参与检索 → 不要依赖它们来提供搜索线索

### 3.3 SEO 与 Open Graph

每篇文章会自动生成以下 SEO 元数据：

| 元数据 | 来源 | 用途 |
|--------|------|------|
| `<title>` | `title` frontmatter + site title | 浏览器标签页标题 |
| `<meta name="description">` | `description` frontmatter | 搜索引擎结果摘要 |
| `og:image` | `image` frontmatter → 自动生成 OG 图 | 社交媒体分享预览 |
| `og:title` | `title` frontmatter | 社交媒体分享标题 |
| `og:description` | `description` frontmatter | 社交媒体分享描述 |
| JSON-LD | 自动生成的结构化数据 | 搜索引擎富文本结果 |

**封面图优先级**：`image` frontmatter > 自动生成的 OG 图片 (`/og/<slug>.png`) > 无图片

如果一个文章设置了 `image`，则该图片同时用于文章卡片、文章页 banner、OG 分享图和 JSON-LD。

---

## 附录：快速检查清单

发布文章前，逐一检查：

- [ ] `title` 包含核心关键词，非泛化标题
- [ ] `published` 日期格式正确（`YYYY-MM-DD`）
- [ ] `description` 已填写，50-160 字，含 2-3 个关键词
- [ ] `tags` 设置 2-5 个相关标签
- [ ] `category` 从推荐列表中选择
- [ ] 正文 H2/H3 层级清晰，标题含关键词
- [ ] 正文首段为摘要性文字（Pagefind 会提取为上下文）
- [ ] 封面图（如有）已放入 `public/assets/posts/<slug>/`
- [ ] `image` 字段路径正确（`/assets/posts/<slug>/cover.webp`）
- [ ] 正文图片已压缩（WebP 优先，< 150KB）
- [ ] 所有图片有描述性 alt 文字
- [ ] `draft: true` 已删除或改为 `false`
- [ ] 本地 `npm run dev` 预览通过
- [ ] `npm run build` 构建无报错
