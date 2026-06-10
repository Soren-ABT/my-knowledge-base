# 🎵 Soren's 知识库与博客

<img align='right' src='public/favicon.svg' width='180px' alt="logo">

基于 [Astro 6](https://astro.build) 和 [Tailwind CSS 4](https://tailwindcss.com) 构建的超高性能个人知识库与博客。内置专业 Hi-Res 音乐播放器（Web Audio API DSP 信号链路）、OKLCH 动态主题系统、Three.js 3D 交互欢迎页和全文搜索。

[![Node.js >= 18](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen?logo=nodedotjs)](https://nodejs.org/)
[![Astro 6](https://img.shields.io/badge/Astro-6.4.3-%23FF5D01?logo=astro)](https://astro.build)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.1.6-%2306B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-green.svg)](LICENSE)

[**🖥️ 在线预览**](https://soren-abt.github.io) | [**📝 使用指南**](https://soren-abt.github.io/posts/website-user-guide/) | [**📚 文章列表**](https://soren-abt.github.io/posts/)

🌏 **README 语言:**
[**English**](./README.md) / [**中文**](./README.zh.md) / [**日本語**](./README.ja.md) / [**繁體中文**](./README.tw.md) /

从博客文章、知识库笔记到沉浸式音乐聆听，这个项目汇集了学生和开发者构建个人网站所需的一切。无论你是想写 LaTeX 数学笔记、整理学习资料，还是享受高保真音频，都能在这里找到完美的零成本方案。

---

## ✨ 功能特性

### 🎨 设计与界面

- [x] 基于 [Astro 6](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com)，使用 OKLCH 色彩空间
- [x] 流畅的页面过渡动画（Astro [View Transitions](https://docs.astro.build/en/guides/view-transitions/)）
- [x] 明暗双主题，自动跟随系统偏好
- [x] 动态色相滑块 —— 一个 CSS 变量控制全站色调
- [x] 全屏壁纸轮播 + 毛玻璃卡片效果
- [x] 樱花粒子飘落动画（Canvas，可开关）
- [x] 欢迎页自定义鼠标光标（悬停特效）
- [x] 全设备响应式设计

### 🎼 音乐播放器

- [x] Web Audio API DSP 信号链路：`ReplayGain → Headroom → Compressor → Crossfeed → Analyser`
- [x] 支持 20+ 音频格式：FLAC、ALAC、WAV、AIFF、WavPack、APE、TAK、TTA、MP3、AAC、Opus、OGG 等
- [x] 自动品质分级：Studio Master / Hi-Res / CD 质量 / 标准无损
- [x] Roon 风格沉浸式全屏播放，模糊封面背景
- [x] Apple Music 风格音乐库浏览器：按专辑、艺术家、流派、年份浏览
- [x] 从音频文件元数据自动提取专辑封面
- [x] ReplayGain 回放增益（曲目/专辑响度标准化）
- [x] EQ 预设：Off、Classical、Rock、Jazz、Headphones、Voice
- [x] 最近播放历史，过期条目自动清理
- [x] 收藏夹与播放队列管理

### 🔍 内容与搜索

- [x] Markdown/MDX 写作，Zod 类型校验内容集合
- [x] 增强代码块（[Expressive Code](https://expressive-code.com/)）：行号、复制按钮、可折叠
- [x] LaTeX 数学公式：KaTeX（服务端）+ MathJax 3（客户端回退）
- [x] Mermaid 图表，自动跟随明暗主题
- [x] GitHub 风格提示框：`:::note`、`:::tip`、`:::important`、`:::caution`、`:::warning`
- [x] GitHub 仓库卡片：`:github[用户/仓库]` 语法
- [x] 图片自定义宽度与居中：`![描述 w-400 center](url)`
- [x] Pagefind 静态全文搜索，支持中文分词
- [x] 阅读时间估算（中文 400 字/分，英文 200 词/分）
- [x] 自动生成浮动目录，滚动位置追踪
- [x] RSS 2.0 订阅源

### 🛠 技术特性

- [x] 默认零 JS 输出（Islands Architecture）
- [x] OG 图片自动生成（Satori：JSX → SVG → PNG）
- [x] JSON-LD 结构化数据（SEO）
- [x] 草稿系统（开发可见，生产隐藏）
- [x] 页面间阅读位置恢复
- [x] 回到顶部按钮（环形进度指示器）
- [x] 图片灯箱（键盘导航）
- [x] 链接预览卡片（悬停触发）
- [x] 自定义 remark/rehype 插件管道（12 个插件）

### 🏠 欢迎页

- [x] Three.js 线框几何体，鼠标视差交互
- [x] 自定义光标（隐藏系统光标，6px 彩色圆点 + 辉光）
- [x] 时间感知问候语（打字机效果）
- [x] 站点标题逐字入场动画
- [x] 3D 场景日夜模式切换

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | >= 18（推荐 LTS） |
| npm | >= 9 |

### 安装

```bash
# 1. 克隆项目
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base

# 2. 安装依赖
npm install

# 3. （可选）放入音乐文件
# 将音频文件放入 public/assets/music/url/
# 支持格式：.mp3 .flac .m4a .ogg .wav .wma .aiff .ape .wv .opus .aac .mpc .mp4 .alac .tak .tta .ac3 .dts
# 注意：不支持 DSD（.dsf/.dff），扫描器会自动跳过

# 4. 扫描音乐并生成播放列表
npm run scan-music

# 5. 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 撰写文章

```bash
# 创建新文章（手动）
# 在 src/content/posts/ 中添加 .md 文件，包含 frontmatter：

---
title: "我的第一篇文章"
published: 2026-06-10
description: "用于 SEO 和预览的简短描述"
tags: ["技术", "教程"]
category: "技术"
draft: false
pinned: false
---
```

知识库文档放在 `src/content/docs/files/` 目录下。

---

## 📝 文章 Frontmatter

```yaml
---
title: "文章标题"                   # 必填
published: 2026-06-10               # 必填
updated: 2026-06-10                 # 选填
description: "SEO 描述"              # 推荐
image: "./cover.jpg"                # 选填，封面图
tags: ["标签1", "标签2"]            # 默认: []
category: "技术"                     # 选填
draft: false                        # true = 生产环境隐藏
pinned: false                       # true = 置顶
---
```

### 草稿系统

草稿文章在开发模式（`npm run dev`）下可见，生产构建时自动隐藏。适合在发布前慢慢打磨文章。

---

## ⚡ 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 扫描音乐 + 启动开发服务器（`localhost:3000`） |
| `npm run build` | 扫描音乐 + 生产构建 + Pagefind 搜索索引 |
| `npm run preview` | 本地预览生产版本 |
| `npm run scan-music` | 仅扫描音乐文件，生成播放列表 |
| `npm run scan-music:watch` | 持续监听音乐目录变化，自动更新 |

---

## 🎼 音乐播放器

### 信号链路

```
MediaElement → Gain(ReplayGain) → Gain(Headroom -3dB) → DynamicsCompressor
  → [Crossfeed Split] → Analyser → Destination
```

### 品质分级

| 级别 | 标准 | 徽章 |
|------|------|------|
| Studio Master | > 96kHz / 24bit | SM |
| Hi-Res 无损 | > 48kHz / 24bit | HR |
| CD 质量 | 44.1kHz / 16bit | CD |
| 标准无损 | 44.1kHz / 16bit（其他格式） | — |
| 高码率有损 | > 256kbps | — |
| 标准有损 | > 128kbps | — |
| 低码率有损 | < 128kbps | — |

### 添加音乐

1. 将音频文件放入 `public/assets/music/url/`
2. 运行 `npm run scan-music`
3. 封面自动提取到 `public/assets/music/cover/`
4. 播放列表生成到 `public/api/music-playlist.json`

扫描器使用 `music-metadata` 库读取嵌入的元数据（标题、艺术家、专辑、年份、流派、作曲者、曲目号、ReplayGain）。格式检测使用 magic bytes，不依赖文件扩展名。

---

## 📁 项目结构

```
my-knowledge-base/
├── public/
│   ├── assets/
│   │   ├── font/                        # 自托管字体（woff2）
│   │   ├── music/
│   │   │   ├── url/                     # 音频文件（在此放入音乐）
│   │   │   └── cover/                   # 封面图（自动提取）
│   │   └── wallpaper/                   # 桌面 + 移动端壁纸
│   ├── api/
│   │   └── music-playlist.json          # 播放列表 API（自动生成）
│   └── js/                              # 客户端脚本
│       ├── app.js                       # 主应用逻辑
│       ├── music-player.js              # 音频引擎（Web Audio API）
│       ├── music-player-library.js      # 音乐库浏览器 UI
│       ├── music-player-eq-presets.js   # 均衡器预设
│       ├── music-player-decoder.js      # 格式解码器信息
│       ├── music-player-lyrics.js       # 歌词显示
│       ├── sakura.js                    # 樱花粒子效果
│       ├── welcome-3d.js                # Three.js 3D 场景
│       └── mermaid-render.js            # Mermaid 图表渲染
├── scripts/
│   ├── scan-music.mjs                   # 音乐元数据扫描器
│   ├── audio-decoder.mjs                # 音频格式知识库
│   └── tag-reader.mjs                   # 标签读取与规范化
├── src/
│   ├── components/                      # Astro 组件（18 个文件）
│   │   └── MusicPlayer.astro            # 完整音乐播放器 UI
│   ├── config/                          # 站点配置（9 个文件）
│   │   └── musicPlaylist.generated.ts   # 播放列表 TS（自动生成）
│   ├── content/
│   │   ├── posts/                       # 博客文章（*.md）
│   │   └── docs/files/                  # 知识库文档
│   ├── content.config.ts                # Zod 内容校验
│   ├── layouts/
│   │   ├── Layout.astro                 # 主布局（所有内容页）
│   │   └── WelcomeLayout.astro          # 欢迎页布局
│   ├── pages/                           # 路由页面（12 个文件）
│   ├── plugins/                         # Remark/Rehype 插件（12 个文件）
│   ├── styles/                          # CSS 设计系统（7 层）
│   └── types/                           # TypeScript 类型定义
├── astro.config.ts                      # Astro 配置
├── pagefind.yml                         # 搜索引擎配置
├── vercel.json                          # Vercel 部署与安全头
└── package.json
```

---

## 🎯 配置指南

### Astro 配置

编辑 `astro.config.ts` 自定义站点 URL、集成、Markdown 插件和 Vite 选项。配置文件按功能分块，注释详尽。

### 站点配置

编辑 `src/config/` 下的文件：
- 站点元数据（标题、描述、作者）
- 导航链接
- 社交链接
- 主题默认值

### CSS 设计令牌

所有颜色由单个 `--hue` CSS 变量通过 OKLCH 色彩空间派生。改变一个数字即可重新着色整个网站：

```css
:root {
  --hue: 250; /* 默认为紫蓝色 */
  --primary: oklch(65% 0.25 var(--hue));
}
```

---

## 🚀 部署

### GitHub Pages（免费）

仓库已包含 GitHub Actions 工作流。推送到 `master` 分支后自动构建并部署到 `gh-pages`。

配置：`astro.config.ts` → `site` + `base`，然后在仓库 Settings → Pages 中启用。

### Vercel（免费 CDN）

```bash
npm i -g vercel
vercel
```

Vercel 提供全球 CDN 加速和自动 HTTPS。免费额度 100GB 带宽/月，个人博客绰绰有余。

### 环境变量

无需任何环境变量。项目零配置即可部署运行。

---

## 🧩 Markdown 扩展

除标准 GitHub Flavored Markdown 外，本项目还支持：

| 扩展 | 语法 | 说明 |
|------|------|------|
| 提示框 | `:::note` / `:::warning` 等 | 5 种样式的提示框 |
| 数学公式 | `$E=mc^2$` / `$$\int$$` | LaTeX 公式（KaTeX + MathJax） |
| 图表 | ` ```mermaid ` | 流程图、时序图、甘特图 |
| GitHub 卡片 | `:github[用户/仓库]` | 仓库信息卡片 |
| 图片宽度 | `![描述 w-400 center](url)` | 自定义宽度与居中 |
| 代码块 | ` ```语言 ` | 行号、复制、可折叠 |

完整参考见 [Markdown 写作指南](https://soren-abt.github.io/posts/markdown-guide/)。

---

## 🏗 架构概览

```
构建时：
  Markdown → remark 插件 → rehype 插件 → HTML
              │                            │
              └── 阅读时间、数学公式、      └── 组件、语法高亮、
                  指令解析、Mermaid             表格包裹、图片处理

  scan-music.mjs → music-metadata → FLAC 标签
    → musicPlaylist.generated.ts（服务端）
    → music-playlist.json（客户端 API）
    → 封面图提取

运行时：
  app.js: 导航栏滚动、搜索弹窗、图片灯箱、设置面板、
          回到顶部、进度条、链接预览、键盘快捷键

  music-player.js: Web Audio API DSP 链路、HTML5 Audio 元素、
                   状态管理、发布-订阅广播

  welcome-3d.js: Three.js 场景、鼠标视差、缩放、日夜模式
```

---

## 🌟 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` / `/` | 打开搜索 |
| `Ctrl+D` | 切换明暗主题 |
| `Ctrl+↑` | 回到顶部 |
| `?` | 显示所有快捷键 |
| `Esc` | 关闭弹窗 / 面板 |

**音乐播放器（音乐库打开时）：**

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `Alt+←` / `Cmd+←` | 上一曲 |
| `Alt+→` / `Cmd+→` | 下一曲 |
| `Esc` | 关闭音乐库 |

完整列表见 [网站使用指南](https://soren-abt.github.io/posts/website-user-guide/)。

---

## 🙏 致谢

- 框架：[Astro](https://astro.build) — 最好的静态站点框架
- 字体：[霞鹜文楷](https://github.com/lxgw/LxgwWenKai)（正文）、JetBrains Mono Nerd Font（代码）
- 数学：[KaTeX](https://katex.org) + [MathJax](https://www.mathjax.org)
- 搜索：[Pagefind](https://pagefind.app)
- 灵感：Roon（音乐 UI）、Apple Music（音乐库浏览器）、foobar2000（DSP）

---

## 📄 许可证

内容：[CC BY-NC-SA 4.0](LICENSE) — 欢迎引用和分享，请注明出处。

代码：MIT — 使用、修改、学习皆可。

---

⭐ 如果这个项目对你有帮助，请给一个 Star！
