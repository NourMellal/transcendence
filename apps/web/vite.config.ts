import { defineConfig } from 'vite';
import path from 'node:path';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000';
const wsProxyTarget = proxyTarget.replace(/^http(s?):/, (_match, secure) => (secure ? 'wss:' : 'ws:'));

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/api/games/ws/socket.io': {
        target: wsProxyTarget,
        ws: true,
        changeOrigin: true,
        secure: false,
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
