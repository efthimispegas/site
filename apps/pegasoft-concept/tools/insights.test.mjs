import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { renderInsights, insightsPages } from './insights-pages.mjs';
import { insightArticles } from '../src/insights-content.js';
const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'index.html'), 'utf8');
test('separate article routes render localized breadcrumbs, real anchors and review content without cinematic entry', () => {
  for (const lang of ['en', 'el'])
    for (const article of insightArticles) {
      const html = renderInsights(
        source,
        lang,
        article.slug,
        'https://example.test',
      );
      assert.match(html, new RegExp(`<html lang="${lang}"`));
      assert.ok(html.includes(article.title[lang]));
      assert.ok(
        html.includes(`href="/${lang}/insights/?category=${article.category}"`),
      );
      assert.match(html, /aria-current="page"/);
      assert.match(html, /href="#section-3"/);
      assert.match(html, /id="section-3"/);
      assert.match(html, /data-copy-link/);
      assert.match(html, /related-articles/);
      assert.match(html, /id="linkedin"/);
      assert.doesNotMatch(
        html,
        /src="\/src\/main.js"|id="opening-stage"|id="story-track"/,
      );
      if (lang === 'en')
        assert.doesNotMatch(html, /<a[^>]*href="\/el\/insights\/"/);
    }
});
test('static build emits every EN/EL direct-entry route with processed assets, canonicals and no source entry references', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'pegasoft-insights-build-'));
  try {
    await writeFile(resolve(dir, 'index.html'), source);
    await mkdir(resolve(dir, 'out/insights'), { recursive: true });
    await writeFile(
      resolve(dir, 'out/insights/index.html'),
      '<script type="module" src="/assets/insights-compiled.js"></script><link rel="stylesheet" href="/assets/insights-compiled.css">',
    );
    const plugin = insightsPages({ origin: 'https://example.test' });
    plugin.configResolved({ root: dir, build: { outDir: 'out' } });
    await plugin.writeBundle();
    for (const lang of ['en', 'el'])
      for (const slug of ['', ...insightArticles.map((a) => a.slug)]) {
        const html = await readFile(
          resolve(dir, 'out', lang, 'insights', slug, 'index.html'),
          'utf8',
        );
        assert.match(html, /src="\/assets\/insights-compiled.js"/);
        assert.match(html, /href="\/assets\/insights-compiled.css"/);
        assert.doesNotMatch(html, /\/src\/insights\.(?:js|css)/);
        assert.ok(
          html.includes(
            `href="https://example.test/${lang}/insights/${slug ? slug + '/' : ''}"`,
          ),
        );
      }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
