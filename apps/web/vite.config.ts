import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';
  const wsTarget =
    env.VITE_API_PROXY_WS_TARGET || apiTarget.replace(/^http/, 'ws');
  const proxySecure = !apiTarget.startsWith('https://');

  return {
    server: {
      port: 5173,
      host: true, // Expose on all network interfaces (0.0.0.0) for Docker/microservices
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: proxySecure,
        },
        '/api/games/ws/socket.io': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: proxySecure,
        },
        '/api/chat/ws/socket.io': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: proxySecure,
        },
        '/api/tournaments/ws/socket.io': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: proxySecure,
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
  };
});
