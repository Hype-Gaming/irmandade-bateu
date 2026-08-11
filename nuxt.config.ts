export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,

  // Workaround (Windows + Vite 7.2 em dev): o `isIgnored` do Nuxt passa o id
  // virtual `vite/modulepreload-polyfill` ao pacote `ignore` como caminho
  // absoluto, que por padrão lança "path should be a path.relative()'d string".
  // `allowRelativePaths: true` faz o `ignore` tolerar o caminho em vez de quebrar.
  ignoreOptions: { allowRelativePaths: true },

  css: [],

  // Head do documento. Isto ANTES vivia num `app.html` na raiz com a sintaxe de
  // template do Nuxt 2 ({{ HEAD }}, {{ APP }}) — o Nuxt 4 não lê esse arquivo
  // (o pacote não tem uma única referência a `app.html`), então favicon, manifest,
  // metas de PWA e Open Graph nunca chegavam ao browser. Aqui elas de fato saem.
  app: {
    head: {
      title: 'Clube da BB',
      htmlAttrs: { lang: 'pt-BR' },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ],
      meta: [
        // PWA
        { name: 'application-name', content: 'Clube da BB' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Clube da BB' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#ff1493' },
        // SEO
        { name: 'keywords', content: 'Clube da BB, Cassino Ao Vivo, Bac Bo, Estatísticas, Análise de padrões, Jogos ao vivo' },
        { name: 'author', content: 'Clube da BB' },
        // Open Graph / Facebook. As URLs de imagem precisam ser absolutas:
        // os scrapers do Facebook/WhatsApp ignoram caminho relativo.
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://app.clubedabb.online/' },
        { property: 'og:title', content: 'Clube da BB - Análises e Estatísticas em Tempo Real' },
        { property: 'og:description', content: 'Plataforma exclusiva com análises inteligentes e estatísticas em tempo real para jogos ao vivo.' },
        { property: 'og:image', content: 'https://app.clubedabb.online/og-image.jpg' },
        // Twitter
        { property: 'twitter:card', content: 'summary_large_image' },
        { property: 'twitter:url', content: 'https://app.clubedabb.online/' },
        { property: 'twitter:title', content: 'Clube da BB - Análises em Tempo Real' },
        { property: 'twitter:description', content: 'Plataforma exclusiva com análises inteligentes e estatísticas em tempo real.' },
        { property: 'twitter:image', content: 'https://app.clubedabb.online/og-image.jpg' }
      ]
    }
  },

  // dev: libera hosts de túnel (ex.: cloudflared) pra testar webhooks externos.
  // Só vale no servidor de desenvolvimento; não afeta produção.
  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com']
    }
  },

  modules: ['@nuxt/icon'],

  icon: {
    serverBundle: 'remote',
  },

  // O driver `mongodb` (v7) usa require() interno p/ deps opcionais. No bundle
  // ESM do Nitro, `require` não existe → "require is not defined" ao criar o
  // MongoClient. O banner define um require global (via createRequire) em todos
  // os chunks, sem redeclarar quando já existe.
  nitro: {
    rollupConfig: {
      output: {
        banner: "import { createRequire as __nuxtCreateRequire } from 'node:module'; if (!globalThis.require) { globalThis.require = __nuxtCreateRequire(import.meta.url); }"
      }
    }
  },

  // Parâmetros do deploy por env (mesmo código roda como Irmandade ou Bateu).
  // - mongodbUri/mongodbDb: banco próprio de cada marca (server-only).
  // - public.appBrand: marca ativa no client (slug em shared/brands.ts).
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || '',
    mongodbDb: process.env.MONGODB_DB || 'irmandade-hyper',
    public: {
      appBrand: process.env.NUXT_PUBLIC_APP_BRAND || 'esportiva'
    }
  },

  compatibilityDate: '2024-12-09'
})
