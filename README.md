# My Knowledge Base

基于 [Astro](https://astro.build) 的个人知识库与博客，支持 Markdown/MDX 写作、KaTeX 数学公式、Mermaid 图表，内置 Hi-Res 音乐播放器。

## 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | `>= 22.12.0` |
| npm | `>= 9.6.5` |

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base

# 2. 安装依赖
npm install

# 3. （可选）放入音乐文件
# 将 FLAC 文件放入 public/assets/music/url/
# 支持的格式：.mp3 .flac .m4a .ogg .wav .wma .aiff .ape .wv .opus .aac .mpc .mp4 .alac .tak .tta .ac3 .dts
# 注意：DSD（.dsf/.dff）不支持

# 4. 扫描音乐并生成播放列表
npm run scan-music

# 5. 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:3000`。

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 扫描音乐 + 启动开发服务器 |
| `npm run build` | 扫描音乐 + 构建生产版本 + Pagefind 搜索索引 |
| `npm run preview` | 预览已构建的生产版本 |
| `npm run scan-music` | 仅扫描音乐文件，生成播放列表 |
| `npm run scan-music:watch` | 持续监听音乐目录变化，自动更新播放列表 |

## 目录结构

```
/
├── public/
│   ├── assets/music/
│   │   ├── url/          ← 音乐文件（在此放入音频）
│   │   └── cover/        ← 封面图（自动生成）
│   ├── api/
│   │   └── music-playlist.json  ← 音乐播放列表 API（自动生成）
│   └── js/               ← 客户端 JS
├── scripts/
│   ├── scan-music.mjs    ← 音乐扫描器
│   ├── audio-decoder.mjs ← 音频解码信息引擎
│   └── tag-reader.mjs    ← 标签读取器
├── src/
│   ├── components/       ← Astro 组件
│   ├── config/           ← 站点配置
│   │   └── musicPlaylist.generated.ts ← 播放列表（自动生成，勿手动编辑）
│   ├── content/          ← Markdown/MDX 内容
│   ├── layouts/          ← 页面布局
│   ├── pages/            ← 路由页面
│   ├── styles/           ← 全局样式
│   └── types/            ← TypeScript 类型定义
├── astro.config.ts       ← Astro 配置
├── tailwind.config.ts    ← Tailwind CSS 配置
└── package.json
```

## 音乐播放器

内置 Roon 风格 Hi-Res 音乐播放器，支持：

- **无损格式**：FLAC、ALAC、WAV、AIFF、WavPack、APE、TAK、TTA
- **有损格式**：MP3、AAC、Opus、OGG、WMA、MPC、AC3、DTS
- **Hi-Res 品质标签**：自动识别 CD 品质 / Hi-Res / Studio Master
- **ReplayGain**：支持音轨/专辑增益标准化
- **浏览器原生解码**：通过 Web Audio API 解码，无需额外插件

> 不支持 DSD（.dsf/.dff），这些格式会被扫描器自动跳过。

## 技术栈

- **框架**：[Astro](https://astro.build) v6
- **样式**：[Tailwind CSS](https://tailwindcss.com) v4
- **内容**：MDX + Remark/Rehype 插件
- **数学**：KaTeX + MathJax
- **图表**：Mermaid
- **代码高亮**：Expressive Code
- **搜索**：Pagefind
- **音频**：music-metadata + Web Audio API
- **部署**：GitHub Pages / Vercel
