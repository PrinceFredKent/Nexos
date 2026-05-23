import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'app-icon.jpg', 'icons/*.png'],
      manifest: false, // We use our own public/manifest.json
      workbox: {
        // Cache shell (JS/CSS/HTML) with stale-while-revalidate
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}'],
        // API calls — network first, fall back to cache
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api') || url.port === '8000',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nexos-api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
        // Skip waiting so new service worker activates immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // Disable SW in dev to avoid caching issues
      },
    }),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split large, stable libraries into their own chunks for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
