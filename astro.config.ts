import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
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
