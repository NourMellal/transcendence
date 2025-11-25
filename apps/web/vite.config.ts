import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 3000,
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
