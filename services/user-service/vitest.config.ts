import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@transcendence/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@transcendence/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@transcendence/shared-validation': path.resolve(__dirname, '../../packages/shared-validation/src'),
    },
  },
});
