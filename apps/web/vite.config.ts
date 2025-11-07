import { defineConfig } from 'vite';

// MOCK SETUP - Proxy configuration for mock backend (port 3001)
export default defineConfig({
  root: '.',
  server: {
    port: 3002,
    proxy: {
      // Proxy API calls to mock backend server
      '/api': {
        target: 'http://localhost:3001', // MOCK backend server
        changeOrigin: true
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
