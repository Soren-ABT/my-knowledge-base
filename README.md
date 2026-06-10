<div align="center">

<img src="public/favicon.svg" alt="logo" width="80" height="80" />

# Soren's Knowledge Base & Blog

*A blazing-fast personal knowledge base & blog, powered by Astro 6 & Tailwind CSS 4*

[![GitHub Stars](https://img.shields.io/github/stars/Soren-ABT/my-knowledge-base?style=for-the-badge&logo=github&color=blue)](https://github.com/Soren-ABT/my-knowledge-base/stargazers)
[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-green?style=for-the-badge)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-6-%23FF5D01?style=for-the-badge&logo=astro)](https://astro.build)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-%2306B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-%23222222?style=for-the-badge&logo=githubpages)](https://soren-abt.github.io)

**Live:** [soren-abt.github.io](https://soren-abt.github.io) · **Docs:** [Website User Guide](https://soren-abt.github.io/posts/website-user-guide/)

</div>

---

<div align="center">

## README Language

[**English**](#english) &nbsp;·&nbsp;
[**简体中文**](#简体中文) &nbsp;·&nbsp;
[**繁體中文**](#繁體中文) &nbsp;·&nbsp;
[**日本語**](#日本語)

</div>

---

## English

> A personal knowledge base and blog with Markdown/MDX writing, KaTeX math rendering, Mermaid diagrams, and a built-in Hi-Res music player with Web Audio API DSP pipeline.

### Quick Start

```bash
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Features

| Feature | Description |
|---------|-------------|
| Blog & KB | Markdown/MDX writing with Zod-typed content collections |
| Math | KaTeX (server-side) + MathJax 3 (client fallback) |
| Diagrams | Mermaid with auto light/dark theme switching |
| Code | Expressive Code highlighting with line numbers & copy button |
| Search | Pagefind static full-text search (CJK-aware) |
| Music | Web Audio API player with ReplayGain, compressor, crossfeed |
| Theme | OKLCH dynamic hue system with light/dark mode |
| 3D | Three.js wireframe geometry on welcome page |
| SEO | Open Graph, Twitter Cards, JSON-LD, Sitemap, RSS |
| Deploy | GitHub Pages + Vercel CDN |

### Music Player

```
Signal Chain: MediaElement → ReplayGain → Headroom(-3dB) → Compressor → Crossfeed → Analyser → Output
```

**Supported formats:** FLAC, ALAC, WAV, AIFF, WavPack, Monkey's Audio, TAK, TTA, MP3, AAC, Ogg Vorbis, Opus, Musepack, WMA, AC3, DTS (~20+ formats)

**Quality tiers:** Studio Master (>96kHz/24bit) · Hi-Res (>48kHz/24bit) · CD Quality · Standard Lossless · High-bitrate Lossy

> DSD (.dsf/.dff) is not supported. The scanner automatically skips them.

**Adding music:** Place audio files in `public/assets/music/url/`, then run:
```bash
npm run scan-music        # Scan once
npm run scan-music:watch  # Watch for changes
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Scan music + start dev server |
| `npm run build` | Scan music + production build + Pagefind index |
| `npm run preview` | Preview production build |
| `npm run scan-music` | Scan music files only |
| `npm run scan-music:watch` | Watch music directory for changes |

### Project Structure

```
/
├── public/
│   ├── assets/music/
│   │   ├── url/              ← Audio files (place your music here)
│   │   └── cover/            ← Cover art (auto-extracted)
│   ├── api/music-playlist.json  ← Playlist API (auto-generated)
│   └── js/                   ← Client-side scripts
├── scripts/
│   ├── scan-music.mjs        ← Music metadata scanner
│   ├── audio-decoder.mjs     ← Audio format decoder
│   └── tag-reader.mjs        ← Tag reader & normalizer
├── src/
│   ├── components/           ← Astro components
│   ├── config/               ← Site configuration
│   ├── content/              ← Markdown/MDX content
│   ├── layouts/              ← Page layouts
│   ├── pages/                ← Route pages
│   ├── plugins/              ← Remark/Rehype plugins
│   ├── styles/               ← CSS design system
│   └── types/                ← TypeScript type definitions
├── astro.config.ts           ← Astro configuration
└── package.json
```

### Tech Stack

- **Framework:** [Astro](https://astro.build) v6
- **Styling:** [Tailwind CSS](https://tailwindcss.com) v4 + OKLCH
- **Content:** MDX + Remark/Rehype plugin pipeline
- **Math:** KaTeX + MathJax 3
- **Diagrams:** Mermaid
- **Code:** Expressive Code (Shiki-based)
- **Search:** Pagefind
- **Audio:** music-metadata + Web Audio API
- **Deploy:** GitHub Pages / Vercel

### Requirements

| Dependency | Version |
|------------|---------|
| Node.js | >= 18 (LTS recommended) |
| npm | >= 9 |

---

## 简体中文

> 个人知识库与博客，支持 Markdown/MDX 写作、KaTeX 数学公式、Mermaid 图表，内置 Hi-Res 无损音乐播放器。

### 快速开始

```bash
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 功能特性

| 功能 | 说明 |
|------|------|
| 博客 & 知识库 | Markdown/MDX 写作，Zod 类型校验 |
| 数学公式 | KaTeX（服务端）+ MathJax 3（客户端回退） |
| 图表 | Mermaid，自动跟随明暗主题 |
| 代码高亮 | Expressive Code，行号 + 复制按钮 + 可折叠 |
| 搜索 | Pagefind 静态全文搜索，支持中文分词 |
| 音乐播放器 | Web Audio API，ReplayGain + 压缩器 + Crossfeed |
| 主题系统 | OKLCH 动态色相，明暗双主题 |
| 3D 欢迎页 | Three.js 线框几何体交互场景 |
| SEO | Open Graph、Twitter Cards、JSON-LD、Sitemap、RSS |
| 部署 | GitHub Pages + Vercel CDN |

### 音乐播放器

```
信号链路：MediaElement → ReplayGain → Headroom(-3dB) → Compressor → Crossfeed → Analyser → Output
```

**支持格式：** FLAC、ALAC、WAV、AIFF、WavPack、Monkey's Audio、TAK、TTA、MP3、AAC、Ogg Vorbis、Opus、Musepack、WMA、AC3、DTS（共 20+ 格式）

**品质分级：** Studio Master（>96kHz/24bit）· Hi-Res（>48kHz/24bit）· CD 质量 · 标准无损 · 高码率有损

> 不支持 DSD（.dsf/.dff），扫描器会自动跳过。

**添加音乐：** 将音频文件放入 `public/assets/music/url/`，然后运行：
```bash
npm run scan-music        # 扫描一次
npm run scan-music:watch  # 持续监听变化
```

### 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 扫描音乐 + 启动开发服务器 |
| `npm run build` | 扫描音乐 + 生产构建 + Pagefind 索引 |
| `npm run preview` | 预览生产版本 |
| `npm run scan-music` | 仅扫描音乐文件 |
| `npm run scan-music:watch` | 监听音乐目录变化 |

### 目录结构

```
/
├── public/
│   ├── assets/music/
│   │   ├── url/              ← 音乐文件（在此放入音频）
│   │   └── cover/            ← 封面图（自动提取）
│   ├── api/music-playlist.json  ← 播放列表 API（自动生成）
│   └── js/                   ← 客户端脚本
├── scripts/
│   ├── scan-music.mjs        ← 音乐元数据扫描器
│   ├── audio-decoder.mjs     ← 音频格式解码器
│   └── tag-reader.mjs        ← 标签读取与规范化
├── src/
│   ├── components/           ← Astro 组件
│   ├── config/               ← 站点配置
│   ├── content/              ← Markdown/MDX 内容
│   ├── layouts/              ← 页面布局
│   ├── pages/                ← 路由页面
│   ├── plugins/              ← Remark/Rehype 插件
│   ├── styles/               ← CSS 设计系统
│   └── types/                ← TypeScript 类型定义
├── astro.config.ts           ← Astro 配置
└── package.json
```

### 技术栈

- **框架：** [Astro](https://astro.build) v6
- **样式：** [Tailwind CSS](https://tailwindcss.com) v4 + OKLCH
- **内容：** MDX + Remark/Rehype 插件管道
- **数学：** KaTeX + MathJax 3
- **图表：** Mermaid
- **代码高亮：** Expressive Code（基于 Shiki）
- **搜索：** Pagefind
- **音频：** music-metadata + Web Audio API
- **部署：** GitHub Pages / Vercel

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | >= 18（推荐 LTS） |
| npm | >= 9 |

---

## 繁體中文

> 個人知識庫與部落格，支援 Markdown/MDX 寫作、KaTeX 數學公式、Mermaid 圖表，內建 Hi-Res 無損音樂播放器。

### 快速開始

```bash
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:3000`。

### 功能特性

| 功能 | 說明 |
|------|------|
| 部落格 & 知識庫 | Markdown/MDX 寫作，Zod 型別校驗 |
| 數學公式 | KaTeX（伺服器端）+ MathJax 3（客戶端回退） |
| 圖表 | Mermaid，自動跟隨明暗主題 |
| 程式碼高亮 | Expressive Code，行號 + 複製按鈕 + 可折疊 |
| 搜尋 | Pagefind 靜態全文搜尋，支援中文分詞 |
| 音樂播放器 | Web Audio API，ReplayGain + 壓縮器 + Crossfeed |
| 主題系統 | OKLCH 動態色相，明暗雙主題 |
| 3D 歡迎頁 | Three.js 線框幾何體互動場景 |
| SEO | Open Graph、Twitter Cards、JSON-LD、Sitemap、RSS |
| 部署 | GitHub Pages + Vercel CDN |

### 音樂播放器

```
訊號鏈路：MediaElement → ReplayGain → Headroom(-3dB) → Compressor → Crossfeed → Analyser → Output
```

**支援格式：** FLAC、ALAC、WAV、AIFF、WavPack、Monkey's Audio、TAK、TTA、MP3、AAC、Ogg Vorbis、Opus、Musepack、WMA、AC3、DTS（共 20+ 格式）

**品質分級：** Studio Master（>96kHz/24bit）· Hi-Res（>48kHz/24bit）· CD 品質 · 標準無損 · 高碼率有損

> 不支援 DSD（.dsf/.dff），掃描器會自動跳過。

**新增音樂：** 將音訊檔案放入 `public/assets/music/url/`，然後執行：
```bash
npm run scan-music        # 掃描一次
npm run scan-music:watch  # 持續監聽變化
```

### 命令

| 命令 | 說明 |
|------|------|
| `npm run dev` | 掃描音樂 + 啟動開發伺服器 |
| `npm run build` | 掃描音樂 + 生產建構 + Pagefind 索引 |
| `npm run preview` | 預覽生產版本 |
| `npm run scan-music` | 僅掃描音樂檔案 |
| `npm run scan-music:watch` | 監聽音樂目錄變化 |

### 目錄結構

```
/
├── public/
│   ├── assets/music/
│   │   ├── url/              ← 音樂檔案（在此放入音訊）
│   │   └── cover/            ← 封面圖（自動提取）
│   ├── api/music-playlist.json  ← 播放清單 API（自動生成）
│   └── js/                   ← 客戶端指令碼
├── scripts/
│   ├── scan-music.mjs        ← 音樂元資料掃描器
│   ├── audio-decoder.mjs     ← 音訊格式解碼器
│   └── tag-reader.mjs        ← 標籤讀取與規範化
├── src/
│   ├── components/           ← Astro 元件
│   ├── config/               ← 網站設定
│   ├── content/              ← Markdown/MDX 內容
│   ├── layouts/              ← 頁面佈局
│   ├── pages/                ← 路由頁面
│   ├── plugins/              ← Remark/Rehype 外掛
│   ├── styles/               ← CSS 設計系統
│   └── types/                ← TypeScript 型別定義
├── astro.config.ts           ← Astro 設定
└── package.json
```

### 技術棧

- **框架：** [Astro](https://astro.build) v6
- **樣式：** [Tailwind CSS](https://tailwindcss.com) v4 + OKLCH
- **內容：** MDX + Remark/Rehype 外掛管道
- **數學：** KaTeX + MathJax 3
- **圖表：** Mermaid
- **程式碼高亮：** Expressive Code（基於 Shiki）
- **搜尋：** Pagefind
- **音訊：** music-metadata + Web Audio API
- **部署：** GitHub Pages / Vercel

### 環境要求

| 依賴 | 版本 |
|------|------|
| Node.js | >= 18（推薦 LTS） |
| npm | >= 9 |

---

## 日本語

> Markdown/MDX 執筆、KaTeX 数式レンダリング、Mermaid 図表、Web Audio API DSP パイプライン搭載の Hi-Res 音楽プレーヤーを内蔵した個人ナレッジベース＆ブログ。

### クイックスタート

```bash
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

### 機能

| 機能 | 説明 |
|------|------|
| ブログ＆KB | Markdown/MDX 執筆、Zod 型付きコンテンツコレクション |
| 数式 | KaTeX（サーバーサイド）+ MathJax 3（クライアントフォールバック） |
| 図表 | Mermaid（ライト/ダークテーマ自動切替） |
| コード | Expressive Code ハイライト（行番号＋コピーボタン） |
| 検索 | Pagefind 静的全文検索（中国語分詞対応） |
| 音楽 | Web Audio API 再生（ReplayGain ＋コンプレッサー＋クロスフィード） |
| テーマ | OKLCH 動的色相システム（ライト/ダークモード） |
| 3D | Three.js ワイヤーフレームジオメトリ（ウェルカムページ） |
| SEO | Open Graph、Twitter Cards、JSON-LD、サイトマップ、RSS |
| デプロイ | GitHub Pages + Vercel CDN |

### 音楽プレーヤー

```
信号経路：MediaElement → ReplayGain → Headroom(-3dB) → Compressor → Crossfeed → Analyser → Output
```

**対応形式：** FLAC、ALAC、WAV、AIFF、WavPack、Monkey's Audio、TAK、TTA、MP3、AAC、Ogg Vorbis、Opus、Musepack、WMA、AC3、DTS（20 以上の形式）

**品質レベル：** Studio Master（>96kHz/24bit）· Hi-Res（>48kHz/24bit）· CD 品質 · 標準ロスレス · 高ビットレート非可逆

> DSD（.dsf/.dff）は非対応です。スキャナーは自動的にスキップします。

**音楽の追加：** 音声ファイルを `public/assets/music/url/` に配置し、以下を実行：
```bash
npm run scan-music        # 一度だけスキャン
npm run scan-music:watch  # 変更を監視
```

### コマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 音楽スキャン + 開発サーバー起動 |
| `npm run build` | 音楽スキャン + 本番ビルド + Pagefind インデックス |
| `npm run preview` | 本番ビルドのプレビュー |
| `npm run scan-music` | 音楽ファイルのみスキャン |
| `npm run scan-music:watch` | 音楽ディレクトリの変更を監視 |

### プロジェクト構成

```
/
├── public/
│   ├── assets/music/
│   │   ├── url/              ← 音声ファイル（ここに音楽を配置）
│   │   └── cover/            ← カバーアート（自動抽出）
│   ├── api/music-playlist.json  ← プレイリスト API（自動生成）
│   └── js/                   ← クライアントスクリプト
├── scripts/
│   ├── scan-music.mjs        ← 音楽メタデータスキャナー
│   ├── audio-decoder.mjs     ← 音声フォーマットデコーダー
│   └── tag-reader.mjs        ← タグリーダー＆正規化
├── src/
│   ├── components/           ← Astro コンポーネント
│   ├── config/               ← サイト設定
│   ├── content/              ← Markdown/MDX コンテンツ
│   ├── layouts/              ← ページレイアウト
│   ├── pages/                ← ルートページ
│   ├── plugins/              ← Remark/Rehype プラグイン
│   ├── styles/               ← CSS デザインシステム
│   └── types/                ← TypeScript 型定義
├── astro.config.ts           ← Astro 設定
└── package.json
```

### 技術スタック

- **フレームワーク:** [Astro](https://astro.build) v6
- **スタイリング:** [Tailwind CSS](https://tailwindcss.com) v4 + OKLCH
- **コンテンツ:** MDX + Remark/Rehype プラグインパイプライン
- **数式:** KaTeX + MathJax 3
- **図表:** Mermaid
- **コード:** Expressive Code（Shiki ベース）
- **検索:** Pagefind
- **音声:** music-metadata + Web Audio API
- **デプロイ:** GitHub Pages / Vercel

### 必要環境

| 依存関係 | バージョン |
|----------|------------|
| Node.js | >= 18（LTS 推奨） |
| npm | >= 9 |

---

<div align="center">

**[↑ Back to Language Selector](#readme-language)**

</div>
