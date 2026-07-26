import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
const firebaseEnvironmentKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const missingFirebaseKeys = firebaseEnvironmentKeys.filter((key) => !env[key]);

  if (missingFirebaseKeys.length > 0) {
    throw new Error(
      `Configuration Firebase incomplète : ${missingFirebaseKeys.join(', ')}`,
    );
  }

  return {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks pour meilleur caching
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'icons-vendor': ['phosphor-react'],
          'charts-vendor': ['recharts'],
        }
      }
    },
    sourcemap: false, // Désactiver en production pour réduire taille
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer console.log en production
        drop_debugger: true
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    mode === 'analyze' && visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      injectManifest: {
        globPatterns: [
          'index.html',
          'registerSW.js',
          'assets/**/*.{js,css}',
          'icons/icon-*.png',
          'favicon.ico',
          'apple-touch-icon.png',
          'KodeksLogo.png',
          'img/default-cover.png',
        ],
        globIgnores: [
          'assets/html2canvas*',
          'assets/purify*',
          'assets/index.es-*',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: 'Kodeks - Gestionnaire de Bibliothèque',
        short_name: 'Kodeks',
        description: 'Application de gestion de bibliothèque personnelle avec scanner ISBN',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['books', 'productivity', 'utilities'],
        lang: 'fr',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-96x96.png', 
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128', 
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Scanner un livre',
            short_name: 'Scanner',
            description: 'Scanner rapidement un code-barres ISBN',
            url: '/?action=scan',
            icons: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192'
              }
            ]
          },
          {
            name: 'Ma collection',
            short_name: 'Collection',
            description: 'Voir ma collection de livres',
            url: '/?view=collection',
            icons: [
              {
                src: '/icons/icon-192x192.png', 
                sizes: '192x192'
              }
            ]
          }
        ]
      }
    })
  ],
  };
});
