import { test } from 'node:test';
import { clearTimeout } from 'node:timers';
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
      assert.doesNotMatch(html, /data-page-loader/);
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

test('all native routes retain shared closing/footer while keeping editorial entry immediate', () => {
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
      })
        .replaceAll('href="/el/insights/"', `href="/${language}/insights/"`)
        .replace(
          'data-privacy-link href="/privacy/"',
          `data-privacy-link href="/${language}/privacy/"`,
        );
      assert.equal(html.match(footer)[0], expectedFooter);
      assert.match(html, /data-compact="false"/);
      assert.doesNotMatch(html, /data-page-loader/);
      assert.doesNotMatch(html, /data-copy-link|onclick=/);
    }
  }
});

test('article source follows prose and precedes tags in both locales', () => {
  for (const language of ['en', 'el']) {
    const html = renderInsights(
      source,
      language,
      insightArticles[0].slug,
      'https://example.test',
    );
    const lead = html.indexOf('class="article-lead"');
    const lastSection = html.indexOf('id="section-3"');
    const metadata = html.indexOf('class="article-source"');
    const tags = html.indexOf('class="article-tags"');
    assert.ok(lead < lastSection && lastSection < metadata && metadata < tags);
    assert.doesNotMatch(html.slice(metadata, tags), />https:\/\/example\.test/);
    assert.match(html, /disabled aria-describedby="article-share-note"/);
    assert.match(html, /id="article-share-note"/);
  }
});

test('shared article links recover invalid categories while retaining sort and list context', async () => {
  const { readInsightListState } = await import('../src/insights-state.js');
  const invalid = readInsightListState(
    'https://example.test/en/insights/?category=unknown&sort=oldest#latest',
  );
  assert.equal(invalid.category, 'all');
  assert.equal(invalid.invalidCategory, true);
  assert.equal(invalid.sort, 'oldest');
  assert.equal(invalid.url.search, '?sort=oldest');
  assert.equal(invalid.url.hash, '#latest');
  const selected = readInsightListState(
    'https://example.test/el/insights/?category=ai&sort=unknown',
  );
  assert.equal(selected.category, 'ai');
  assert.equal(selected.sort, 'newest');
  assert.equal(selected.invalidCategory, false);
  assert.equal(selected.url.search, '?category=ai');
});

test('article counts describe the actual state in both locales', async () => {
  const { articleCountLabel } = await import('../src/insights-state.js');
  assert.equal(articleCountLabel(0, 'en'), '0 articles');
  assert.equal(articleCountLabel(1, 'en'), '1 article');
  assert.equal(articleCountLabel(3, 'en'), '3 articles');
  assert.equal(articleCountLabel(1, 'el'), '1 άρθρο');
  assert.equal(articleCountLabel(3, 'el'), '3 άρθρα');
});

test('Insights selection follows localized route identity rather than navigation history', async () => {
  const { isInsightsPath } = await import('../src/navigation-state.js');
  for (const path of ['/en/', '/el/', '/', '/en/insights-other/'])
    assert.equal(isInsightsPath(path), false);
  for (const path of [
    '/en/insights/',
    '/el/insights',
    '/el/insights/purposeful-ai/',
  ])
    assert.equal(isInsightsPath(path), true);
});

test('editorial browsing renders native labelled controls and a stable feature in both locales', () => {
  for (const language of ['en', 'el']) {
    const html = renderInsights(source, language, '', 'https://example.test');
    assert.match(html, /for="insights-category"/);
    assert.match(html, /id="insights-category" name="category"/);
    assert.match(html, /for="insights-sort"/);
    assert.match(html, /id="filter-status" role="status" aria-live="polite"/);
    assert.match(html, /data-reset-filter hidden/);
    assert.ok(html.includes(insightArticles[0].title[language]));
    assert.doesNotMatch(
      html,
      /data-slide=|data-autoplay|class="insight-card reveal"/,
    );
    assert.match(html, /data-page-ready="true"/);
    if (language === 'el')
      assert.doesNotMatch(
        html.match(
          /<p\b[^>]*class="content-review-note"[^>]*>([\s\S]*?)<\/p>/,
        )[1],
        /Online contact and Careers applications are temporarily\s+unavailable/,
      );
  }
});

test('articles keep native mobile contents, desktop navigation and stable section anchors', () => {
  for (const language of ['en', 'el']) {
    const html = renderInsights(
      source,
      language,
      insightArticles[0].slug,
      'https://example.test',
    );
    assert.match(html, /<details class="mobile-contents"><summary>/);
    assert.doesNotMatch(html, /<details class="mobile-contents" open/);
    assert.match(html, /class="article-toc-widget"/);
    assert.equal((html.match(/data-toc="section-3"/g) || []).length, 2);
    assert.equal((html.match(/id="section-3"/g) || []).length, 1);
  }
});

test('category, sorting, reset and browser history share one model without moving focus', async () => {
  const { JSDOM } = await import('jsdom');
  const { createInsightListing } = await import('../src/insights-listing.js');
  for (const language of ['en', 'el']) {
    const dom = new JSDOM(renderInsights(source, language), {
      url: `https://example.test/${language}/insights/?utm_source=test`,
    });
    const { document, Event, MouseEvent } = dom.window;
    let updates = 0;
    const owner = createInsightListing({ document, onChange: () => updates++ });
    const category = document.querySelector('#insights-category');
    const sort = document.querySelector('#insights-sort');
    const cards = () =>
      [...document.querySelectorAll('#article-grid > a')].filter(
        (card) => !card.hidden,
      );
    category.focus();
    category.value = 'ai';
    category.dispatchEvent(new Event('change'));
    assert.equal(cards().length, 1);
    assert.equal(cards()[0].dataset.category, 'ai');
    assert.equal(document.activeElement, category);
    assert.equal(document.querySelector('.highlights').hidden, true);
    assert.equal(
      new URL(dom.window.location.href).searchParams.get('utm_source'),
      'test',
    );
    sort.value = 'oldest';
    sort.dispatchEvent(new Event('change'));
    assert.equal(category.value, 'ai');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error('history did not restore')),
        1000,
      );
      dom.window.addEventListener(
        'popstate',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      dom.window.history.back();
    });
    assert.equal(category.value, 'ai');
    assert.equal(sort.value, 'newest');
    const reset = document.querySelector(
      '.insights-browse [data-reset-filter]',
    );
    reset.click();
    assert.equal(cards().length, 3);
    assert.equal(document.querySelector('.highlights').hidden, false);
    assert.equal(document.activeElement, sort);
    assert.equal(reset.hidden, true);
    const link = document.querySelector('[data-filter="engineering"]');
    const modifiedClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    link.dispatchEvent(modifiedClick);
    assert.equal(modifiedClick.defaultPrevented, false);
    assert.equal(category.value, 'all');
    const ordinaryClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(ordinaryClick);
    assert.equal(ordinaryClick.defaultPrevented, true);
    assert.equal(cards()[0].dataset.category, 'engineering');
    const before = updates;
    owner.dispose();
    category.value = 'ai';
    category.dispatchEvent(new Event('change'));
    assert.equal(updates, before);
    dom.window.close();
  }
});

test('invalid shared links recover and empty categories offer an explicit reset', async () => {
  const { JSDOM } = await import('jsdom');
  const { createInsightListing } = await import('../src/insights-listing.js');
  for (const language of ['en', 'el']) {
    const dom = new JSDOM(renderInsights(source, language), {
      url: `https://example.test/${language}/insights/?category=unknown&sort=oldest#latest`,
    });
    const document = dom.window.document;
    document
      .querySelector('#article-grid [data-category="engineering"]')
      .remove();
    const owner = createInsightListing({ document });
    assert.equal(dom.window.location.search, '?sort=oldest');
    assert.equal(dom.window.location.hash, '#latest');
    assert.equal(document.querySelector('#filter-recovery').hidden, false);
    const select = document.querySelector('#insights-category');
    select.value = 'engineering';
    select.dispatchEvent(new dom.window.Event('change'));
    assert.match(document.querySelector('#filter-status').textContent, /^0 /);
    assert.equal(document.querySelector('#filter-recovery').hidden, false);
    document.querySelector('#filter-recovery [data-reset-filter]').click();
    assert.equal(document.querySelector('#filter-recovery').hidden, true);
    assert.equal(document.querySelector('#insights-sort').value, 'oldest');
    owner.dispose();
    dom.window.close();
  }
});
