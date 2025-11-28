import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
