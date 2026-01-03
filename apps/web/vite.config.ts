import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  // Prefer process.env (from docker-compose) over .env file values
  const apiTarget = process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'http://localhost:3000';
  const wsTarget =
    process.env.VITE_API_PROXY_WS_TARGET || env.VITE_API_PROXY_WS_TARGET || apiTarget.replace(/^http/, 'ws');
  
  console.log(`[Vite Config] API Target: ${apiTarget}`);
  console.log(`[Vite Config] WebSocket Target: ${wsTarget}`);

  return {
    server: {
      port: 5173,
      host: true, // Expose on all network interfaces (0.0.0.0) for Docker/microservices
      proxy: {
        // WebSocket proxies MUST come before generic /api proxy
        // Order matters in Vite proxy configuration
        '/api/games/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: false, // Allow self-signed certs
        },
        '/api/chat/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        '/api/tournaments/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        '/api/presence/ws': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        // Generic API proxy (must be last)
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false, // Allow self-signed certs
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
