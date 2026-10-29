export const CONSENT_KEY = 'pegasoft.cookie-preferences';
const choices = ['accept', 'reject', 'settings'];
/** Only an explicit choice for the current inventory suppresses the landing notice. */
export function readConsent(storage) {
  try {
    const value = JSON.parse(storage?.getItem(CONSENT_KEY) ?? 'null');
    return value?.version === 1 &&
      choices.includes(value.choice) &&
      value.necessary === true &&
      value.analytics === false &&
      value.marketing === false
      ? value
      : null;
  } catch {
    return null;
  }
}
/** Accepting cannot enable categories absent from this site's tracker inventory. */
export function storeConsent(storage, choice) {
  if (!choices.includes(choice)) throw new Error('Unknown cookie choice');
  try {
    if (!storage) return false;
    storage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        version: 1,
        choice,
        necessary: true,
        analytics: false,
        marketing: false,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
