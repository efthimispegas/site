import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { localizeHtml } from '../src/locale-messages.js';
/** Static, crawler-readable localized homepages. Inspection entries stay frozen in English. */
export function localizedPages({ origin = '', indexable = false } = {}) {
  let directory;
  const robots = indexable ? 'index, follow' : 'noindex, nofollow, noarchive';
  return {
    name: 'pegasoft-localized-homepages',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { name: 'robots', content: robots },
          injectTo: 'head',
        },
      ];
    },
    configResolved(config) {
      directory = resolve(config.root, config.build.outDir);
    },
    async writeBundle() {
      const source = await readFile(resolve(directory, 'index.html'), 'utf8');
      const render = (language) => {
        const links = origin
          ? `<link rel="canonical" href="${origin}/${language}/">\n<link rel="alternate" hreflang="el" href="${origin}/el/">\n<link rel="alternate" hreflang="en" href="${origin}/en/">\n<link rel="alternate" hreflang="x-default" href="${origin}/el/">\n`
          : '';
        return localizeHtml(source, language, { origin }).replace(
          '</head>',
          links + '</head>',
        );
      };
      for (const language of ['el', 'en']) {
        await mkdir(resolve(directory, language), { recursive: true });
        await writeFile(
          resolve(directory, language, 'index.html'),
          render(language),
        );
      }
      await writeFile(resolve(directory, 'index.html'), render('el'));
      // Replace only the indexing directive; preserve all maintained security headers.
      const headers = await readFile(resolve(directory, '_headers'), 'utf8');
      await writeFile(
        resolve(directory, '_headers'),
        indexable
          ? headers.replace(/^\s*X-Robots-Tag:[^\n]*\n/gm, '')
          : headers,
      );
      await writeFile(
        resolve(directory, 'robots.txt'),
        'User-agent: *\n' + (indexable ? 'Allow: /' : 'Disallow: /') + '\n',
      );
    },
  };
}
