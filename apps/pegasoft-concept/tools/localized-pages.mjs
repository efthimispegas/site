import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderPrivacy, withPrivacyLink } from './privacy-page.mjs';
import { localizeHtml } from '../src/locale-messages.js';
/** Static, crawler-readable localized homepages. Inspection entries stay frozen in English. */
export function localizedPages({
  origin = '',
  indexable = false,
  contact = { enabled: false },
  privacy = null,
} = {}) {
  if (
    contact.enabled &&
    (!privacy?.approved ||
      privacy.version !== contact.privacyVersion ||
      privacy.path !== contact.privacyPath)
  )
    throw Error('Contact requires an approved matching privacy page.');
  let directory;
  const publishPrivacy = Boolean(privacy && (!indexable || privacy.approved));
  const robots = indexable ? 'index, follow' : 'noindex, nofollow, noarchive';
  return {
    name: 'pegasoft-localized-homepages',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'application/json', id: 'contact-runtime-config' },
          children: JSON.stringify(contact).replace(/</g, '\\u003c'),
          injectTo: 'head',
        },
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
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0];
        const language = ['en', 'el'].find(
          (value) => path === `/${value}${privacy?.path}`,
        );
        if (!privacy || (!language && path !== privacy.path)) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(renderPrivacy(language || 'el', privacy, { origin }));
      });
    },
    async writeBundle() {
      let source = await readFile(resolve(directory, 'index.html'), 'utf8');
      const privacyStyles = privacy
        ? [
            ...(
              await readFile(resolve(directory, 'privacy/index.html'), 'utf8')
            ).matchAll(/<link[^>]*href="([^"]+\.css)"/g),
          ].map((match) => match[1])
        : [];
      // The Vite entry exists to compile shared CSS; it is never a public draft placeholder.
      await rm(resolve(directory, 'privacy'), { recursive: true, force: true });
      if (!publishPrivacy) {
        source = withPrivacyLink(source, false);
      }
      const render = (language) => {
        const links = origin
          ? `<link rel="canonical" href="${origin}/${language}/">\n<link rel="alternate" hreflang="el" href="${origin}/el/">\n<link rel="alternate" hreflang="en" href="${origin}/en/">\n<link rel="alternate" hreflang="x-default" href="${origin}/el/">\n`
          : '';
        return localizeHtml(source, language, { origin })
          .replaceAll(
            'href="/privacy/"',
            `href="/${language}${privacy?.path || '/privacy/'}"`,
          )
          .replace('</head>', links + '</head>');
      };
      for (const language of ['el', 'en']) {
        await mkdir(resolve(directory, language), { recursive: true });
        await writeFile(
          resolve(directory, language, 'index.html'),
          render(language),
        );
      }
      await writeFile(resolve(directory, 'index.html'), render('el'));
      if (publishPrivacy) {
        for (const language of ['el', 'en']) {
          const target = resolve(directory, language, privacy.path.slice(1));
          await mkdir(target, { recursive: true });
          await writeFile(
            resolve(target, 'index.html'),
            renderPrivacy(language, privacy, { origin, styles: privacyStyles }),
          );
        }
        const target = resolve(directory, privacy.path.slice(1));
        await mkdir(target, { recursive: true });
        await writeFile(
          resolve(target, 'index.html'),
          renderPrivacy('el', privacy, { origin, styles: privacyStyles }),
        );
      }
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
