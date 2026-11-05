import { pageScroll } from './page-scroll.js';
import { locale } from './locale-messages.js';

/** Shared keyboard, focus, dismissal and mobile language interaction. */
export function createLanguageMenus({ document, onSelect }) {
  const scrolling = pageScroll(document);
  const menus = [...document.querySelectorAll('[data-language-menu]')],
    cleanups = [];
  function listen(element, type, handler) {
    element.addEventListener(type, handler);
    cleanups.push(() => element.removeEventListener(type, handler));
  }
  function close(menu, { focus = false } = {}) {
    const trigger = menu.querySelector('[data-language-trigger]');
    menu.querySelector('[role=menu]').hidden = true;
    if (menu.closest('#mobile-language-slot'))
      trigger.removeAttribute('aria-expanded');
    else trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus({ preventScroll: true });
  }
  function closeAll(except) {
    menus.filter((menu) => menu !== except).forEach((menu) => close(menu));
  }
  for (const menu of menus) {
    const trigger = menu.querySelector('[data-language-trigger]'),
      panel = menu.querySelector('[role=menu]'),
      options = [...menu.querySelectorAll('[data-locale]')];
    const open = ({ keyboard = false } = {}) => {
      closeAll(menu);
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      if (keyboard)
        options
          .find((button) => button.dataset.locale === locale())
          .focus({ preventScroll: true });
    };
    listen(trigger, 'click', (event) => {
      if (menu.closest('#mobile-language-slot')) {
        onSelect(locale() === 'el' ? 'en' : 'el');
        close(menu);
        trigger.removeAttribute('aria-expanded');
        return;
      }
      panel.hidden ? open({ keyboard: event.detail === 0 }) : close(menu);
    });
    listen(trigger, 'keydown', (event) => {
      if (menu.closest('#mobile-language-slot')) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        open({ keyboard: true });
        if (event.key === 'ArrowUp') options.at(-1).focus();
      }
    });
    options.forEach((button) =>
      listen(button, 'click', () => {
        if (button.dataset.locale !== locale()) {
          onSelect(button.dataset.locale);
        }
        close(menu, { focus: true });
      }),
    );
    listen(menu, 'keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close(menu, { focus: true });
        return;
      }
      if (panel.hidden) return;
      let index = options.indexOf(document.activeElement);
      if (event.key === 'ArrowDown') index = (index + 1) % options.length;
      else if (event.key === 'ArrowUp')
        index = (index - 1 + options.length) % options.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = options.length - 1;
      else if (event.key === 'Tab') {
        close(menu);
        return;
      } else return;
      event.preventDefault();
      options[index].focus();
    });
    listen(menu, 'focusout', (event) => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget))
        close(menu);
    });
  }
  listen(document, 'pointerdown', (event) => {
    for (const menu of menus) if (!menu.contains(event.target)) close(menu);
  });
  // Returning focus aids keyboard users; resumed page scrolling ends that menu interaction.
  let menuScrollY = scrolling.y;
  cleanups.push(
    scrolling.listen(() => {
      if (Math.abs(scrolling.y - menuScrollY) < 4) return;
      menuScrollY = scrolling.y;
      for (const menu of menus) {
        const focused = menu.contains(document.activeElement)
          ? document.activeElement
          : null;
        close(menu);
        focused?.blur();
      }
    }),
  );
  return {
    dispose() {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
