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
import {
  readInsightListState,
  articleCountLabel,
  highlightActionLabel,
} from './insights-state.js';
import { createColorTheme } from './color-theme.js';
import './website-motion.css';
import './content-sections.css';
import './localization.css';
import './ui-theme.css';
import './adaptive-header.css';
import './core-layout.css';
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
    auto.setAttribute('aria-label', highlightActionLabel(paused, language));
    auto.title = highlightActionLabel(paused, language);
    auto.innerHTML = paused
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
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
  const state = readInsightListState(location.href);
  const { category, sort } = state;
  if (state.url.href !== location.href)
    window.history.replaceState(window.history.state, '', state.url.href);
  const cards = [...grid.children];
  cards
    .sort((a, b) =>
      sort === 'oldest'
        ? a.dataset.date.localeCompare(b.dataset.date)
        : b.dataset.date.localeCompare(a.dataset.date),
    )
    .forEach((card) => {
      card.hidden = category !== 'all' && card.dataset.category !== category;
      grid.append(card);
    });
  document
    .querySelectorAll('.insights-sidebar [data-filter]')
    .forEach((link) => {
      if (link.dataset.filter === category)
        link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      const target = new URL(state.url);
      if (link.dataset.filter === 'all') target.searchParams.delete('category');
      else target.searchParams.set('category', link.dataset.filter);
      target.hash = 'latest';
      link.href = target.pathname + target.search + target.hash;
    });
  document.querySelector('#insights-sort').value = sort;
  const count = cards.filter((card) => !card.hidden).length;
  document.querySelector('#filter-status').textContent = articleCountLabel(
    count,
    language,
  );
  const recovery = document.querySelector('#filter-recovery');
  recovery.hidden = !state.invalidCategory && count > 0;
  recovery.querySelector('p').textContent = state.invalidCategory
    ? greek
      ? 'Αυτή η κατηγορία δεν είναι διαθέσιμη. Εμφανίζονται όλα τα άρθρα.'
      : 'This category is unavailable. Showing all articles.'
    : greek
      ? 'Δεν υπάρχουν ακόμη άρθρα σε αυτή την κατηγορία.'
      : 'There are no articles in this category yet.';
  resizeWebsite();
  updateWebsite();
}
function updateListing(url) {
  url.hash = 'latest';
  window.history.pushState(
    window.history.state,
    '',
    url.pathname + url.search + url.hash,
  );
  filter();
  document
    .querySelector('#latest')
    .scrollIntoView({ block: 'start', behavior: 'auto' });
}
filter();
const filterLinks = [...document.querySelectorAll('[data-filter]')];
function selectCategory(event) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  const url = new URL(location.href);
  const category = event.currentTarget.dataset.filter;
  if (category === 'all') url.searchParams.delete('category');
  else url.searchParams.set('category', category);
  updateListing(url);
}
filterLinks.forEach((link) => link.addEventListener('click', selectCategory));
function selectSort(event) {
  const url = new URL(location.href);
  if (event.target.value === 'newest') url.searchParams.delete('sort');
  else url.searchParams.set('sort', event.target.value);
  updateListing(url);
}
document
  .querySelector('#insights-sort')
  ?.addEventListener('change', selectSort);
window.addEventListener('popstate', filter);
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
    filterLinks.forEach((link) =>
      link.removeEventListener('click', selectCategory),
    );
    document
      .querySelector('#insights-sort')
      ?.removeEventListener('change', selectSort);
    window.removeEventListener('popstate', filter);
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
