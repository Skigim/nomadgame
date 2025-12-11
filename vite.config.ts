import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
  },
  css: {
    postcss: {}, // Override parent postcss.config.mjs
  },
});
