import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: '/LIMO-TEAM-Silicon-Minds-/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
