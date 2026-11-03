import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Project Pages: https://<user>.github.io/ConsoleHelper/
  base: '/ConsoleHelper/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
