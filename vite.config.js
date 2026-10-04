import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/LIMO-TEAM-Silicon-Minds-/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
