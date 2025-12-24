import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 5173,
    host: true, // Expose on all network interfaces (0.0.0.0) for Docker/microservices
    proxy: {
      '/api': {
        target: 'http://api-gateway:3000',
        changeOrigin: true,
      },
      '/api/games/ws/socket.io': {
        target: 'ws://api-gateway:3000',
        ws: true,
        changeOrigin: true,
      },
    },
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
