import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: import.meta.dirname,
  server: { host: '127.0.0.1', port: 8770, strictPort: true },
  preview: { host: '127.0.0.1', port: 8771, strictPort: true },
  build: {
    outDir: '../../dist/apps/pegasoft-concept',
    emptyOutDir: true,
    sourcemap: true,
    // Keep the pilot inspectable; optimization is a later, separately verified change.
    minify: false,
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
