import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://ottervoice.vercel.app',
  base: '/docs',
  outDir: './dist-docs',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'OtterVoice',
      description: 'TypeScript-first real-time voice SDK for Web, Expo, and Node.js.',
      favicon: '/favicon.png',
      logo: {
        src: './src/assets/ottervoice-icon.webp',
        alt: 'OtterVoice',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/bugkiwi/OtterVoice',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/bugkiwi/OtterVoice/edit/main/docs/site/',
      },
      defaultLocale: 'root',
      locales: {
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
        en: {
          label: 'English',
          lang: 'en',
        },
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        SocialIcons: './src/components/SocialIcons.astro',
      },
      sidebar: [
        {
          label: '快速接入',
          translations: { en: 'Quick start' },
          items: [
            {
              label: '总览',
              translations: { en: 'Overview' },
              slug: 'getting-started',
            },
            {
              label: 'Mock / 无密钥',
              translations: { en: 'Mocks (no API key)' },
              slug: 'getting-started/mocks',
            },
            {
              label: 'Web 浏览器',
              translations: { en: 'Web browser' },
              slug: 'getting-started/web',
            },
            {
              label: 'Expo / React Native',
              translations: { en: 'Expo / React Native' },
              slug: 'getting-started/expo',
            },
            {
              label: 'Node.js',
              translations: { en: 'Node.js' },
              slug: 'getting-started/node',
            },
            {
              label: 'Token Broker',
              translations: { en: 'Token broker' },
              slug: 'getting-started/token-broker',
            },
          ],
        },
        {
          label: '模块',
          translations: { en: 'Packages' },
          items: [
            {
              label: '怎么选',
              translations: { en: 'Which package?' },
              slug: 'packages',
            },
            { label: '@ottervoice/core', slug: 'packages/core' },
            { label: '@ottervoice/runtime-web', slug: 'packages/runtime-web' },
            {
              label: '@ottervoice/runtime-react-native',
              slug: 'packages/runtime-react-native',
            },
            { label: '@ottervoice/runtime-node', slug: 'packages/runtime-node' },
            {
              label: 'Providers',
              translations: { en: 'Providers' },
              slug: 'packages/providers',
            },
            {
              label: '@ottervoice/provider-utils',
              slug: 'packages/provider-utils',
            },
            { label: '@ottervoice/protocol', slug: 'packages/protocol' },
          ],
        },
        {
          label: '指南',
          translations: { en: 'Guides' },
          items: [
            {
              label: '架构',
              translations: { en: 'Architecture' },
              slug: 'guides/architecture',
            },
            {
              label: '事件与字幕',
              translations: { en: 'Events & transcripts' },
              slug: 'guides/events',
            },
            {
              label: '延迟',
              translations: { en: 'Latency' },
              slug: 'guides/latency',
            },
            {
              label: '安全',
              translations: { en: 'Security' },
              slug: 'guides/security',
            },
          ],
        },
        {
          label: 'API 参考',
          translations: { en: 'API reference' },
          items: [
            {
              label: '总览',
              translations: { en: 'Overview' },
              slug: 'reference',
            },
            {
              label: 'API 索引',
              translations: { en: 'API index' },
              slug: 'reference/api',
            },
            {
              label: '@ottervoice/core',
              slug: 'reference/api/ottervoice-core',
            },
            {
              label: '@ottervoice/protocol',
              slug: 'reference/api/ottervoice-protocol',
            },
            {
              label: '@ottervoice/provider-utils',
              slug: 'reference/api/ottervoice-provider-utils',
            },
            {
              label: '@ottervoice/provider-deepgram',
              slug: 'reference/api/ottervoice-provider-deepgram',
            },
            {
              label: '@ottervoice/provider-elevenlabs',
              slug: 'reference/api/ottervoice-provider-elevenlabs',
            },
            {
              label: '@ottervoice/provider-openrouter',
              slug: 'reference/api/ottervoice-provider-openrouter',
            },
            {
              label: '@ottervoice/provider-azure-speech',
              slug: 'reference/api/ottervoice-provider-azure-speech',
            },
            {
              label: '@ottervoice/runtime-web',
              slug: 'reference/api/ottervoice-runtime-web',
            },
            {
              label: '@ottervoice/runtime-react-native',
              slug: 'reference/api/ottervoice-runtime-react-native',
            },
            {
              label: '@ottervoice/runtime-node',
              slug: 'reference/api/ottervoice-runtime-node',
            },
          ],
        },
      ],
    }),
  ],
});
