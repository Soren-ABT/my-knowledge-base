# 🎵 Soren's Knowledge Base & Blog

<img align='right' src='public/favicon.svg' width='180px' alt="logo">

A blazing-fast personal knowledge base and blog powered by [Astro 6](https://astro.build) & [Tailwind CSS 4](https://tailwindcss.com). Features a professional Hi-Res music player with Web Audio API DSP pipeline, OKLCH dynamic theme system, 3D interactive welcome page, and full-text search.

[![Node.js >= 18](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen?logo=nodedotjs)](https://nodejs.org/)
[![Astro 6](https://img.shields.io/badge/Astro-6.4.3-%23FF5D01?logo=astro)](https://astro.build)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.1.6-%2306B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-green.svg)](LICENSE)

[**🖥️ Live Demo**](https://soren-abt.github.io) | [**📝 Usage Guide**](https://soren-abt.github.io/posts/website-user-guide/) | [**📚 Blog Posts**](https://soren-abt.github.io/posts/)

🌏 **README Languages:**
[**English**](./README.md) / [**中文**](./README.zh.md) / [**日本語**](./README.ja.md) / [**繁體中文**](./README.tw.md) /

From blog posts and knowledge base articles to interactive music listening, this project brings together everything a student or developer needs for a personal web presence. Whether you're writing LaTeX-heavy notes, organizing learning materials, or enjoying high-fidelity audio, it's all here in one polished, zero-cost static site.

---

## ✨ Features

### 🎨 Design & Interface

- [x] Built with [Astro 6](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com) with OKLCH color space
- [x] Smooth page transitions via Astro [View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- [x] Light/dark theme switching with system preference detection
- [x] Dynamic hue slider — change the entire site's accent color with one CSS variable
- [x] Fullscreen wallpaper carousel with glassmorphism card effects
- [x] Sakura particle animation (Canvas, toggleable)
- [x] Custom cursor with hover effects on welcome page
- [x] Fully responsive design for all devices

### 🎼 Music Player

- [x] Web Audio API DSP signal chain: `ReplayGain → Headroom → Compressor → Crossfeed → Analyser`
- [x] 20+ audio formats: FLAC, ALAC, WAV, AIFF, WavPack, APE, TAK, TTA, MP3, AAC, Opus, OGG, etc.
- [x] Auto quality classification: Studio Master / Hi-Res / CD Quality / Standard Lossless
- [x] Roon-inspired immersive full-screen playback with blurred cover background
- [x] Apple Music-style library browser: browse by album, artist, genre, year
- [x] Album cover auto-extraction from audio file metadata
- [x] ReplayGain (track/album gain normalization)
- [x] EQ presets: Off, Classical, Rock, Jazz, Headphones, Voice
- [x] Recent play history with stale-entry auto-cleanup
- [x] Favorites & play queue management

### 🔍 Content & Search

- [x] Markdown/MDX writing with Zod-typed content collections
- [x] Enhanced code blocks via [Expressive Code](https://expressive-code.com/): line numbers, copy button, collapsible sections
- [x] LaTeX math: KaTeX (server-side) + MathJax 3 (client fallback)
- [x] Mermaid diagrams with auto light/dark theme switching
- [x] GitHub-flavored admonitions: `:::note`, `:::tip`, `:::important`, `:::caution`, `:::warning`
- [x] GitHub repository cards via `:github[user/repo]` syntax
- [x] Image width control and centering: `![desc w-400 center](url)`
- [x] Static full-text search via [Pagefind](https://pagefind.app/) with CJK support
- [x] Reading time estimation (Chinese 400 cpm, English 200 wpm)
- [x] Auto-generated floating table of contents with scroll tracking
- [x] RSS 2.0 feed

### 🛠 Technical Features

- [x] Zero-JS-by-default output (Islands Architecture)
- [x] OG image generation via Satori (JSX → SVG → PNG)
- [x] JSON-LD structured data for SEO
- [x] Content collections with draft system
- [x] Reading position restoration across navigations
- [x] Back-to-top button with scroll progress ring
- [x] Image lightbox with keyboard navigation
- [x] Link preview cards on hover
- [x] Custom remark/rehype plugin pipeline (12 plugins)

### 🏠 Welcome Page

- [x] Three.js wireframe geometry with mouse parallax
- [x] Custom cursor (system cursor hidden, 6px dot with glow)
- [x] Time-aware greeting with typewriter effect
- [x] Staggered character entrance animation on site title
- [x] Day/night mode toggle for 3D scene

---

## 🚀 Quick Start

### Prerequisites

| Dependency | Version |
|------------|---------|
| Node.js | >= 18 (LTS recommended) |
| npm | >= 9 |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base

# 2. Install dependencies
npm install

# 3. (Optional) Add your music files
# Place audio files in public/assets/music/url/
# Supported: .mp3 .flac .m4a .ogg .wav .wma .aiff .ape .wv .opus .aac .mpc .mp4 .alac .tak .tta .ac3 .dts
# Note: DSD (.dsf/.dff) is NOT supported — they are automatically skipped by the scanner

# 4. Scan music and generate playlist
npm run scan-music

# 5. Start the dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Writing Content

```bash
# Create a new blog post (manually)
# Add a .md file to src/content/posts/ with frontmatter:

---
title: "My First Post"
published: 2026-06-10
description: "A short description for SEO and previews"
tags: ["tech", "tutorial"]
category: "Tech"
draft: false
pinned: false
---
```

For knowledge base documents, place files in `src/content/docs/files/` (kept local, excluded from git).

---

## 📝 Article Frontmatter

```yaml
---
title: "Article Title"             # Required
published: 2026-06-10              # Required
updated: 2026-06-10                # Optional
description: "SEO description"     # Recommended
image: "./cover.jpg"               # Optional cover image
tags: ["tag1", "tag2"]             # Default: []
category: "Tech"                   # Optional
draft: false                       # true = hidden in production
pinned: false                      # true = pinned to top
---
```

### Draft System

Draft posts are visible during development (`npm run dev`) but automatically hidden in production builds. Use this to work on posts before publishing.

---

## ⚡ Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Scan music + start dev server at `localhost:3000` |
| `npm run build` | Scan music + production build + Pagefind search index |
| `npm run preview` | Preview production build locally |
| `npm run scan-music` | Scan music files and generate playlist |
| `npm run scan-music:watch` | Watch music directory for changes, auto-regenerate |

---

## 🎼 Music Player

### Signal Chain

```
MediaElement → Gain(ReplayGain) → Gain(Headroom -3dB) → DynamicsCompressor
  → [Crossfeed Split] → Analyser → Destination
```

### Quality Tiers

| Tier | Criteria | Badge |
|------|----------|-------|
| Studio Master | > 96kHz / 24bit | SM |
| Hi-Res Lossless | > 48kHz / 24bit | HR |
| CD Quality | 44.1kHz / 16bit | CD |
| Standard Lossless | 44.1kHz / 16bit (other formats) | — |
| High-bitrate Lossy | > 256kbps | — |
| Standard Lossy | > 128kbps | — |
| Low-bitrate Lossy | < 128kbps | — |

### Adding Music

1. Place audio files in `public/assets/music/url/`
2. Run `npm run scan-music`
3. Covers are auto-extracted to `public/assets/music/cover/`
4. Playlist is generated at `public/api/music-playlist.json`

The scanner reads embedded metadata (title, artist, album, year, genre, composer, track number, ReplayGain) using the `music-metadata` library. Format detection uses magic bytes — file extensions don't matter.

---

## 📁 Project Structure

```
my-knowledge-base/
├── public/
│   ├── assets/
│   │   ├── font/                        # Self-hosted fonts (woff2)
│   │   ├── music/
│   │   │   ├── url/                     # Audio files (place your music here)
│   │   │   └── cover/                   # Cover art (auto-extracted)
│   │   └── wallpaper/                   # Desktop + mobile wallpapers
│   ├── api/
│   │   └── music-playlist.json          # Playlist API (auto-generated)
│   └── js/                              # Client-side scripts
│       ├── app.js                       # Main app logic
│       ├── music-player.js              # Audio engine (Web Audio API)
│       ├── music-player-library.js      # Library browser UI
│       ├── music-player-eq-presets.js   # Equalizer presets
│       ├── music-player-decoder.js      # Format decoder info
│       ├── music-player-lyrics.js       # Lyrics display
│       ├── sakura.js                    # Cherry blossom particles
│       ├── welcome-3d.js                # Three.js 3D scene
│       └── mermaid-render.js            # Mermaid diagram renderer
├── scripts/
│   ├── scan-music.mjs                   # Music metadata scanner
│   ├── audio-decoder.mjs                # Audio format knowledge base
│   └── tag-reader.mjs                   # Tag reader & normalizer
├── src/
│   ├── components/                      # Astro components (18 files)
│   │   └── MusicPlayer.astro            # Full music player UI
│   ├── config/                          # Site configuration (9 files)
│   │   └── musicPlaylist.generated.ts   # Playlist TS (auto-generated)
│   ├── content/
│   │   ├── posts/                       # Blog posts (*.md)
│   │   └── docs/                        # Knowledge base (local only, .gitignored)
│   ├── content.config.ts                # Zod content schema
│   ├── layouts/
│   │   ├── Layout.astro                 # Main layout (all content pages)
│   │   └── WelcomeLayout.astro          # Welcome page layout
│   ├── pages/                           # Route pages (12 files)
│   ├── plugins/                         # Remark/Rehype plugins (12 files)
│   ├── styles/                          # CSS design system (7 layers)
│   └── types/                           # TypeScript type definitions
├── astro.config.ts                      # Astro configuration
├── pagefind.yml                         # Search engine config
├── vercel.json                          # Vercel deployment + security headers
└── package.json
```

---

## 🎯 Configuration

### Astro Configuration

Edit `astro.config.ts` to customize site URL, integrations, markdown plugins, and Vite options. The configuration is heavily commented and organized by section.

### Site Configuration

Edit files in `src/config/`:
- Site metadata (title, description, author)
- Navigation links
- Social links
- Theme defaults

### CSS Design Tokens

All colors derive from a single `--hue` CSS variable using OKLCH color space. Change one number to recolor the entire site:

```css
:root {
  --hue: 250; /* Purple-blue by default */
  --primary: oklch(65% 0.25 var(--hue));
}
```

---

## 🚀 Deployment

### GitHub Pages (Free)

The repository includes a GitHub Actions workflow. Push to `master` and GitHub will automatically build and deploy to `gh-pages`.

Configuration: `astro.config.ts` → `site` + `base`, then enable Pages in repo settings.

### Vercel (Free CDN)

```bash
npm i -g vercel
vercel
```

Vercel provides global CDN acceleration and automatic HTTPS. Free tier includes 100GB bandwidth/month — more than enough for a personal blog.

### Environment

No environment variables required. The project works out of the box with zero configuration for deployment.

---

## 🧩 Markdown Extensions

Beyond standard GitHub Flavored Markdown, this project supports:

| Extension | Syntax | Description |
|-----------|--------|-------------|
| Admonitions | `:::note` / `:::warning` etc. | 5 types of callout boxes |
| Math | `$E=mc^2$` / `$$\int$$` | LaTeX via KaTeX + MathJax |
| Diagrams | ` ```mermaid ` | Flowcharts, sequence, Gantt |
| GitHub Cards | `:github[user/repo]` | Repository info cards |
| Image Width | `![desc w-400 center](url)` | Custom width + centering |
| Code Blocks | ` ```lang ` | Line numbers, copy, collapse |

See [Markdown Guide](https://soren-abt.github.io/posts/markdown-guide/) for the complete reference.

---

## 🏗 Architecture

```
Build Time:
  Markdown → remark plugins → rehype plugins → HTML
              │                                  │
              └── Reading time, math,            └── Components, syntax
                  directives, mermaid               highlighting, wrapping

  scan-music.mjs → music-metadata → FLAC tags
    → musicPlaylist.generated.ts (server)
    → music-playlist.json (client API)
    → cover images extracted

Runtime:
  app.js: Navbar scroll, search modal, lightbox, settings panel,
          back-to-top, progress bar, link previews, keyboard shortcuts

  music-player.js: Web Audio API DSP chain, HTML5 Audio element,
                   state management, broadcast pub/sub

  welcome-3d.js: Three.js scene, mouse parallax, zoom, day/night
```

---

## 🌟 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `/` | Open search |
| `Ctrl+D` | Toggle dark/light theme |
| `Ctrl+↑` | Scroll to top |
| `?` | Show all shortcuts |
| `Esc` | Close modal / panel |

**Music Player (when library is open):**

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Alt+←` / `Cmd+←` | Previous track |
| `Alt+→` / `Cmd+→` | Next track |
| `Esc` | Close library |

See the [Website User Guide](https://soren-abt.github.io/posts/website-user-guide/) for the complete list.

---

## 🙏 Acknowledgements

- Built with [Astro](https://astro.build) — the best static site framework
- Fonts: [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (Chinese), JetBrains Mono Nerd Font (code)
- Math: [KaTeX](https://katex.org) + [MathJax](https://www.mathjax.org)
- Search: [Pagefind](https://pagefind.app)
- Inspiration: Roon (music UI), Apple Music (library browser), foobar2000 (DSP)

---

## 📄 License

Content: [CC BY-NC-SA 4.0](LICENSE) — feel free to reference and share, but please attribute.

Code: MIT — use it, modify it, learn from it.

---

⭐ If you find this project helpful, please consider giving it a star!
