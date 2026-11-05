import { translate as t } from './locale-messages.js';
import { isInsightsPath } from './navigation-state.js';
import { createScope } from '../runtime/runtime-lifecycle.js';

/** Homepage menu lifecycle shared by every route. */
export function createHeaderMenu(document) {
  const window = document.defaultView,
    scope = createScope(),
    $ = (s) => document.querySelector(s),
    menu = $('#mobile-navigation');
  function syncCurrentPage() {
    const current = isInsightsPath(window.location.pathname);
    document.querySelectorAll('.insights-nav-link').forEach((link) => {
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  syncCurrentPage();
  scope.listen(window, 'pageshow', syncCurrentPage);
  function syncMenu() {
    const open = menu.open;
    $('#open-mobile-menu').setAttribute('aria-expanded', String(open));
    $('#open-mobile-menu').setAttribute(
      'aria-label',
      t(open ? 'Close menu' : 'Open menu'),
    );
    document.body.dataset.menuOpen = String(open);
  }
  scope.listen($('#open-mobile-menu'), 'click', () => {
    menu.showModal();
    document.querySelector('#mobile-menu-title').focus({ preventScroll: true });
    syncMenu();
  });
  scope.listen(document.querySelector('#close-mobile-menu'), 'click', () =>
    menu.close(),
  );
  scope.listen(menu, 'close', syncMenu);
  const mobile = window.matchMedia('(max-width:760px)'),
    language = $('#site-header-language'),
    languageHome = language.parentElement;
  const placeLanguage = () => {
    const parent = mobile.matches
        ? document.querySelector('#mobile-language-slot')
        : languageHome,
      trigger = language.querySelector('[data-language-trigger]');
    if (language.parentElement !== parent) {
      language.querySelector('[role=menu]').hidden = true;
      parent.insertBefore(
        language,
        mobile.matches ? null : $('#open-mobile-menu'),
      );
    }
    if (mobile.matches) {
      trigger.removeAttribute('aria-haspopup');
      trigger.removeAttribute('aria-expanded');
      trigger.removeAttribute('aria-controls');
      trigger.setAttribute(
        'aria-label',
        document.documentElement.lang === 'el'
          ? 'Switch to English'
          : 'Αλλαγή σε Ελληνικά',
      );
    } else {
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', 'language-options-header');
    }
    if (!mobile.matches && menu.open) {
      menu.close();
      syncMenu();
    }
  };
  placeLanguage();
  scope.listen(mobile, 'change', placeLanguage);
  scope.defer(() => {
    languageHome.insertBefore(language, $('#open-mobile-menu'));
  });

  return {
    dispose() {
      if (menu.open) menu.close();
      scope.dispose();
    },
  };
}
