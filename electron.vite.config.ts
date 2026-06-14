import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['better-sqlite3'],
        input: {
          index: resolve(__dirname, 'packages/main/src/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'packages/preload/src/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'packages/renderer'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'packages/renderer/index.html'),
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@rdm/shared': resolve(__dirname, 'packages/shared/src'),
        '@rdm/renderer': resolve(__dirname, 'packages/renderer/src'),
      },
    },
  },
});
