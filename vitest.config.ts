import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/renderer/core'),
      '@data': path.resolve(__dirname, 'src/renderer/data'),
      '@stores': path.resolve(__dirname, 'src/renderer/stores'),
      '@ui': path.resolve(__dirname, 'src/renderer/ui'),
      '@hooks': path.resolve(__dirname, 'src/renderer/hooks'),
      '@lib': path.resolve(__dirname, 'src/renderer/lib'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
