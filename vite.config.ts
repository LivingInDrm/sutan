import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
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
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
  },
});
