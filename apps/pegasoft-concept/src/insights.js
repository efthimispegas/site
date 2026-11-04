import { storeConsent } from './cookie-consent.js';
import { createParticleWordmark } from './particle-wordmark.js';
import { sectors, services } from './footer-content.js';
import { setLocale, translate, localeUrl } from './locale-messages.js';
import { insightArticles } from './insights-content.js';
import { createColorTheme } from './color-theme.js';
import './website-motion.css';
import './content-sections.css';
import './localization.css';
import './ui-theme.css';
import './adaptive-header.css';
import './insights.css';
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
const loader = document.querySelector('.insights-loader');
const ready = () => {
  document.body.dataset.pageReady = 'true';
  loader.classList.add('finished');
};
// A direct load and each native article/category navigation have their own bounded reveal.
setTimeout(ready, reduced.matches ? 0 : 650);
const nav = document.querySelector('#site-header');
const menu = document.querySelector('#mobile-navigation'),
  toggle = document.querySelector('#open-mobile-menu');
function closeMenu() {
  menu.close();
  toggle.setAttribute('aria-expanded', 'false');
  document.body.dataset.menuOpen = 'false';
  toggle.focus();
}
toggle.addEventListener('click', () => {
  menu.showModal();
  toggle.setAttribute('aria-expanded', 'true');
  document.body.dataset.menuOpen = 'true';
});
document
  .querySelector('#close-mobile-menu')
  .addEventListener('click', closeMenu);
menu.addEventListener('close', () => {
  toggle.setAttribute('aria-expanded', 'false');
  document.body.dataset.menuOpen = 'false';
});
const languageMenu = document.querySelector('#site-header-language'),
  languageHome = languageMenu.parentElement;
const mobile = window.matchMedia('(max-width: 760px)');
function moveLanguages() {
  if (mobile.matches)
    document.querySelector('#mobile-language-slot').append(languageMenu);
  else languageHome.insertBefore(languageMenu, toggle);
  const trigger = languageMenu.querySelector('[data-language-trigger]');
  if (mobile.matches) {
    trigger.removeAttribute('aria-haspopup');
    trigger.setAttribute(
      'aria-label',
      greek ? 'Switch to English' : 'Αλλαγή σε Ελληνικά',
    );
  } else trigger.setAttribute('aria-haspopup', 'menu');
}
moveLanguages();
mobile.addEventListener('change', moveLanguages);
document.querySelectorAll('[data-language-trigger]').forEach((b) =>
  b.addEventListener('click', () => {
    if (mobile.matches) {
      const url = localeUrl(location.href, greek ? 'en' : 'el');
      location.assign(url.href);
      return;
    }
    const options = languageMenu.querySelector('[role=menu]');
    options.hidden = !options.hidden;
    b.setAttribute('aria-expanded', String(!options.hidden));
  }),
);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const options = languageMenu.querySelector('[role=menu]');
    options.hidden = true;
    languageMenu
      .querySelector('[data-language-trigger]')
      .setAttribute('aria-expanded', 'false');
  }
});
document.querySelectorAll('[data-locale]').forEach((b) =>
  b.addEventListener('click', () => {
    const url = localeUrl(location.href, b.dataset.locale);
    location.assign(url.href);
  }),
);
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
document
  .querySelectorAll('[data-contact-action],[data-careers-action]')
  .forEach((b) =>
    b.addEventListener('click', (e) => {
      e.preventDefault();
      location.assign(base + '#contact');
    }),
  );
document
  .querySelectorAll('#website-footer a[href^="#"]')
  .forEach((a) => (a.href = base + a.getAttribute('href')));
const cookies = document.querySelector('#cookie-preferences');
document
  .querySelector('#open-cookies')
  .addEventListener('click', () => cookies.showModal());
document
  .querySelector('[data-close-cookies]')
  .addEventListener('click', () => cookies.close());
document.querySelector('#save-cookies').addEventListener('click', () => {
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* visit only */
  }
  const saved = storeConsent(storage, 'settings');
  cookies.close();
  document.querySelector('#cookie-status').textContent = translate(
    saved
      ? 'Preferences saved. No optional trackers enabled.'
      : 'Preferences apply to this visit only. This browser could not save them.',
    language,
  );
});
const modeButtons = document.querySelectorAll('[data-footer-mode]');
function footerMode(mode) {
  modeButtons.forEach((x) =>
    x.setAttribute('aria-pressed', String(x.dataset.footerMode === mode)),
  );
  document.querySelectorAll('[data-marquee-group]').forEach((group) =>
    group.replaceChildren(
      ...(mode === 'industries' ? sectors : services).map((text) => {
        const span = document.createElement('span');
        span.textContent = translate(text, language);
        return span;
      }),
    ),
  );
}
modeButtons.forEach((b) =>
  b.addEventListener('click', () => footerMode(b.dataset.footerMode)),
);
footerMode('industries');
const canvas = document.querySelector('#particle-wordmark'),
  particles = createParticleWordmark({ canvas });
let particleFrame,
  footerVisible = false,
  lastFrame = 0;
function drawParticles(time) {
  if (!footerVisible || document.hidden) {
    particleFrame = 0;
    return;
  }
  const dt = Math.min(0.05, (time - lastFrame) / 1000);
  lastFrame = time;
  particles.render(dt, reduced.matches);
  particleFrame = requestAnimationFrame(drawParticles);
}
const footerObserver = new window.IntersectionObserver((entries) => {
  footerVisible = entries[0].isIntersecting;
  if (footerVisible && !particleFrame)
    particleFrame = requestAnimationFrame(drawParticles);
});
particles.mount().then(() => {
  particles.resize();
  footerObserver.observe(canvas);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && footerVisible && !particleFrame)
    particleFrame = requestAnimationFrame(drawParticles);
});
canvas.addEventListener('pointermove', (event) => {
  if (reduced.matches) return;
  const r = canvas.getBoundingClientRect();
  particles.setPointer({ x: event.clientX - r.left, y: event.clientY - r.top });
});
canvas.addEventListener('pointerleave', () => particles.setPointer(null));
canvas.addEventListener('focus', () => {
  if (!reduced.matches)
    particles.setPointer({
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
    });
});
canvas.addEventListener('blur', () => particles.setPointer(null));
window.addEventListener('resize', () => particles.resize());
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (
    !a ||
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    a.target === '_blank' ||
    a.hasAttribute('download')
  )
    return;
  const url = new URL(a.href, location.href);
  if (
    url.origin !== location.origin ||
    (url.pathname === location.pathname && url.search === location.search)
  )
    return;
  e.preventDefault();
  document.body.dataset.leaving = 'true';
  if (menu.open) menu.close();
  setTimeout(() => location.assign(url.href), reduced.matches ? 0 : 280);
});
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
  nav.dataset.compact = 'true';
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
  document.querySelector('#reading-progress').value = Math.max(
    0,
    Math.min(
      100,
      (100 * (-rect.top + 160)) /
        (body.offsetHeight - window.innerHeight + 160),
    ),
  );
}
window.addEventListener('scroll', scroll, { passive: true });
scroll();
document
  .querySelector('[data-copy-link]')
  ?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      document.querySelector('[data-copy-status]').textContent = greek
        ? 'Ο σύνδεσμος αντιγράφηκε'
        : 'Link copied';
    } catch {
      document.querySelector('[data-copy-status]').textContent = location.href;
    }
  });
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stop();
    cancelAnimationFrame(particleFrame);
    particles.dispose();
    footerObserver.disconnect();
    observer.disconnect();
    theme.dispose();
    window.removeEventListener('scroll', scroll);
    mobile.removeEventListener('change', moveLanguages);
  });
