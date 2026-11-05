/** Server credentials never belong here. Requests remain same-origin and opt-in. */
export function createContactTransport({
  path,
  origin,
  fetcher = globalThis.fetch,
}) {
  if (
    !/^\/api\/[a-z0-9/-]{1,60}$/.test(path || '') ||
    new URL(path, origin).origin !== origin
  )
    throw Error('Contact endpoint must be same-origin.');
  return (body) =>
    fetcher(path, {
      method: 'POST',
      body,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: globalThis.AbortSignal.timeout(30000),
    });
}
const scripts = new WeakMap();
export function createTurnstileChallenge({ document, siteKey, container }) {
  const win = document.defaultView;
  let widget = null,
    cancel = null,
    disposed = false;
  function load() {
    if (win.turnstile?.render) return Promise.resolve(win.turnstile);
    if (scripts.has(document)) return scripts.get(document);
    const pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      const finish = (error) => {
        win.clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) {
          script.remove();
          scripts.delete(document);
          reject(Error('Verification unavailable'));
        } else resolve(win.turnstile);
      };
      const timer = win.setTimeout(() => finish(true), 10000);
      script.onload = () => finish(!win.turnstile?.render);
      script.onerror = () => finish(true);
      document.head.append(script);
    });
    scripts.set(document, pending);
    return pending;
  }
  const clear = () => {
    if (widget !== null) {
      win.turnstile?.remove(widget);
      widget = null;
    }
  };
  return {
    async run({ action, language }) {
      const api = await load();
      if (disposed) throw Error('disposed');
      cancel?.();
      clear();
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = (token) => {
          if (done) return;
          done = true;
          win.clearTimeout(timer);
          cancel = null;
          token ? resolve(token) : reject(Error('Verification incomplete'));
        };
        const timer = win.setTimeout(() => finish(), 120000);
        cancel = () => finish();
        try {
          widget = api.render(container(), {
            sitekey: siteKey,
            action,
            language,
            size:
              container().getBoundingClientRect().width < 300
                ? 'compact'
                : 'flexible',
            execution: 'execute',
            appearance: 'interaction-only',
            'response-field': false,
            callback: (token) => finish(token),
            'error-callback': () => finish(),
            'expired-callback': () => finish(),
            'timeout-callback': () => finish(),
          });
          api.execute(widget);
        } catch {
          finish();
        }
      });
    },
    reset() {
      cancel?.();
      clear();
    },
    dispose() {
      disposed = true;
      cancel?.();
      clear();
    },
  };
}
