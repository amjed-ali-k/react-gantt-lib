import { defineConfig } from 'vitepress';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const repo = 'amjed-ali-k/react-gantt-lib';
const siteUrl = `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}`;

export default defineConfig({
  title: 'react-gantt-lib',
  description:
    'High-performance React Gantt chart with granular bar updates, draggable panels, sticky rows, and rich interactions.',
  lang: 'en-US',
  base: '/react-gantt-lib/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/react-gantt-lib/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'react-gantt-lib' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    [
      'script',
      {},
      `(function(){try{var t=localStorage.getItem('vitepress-theme-appearance');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
    ],
  ],

  sitemap: {
    hostname: siteUrl,
  },

  transformHead({ pageData }) {
    const title = pageData.title ? `${pageData.title} | react-gantt-lib` : 'react-gantt-lib';
    const description =
      pageData.description ??
      'High-performance React Gantt chart for React 18+ with granular updates and customizable panels.';
    return [
      ['title', title],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'description', content: description }],
      ['meta', { property: 'og:url', content: `${siteUrl}${pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '.html')}` }],
    ];
  },

  transformPageData(pageData) {
    const path = pageData.relativePath.replace(/\\/g, '/');
    const isWide =
      path.startsWith('examples/') ||
      path.startsWith('playground/') ||
      path.startsWith('guide/') ||
      path.startsWith('api/') ||
      path === 'index.md';

    if (isWide) {
      pageData.frontmatter.aside = false;
      pageData.frontmatter.outline = false;
      const existing = pageData.frontmatter.pageClass ?? '';
      pageData.frontmatter.pageClass = `${existing} docs-wide`.trim();
    }
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'react-gantt-lib',

    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
      { text: 'Playground', link: '/playground/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      {
        text: 'v0.1.15',
        items: [
          { text: 'Changelog', link: '/reference/changelog' },
          { text: 'Limitations', link: '/reference/limitations' },
          { text: 'npm', link: 'https://www.npmjs.com/package/react-gantt-lib' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Tasks & Hierarchy', link: '/guide/tasks' },
            { text: 'Layout & Panels', link: '/guide/layout' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Columns & Timezone', link: '/guide/columns-timezone' },
            { text: 'Zoom & Timeline', link: '/guide/zoom-timeline' },
            { text: 'Interactions', link: '/guide/interactions' },
            { text: 'Custom Rows', link: '/guide/custom-rows' },
            { text: 'Sticky Rows', link: '/guide/sticky-rows' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Events & Hooks', link: '/guide/events' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Theme & CSS', link: '/guide/theme' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Live Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Quick Start', link: '/examples/quick-start' },
            { text: 'Group Summary', link: '/examples/group-summary' },
            { text: 'Sticky Rows', link: '/examples/sticky-rows' },
            { text: 'Grid Snap', link: '/examples/grid-snap' },
            { text: 'Large Timeline', link: '/examples/large-timeline' },
            { text: 'Custom Rows', link: '/examples/custom-rows' },
            { text: 'Timezone', link: '/examples/timezone' },
            { text: 'Advanced', link: '/examples/advanced' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'GanttChart Props', link: '/api/gantt-chart' },
            { text: 'Components & Hooks', link: '/api/components' },
            { text: 'Utilities', link: '/api/utilities' },
            { text: 'Types', link: '/api/types' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Project',
          items: [
            { text: 'Changelog', link: '/reference/changelog' },
            { text: 'Limitations', link: '/reference/limitations' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: `https://github.com/${repo}` }],

    search: { provider: 'local' },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 react-gantt-lib contributors',
    },

    editLink: {
      pattern: `https://github.com/${repo}/edit/master/docs/:path`,
    },
  },

  vite: {
    plugins: [react()],
    resolve: {
      alias: {
        '@src': resolve(__dirname, '../../src'),
        '@demo': resolve(__dirname, '../../demo'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'date-fns'],
    },
    ssr: {
      noExternal: ['react', 'react-dom'],
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});
