import { defineConfig } from 'vite';

// MOCK SETUP - Proxy configuration for mock backend (port 3001)
export default defineConfig({
  root: '.',
  server: {
    port: 3002,
    proxy: {
      // Proxy API calls to mock backend server
      // MSW will intercept requests first, so this is only a fallback
      '/api': {
        target: 'http://localhost:3001', // MOCK backend server
        changeOrigin: true,
        // Don't log connection errors - MSW handles them
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently ignore connection refused errors - MSW will handle the request
            if ((err as NodeJS.ErrnoException).code !== 'ECONNREFUSED') {
              console.error('Proxy error:', err);
            }
          });
        },
      }
    }
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
