import { defineConfig } from 'vite';

// DEV SETUP - Configuration for MSW (Mock Service Worker) mode
export default defineConfig({
  root: '.',
  server: {
    port: 3002,
    // No proxy - let MSW handle API calls
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});