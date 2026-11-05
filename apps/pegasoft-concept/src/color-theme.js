import { createScope } from '../runtime/runtime-lifecycle.js';

/** Local appearance preference only; no analytics, network request or scene remount. */
export function createColorTheme(document) {
  const scope = createScope();
  const controls = [...document.querySelectorAll('[data-theme-toggle]')];
  const html = document.documentElement;
  let theme = html.dataset.colorTheme === 'light' ? 'light' : 'dark';
  function refresh() {
    const greek = html.lang === 'el';
    html.dataset.colorTheme = theme;
    controls.forEach((button) => {
      button.setAttribute('aria-checked', String(theme === 'light'));
      button.setAttribute('aria-label', greek ? 'Φωτεινό θέμα' : 'Light theme');
      button.title = greek
        ? theme === 'light'
          ? 'Αλλαγή σε σκοτεινό θέμα'
          : 'Αλλαγή σε φωτεινό θέμα'
        : theme === 'light'
          ? 'Switch to dark theme'
          : 'Switch to light theme';
    });
  }
  controls.forEach((button) =>
    scope.listen(button, 'click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      try {
        document.defaultView.localStorage.setItem('pegasoft-theme', theme);
      } catch {
        /* Visit-only preference when storage is unavailable. */
      }
      refresh();
      document.defaultView.dispatchEvent(
        new document.defaultView.Event('pegasoft-theme-change'),
      );
    }),
  );
  refresh();
  return { refresh, dispose: () => scope.dispose() };
}
