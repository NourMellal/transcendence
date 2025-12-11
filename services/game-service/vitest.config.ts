import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@transcendence/shared-validation': path.resolve(
                __dirname,
                '../../packages/shared-validation/src/index.ts'
            ),
            '@transcendence/shared-messaging': path.resolve(
                __dirname,
                '../../packages/shared-messaging/src/index.ts'
            ),
            sqlite: path.resolve(__dirname, './tests/stubs/sqlite.ts'),
            zod: path.resolve(__dirname, './tests/stubs/zod.ts'),
        },
    },
});
