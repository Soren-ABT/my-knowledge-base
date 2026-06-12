# Soren's 知識庫與部落格

<img align='right' src='public/favicon.svg' width='180px' alt="logo">

基於 [Astro 6](https://astro.build) 和 [Tailwind CSS 4](https://tailwindcss.com) 構建的超高效能個人知識庫與部落格。內建專業 Hi-Res 音樂播放器（Web Audio API DSP 訊號鏈路）、OKLCH 動態主題系統、Three.js 3D 互動歡迎頁和全文搜尋。

[![Node.js >= 18](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen?logo=nodedotjs)](https://nodejs.org/)
[![Astro 6](https://img.shields.io/badge/Astro-6.4.3-%23FF5D01?logo=astro)](https://astro.build)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.1.6-%2306B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-green.svg)](LICENSE)

[**🖥️ 線上預覽**](https://soren-abt.github.io) | [**📝 使用指南**](https://soren-abt.github.io/posts/website-user-guide/) | [**📚 文章列表**](https://soren-abt.github.io/posts/)

🌏 **README 語言：**
[**English**](./README.md) / [**中文**](./README.zh.md) / [**日本語**](./README.ja.md) / [**繁體中文**](./README.tw.md) /

從部落格文章、知識庫筆記到沉浸式音樂聆聽，這個專案匯集了學生和開發者構建個人網站所需的一切。無論你是想寫 LaTeX 數學筆記、整理學習資料，還是享受高保真音頻，都能在這裡找到完美的零成本方案。

---

## ✨ 功能特性

### 🎨 設計與介面

- [x] 基於 [Astro 6](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com)，使用 OKLCH 色彩空間
- [x] 流暢的頁面過渡動畫（Astro [View Transitions](https://docs.astro.build/en/guides/view-transitions/)）
- [x] 明暗雙主題，自動跟隨系統偏好
- [x] 動態色相滑桿 —— 一個 CSS 變數控制全站色調
- [x] 部落格首頁雙欄佈局：即時時鐘 + 音樂播放器側邊欄小工具
- [x] 全螢幕桌布輪播 + 毛玻璃卡片效果
- [x] 櫻花粒子飄落動畫（Canvas，可開關）
- [x] 歡迎頁自訂滑鼠游標（懸停特效）
- [x] 全裝置響應式設計

### 🎼 音樂播放器

- [x] Web Audio API DSP 訊號鏈路：`ReplayGain → Headroom → Compressor → Crossfeed → Analyser`
- [x] 支援 20+ 音訊格式：FLAC、ALAC、WAV、AIFF、WavPack、APE、TAK、TTA、MP3、AAC、Opus、OGG 等
- [x] 自動品質分級：Studio Master / Hi-Res / CD 品質 / 標準無損
- [x] Roon 風格沉浸式全螢幕播放，模糊封面背景
- [x] Apple Music 風格音樂庫瀏覽器：按專輯、藝術家、流派、年份瀏覽
- [x] 從音訊檔案元資料自動提取專輯封面
- [x] ReplayGain 回放增益（曲目/專輯響度標準化）
- [x] EQ 預設：Off、Classical、Rock、Jazz、Headphones、Voice
- [x] 最近播放歷史，過期條目自動清理
- [x] 收藏夾與播放佇列管理

### 🔍 內容與搜尋

- [x] Markdown/MDX 寫作，Zod 型別校驗內容集合
- [x] 增強程式碼區塊（[Expressive Code](https://expressive-code.com/)）：行號、複製按鈕、可折疊
- [x] LaTeX 數學公式：KaTeX（伺服器端）+ MathJax 3（客戶端回退）
- [x] Mermaid 圖表，自動跟隨明暗主題
- [x] GitHub 風格提示框：`:::note`、`:::tip`、`:::important`、`:::caution`、`:::warning`
- [x] GitHub 倉庫卡片：`:github[使用者/倉庫]` 語法
- [x] 圖片自訂寬度與置中：`![描述 w-400 center](url)`
- [x] Pagefind 靜態全文搜尋，支援中文分詞
- [x] 閱讀時間估算（中文 400 字/分，英文 200 詞/分）
- [x] 自動生成浮動目錄，捲動位置追蹤
- [x] RSS 2.0 訂閱源

### 🛠 技術特性

- [x] 預設零 JS 輸出（Islands Architecture）
- [x] OG 圖片自動生成（Satori：JSX → SVG → PNG）
- [x] JSON-LD 結構化資料（SEO）
- [x] 草稿系統（開發可見，生產隱藏）
- [x] 頁面間閱讀位置恢復
- [x] 回到頂部按鈕（環形進度指示器）
- [x] 圖片燈箱（鍵盤導航）
- [x] 連結預覽卡片（懸停觸發）
- [x] 自訂 remark/rehype 外掛管道（12 個外掛）

### 🏠 歡迎頁

- [x] Three.js 線框幾何體，滑鼠視差互動
- [x] 自訂游標（隱藏系統游標，6px 彩色圓點 + 輝光）
- [x] 時間感知問候語（打字機效果）
- [x] 網站標題逐字入場動畫
- [x] 3D 場景日夜模式切換

---

## 🚀 快速開始

### 環境要求

| 依賴 | 版本 |
|------|------|
| Node.js | >= 18（推薦 LTS） |
| npm | >= 9 |

### 安裝

```bash
# 1. 複製專案
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base

# 2. 安裝依賴
npm install

# 3. （可選）放入音樂檔案
# 將音訊檔案放入 public/assets/music/url/
# 支援格式：.mp3 .flac .m4a .ogg .wav .wma .aiff .ape .wv .opus .aac .mpc .mp4 .alac .tak .tta .ac3 .dts
# 注意：不支援 DSD（.dsf/.dff），掃描器會自動跳過

# 4. 掃描音樂並生成播放清單
npm run scan-music

# 5. 啟動開發伺服器
npm run dev
```

瀏覽器開啟 `http://localhost:3000`。

### 撰寫文章

```bash
# 建立新文章（手動）
# 在 src/content/posts/ 中加入 .md 檔案，包含 frontmatter：

---
title: "我的第一篇文章"
published: 2026-06-10
description: "用於 SEO 和預覽的簡短描述"
tags: ["技術", "教學"]
category: "技術"
draft: false
pinned: false
---
```

知識庫文件放在 `src/content/docs/files/` 目錄下（僅本機保留，git 已排除）。

---

## 📝 文章 Frontmatter

```yaml
---
title: "文章標題"                   # 必填
published: 2026-06-10               # 必填
updated: 2026-06-10                 # 選填
description: "SEO 描述"              # 推薦
image: "./cover.jpg"                # 選填，封面圖
tags: ["標籤1", "標籤2"]            # 預設: []
category: "技術"                     # 選填
draft: false                        # true = 生產環境隱藏
pinned: false                       # true = 置頂
---
```

### 草稿系統

草稿文章在開發模式（`npm run dev`）下可見，生產構建時自動隱藏。適合在發佈前慢慢打磨文章。

---

## ⚡ 命令

| 命令 | 說明 |
|------|------|
| `npm run dev` | 掃描音樂 + 啟動開發伺服器（`localhost:3000`） |
| `npm run build` | 掃描音樂 + 生產構建 + Pagefind 搜尋索引 |
| `npm run preview` | 本機預覽生產版本 |
| `npm run scan-music` | 僅掃描音樂檔案，生成播放清單 |
| `npm run scan-music:watch` | 持續監聽音樂目錄變化，自動更新 |

---

## 🎼 音樂播放器

### 訊號鏈路

```
MediaElement → Gain(ReplayGain) → Gain(Headroom -3dB) → DynamicsCompressor
  → [Crossfeed Split] → Analyser → Destination
```

### 品質分級

| 級別 | 標準 | 徽章 |
|------|------|------|
| Studio Master | > 96kHz / 24bit | SM |
| Hi-Res 無損 | > 48kHz / 24bit | HR |
| CD 品質 | 44.1kHz / 16bit | CD |
| 標準無損 | 44.1kHz / 16bit（其他格式） | — |
| 高碼率有損 | > 256kbps | — |
| 標準有損 | > 128kbps | — |
| 低碼率有損 | < 128kbps | — |

### 新增音樂

1. 將音訊檔案放入 `public/assets/music/url/`
2. 執行 `npm run scan-music`
3. 封面自動提取到 `public/assets/music/cover/`
4. 播放清單生成到 `public/api/music-playlist.json`

掃描器使用 `music-metadata` 庫讀取嵌入的元資料（標題、藝術家、專輯、年份、流派、作曲者、曲目號、ReplayGain）。格式檢測使用 magic bytes，不依賴檔案副檔名。

---

## 📁 專案結構

```
my-knowledge-base/
├── public/
│   ├── assets/
│   │   ├── font/                        # 自託管字型（woff2）
│   │   ├── music/
│   │   │   ├── url/                     # 音訊檔案（在此放入音樂）
│   │   │   └── cover/                   # 封面圖（自動提取）
│   │   └── wallpaper/                   # 桌面 + 行動端桌布
│   ├── api/
│   │   └── music-playlist.json          # 播放清單 API（自動生成）
│   └── js/                              # 客戶端指令碼
│       ├── app.js                       # 主應用邏輯
│       ├── music-player.js              # 音訊引擎（Web Audio API）
│       ├── music-player-library.js      # 音樂庫瀏覽器 UI
│       ├── music-player-eq-presets.js   # 等化器預設
│       ├── music-player-decoder.js      # 格式解碼器資訊
│       ├── music-player-lyrics.js       # 歌詞顯示
│       ├── now-playing.js               # 側邊欄迷你播放器
│       ├── sakura.js                    # 櫻花粒子效果
│       ├── welcome-3d.js                # Three.js 3D 場景
│       └── mermaid-render.js            # Mermaid 圖表渲染
├── scripts/
│   ├── scan-music.mjs                   # 音樂元資料掃描器
│   ├── audio-decoder.mjs                # 音訊格式知識庫
│   └── tag-reader.mjs                   # 標籤讀取與規範化
├── src/
│   ├── components/                      # Astro 元件（18 個檔案）
│   │   └── MusicPlayer.astro            # 完整音樂播放器 UI
│   ├── config/                          # 網站設定（9 個檔案）
│   │   └── musicPlaylist.generated.ts   # 播放清單 TS（自動生成）
│   ├── content/
│   │   ├── posts/                       # 部落格文章（*.md）
│   │   └── docs/                        # 知識庫（僅本機，.gitignore 排除）
│   ├── content.config.ts                # Zod 內容校驗
│   ├── layouts/
│   │   ├── Layout.astro                 # 主佈局（所有內容頁）
│   │   └── WelcomeLayout.astro          # 歡迎頁佈局
│   ├── pages/                           # 路由頁面（17 個檔案）
│   ├── plugins/                         # Remark/Rehype 外掛（12 個檔案）
│   ├── styles/                          # CSS 設計系統（元件、面板、頁面、音樂播放器）
│   └── types/                           # TypeScript 型別定義
├── astro.config.ts                      # Astro 設定
├── pagefind.yml                         # 搜尋引擎設定
├── vercel.json                          # Vercel 部署與安全標頭
└── package.json
```

---

## 🎯 設定指南

### Astro 設定

編輯 `astro.config.ts` 自訂網站 URL、整合、Markdown 外掛和 Vite 選項。設定檔按功能分塊，註解詳盡。

### 網站設定

編輯 `src/config/` 下的檔案：
- 網站元資料（標題、描述、作者）
- 導航連結
- 社交連結
- 主題預設值

### CSS 設計權杖

所有顏色由單個 `--hue` CSS 變數透過 OKLCH 色彩空間派生。改變一個數字即可重新著色整個網站：

```css
:root {
  --hue: 250; /* 預設為紫藍色 */
  --primary: oklch(65% 0.25 var(--hue));
}
```

---

## 🚀 部署

### GitHub Pages（免費）

倉庫已包含 GitHub Actions 工作流程。推送到 `master` 分支後自動構建並部署到 `gh-pages`。

設定：`astro.config.ts` → `site` + `base`，然後在倉庫 Settings → Pages 中啟用。

### Vercel（免費 CDN）

```bash
npm i -g vercel
vercel
```

Vercel 提供全球 CDN 加速和自動 HTTPS。免費額度 100GB 頻寬/月，個人部落格綽綽有餘。

### 環境變數

無需任何環境變數。專案零設定即可部署執行。

---

## 🧩 Markdown 擴展

除標準 GitHub Flavored Markdown 外，本專案還支援：

| 擴展 | 語法 | 說明 |
|------|------|------|
| 提示框 | `:::note` / `:::warning` 等 | 5 種樣式的提示框 |
| 數學公式 | `$E=mc^2$` / `$$\int$$` | LaTeX 公式（KaTeX + MathJax） |
| 圖表 | ` ```mermaid ` | 流程圖、時序圖、甘特圖 |
| GitHub 卡片 | `:github[使用者/倉庫]` | 倉庫資訊卡片 |
| 圖片寬度 | `![描述 w-400 center](url)` | 自訂寬度與置中 |
| 程式碼區塊 | ` ```語言 ` | 行號、複製、可折疊 |

完整參考見 [Markdown 寫作指南](https://soren-abt.github.io/posts/markdown-guide/)。

---

## 🏗 架構概覽

```
構建時：
  Markdown → remark 外掛 → rehype 外掛 → HTML
              │                            │
              └── 閱讀時間、數學公式、      └── 元件、語法突顯、
                  指令解析、Mermaid             表格包裹、圖片處理

  scan-music.mjs → music-metadata → FLAC 標籤
    → musicPlaylist.generated.ts（伺服器端）
    → music-playlist.json（客戶端 API）
    → 封面圖提取

執行時：
  app.js: 導航欄捲動、搜尋彈窗、圖片燈箱、設定面板、
          回到頂部、進度條、連結預覽、鍵盤快捷鍵

  music-player.js: Web Audio API DSP 鏈路、HTML5 Audio 元素、
                   狀態管理、發佈-訂閱廣播

  welcome-3d.js: Three.js 場景、滑鼠視差、縮放、日夜模式
```

---

## 🌟 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+K` / `/` | 開啟搜尋 |
| `Ctrl+D` | 切換明暗主題 |
| `Ctrl+↑` | 回到頂部 |
| `?` | 顯示所有快捷鍵 |
| `Esc` | 關閉彈窗 / 面板 |

**音樂播放器（音樂庫開啟時）：**

| 快捷鍵 | 功能 |
|--------|------|
| `Space` | 播放 / 暫停 |
| `Alt+←` / `Cmd+←` | 上一曲 |
| `Alt+→` / `Cmd+→` | 下一曲 |
| `Esc` | 關閉音樂庫 |

完整列表見 [網站使用指南](https://soren-abt.github.io/posts/website-user-guide/)。

---

## 🙏 致謝

- 框架：[Astro](https://astro.build) — 最好的靜態網站框架
- 字型：[霞鶩文楷](https://github.com/lxgw/LxgwWenKai)（正文）、JetBrains Mono Nerd Font（程式碼）
- 數學：[KaTeX](https://katex.org) + [MathJax](https://www.mathjax.org)
- 搜尋：[Pagefind](https://pagefind.app)
- 靈感：Roon（音樂 UI）、Apple Music（音樂庫瀏覽器）、foobar2000（DSP）

---

## 📄 授權條款

內容：[CC BY-NC-SA 4.0](LICENSE) — 歡迎引用和分享，請註明出處。

程式碼：MIT — 使用、修改、學習皆可。

---

⭐ 如果這個專案對你有幫助，請給一個 Star！
