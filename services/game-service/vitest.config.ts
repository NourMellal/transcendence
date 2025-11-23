import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@transcendence/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
            '@transcendence/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
            '@transcendence/shared-validation': path.resolve(__dirname, '../../packages/shared-validation/src'),
            '@transcendence/shared-messaging': path.resolve(__dirname, '../../packages/shared-messaging/src'),
        },
    },
    test: {
        include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
        environment: 'node',
    },
});
