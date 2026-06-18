export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,

  // Workaround (Windows + Vite 7.2 em dev): o `isIgnored` do Nuxt passa o id
  // virtual `vite/modulepreload-polyfill` ao pacote `ignore` como caminho
  // absoluto, que por padrão lança "path should be a path.relative()'d string".
  // `allowRelativePaths: true` faz o `ignore` tolerar o caminho em vez de quebrar.
  ignoreOptions: { allowRelativePaths: true },

  css: [],

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
