import { defineConfig } from 'vite';

export default defineConfig({
  base: '/LIMO-TEAM-Silicon-Minds-/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
