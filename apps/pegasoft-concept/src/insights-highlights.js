import { insightArticles } from './insights-content.js';
import { highlightActionLabel } from './insights-state.js';

/** Preserve the prior desktop carousel; mobile keeps its approved stable feature. */
export function createInsightHighlights({ document, reduced, mobile }) {
  const copy = document.querySelector('[data-highlight-copy]');
  if (!copy) return { dispose() {} };
  const window = document.defaultView;
  const language = document.documentElement.lang;
  const element = document.querySelector('.highlights');
  const auto = document.querySelector('[data-autoplay]');
  const art = {
    systems: '/assets/live/ship-family/S01/S01-oblique-original.png',
    ai: '/assets/live/cloud-family/K03/K03.png',
    engineering: '/assets/live/jet-family/J02-overhead.png',
  };
  const cleanups = [];
  let timer,
    slide = 0,
    paused = reduced.matches,
    hovering = false;
  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    cleanups.push(() => target.removeEventListener(event, handler));
  }
  function stop() {
    window.clearInterval(timer);
  }
  function show() {
    const article = insightArticles[slide];
    const title = document.createElement('h2'),
      link = document.createElement('a'),
      meta = document.createElement('p'),
      summary = document.createElement('p');
    link.href = `/${language}/insights/${article.slug}/`;
    link.textContent = article.title[language];
    title.append(link);
    meta.className = 'insight-meta';
    meta.textContent = `${mobile.matches ? (language === 'el' ? 'Επιλεγμένο άρθρο · ' : 'Featured article · ') : ''}${article.date} · ${language === 'el' ? 'Προς έγκριση' : 'Review copy'}`;
    summary.textContent = article.summary[language];
    copy.replaceChildren(title, meta, summary);
    document.querySelector('[data-highlight-image]').src =
      art[article.category];
    const imageLink = document.querySelector('[data-highlight-link]');
    imageLink.href = link.href;
    imageLink.setAttribute('aria-label', article.title[language]);
    document.querySelector('[data-slide-count]').textContent =
      `${String(slide + 1).padStart(2, '0')} / ${String(insightArticles.length).padStart(2, '0')}`;
  }
  function sync() {
    auto.setAttribute('aria-pressed', String(paused));
    auto.setAttribute('aria-label', highlightActionLabel(paused, language));
    auto.title = highlightActionLabel(paused, language);
    auto.innerHTML = paused
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  }
  function start() {
    stop();
    if (
      !mobile.matches &&
      !paused &&
      !reduced.matches &&
      !document.hidden &&
      !hovering &&
      !element.contains(document.activeElement)
    )
      timer = window.setInterval(() => {
        slide = (slide + 1) % insightArticles.length;
        show();
      }, 6500);
  }
  for (const button of document.querySelectorAll('[data-slide]'))
    listen(button, 'click', () => {
      if (mobile.matches) return;
      slide =
        (slide + Number(button.dataset.slide) + insightArticles.length) %
        insightArticles.length;
      show();
      start();
    });
  listen(auto, 'click', () => {
    if (mobile.matches) return;
    paused = !paused;
    sync();
    start();
  });
  listen(element, 'focusin', stop);
  listen(element, 'focusout', start);
  listen(element, 'mouseenter', () => {
    hovering = true;
    stop();
  });
  listen(element, 'mouseleave', () => {
    hovering = false;
    start();
  });
  listen(document, 'visibilitychange', start);
  listen(reduced, 'change', () => {
    if (reduced.matches) paused = true;
    sync();
    start();
  });
  listen(mobile, 'change', () => {
    if (mobile.matches) slide = 0;
    show();
    start();
  });
  show();
  sync();
  start();
  return {
    dispose() {
      stop();
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
