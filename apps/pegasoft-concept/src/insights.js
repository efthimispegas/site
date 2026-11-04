import { createHeaderMenu } from './header-menu.js';
import { createLanguageMenus } from './language-menu.js';
import { createPageLoader } from './site-loader.js';
import { createAdaptiveHeader } from './adaptive-header.js';
import './hero-opening.css';
import './loader.css';
import { createCookiePreferences } from './cookie-preferences.js';
import { createWebsiteMotionController } from './website-motion-controller.js';
import { setLocale, localeUrl } from './locale-messages.js';
import { insightArticles } from './insights-content.js';
import { createColorTheme } from './color-theme.js';
import './website-motion.css';
import './content-sections.css';
import './localization.css';
import './ui-theme.css';
import './adaptive-header.css';
import './insights.css';
import './insights-bento.css';
const language = document.documentElement.lang,
  greek = language === 'el',
  base = `/${language}/`,
  listing = base + 'insights/';
setLocale(language);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
try {
  document.documentElement.dataset.colorTheme =
    localStorage.getItem('pegasoft-theme') === 'light' ? 'light' : 'dark';
} catch {
  /* visit-only preference */
}
const theme = createColorTheme(document);
const nav = document.querySelector('#site-header');
const adaptiveHeader = createAdaptiveHeader(nav);
let openingReady = false;
function updateHeader() {
  const title = document
    .querySelector('.insights-title')
    .getBoundingClientRect();
  adaptiveHeader.update({
    y: window.scrollY,
    mobile: window.innerWidth <= 760,
    openingReady,
    heroSurface: title.bottom > nav.clientHeight / 2,
    light: document.documentElement.dataset.colorTheme === 'light',
  });
}
const pageLoader = createPageLoader({
  stage: document.querySelector('[data-page-loader]'),
  reduced,
  onFrame(opening) {
    openingReady = opening.nav >= 0.95;
    updateHeader();
  },
  onReady() {
    document.body.dataset.pageReady = 'true';
  },
});
window.addEventListener('resize', updateHeader);
window.addEventListener('pegasoft-theme-change', updateHeader);
nav.addEventListener('focusin', updateHeader);
nav.addEventListener('focusout', updateHeader);
const headerMenu = createHeaderMenu(document);
const languageMenus = createLanguageMenus({
  document,
  onSelect(language) {
    location.assign(localeUrl(location.href, language).href);
  },
});
document.querySelectorAll('.logo').forEach((a) => (a.href = base));
document.querySelectorAll('[href="#insights"]').forEach((a) => {
  a.href = listing;
  a.hidden = false;
  a.removeAttribute('data-launch-omit');
  a.removeAttribute('data-page-target');
});
document.querySelectorAll('[data-page-target]').forEach((b) =>
  b.addEventListener('click', () => {
    const target = b.dataset.pageTarget;
    location.assign(
      target === '#insights'
        ? listing
        : base + (target.startsWith('#') ? target : '#' + target),
    );
  }),
);
document.querySelectorAll('[data-careers-action]').forEach((b) =>
  b.addEventListener('click', (e) => {
    e.preventDefault();
    location.assign(base + '#contact');
  }),
);
document
  .querySelectorAll('#website-footer a[href^="#"]')
  .forEach((a) => (a.href = base + a.getAttribute('href')));
const preferences = createCookiePreferences(document);
const websiteMotion = createWebsiteMotionController({
  root: document.body,
  headerUpdate: updateHeader,
  contactAction: () => location.assign(base + '#contact'),
});
let websiteFrame;
function updateWebsite() {
  websiteMotion.update({ reducedMotion: reduced.matches });
}
function resizeWebsite() {
  websiteMotion.resize();
}
function tickWebsite(now) {
  websiteMotion.tick(now);
  websiteFrame = requestAnimationFrame(tickWebsite);
}
function visibilityChanged() {
  cancelAnimationFrame(websiteFrame);
  websiteMotion.pause();
  if (!document.hidden) websiteFrame = requestAnimationFrame(tickWebsite);
}
websiteMotion.mount();
updateWebsite();
websiteFrame = requestAnimationFrame(tickWebsite);
window.addEventListener('scroll', updateWebsite, { passive: true });
window.addEventListener('resize', resizeWebsite);
reduced.addEventListener('change', updateWebsite);
document.addEventListener('visibilitychange', visibilityChanged);
// Scroll reveals are progressive enhancement: content stays readable if scripting fails.
const observer = new window.IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    }),
  { threshold: 0.08 },
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
let timer,
  slide = 0,
  paused = reduced.matches;
const copy = document.querySelector('[data-highlight-copy]');
const art = {
  systems: '/assets/live/ship-family/S01/S01-oblique-original.png',
  ai: '/assets/live/cloud-family/K03/K03.png',
  engineering: '/assets/live/jet-family/J02-overhead.png',
};
function showSlide() {
  if (!copy) return;
  const a = insightArticles[slide];
  copy.replaceChildren();
  const title = document.createElement('h2'),
    link = document.createElement('a'),
    meta = document.createElement('p'),
    summary = document.createElement('p');
  link.href = listing + a.slug + '/';
  link.textContent = a.title[language];
  title.append(link);
  meta.className = 'insight-meta';
  meta.textContent = a.date + ' · ' + (greek ? 'Προς έγκριση' : 'Review copy');
  summary.textContent = a.summary[language];
  copy.append(title, meta, summary);
  const image = document.querySelector('[data-highlight-image]');
  image.src = art[a.category];
  document.querySelector('[data-highlight-link]').href = link.href;
  document
    .querySelector('[data-highlight-link]')
    .setAttribute('aria-label', a.title[language]);
  document.querySelector('[data-slide-count]').textContent =
    `0${slide + 1} / 0${insightArticles.length}`;
}
function stop() {
  window.clearInterval(timer);
}
function start() {
  stop();
  if (!paused && !document.hidden)
    timer = window.setInterval(() => {
      slide = (slide + 1) % insightArticles.length;
      showSlide();
    }, 6500);
}
if (copy) {
  showSlide();
  start();
  document.querySelectorAll('[data-slide]').forEach((b) =>
    b.addEventListener('click', () => {
      slide =
        (slide + Number(b.dataset.slide) + insightArticles.length) %
        insightArticles.length;
      showSlide();
      start();
    }),
  );
  const auto = document.querySelector('[data-autoplay]');
  function syncAutoplay() {
    auto.setAttribute('aria-pressed', String(paused));
    auto.textContent = paused ? '▶' : 'Ⅱ';
  }
  syncAutoplay();
  auto.addEventListener('click', () => {
    paused = !paused;
    syncAutoplay();
    start();
  });
  // A changed system preference stops the current timer as well as CSS motion.
  const motionChanged = () => {
    if (reduced.matches) {
      paused = true;
      stop();
      syncAutoplay();
    }
  };
  reduced.addEventListener('change', motionChanged);
  if (import.meta.hot)
    import.meta.hot.dispose(() =>
      reduced.removeEventListener('change', motionChanged),
    );
  document.querySelector('.highlights').addEventListener('focusin', stop);
  document.querySelector('.highlights').addEventListener('focusout', start);
  document.querySelector('.highlights').addEventListener('mouseenter', stop);
  document.querySelector('.highlights').addEventListener('mouseleave', start);
  document.addEventListener('visibilitychange', start);
}
const grid = document.querySelector('#article-grid');
function filter() {
  if (!grid) return;
  const params = new URLSearchParams(location.search),
    category = params.get('category') || 'all',
    sort = params.get('sort') || 'newest';
  const cards = [...grid.children];
  cards
    .sort((a, b) =>
      sort === 'oldest'
        ? a.dataset.date.localeCompare(b.dataset.date)
        : b.dataset.date.localeCompare(a.dataset.date),
    )
    .forEach((c) => {
      c.hidden = category !== 'all' && c.dataset.category !== category;
      grid.append(c);
    });
  document.querySelectorAll('[data-filter]').forEach((a) => {
    if (a.dataset.filter === category) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
  document.querySelector('#insights-sort').value = sort;
  const count = cards.filter((c) => !c.hidden).length;
  document.querySelector('#filter-status').textContent = greek
    ? `${count} άρθρα`
    : `${count} articles`;
}
filter();
document.querySelector('#insights-sort')?.addEventListener('change', (e) => {
  const url = new URL(location.href);
  url.searchParams.set('sort', e.target.value);
  location.assign(url.href);
});
const body = document.querySelector('.article-body');
function scroll() {
  updateHeader();
  if (!body) return;
  const sections = [...body.querySelectorAll('section[id^="section-"]')];
  const active =
    sections.filter((s) => s.getBoundingClientRect().top < 180).at(-1) ||
    sections[0];
  document.querySelectorAll('[data-toc]').forEach((a) => {
    if (a.dataset.toc === active?.id)
      a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
  const rect = body.getBoundingClientRect();
  const end = sections.at(-1).getBoundingClientRect().bottom;
  const readingHeight = end - rect.top;
  document.querySelector('#reading-progress').value = Math.max(
    0,
    Math.min(
      100,
      (100 * (-rect.top + 160)) /
        Math.max(1, readingHeight - window.innerHeight + 160),
    ),
  );
}
window.addEventListener('scroll', scroll, { passive: true });
scroll();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stop();
    cancelAnimationFrame(websiteFrame);
    websiteMotion.dispose();
    window.removeEventListener('scroll', updateWebsite);
    window.removeEventListener('resize', resizeWebsite);
    reduced.removeEventListener('change', updateWebsite);
    document.removeEventListener('visibilitychange', visibilityChanged);
    observer.disconnect();
    theme.dispose();
    preferences.dispose();
    pageLoader.dispose();
    window.removeEventListener('resize', updateHeader);
    window.removeEventListener('pegasoft-theme-change', updateHeader);
    nav.removeEventListener('focusin', updateHeader);
    nav.removeEventListener('focusout', updateHeader);
    window.removeEventListener('scroll', scroll);
    headerMenu.dispose();
    languageMenus.dispose();
  });
