import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { responsiveWallpapers } from './src/integrations/responsive-wallpapers';
import AstroPWA from '@vite-pwa/astro';
import tailwindcss from '@tailwindcss/vite';
import expressiveCode from 'astro-expressive-code';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import rehypeKatex from 'rehype-katex';

import { parseDirectiveNode } from './src/plugins/remark-directive-rehype';
import { remarkFixGithubAdmonitions } from './src/plugins/remark-fix-github-admonitions';
import { remarkMermaid } from './src/plugins/remark-mermaid';
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs';
import { AdmonitionComponent } from './src/plugins/rehype-component-admonition.mjs';
import { GithubCardComponent } from './src/plugins/rehype-component-github-card.mjs';
import { rehypeImageWidth } from './src/plugins/rehype-image-width.mjs';
import { rehypeMermaid } from './src/plugins/rehype-mermaid.mjs';
import { rehypeWrapTable } from './src/plugins/rehype-wrap-table.mjs';
import rehypeComponents from 'rehype-components';

export default defineConfig({
  site: 'https://soren-abt.github.io',
  base: '/',
  trailingSlash: 'always',

  output: 'static',

  image: {
    layout: 'constrained',
  },

  server: {
    port: 3000,
  },

  integrations: [
    responsiveWallpapers(),
    sitemap(),
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      plugins: [
        pluginCollapsibleSections(),
        pluginLineNumbers(),
      ],
      defaultProps: {
        wrap: true,
        overridesByLang: {
          'shell-session': { showLineNumbers: false },
        },
      },
      styleOverrides: {
        codeBackground: 'var(--codeblock-bg)',
        borderRadius: '0.75rem',
        borderColor: 'var(--code-border)',
        codeFontSize: '0.875rem',
        codeFontFamily: "'JetBrains Mono Variable', 'JetBrainsMonoNerdFont-Light', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        codeLineHeight: '1.5rem',
        frames: {
          editorBackground: 'var(--codeblock-bg)',
          terminalBackground: 'var(--codeblock-bg)',
          terminalTitlebarBackground: 'var(--codeblock-topbar-bg)',
          editorTabBarBackground: 'var(--codeblock-topbar-bg)',
          editorActiveTabBackground: 'none',
          editorActiveTabIndicatorBottomColor: 'var(--primary)',
          editorActiveTabIndicatorTopColor: 'none',
          editorTabBarBorderBottomColor: 'var(--codeblock-topbar-bg)',
          terminalTitlebarBorderBottomColor: 'none',
        },
        textMarkers: {
          delHue: 0,
          insHue: 180,
          markHue: 250,
        },
      },
      frames: {
        showCopyToClipboardButton: true,
      },
    }),
    mdx(),
    AstroPWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,xml}'],
        globIgnores: [
          '**/wallpaper/*.{webp,jpg,png}',
          '**/LXGWWenKai*.woff2',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-jsdelivr',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-unpkg',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "Soren's Blog",
        short_name: "Soren's Blog",
        description: '记录思考 · 沉淀技术 · 无限突破',
        theme_color: '#6366f1',
        background_color: '#0f0f1a',
        display: 'standalone',
        icons: [
          { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],

  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkReadingTime,
      remarkFixGithubAdmonitions,
      remarkDirective,
      parseDirectiveNode,
      remarkMermaid,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeWrapTable,
      rehypeMermaid,
      rehypeImageWidth,
      [
        rehypeComponents,
        {
          components: {
            github: GithubCardComponent,
            note: (x, y) => AdmonitionComponent(x, y, "note"),
            tip: (x, y) => AdmonitionComponent(x, y, "tip"),
            important: (x, y) => AdmonitionComponent(x, y, "important"),
            caution: (x, y) => AdmonitionComponent(x, y, "caution"),
            warning: (x, y) => AdmonitionComponent(x, y, "warning"),
          },
        },
      ],
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: (id) => id.includes("/pagefind/"),
      },
    },
  },
});
