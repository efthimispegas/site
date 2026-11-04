import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { insightArticles, insightCategories } from '../src/insights-content.js';
import { localizeHtml } from '../src/locale-messages.js';
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const text = (language, en, el) => (language === 'el' ? el : en);
const image = (category) =>
  ({
    systems: '/assets/live/ship-family/S01/S01-oblique-original.png',
    ai: '/assets/live/cloud-family/K03/K03.png',
    engineering: '/assets/live/jet-family/J02-overhead.png',
  })[category];
export function renderInsights(source, language, slug = '', origin = '') {
  const t = (en, el) => text(language, en, el),
    base = `/${language}/`,
    home = base,
    listing = base + 'insights/',
    item = insightArticles.find((a) => a.slug === slug);
  const category = (id) =>
    insightCategories.find((c) => c[0] === id)?.[language === 'el' ? 2 : 1] ||
    id;
  const href = (a) => listing + a.slug + '/';
  const card = (a) =>
    `<a class="insight-card reveal" href="${href(a)}" data-category="${a.category}" data-date="${a.date}"><div class="card-image"><img src="${image(a.category)}" alt="" loading="lazy"></div><p class="insight-meta">${category(a.category)} <span>${a.date} · ${t('Review copy', 'Προς έγκριση')}</span></p><h3>${esc(a.title[language])}</h3><p>${esc(a.summary[language])}</p><span class="card-arrow" aria-hidden="true">↗</span></a>`;
  const header = source
    .match(/<nav\s+id="site-header"[\s\S]*?<\/nav>/)[0]
    .replace('data-visible="false"', 'data-visible="true"')
    .replace('data-ready="false"', 'data-ready="true"')
    .replace('data-compact="false"', 'data-compact="true"');
  const footer = source.match(/<section id="closing-cta"[\s\S]*?<\/footer>/)[0];
  const menu = source.match(
    /<dialog id="mobile-navigation"[\s\S]*?<\/dialog>/,
  )[0];
  const sidebar = `<aside class="insights-sidebar"><h2>${t('Categories', 'Κατηγορίες')}</h2><p class="sidebar-group">${t('Articles', 'Άρθρα')}</p>${insightCategories.map(([id, en, el]) => `<a href="${listing}${id === 'all' ? '' : '?category=' + id}" data-filter="${id}">${t(en, el)}<span>${id === 'all' ? insightArticles.length : insightArticles.filter((a) => a.category === id).length}</span></a>`).join('')}<p class="sidebar-group">${t('Social updates', 'Κοινωνικά δίκτυα')}</p><a href="${listing}#linkedin">LinkedIn <span>↗</span></a></aside>`;
  const breadcrumbs = `<nav class="breadcrumbs" aria-label="${t('Breadcrumb', 'Διαδρομή')}"><a href="${home}">${t('Home', 'Αρχική')}</a><span>/</span>${item ? `<a href="${listing}">Insights</a><span>/</span><a href="${listing}?category=${item.category}">${category(item.category)}</a><span>/</span><span aria-current="page">${esc(item.title[language])}</span>` : '<span aria-current="page">Insights</span>'}</nav>`;
  const follow = `<section id="linkedin" class="linkedin-panel reveal"><div><p class="eyebrow">${t('Keep the conversation going', 'Συνεχίζουμε τη συζήτηση')}</p><h2>${t('Follow what comes next.', 'Ακολουθήστε όσα έρχονται.')}</h2><p>${t('Perspectives on connected products, purposeful AI and digital craft.', 'Ιδέες για συνδεδεμένα προϊόντα, AI με σκοπό και ψηφιακή ποιότητα.')}</p></div><div><span class="pending-link">${t('Company LinkedIn connection pending', 'Εκκρεμεί η σύνδεση του εταιρικού LinkedIn')}</span></div></section>`;
  let content;
  if (item)
    content = `<header class="insights-title article-title"><p class="eyebrow">${category(item.category)} · ${t('Editorial preview', 'Συντακτική προεπισκόπηση')}</p><h1>${esc(item.title[language])}</h1>${breadcrumbs}<p class="insight-meta">${item.author} <span>${item.date} · ${t('Review copy', 'Προς έγκριση')} · ${t('1 min read', '1 λεπτό ανάγνωσης')}</span></p></header><figure class="article-cover"><img src="${image(item.category)}" alt="${t('Pegasoft visual study', 'Οπτική μελέτη Pegasoft')}"></figure><div class="article-layout"><aside class="article-toc"><h2>${t('Table of contents', 'Περιεχόμενα')}</h2><nav aria-label="${t('Article sections', 'Ενότητες άρθρου')}">${item.sections[language].map(([title], i) => `<a href="#section-${i + 1}" data-toc="section-${i + 1}"><span>0${i + 1}</span>${esc(title)}</a>`).join('')}</nav><progress id="reading-progress" max="100" value="0" aria-label="${t('Reading progress', 'Πρόοδος ανάγνωσης')}"></progress><p>${item.author} · ${item.date}</p><button type="button" data-copy-link>${t('Copy article link', 'Αντιγραφή συνδέσμου')}</button><p data-copy-status role="status"></p></aside><article class="article-body"><p class="article-lead">${esc(item.summary[language])}</p>${item.sections[language].map(([title, body], i) => `<section id="section-${i + 1}"><h2>${i + 1}. ${esc(title)}</h2><p>${esc(body)}</p></section>`).join('')}<nav class="article-tags" aria-label="Tags"><span>Tags</span><a href="${listing}?category=${item.category}">${category(item.category)}</a><a href="${listing}">Pegasoft</a></nav>${follow}<section class="related-articles"><h2>${t('Related articles', 'Σχετικά άρθρα')}</h2><div class="insight-grid">${insightArticles
      .filter((a) => a !== item)
      .map(card)
      .join('')}</div></section></article></div>`;
  else
    content = `<header class="insights-title"><div><h1>Insights<span>(${String(insightArticles.length).padStart(2, '0')})</span></h1><p>${t('Ideas for what comes next.', 'Ιδέες για όσα έρχονται.')}</p></div>${breadcrumbs}</header><div class="insights-layout">${sidebar}<div class="insights-main"><section class="highlights reveal" aria-label="${t('Highlights', 'Επιλεγμένα')}"><div class="highlight-copy"><span class="eyebrow">${t('Highlights', 'Επιλεγμένα')}</span><div data-highlight-copy></div><div class="highlight-controls"><button type="button" data-slide="-1" aria-label="${t('Previous highlight', 'Προηγούμενο άρθρο')}">←</button><span data-slide-count aria-live="polite"></span><button type="button" data-slide="1" aria-label="${t('Next highlight', 'Επόμενο άρθρο')}">→</button><button type="button" data-autoplay aria-pressed="false" aria-label="${t('Pause highlights', 'Παύση εναλλαγής')}">Ⅱ</button></div></div><a class="highlight-art" data-highlight-link><img data-highlight-image alt=""><span class="art-index" aria-hidden="true"></span></a></section><section id="latest" class="latest-articles reveal"><div class="section-heading"><h2>${t('Latest articles', 'Πρόσφατα άρθρα')}</h2><label>${t('Sort by', 'Ταξινόμηση')} <select id="insights-sort"><option value="newest">${t('Date: newest first', 'Ημερομηνία: νεότερα')}</option><option value="oldest">${t('Date: oldest first', 'Ημερομηνία: παλαιότερα')}</option></select></label></div><p class="review-note">${t('Original Pegasoft editorial preview. Content awaits publication approval.', 'Πρωτότυπη συντακτική προεπισκόπηση Pegasoft. Το περιεχόμενο αναμένει έγκριση δημοσίευσης.')}</p><p id="filter-status" role="status"></p><div class="insight-grid" id="article-grid">${insightArticles.map(card).join('')}</div></section>${follow}</div></div>`;
  const title = item
    ? item.title[language] + ' — Pegasoft'
    : 'Insights — Pegasoft';
  const path = listing + (item ? item.slug + '/' : '');
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(item ? item.summary[language] : t('Perspectives on connected products, purposeful AI and digital craft.', 'Ιδέες για συνδεδεμένα προϊόντα, AI με σκοπό και ψηφιακή ποιότητα.'))}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${origin}${path}">${['en', 'el'].map((l) => `<link rel="alternate" hreflang="${l}" href="${origin}/${l}/insights/${item ? item.slug + '/' : ''}">`).join('')}<link rel="stylesheet" href="/src/insights.css">`;
  let html = `<!doctype html><html lang="${language}" data-color-theme="dark"><head>${head}<noscript><style>.insights-loader{display:none}</style></noscript></head><body class="insights-page" data-insight-slug="${slug}"><a class="skip-link" href="#insights-content">${t('Skip to content', 'Μετάβαση στο περιεχόμενο')}</a><div class="insights-loader" aria-hidden="true"><div class="loader-orbit"><i></i><i></i><i></i><b>p.</b></div></div>${header}<main id="insights-content">${content}</main><div id="after-journey" class="after-journey">${footer}</div>${menu}<script type="module" src="/src/insights.js"></script></body></html>`;
  html = localizeHtml(html, language, { origin }).replaceAll(
    'href="/el/insights/"',
    `href="${listing}"`,
  );
  html = html.replace(
    /<a hidden data-launch-omit href="#insights">/g,
    `<a href="${listing}">`,
  );
  return html;
}
/** Generate independent static index/detail destinations; no homepage/3D runtime on these pages. */
export function insightsPages({ origin = '' } = {}) {
  let root, out;
  return {
    name: 'pegasoft-insights-pages',
    configResolved(c) {
      root = c.root;
      out = resolve(c.root, c.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0],
          m = path.match(/^\/(?:(en|el)\/)?insights(?:\/([a-z0-9-]+))?\/?$/);
        if (!m) return next();
        if (m[2] && !insightArticles.some((a) => a.slug === m[2])) {
          res.statusCode = 404;
          return res.end('Article not found');
        }
        try {
          const source = await readFile(resolve(root, 'index.html'), 'utf8');
          const html = await server.transformIndexHtml(
            path,
            renderInsights(source, m[1] || 'el', m[2] || '', origin),
          );
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    },
    async writeBundle() {
      // Vite's processed template carries the hashed entry references for every static page.
      const source = await readFile(resolve(root, 'index.html'), 'utf8'),
        template = await readFile(resolve(out, 'insights/index.html'), 'utf8');
      for (const language of ['en', 'el'])
        for (const slug of ['', ...insightArticles.map((a) => a.slug)]) {
          let html = renderInsights(source, language, slug, origin);
          const js = template.match(/<script[^>]*src="([^"]+)"/);
          const css = [...template.matchAll(/<link[^>]*href="([^"]+\.css)"/g)];
          if (js) html = html.replace('/src/insights.js', js[1]);
          html = html.replace(
            '<link rel="stylesheet" href="/src/insights.css">',
            css.map((m) => `<link rel="stylesheet" href="${m[1]}">`).join(''),
          );
          const dir = resolve(out, language, 'insights', slug);
          await mkdir(dir, { recursive: true });
          await writeFile(resolve(dir, 'index.html'), html);
        }
      await mkdir(resolve(out, 'insights'), { recursive: true });
      await writeFile(
        resolve(out, 'insights/index.html'),
        await readFile(resolve(out, 'el/insights/index.html'), 'utf8'),
      );
    },
  };
}
