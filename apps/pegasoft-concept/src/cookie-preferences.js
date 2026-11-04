import { translate as t } from './locale-messages.js';
import { createScope } from '../runtime/runtime-lifecycle.js';
import { storeConsent } from './cookie-consent.js';

/** Shared footer preference dialog; no optional tracking is enabled. */
export function createCookiePreferences(document) {
  const scope = createScope(),
    window = document.defaultView;
  const dialog = document.querySelector('#cookie-preferences');
  function save(choice) {
    let storage;
    try {
      storage = window.localStorage;
    } catch {
      /* visit only */
    }
    const saved = storeConsent(storage, choice);
    const notice = document.querySelector('#cookie-notice');
    if (notice) notice.hidden = true;
    document.querySelector('#cookie-status').textContent = t(
      saved
        ? 'Preferences saved. No optional trackers enabled.'
        : 'Preferences apply to this visit only. This browser could not save them.',
    );
    if (dialog.open) dialog.close();
  }
  scope.listen(document.querySelector('#open-cookies'), 'click', () =>
    dialog.showModal(),
  );
  scope.listen(document.querySelector('[data-close-cookies]'), 'click', () =>
    dialog.close(),
  );
  scope.listen(document.querySelector('#save-cookies'), 'click', () =>
    save('settings'),
  );
  return {
    save,
    dispose() {
      if (dialog.open) dialog.close();
      scope.dispose();
    },
  };
}
