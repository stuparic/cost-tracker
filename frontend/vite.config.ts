import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Troškić',
        short_name: 'Troškić',
        description: 'Pratite troškove domaćinstva',
        id: '/?v=7',
        theme_color: '#5b45d6',
        background_color: '#f6f6fb',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/?v=7',
        icons: [
          {
            src: 'pwa-64x64.png?v=7',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png?v=7',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png?v=7',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Firebase Auth opens /__/auth/handler in a popup. Without this
        // exclusion, Workbox serves index.html for that navigation and the
        // popup renders the app's login page instead of Google's OAuth flow.
        navigateFallbackDenylist: [/^\/__\/auth\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cost-tracker-utmayd66ga-ew\.a\.run\.app\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
