import { createPageScroll } from './page-scroll.js';
import { createLocalization } from './localization.js';
import './hero-opening.css';
import './outcome.css';
import './loader.css';
import './website-motion.css';
import './content-sections.css';
import './localization.css';
import './ui-theme.css';
import './adaptive-header.css';
import './core-layout.css';
import { createColorTheme } from './color-theme.js';
import { createContentController } from './content-controller.js';
import { createJourneyHost } from './journey-host.js';

const colorTheme = createColorTheme(document);
const scrolling = createPageScroll(document);
const languages = createLocalization({
  document,
  onChange() {
    content.refreshLanguage();
    colorTheme.refresh();
    journey.refreshLanguage();
  },
});
colorTheme.refresh();
export const journey = createJourneyHost(document.querySelector('main'));
const ready = journey.mount();
export const content = createContentController({
  root: document.querySelector('main'),
  journey,
});
content.mount();
ready.then(() => {
  if (location.hash === '#insights') {
    location.replace(`/${document.documentElement.lang}/insights/`);
    return;
  }
  content.showLandingConsent();
  content.followInitialHash();
  if (['#about', '#services'].includes(location.hash))
    journey.navigate(location.hash.slice(1));
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    colorTheme.dispose();
    languages.dispose();
    content.dispose();
    journey.dispose();
    scrolling.dispose();
  });

// Native separate-page destinations preserve the active locale.
function syncInsightsLinks() {
  document.querySelectorAll('.insights-nav-link').forEach((link) => {
    link.href = `/${document.documentElement.lang}/insights/`;
  });
}
syncInsightsLinks();
const insightsLanguage = new window.MutationObserver(syncInsightsLinks);
insightsLanguage.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['lang'],
});
if (import.meta.hot)
  import.meta.hot.dispose(() => insightsLanguage.disconnect());
