import { translate as t } from './locale-messages.js';
import { createScope } from '../runtime/runtime-lifecycle.js';
import { createContactForm } from './contact-form.js';
import { readConsent, storeConsent } from './cookie-consent.js';
/** Ordinary DOM interactions. No animation clock, network submission or tracker loading. */
export function createContentController({ root, journey }) {
  const document = root.ownerDocument,
    window = document.defaultView,
    scope = createScope(),
    $ = (s) => root.querySelector(s);

  let mounted = false,
    selected = 'General';
  const tabs = [...root.querySelectorAll('[data-contact-tab]')].filter(
      (el) => el.getAttribute('role') === 'tab',
    ),
    panel = $('#contact-field-plan'),
    dialog = $('#cookie-preferences'),
    menu = document.querySelector('#mobile-navigation'),
    contactForm = createContactForm({ panel, scope });
  function saveConsent(choice) {
    let storage;
    try {
      storage = window.localStorage;
    } catch {}
    const saved = storeConsent(storage, choice);
    $('#cookie-notice').hidden = true;
    $('#cookie-status').textContent = t(
      saved
        ? 'Preferences saved. No optional trackers enabled.'
        : 'Preferences apply to this visit only. This browser could not save them.',
    );
    if (dialog.open) dialog.close();
  }
  function selectTab(value) {
    selected = value;
    tabs.forEach((tab) => {
      const active = tab.dataset.contactTab === value;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    contactForm.show(value);
    panel.setAttribute(
      'aria-labelledby',
      tabs.find((tab) => tab.dataset.contactTab === value).id,
    );
    $('#contact').dataset.tab = value;
  }
  function syncMenu() {
    const open = menu.open;
    $('#open-mobile-menu').setAttribute('aria-expanded', String(open));
    $('#open-mobile-menu').setAttribute(
      'aria-label',
      t(open ? 'Close menu' : 'Open menu'),
    );
    document.body.dataset.menuOpen = String(open);
  }
  function go(target) {
    if (menu.open) menu.close();
    const reduced = window.matchMedia(
        '(prefers-reduced-motion:reduce)',
      ).matches,
      behavior = reduced ? 'instant' : 'smooth';
    if (target === 'services') journey.navigate('services');
    else if (target === 'about') journey.navigate('about');
    else {
      if (target === '#website-footer')
        $('[data-footer-mode=industries]').click();
      $(target).scrollIntoView({ block: 'start', behavior });
    }
  }
  function mount() {
    if (mounted || scope.disposed) return;
    mounted = true;
    selectTab(selected);
    scope.listen(document, 'click', (event) => {
      const el = event.target.closest('[data-page-target]');
      if (!el) return;
      event.preventDefault();
      go(el.dataset.pageTarget);
    });
    tabs.forEach((tab, i) => {
      scope.listen(tab, 'click', () => selectTab(tab.dataset.contactTab));
      scope.listen(tab, 'keydown', (event) => {
        let index;
        if (event.key === 'ArrowRight') index = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft')
          index = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[index].dataset.contactTab);
        tabs[index].focus();
      });
    });
    document.querySelectorAll('[data-careers-action]').forEach((el) =>
      scope.listen(el, 'click', () => {
        selectTab('Careers');
        go('#contact');
      }),
    );
    scope.listen($('#open-mobile-menu'), 'click', () => {
      menu.showModal();
      document
        .querySelector('#mobile-menu-title')
        .focus({ preventScroll: true });
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
    scope.listen($('#open-cookies'), 'click', () => {
      dialog.showModal();
    });
    scope.listen($('[data-close-cookies]'), 'click', () => dialog.close());
    scope.listen($('#save-cookies'), 'click', () => saveConsent('settings'));
    scope.listen($('[data-open-cookie-settings]'), 'click', () =>
      dialog.showModal(),
    );
    root
      .querySelectorAll('[data-cookie-choice]')
      .forEach((button) =>
        scope.listen(button, 'click', () =>
          saveConsent(button.dataset.cookieChoice),
        ),
      );
    const rail = $('#testimonials-rail');
    function advance(direction) {
      const card = rail.querySelector('article'),
        step = card.getBoundingClientRect().width + 24;
      rail.scrollBy({
        left: direction * step,
        behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }
    root
      .querySelectorAll('[data-testimonial-step]')
      .forEach((button) =>
        scope.listen(button, 'click', () =>
          advance(Number(button.dataset.testimonialStep)),
        ),
      );
    scope.listen(rail, 'keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        advance(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        rail.scrollTo({
          left: event.key === 'Home' ? 0 : rail.scrollWidth,
          behavior: 'instant',
        });
      }
    });
    scope.defer(() => {
      $('#cookie-notice').hidden = true;
      if (dialog.open) dialog.close();
      if (menu.open) menu.close();
    });
  }
  function followInitialHash() {
    if (scope.disposed) return;
    const id = window.location.hash.slice(1);
    if (
      id === 'trust-evidence' &&
      !document.body.classList.contains('static-journey')
    ) {
      journey.navigate('trust', { behavior: 'instant' });
      return;
    }
    if (
      ['trust-evidence', 'partners', 'insights', 'faq', 'contact'].includes(id)
    )
      $('#' + id).scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  return {
    mount,
    followInitialHash,
    showLandingConsent() {
      if (scope.disposed) return;
      let storage;
      try {
        storage = window.localStorage;
      } catch {}
      $('#cookie-notice').hidden = Boolean(readConsent(storage));
    },
    refreshLanguage() {
      panel
        .querySelectorAll('input,select,textarea')
        .forEach((input) => input.setCustomValidity(''));
    },
    dispose() {
      scope.dispose();
      mounted = false;
    },
    get selected() {
      return selected;
    },
  };
}
