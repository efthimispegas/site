import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { JSDOM } from 'jsdom';
import { createContactForm } from '../../pegasoft-concept/src/contact-form.js';
import { setLocale } from '../../pegasoft-concept/src/locale-messages.js';
import { createScope } from '../../pegasoft-concept/runtime/runtime-lifecycle.js';
import {
  createTurnstileChallenge,
  createContactTransport,
} from '../../pegasoft-concept/src/contact-transport.js';
import { contactConfig } from '../../pegasoft-concept/tools/deployment-config.mjs';
import { deploymentConfiguration } from '../tools/deployment-config.mjs';
import { deploymentFixture } from './deployment-fixture.mjs';
const publicSettings = {
  enabled: true,
  path: '/api/intake',
  siteKey: 'synthetic-public-site-key',
  privacyVersion: 'synthetic-v1',
  privacyPath: '/privacy/',
};
function formFixture(language = 'en') {
  setLocale(language);
  const dom = new JSDOM('<main><div id="panel"></div></main>', {
      url: 'https://example.test/en/',
    }),
    panel = dom.window.document.querySelector('#panel'),
    scope = (() => {
      const previous = globalThis.AbortController;
      globalThis.AbortController = dom.window.AbortController;
      try {
        return createScope();
      } finally {
        globalThis.AbortController = previous;
      }
    })(),
    sent = [],
    challenges = [];
  const view = createContactForm({
    panel,
    scope,
    config: publicSettings,
    dependencies: {
      challenge: {
        run: async ({ action, language }) => {
          challenges.push({ action, language });
          return 'synthetic-' + challenges.length;
        },
        reset() {},
        dispose() {},
      },
      send: async (body) => {
        sent.push(body);
        return Response.json({ code: 'submitted' }, { status: 201 });
      },
    },
  });
  view.show('General');
  const form = panel.querySelector('form');
  for (const [name, value] of Object.entries({
    name: 'Synthetic',
    email: 'applicant@example.test',
    message: 'Synthetic',
  }))
    form.elements.namedItem(name).value = value;
  return {
    dom,
    panel,
    scope,
    view,
    form,
    sent,
    challenges,
    dispose() {
      scope.dispose();
      dom.window.close();
      setLocale('en');
    },
  };
}
async function submit(f) {
  f.form.dispatchEvent(
    new f.dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  for (let i = 0; i < 100 && f.form.hasAttribute('aria-busy'); i++)
    await pause(5);
}
test('staged UI requires explicit privacy confirmation and sends one same-origin Contact submission with fresh challenge', async () => {
  const f = formFixture();
  try {
    await submit(f);
    assert.equal(f.sent.length, 0);
    assert.equal(f.challenges.length, 0);
    f.form.elements.namedItem('privacyAccepted').checked = true;
    f.form.elements
      .namedItem('privacyAccepted')
      .dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
    await submit(f);
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].get('privacyAccepted'), 'true');
    assert.equal(f.sent[0].get('privacyVersion'), 'synthetic-v1');
    assert.equal(f.sent[0].get('audience'), 'General');
    assert.equal(f.sent[0].get('cv'), null);
    assert.equal(f.form.dataset.received, 'true');
    await submit(f);
    assert.equal(f.sent.length, 1);
  } finally {
    f.dispose();
  }
});
test('Greek UI renders consent/send text and Careers cannot render an upload form', () => {
  const f = formFixture('el');
  try {
    assert.equal(
      f.form.querySelector('[type=submit]').textContent,
      'Αποστολή μηνύματος',
    );
    assert.ok(
      f.form
        .querySelector('.contact-privacy')
        .textContent.includes('απορρήτου'),
    );
    assert.equal(f.view.show('Careers'), true);
    assert.equal(f.panel.querySelector('form'), null);
    assert.equal(f.panel.querySelector('[type=file]'), null);
  } finally {
    f.dispose();
  }
});
test('busy Contact form blocks switching/double submit and failures preserve draft values', async () => {
  const f = formFixture();
  try {
    f.form.elements.namedItem('privacyAccepted').checked = true;
    f.form.elements
      .namedItem('privacyAccepted')
      .dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
    const pending = submit(f);
    assert.equal(f.view.show('Investor'), false);
    await pending;
    assert.equal(f.form.elements.namedItem('message').value, 'Synthetic');
    assert.equal(f.form.hasAttribute('aria-busy'), false);
  } finally {
    f.dispose();
  }
});
test('transport rejects external paths and neither forwards cookies nor follows redirects', async () => {
  assert.throws(() =>
    createContactTransport({
      path: 'https://foreign.test',
      origin: 'https://example.test',
    }),
  );
  let options;
  const send = createContactTransport({
    path: '/api/intake',
    origin: 'https://example.test',
    fetcher: async (path, input) => {
      assert.equal(path, '/api/intake');
      options = input;
      return new Response(null, { status: 503 });
    },
  });
  await send(new FormData());
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal);
  assert.equal(options.headers, undefined);
});
test('Turnstile adapter explicitly renders a fresh contact challenge per attempt and removes its widgets', async () => {
  const dom = new JSDOM('<div id="challenge"></div>', {
    url: 'https://example.test',
  });
  const calls = [],
    removed = [];
  let settings;
  dom.window.turnstile = {
    render: (_el, options) => {
      settings = options;
      calls.push(options);
      return calls.length;
    },
    execute: () => settings.callback('fresh-' + calls.length),
    remove: (id) => removed.push(id),
  };
  const challenge = createTurnstileChallenge({
    document: dom.window.document,
    siteKey: publicSettings.siteKey,
    container: () => dom.window.document.querySelector('#challenge'),
  });
  try {
    assert.equal(
      await challenge.run({ action: 'contact', language: 'el' }),
      'fresh-1',
    );
    assert.equal(
      await challenge.run({ action: 'contact', language: 'en' }),
      'fresh-2',
    );
    assert.equal(calls[0].action, 'contact');
    assert.equal(calls[0]['response-field'], false);
    assert.equal(calls[0].language, 'el');
    assert.deepEqual(removed, [1]);
  } finally {
    challenge.dispose();
    dom.window.close();
  }
  assert.deepEqual(removed, [1, 2]);
});
test('public form settings fail closed and never export backend credentials', () => {
  assert.deepEqual(contactConfig({ RESEND_API_KEY: 'secret' }), {
    enabled: false,
  });
  assert.throws(() => contactConfig({ PEGASOFT_CONTACT_FORM_ENABLED: 'true' }));
  const env = {
    PEGASOFT_CONTACT_FORM_ENABLED: 'true',
    PEGASOFT_CONTACT_QUALIFIED: 'true',
    PEGASOFT_INTAKE_PATH: publicSettings.path,
    PEGASOFT_TURNSTILE_SITE_KEY: publicSettings.siteKey,
    PEGASOFT_PRIVACY_VERSION: publicSettings.privacyVersion,
    PEGASOFT_PRIVACY_PATH: publicSettings.privacyPath,
    RESEND_API_KEY: 'must-never-publish',
  };
  assert.ok(!JSON.stringify(contactConfig(env)).includes('must-never'));
  assert.equal(contactConfig(env).careersEnabled, false);
  assert.throws(() =>
    contactConfig({ ...env, PEGASOFT_CAREERS_FORM_ENABLED: 'true' }),
  );
});
test('active backend routes need separate Contact qualification and still force Careers off', () => {
  const env = {
    ...deploymentFixture,
    PEGASOFT_INTAKE_ENABLED: 'true',
    PEGASOFT_CONTACT_ACTIVATION_READY: 'true',
    PEGASOFT_INTAKE_CAPACITY_VERIFIED: 'true',
    PEGASOFT_INTAKE_ZONE_ID: 'c'.repeat(32),
  };
  const active = deploymentConfiguration(env);
  assert.equal(active.expected.vars.PEGASOFT_INTAKE_ENABLED, 'true');
  assert.equal(active.expected.vars.PEGASOFT_CAREERS_ENABLED, 'false');
  assert.deepEqual(active.expected.routes, [
    {
      pattern: 'intake.example/api/intake*',
      zone_id: env.PEGASOFT_INTAKE_ZONE_ID,
    },
  ]);
  for (const change of [
    { PEGASOFT_CONTACT_ACTIVATION_READY: '' },
    { PEGASOFT_INTAKE_CAPACITY_VERIFIED: 'false' },
    { PEGASOFT_INTAKE_ZONE_ID: '' },
    { PEGASOFT_CAREERS_ENABLED: 'true' },
  ])
    assert.throws(() => deploymentConfiguration({ ...env, ...change }));
});
test('full bilingual privacy draft stays noindex, escapes public configuration and blocks form release before approval', async () => {
  const { privacyConfig, renderPrivacy } =
    await import('../../pegasoft-concept/tools/privacy-page.mjs');
  const { localizedPages } =
    await import('../../pegasoft-concept/tools/localized-pages.mjs');
  const draft = privacyConfig({
    PEGASOFT_COMPANY_LEGAL_NAME: '<Synthetic>',
    RESEND_API_KEY: 'must-never-publish',
  });
  assert.equal(draft.approved, false);
  for (const language of ['en', 'el']) {
    const html = renderPrivacy(language, draft);
    assert.ok(html.includes(`lang="${language}"`));
    assert.ok(html.includes('noindex, nofollow'));
    assert.ok(html.includes('&lt;Synthetic&gt;'));
    assert.ok(!html.includes('must-never-publish'));
    assert.ok(
      html.includes('/' + (language === 'en' ? 'el' : 'en') + '/privacy/'),
    );
  }
  assert.throws(() =>
    localizedPages({ contact: publicSettings, privacy: draft }),
  );
  assert.throws(() => privacyConfig({ PEGASOFT_PRIVACY_APPROVED: 'true' }));
  assert.throws(() => privacyConfig({ PEGASOFT_ANALYTICS_ENABLED: 'true' }));
});
