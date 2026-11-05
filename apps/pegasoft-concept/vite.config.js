import { privacyConfig } from './tools/privacy-page.mjs';
import { insightsPages } from './tools/insights-pages.mjs';
import { localizedPages } from './tools/localized-pages.mjs';
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { staticCompression } from './tools/static-compression.mjs';
import {
  developmentConfig,
  deploymentConfig,
  indexingConfig,
  contactConfig,
} from './tools/deployment-config.mjs';

export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, import.meta.dirname, 'PEGASOFT_'),
    config = deploymentConfig(environment, { production: command === 'build' }),
    development = developmentConfig(environment);
  return {
    root: import.meta.dirname,
    plugins: [
      insightsPages(config),
      localizedPages({
        ...config,
        contact: contactConfig(environment),
        privacy: privacyConfig(environment),
        ...indexingConfig(environment, {
          ...config,
          production: command === 'build',
        }),
      }),
      staticCompression(),
    ],
    server: {
      host: development.host,
      port: development.devPort,
      strictPort: true,
    },
    preview: {
      host: development.host,
      port: development.previewPort,
      strictPort: true,
    },
    build: {
      outDir: '../../dist/apps/pegasoft-concept',
      emptyOutDir: true,
      sourcemap: true,
      // Preserve source maps for inspection; send compact production JavaScript.
      minify: true,
      rolldownOptions: {
        input: {
          index: resolve(import.meta.dirname, 'index.html'),
          insights: resolve(import.meta.dirname, 'insights/index.html'),
          privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        },
      },
    },
  };
});
