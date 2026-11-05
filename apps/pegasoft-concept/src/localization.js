import { createLanguageMenus } from './language-menu.js';
import {
  resolveLocale,
  setLocale,
  locale,
  translate,
  messageSource,
  localeUrl,
} from './locale-messages.js';
export { translate, locale } from './locale-messages.js';
const attributes = ['aria-label', 'alt', 'title', 'placeholder'];
/** Existing DOM nodes keep ownership; language changes never remount scenes or restart clocks. */
export function translateTree(root, language = locale()) {
  const document = root.ownerDocument ?? root,
    walker = document.createTreeWalker(root, 4);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,[data-user-content]')) continue;
    const raw = node.nodeValue.trim();
    if (!raw) continue;
    const message = parent.dataset.msg ?? messageSource(raw),
      next = translate(message, language);
    if (next !== raw) node.nodeValue = node.nodeValue.replace(raw, next);
  }
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!element.getAttribute) continue;
    for (const attr of attributes) {
      const raw = element.getAttribute(attr);
      if (raw)
        element.setAttribute(attr, translate(messageSource(raw), language));
    }
  }
}
export function createLocalization({ document, onChange = () => {} }) {
  const window = document.defaultView;
  let stored;
  try {
    stored = window.localStorage.getItem('pegasoft.locale');
  } catch {}
  setLocale(
    resolveLocale({
      pathname: window.location.pathname,
      search: window.location.search,
      stored,
    }),
  );
  function apply({ persist = false, notify = true } = {}) {
    document.documentElement.lang = locale();
    document.documentElement.dataset.locale = locale();
    translateTree(document.body);
    document
      .querySelectorAll('[data-locale]')
      .forEach((button) =>
        button.setAttribute(
          'aria-checked',
          String(button.dataset.locale === locale()),
        ),
      );
    document.querySelectorAll('[data-language-trigger]').forEach((button) => {
      button.setAttribute(
        'aria-label',
        button.closest('#mobile-language-slot')
          ? locale() === 'el'
            ? 'Switch to English'
            : 'Αλλαγή σε Ελληνικά'
          : locale() === 'el'
            ? 'Γλώσσα: Ελληνικά'
            : 'Language: English',
      );
      button.querySelector('[data-language-flag]').textContent =
        locale() === 'el' ? '🇬🇷' : '🇬🇧';
    });
    const url = localeUrl(window.location.href, locale());
    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash,
    );
    const description = translate(
      'Strategy, design and engineering, carried through by one accountable team.',
    );
    const artworkAlt = translate(
      'Pegasoft — Every idea engineered to matter, alongside the blue connected globe.',
    );
    const values = {
      'og:image:alt': artworkAlt,
      'twitter:image:alt': artworkAlt,
      'og:title': translate('Pegasoft — Every idea engineered to matter.'),
      'twitter:title': translate('Pegasoft — Every idea engineered to matter.'),
      'og:description': description,
      'twitter:description': description,
      description: description,
      'og:url': url.origin + (locale() === 'en' ? '/en/' : '/el/'),
      'og:image':
        url.origin +
        `/assets/social/hero-card-${locale() === 'el' ? 'el-' : ''}20261019.jpg`,
      'twitter:image':
        url.origin +
        `/assets/social/hero-card-${locale() === 'el' ? 'el-' : ''}20261019.jpg`,
    };
    document.querySelectorAll('meta[property],meta[name]').forEach((tag) => {
      const key = tag.getAttribute('property') ?? tag.getAttribute('name');
      if (values[key]) tag.content = values[key];
    });
    if (persist)
      try {
        window.localStorage.setItem('pegasoft.locale', locale());
      } catch {}
    if (notify) onChange(locale());
  }
  apply({ notify: false });
  const menus = createLanguageMenus({
    document,
    onSelect(language) {
      setLocale(language);
      apply({ persist: true });
    },
  });
  const history = () => {
    setLocale(
      resolveLocale({
        pathname: window.location.pathname,
        search: window.location.search,
        stored: locale(),
      }),
    );
    apply();
  };
  window.addEventListener('popstate', history);
  return {
    apply,
    dispose() {
      menus.dispose();
      window.removeEventListener('popstate', history);
    },
  };
}
