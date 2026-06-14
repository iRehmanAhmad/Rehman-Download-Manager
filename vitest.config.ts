import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/renderer/**'],
    },
  },
  resolve: {
    alias: {
      '@rdm/shared': resolve(__dirname, 'packages/shared/src'),
      '@rdm/main': resolve(__dirname, 'packages/main/src'),
    },
  },
});
