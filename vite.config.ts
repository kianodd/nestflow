import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'NestFlow — Visual NestJS Builder',
        short_name: 'NestFlow',
        description: 'Visually build, test and export real NestJS applications',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] }
    })
  ],
  build: { chunkSizeWarningLimit: 1200 }
});
