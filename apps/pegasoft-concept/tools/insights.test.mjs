import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { renderInsights, insightsPages } from './insights-pages.mjs';
import { localizeHtml } from '../src/locale-messages.js';
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
      assert.match(html, /data-social="linkedin"/);
      assert.match(html, /data-social="link"/);
      assert.match(html, /data-page-loader/);
      assert.doesNotMatch(html, /insights-loader|loader-orbit/);
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

test('all native routes retain the homepage closing component and loader markup', () => {
  const closing = /<section id="closing-cta"[\s\S]*?<\/section>/;
  const original = source.match(closing)[0];
  const footer = /<footer id="website-footer"[\s\S]*?<\/footer>/;
  for (const language of ['en', 'el']) {
    const expected = localizeHtml(original, language, {
      origin: 'https://example.test',
    });
    for (const slug of [
      '',
      ...insightArticles.map((article) => article.slug),
    ]) {
      const html = renderInsights(
        source,
        language,
        slug,
        'https://example.test',
      );
      assert.equal(html.match(closing)[0], expected);
      const expectedFooter = localizeHtml(source.match(footer)[0], language, {
        origin: 'https://example.test',
      }).replaceAll('href="/el/insights/"', `href="/${language}/insights/"`);
      assert.equal(html.match(footer)[0], expectedFooter);
      assert.match(html, /data-compact="false"/);
      for (const name of ['pulse', 'radar', 'loader-mark']) {
        const pattern = new RegExp(
          `<div[^>]*class="${name}"[^>]*>[\\s\\S]*?<\\/div>`,
        );
        assert.equal(html.match(pattern)[0], source.match(pattern)[0]);
      }
      assert.doesNotMatch(html, /data-copy-link|onclick=/);
    }
  }
});
