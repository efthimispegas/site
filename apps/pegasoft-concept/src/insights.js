import { createPageLoader } from './site-loader.js';
import { createInsightHighlights } from './insights-highlights.js';
import './hero-opening.css';
import './loader.css';
import { createHeaderMenu } from './header-menu.js';
import { createLanguageMenus } from './language-menu.js';
import { createAdaptiveHeader } from './adaptive-header.js';
import { createCookiePreferences } from './cookie-preferences.js';
import { createWebsiteMotionController } from './website-motion-controller.js';
import { setLocale, localeUrl } from './locale-messages.js';
import { createInsightListing } from './insights-listing.js';
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
const mobileReading = window.matchMedia('(max-width:760px)');
let openingReady = mobileReading.matches;
function updateHeader() {
  adaptiveHeader.update({
    y: window.scrollY,
    mobile: window.innerWidth <= 760,
    openingReady,
    heroSurface:
      !mobileReading.matches &&
      document.querySelector('.insights-title').getBoundingClientRect().bottom >
        nav.clientHeight / 2,
    light: document.documentElement.dataset.colorTheme === 'light',
  });
}
let headerHeight = 0;
const headerObserver = new ResizeObserver(([entry]) => {
  const height = Math.ceil(
    entry.borderBoxSize?.[0]?.blockSize ?? nav.offsetHeight,
  );
  if (height === headerHeight) return;
  headerHeight = height;
  document.documentElement.style.setProperty(
    '--editorial-header-clearance',
    `${height + 32}px`,
  );
});
headerObserver.observe(nav);
const loaderStage = document.querySelector('[data-page-loader]');
let pageLoader;
if (mobileReading.matches) loaderStage.hidden = true;
else
  pageLoader = createPageLoader({
    stage: loaderStage,
    reduced,
    onFrame(opening) {
      openingReady = opening.nav >= 0.95;
      updateHeader();
    },
    onReady() {
      document.body.dataset.pageReady = 'true';
    },
  });
function readingBreakpointChanged() {
  if (mobileReading.matches) {
    pageLoader?.dispose();
    pageLoader = null;
    loaderStage.hidden = true;
    openingReady = true;
  }
  updateHeader();
}
mobileReading.addEventListener('change', readingBreakpointChanged);
updateHeader();
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
const highlights = createInsightHighlights({
  document,
  reduced,
  mobile: mobileReading,
});
const listingControls = createInsightListing({
  document,
  onChange() {
    resizeWebsite();
    updateWebsite();
  },
});
const mobileContents = document.querySelector('.mobile-contents');
function closeContents(event) {
  if (event.target.closest('a[data-toc]')) mobileContents.open = false;
}
mobileContents?.addEventListener('click', closeContents);
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
    listingControls.dispose();
    highlights.dispose();
    pageLoader?.dispose();
    mobileReading.removeEventListener('change', readingBreakpointChanged);
    mobileContents?.removeEventListener('click', closeContents);
    headerObserver.disconnect();
    cancelAnimationFrame(websiteFrame);
    websiteMotion.dispose();
    window.removeEventListener('scroll', updateWebsite);
    window.removeEventListener('resize', resizeWebsite);
    reduced.removeEventListener('change', updateWebsite);
    document.removeEventListener('visibilitychange', visibilityChanged);
    theme.dispose();
    preferences.dispose();
    window.removeEventListener('resize', updateHeader);
    window.removeEventListener('pegasoft-theme-change', updateHeader);
    nav.removeEventListener('focusin', updateHeader);
    nav.removeEventListener('focusout', updateHeader);
    window.removeEventListener('scroll', scroll);
    headerMenu.dispose();
    languageMenus.dispose();
  });
