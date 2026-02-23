// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  future: {
    compatibilityVersion: 4,
  },
  modules: ['@nuxt/ui'],
  nitro: {
    preset: 'cloudflare-module',
  },
  devtools: { enabled: true },
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
      }
    }
  }
})
