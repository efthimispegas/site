import {localizedPages} from './tools/localized-pages.mjs';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import {staticCompression} from './tools/static-compression.mjs';

export default defineConfig({
  root: import.meta.dirname,
  plugins:[localizedPages(),staticCompression()],
  server: { host: '127.0.0.1', port: 8770, strictPort: true },
  preview: { host: '127.0.0.1', port: 8771, strictPort: true },
  build: {
    outDir: '../../dist/apps/pegasoft-concept',
    emptyOutDir: true,
    sourcemap: true,
    // Preserve source maps for inspection; send compact production JavaScript.
    minify: true,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        inspection: resolve(import.meta.dirname, 'review/ship-jet-integration.html'),
        loader: resolve(import.meta.dirname, 'review/loader.html'),
        footerParticles: resolve(import.meta.dirname, 'review/footer-particles.html'),
      },
    },
  },
});
