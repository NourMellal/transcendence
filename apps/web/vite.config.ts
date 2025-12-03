import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    port: 3000,
    host: true, // Expose on all network interfaces (0.0.0.0) for Docker/microservices
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/games/ws/socket.io': {
        target: 'ws://localhost:3002',
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
