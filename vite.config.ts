import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist'
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
});
