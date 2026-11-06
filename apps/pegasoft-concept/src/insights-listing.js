import { readInsightListState, articleCountLabel } from './insights-state.js';

/** One URL-backed browsing model for desktop links and mobile native controls. */
export function createInsightListing({ document, onChange = () => {} }) {
  const grid = document.querySelector('#article-grid');
  if (!grid) return { dispose() {} };
  const window = document.defaultView;
  const language = document.documentElement.lang;
  const categoryControl = document.querySelector('#insights-category');
  const sortControl = document.querySelector('#insights-sort');
  const mobileSort = document.querySelector('#insights-sort-mobile');
  const mobile = window.matchMedia?.('(max-width:760px)');
  const controls = document.querySelector('.insights-browse');
  const statuses = [
    ...document.querySelectorAll('#filter-status, #filter-status-mobile'),
  ];
  const recovery = document.querySelector('#filter-recovery');
  const feature = document.querySelector('.highlights');
  const clear = controls.querySelector('[data-reset-filter]');
  const links = [
    ...document.querySelectorAll('.insights-sidebar [data-filter]'),
  ];
  const cards = [...grid.children];
  const cleanups = [];
  const t = (en, el) => (language === 'el' ? el : en);
  function listen(element, event, handler) {
    element.addEventListener(event, handler);
    cleanups.push(() => element.removeEventListener(event, handler));
  }
  function render() {
    const state = readInsightListState(window.location.href);
    if (state.url.href !== window.location.href)
      window.history.replaceState(window.history.state, '', state.url.href);
    categoryControl.value = state.category;
    sortControl.value = state.sort;
    mobileSort.value = state.sort;
    cards
      .sort((a, b) =>
        state.sort === 'oldest'
          ? a.dataset.date.localeCompare(b.dataset.date)
          : b.dataset.date.localeCompare(a.dataset.date),
      )
      .forEach((card) => {
        card.hidden =
          state.category !== 'all' && card.dataset.category !== state.category;
        grid.append(card);
      });
    const count = cards.filter((card) => !card.hidden).length;
    statuses.forEach((status) => {
      status.textContent = articleCountLabel(count, language);
    });
    clear.hidden = state.category === 'all';
    if (feature)
      feature.dataset.mobileFiltered = String(state.category !== 'all');
    recovery.hidden = !state.invalidCategory && count > 0;
    recovery.querySelector('p').textContent = state.invalidCategory
      ? t(
          'This category is unavailable. Showing all articles.',
          'Αυτή η κατηγορία δεν είναι διαθέσιμη. Εμφανίζονται όλα τα άρθρα.',
        )
      : t(
          'There are no articles in this category yet.',
          'Δεν υπάρχουν ακόμη άρθρα σε αυτή την κατηγορία.',
        );
    for (const link of links) {
      if (link.dataset.filter === state.category)
        link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      const target = new URL(state.url);
      if (link.dataset.filter === 'all') target.searchParams.delete('category');
      else target.searchParams.set('category', link.dataset.filter);
      link.href = target.pathname + target.search + target.hash;
    }
    onChange();
  }
  function update(category, sort) {
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    if (sort === 'newest') url.searchParams.delete('sort');
    else url.searchParams.set('sort', sort);
    window.history.pushState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash,
    );
    render();
  }
  listen(categoryControl, 'change', () =>
    update(categoryControl.value, mobileSort.value),
  );
  listen(sortControl, 'change', () => {
    update(categoryControl.value, sortControl.value);
    document
      .querySelector('#latest')
      .scrollIntoView?.({ block: 'start', behavior: 'auto' });
  });
  listen(mobileSort, 'change', () =>
    update(categoryControl.value, mobileSort.value),
  );
  listen(controls, 'submit', (event) => event.preventDefault());
  for (const button of document.querySelectorAll('[data-reset-filter]')) {
    listen(button, 'click', () => {
      update('all', sortControl.value);
      // Reset hides its own button; keep keyboard focus on a visible control.
      (mobile?.matches ? mobileSort : sortControl).focus({
        preventScroll: true,
      });
    });
  }
  for (const link of links)
    listen(link, 'click', (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      update(link.dataset.filter, sortControl.value);
      if (!mobile?.matches)
        document
          .querySelector('#latest')
          .scrollIntoView?.({ block: 'start', behavior: 'auto' });
    });
  listen(window, 'popstate', render);
  render();
  return {
    dispose() {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
