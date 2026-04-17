import { defineConfig } from 'vite';
import { resolve } from 'path';

// Detecta si se está desplegando a GitHub Pages bajo /mondragondetective/
// o si es deploy local/custom-domain
const isGhPages = process.env.GH_PAGES === 'true';

export default defineConfig({
  base: isGhPages ? '/mondragondetective/' : '/',
  root: '.',
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        caso01: resolve(__dirname, 'caso-01/index.html'),
        caso02: resolve(__dirname, 'caso-02/coming-soon.html'),
        caso03: resolve(__dirname, 'caso-03/coming-soon.html'),
      },
    },
  },

  server: {
    port: 4242,
    open: '/index.html',
  },
});
