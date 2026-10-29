import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Buffer } from 'node:buffer';
/* global structuredClone */

const source = fs.readFileSync(
  new URL('../tools/gmail-retention/Code.js', import.meta.url),
  'utf8',
);
const qualificationSource = fs.readFileSync(
  new URL('../tools/gmail-retention/Qualification.js', import.meta.url),
  'utf8',
);
const now = Date.UTC(2026, 9, 29, 12);
const cutoff = now - 30 * 86400000;
const reference = '12345678-1234-4234-8234-123456789abc';
function message(id = 'abc', overrides = {}) {
  return {
    id,
    internalDate: String(cutoff),
    labelIds: ['Label_intake'],
    payload: {
      headers: [
        { name: 'From', value: 'Website <intake@example.test>' },
        { name: 'To', value: 'owner@example.test' },
        { name: 'Subject', value: 'Website Careers [' + reference + ']' },
      ],
    },
    ...overrides,
  };
}
function fixture(messages = [message()]) {
  const properties = {
    PEGASOFT_GMAIL_MAILBOX: 'owner@example.test',
    PEGASOFT_GMAIL_INTAKE_SENDER: 'intake@example.test',
    PEGASOFT_GMAIL_LABEL_ID: 'Label_intake',
    PEGASOFT_GMAIL_LABEL_NAME: 'Synthetic intake',
    PEGASOFT_GMAIL_RETENTION_DAYS: '30',
  };
  const calls = [],
    logs = [],
    releases = [];
  const getCounts = {};
  const gmail = {
    Users: {
      getProfile: () => ({ emailAddress: 'owner@example.test' }),
      Labels: { get: () => ({ type: 'user', name: 'Synthetic intake' }) },
      Messages: {
        list: (_user, options) => {
          calls.push({ kind: 'list', options });
          return { messages: messages.map(({ id }) => ({ id })) };
        },
        get: (_user, id, options) => {
          calls.push({ kind: 'get', options });
          getCounts[id] = (getCounts[id] || 0) + 1;
          return structuredClone(messages.find((m) => m.id === id));
        },
        batchDelete: ({ ids }, user) => {
          calls.push({ kind: 'delete', ids: [...ids], user });
        },
      },
    },
  };
  const context = vm.createContext({
    Gmail: gmail,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => properties[name] ?? null,
        setProperty: (name, value) => {
          properties[name] = value;
        },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => releases.push(true),
      }),
    },
    console: { log: (value) => logs.push(value) },
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [now]));
      }
      static now() {
        return now;
      }
    },
  });
  vm.runInContext(source, context);
  vm.runInContext(qualificationSource, context);
  return { context, properties, calls, logs, releases, gmail, getCounts };
}
function arm(f) {
  f.context.previewIntakeRetention();
  f.properties.PEGASOFT_GMAIL_DELETE_READY = 'true';
}

test('mail retention preview is read-only, metadata-only and excludes personal data from logs', () => {
  const f = fixture();
  const result = f.context.previewIntakeRetention();
  assert.equal(result.eligible, 1);
  assert.equal(result.deleted, 0);
  assert.ok(!f.calls.some((c) => c.kind === 'delete'));
  assert.ok(
    f.calls
      .filter((c) => c.kind === 'get')
      .every((c) => c.options.format === 'metadata'),
  );
  assert.deepEqual([...f.calls[0].options.labelIds], ['Label_intake']);
  assert.equal(f.calls[0].options.includeSpamTrash, true);
  assert.ok(!f.logs.join().match(/owner@|intake@|Careers|12345678/));
  assert.equal(f.releases.length, 1);
});

test('mail retention deletion requires explicit arm and successful preview of unchanged configuration', () => {
  const f = fixture();
  assert.throws(() => f.context.deleteExpiredIntakeNotifications(), /disabled/);
  f.properties.PEGASOFT_GMAIL_DELETE_READY = 'true';
  assert.throws(() => f.context.deleteExpiredIntakeNotifications(), /disabled/);
  arm(f);
  f.properties.PEGASOFT_GMAIL_INTAKE_SENDER = 'changed@example.test';
  assert.throws(
    () => f.context.deleteExpiredIntakeNotifications(),
    /previewed/,
  );
  assert.ok(!f.calls.some((c) => c.kind === 'delete'));
});

test('mail retention rejects wrong account, system label and unapproved retention', () => {
  for (const modify of [
    (f) => {
      f.gmail.Users.getProfile = () => ({ emailAddress: 'other@example.test' });
    },
    (f) => {
      f.gmail.Users.Labels.get = () => ({
        type: 'system',
        name: 'Synthetic intake',
      });
    },
    (f) => {
      f.properties.PEGASOFT_GMAIL_RETENTION_DAYS = '31';
    },
    (f) => {
      f.properties.PEGASOFT_GMAIL_LABEL_ID = 'INBOX';
    },
  ]) {
    const f = fixture();
    modify(f);
    assert.throws(() => f.context.previewIntakeRetention());
    assert.ok(!f.calls.some((c) => c.kind === 'delete'));
    assert.equal(f.releases.length, 1);
  }
});

test('mail retention never selects recent, unrelated, duplicate-header, sent or draft messages', () => {
  const messages = [
    message('a'),
    message('b', { internalDate: String(cutoff + 1) }),
    message('c', { labelIds: [] }),
    message('d', { labelIds: ['Label_intake', 'SENT'] }),
    message('e', { labelIds: ['Label_intake', 'DRAFT'] }),
    message('f', { internalDate: 'invalid' }),
  ];
  for (const [id, name, value] of [
    ['aa', 'From', 'other@example.test'],
    ['ab', 'From', 'other@example.test, Website <intake@example.test>'],
    ['ac', 'To', 'owner@example.test,other@example.test'],
    ['ad', 'Subject', 'Re: Website Careers [' + reference + ']'],
    ['ae', 'Subject', 'Website Careers [bad-id]'],
  ]) {
    const m = message(id);
    m.payload.headers.find((h) => h.name === name).value = value;
    messages.push(m);
  }
  const duplicate = message('af');
  duplicate.payload.headers.push({
    name: 'From',
    value: 'intake@example.test',
  });
  messages.push(duplicate);
  const f = fixture(messages);
  arm(f);
  const result = f.context.deleteExpiredIntakeNotifications();
  assert.equal(result.requested, 1);
  assert.deepEqual(f.calls.find((c) => c.kind === 'delete').ids, ['a']);
});

test('mail retention rechecks label immediately before deletion and reports API request only', () => {
  const f = fixture();
  arm(f);
  const original = f.gmail.Users.Messages.get;
  f.gmail.Users.Messages.get = (...args) => {
    const m = original(...args);
    if (f.getCounts.abc >= 3) m.labelIds = [];
    return m;
  };
  assert.equal(f.context.deleteExpiredIntakeNotifications().requested, 0);
  assert.ok(!f.calls.some((c) => c.kind === 'delete'));
  f.gmail.Users.Messages.get = original;
  const result = f.context.deleteExpiredIntakeNotifications();
  assert.equal(result.mode, 'delete-requested');
  assert.equal(result.requested, 1);
  assert.ok(f.properties.PEGASOFT_GMAIL_LAST_SUCCESS_AT);
});

test('mail retention paginates before mutation and fails safely on excessive or looping results', () => {
  const f = fixture([message('a'), message('b')]);
  f.gmail.Users.Messages.list = (_user, options) =>
    options.pageToken
      ? { messages: [{ id: 'b' }] }
      : { messages: [{ id: 'a' }], nextPageToken: 'page-two' };
  assert.equal(f.context.previewIntakeRetention().eligible, 2);
  const looping = fixture();
  looping.gmail.Users.Messages.list = () => ({
    messages: [{ id: 'abc' }],
    nextPageToken: 'same',
  });
  assert.throws(() => looping.context.previewIntakeRetention(), /pagination/);
  const overLimit = fixture();
  overLimit.gmail.Users.Messages.list = () => ({
    messages: Array.from({ length: 201 }, (_, i) => ({
      id: (i + 1).toString(16),
    })),
  });
  assert.throws(() => overLimit.context.previewIntakeRetention(), /backlog/);
  assert.ok(!overLimit.calls.some((c) => c.kind === 'delete'));
});

test('mail retention ships with read-only permission; full deletion permission is a separate owner step', () => {
  const read = (name) =>
    JSON.parse(
      fs.readFileSync(
        new URL('../tools/gmail-retention/' + name, import.meta.url),
        'utf8',
      ),
    );
  assert.deepEqual(read('appsscript.json').oauthScopes, [
    'https://www.googleapis.com/auth/gmail.readonly',
  ]);
  assert.deepEqual(read('appsscript-deletion.json').oauthScopes, [
    'https://mail.google.com/',
  ]);
  assert.deepEqual(read('appsscript-qualification.json').oauthScopes, [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.insert',
    'https://www.googleapis.com/auth/gmail.labels',
  ]);
  assert.ok(!source.includes('ScriptApp.newTrigger'));
  assert.ok(!source.includes('GmailApp'));
});

test('mail retention first preview resolves one exact user label and pins its ID without arming deletion', () => {
  const f = fixture();
  delete f.properties.PEGASOFT_GMAIL_LABEL_ID;
  f.gmail.Users.Labels.list = () => ({
    labels: [
      { id: 'Label_other', type: 'user', name: 'Unrelated' },
      { id: 'Label_intake', type: 'user', name: 'Synthetic intake' },
    ],
  });
  assert.equal(f.context.previewIntakeRetention().eligible, 1);
  assert.equal(f.properties.PEGASOFT_GMAIL_LABEL_ID, 'Label_intake');
  assert.equal(f.properties.PEGASOFT_GMAIL_DELETE_READY, undefined);
  const absent = fixture();
  delete absent.properties.PEGASOFT_GMAIL_LABEL_ID;
  absent.gmail.Users.Labels.list = () => ({ labels: [] });
  assert.throws(
    () => absent.context.previewIntakeRetention(),
    /dedicated label/,
  );
});

function qualificationFixture() {
  const records = [];
  const f = fixture(records);
  f.properties.PEGASOFT_GMAIL_TEST_LABEL_NAME =
    'Synthetic retention qualification';
  f.gmail.Users.Labels.list = () => ({
    labels: [{ id: 'Label_intake', name: 'Synthetic intake', type: 'user' }],
  });
  f.gmail.Users.Labels.get = (_user, id) => ({
    id,
    type: 'user',
    name:
      id === 'Label_intake'
        ? 'Synthetic intake'
        : f.properties.PEGASOFT_GMAIL_TEST_LABEL_NAME,
  });
  f.gmail.Users.Labels.create = (resource, user) => {
    f.calls.push({ kind: 'create-label', resource, user });
    return { id: 'Label_test' };
  };
  f.context.Utilities = {
    getUuid: () => reference,
    base64EncodeWebSafe: (text) => Buffer.from(text).toString('base64url'),
  };
  f.gmail.Users.Messages.insert = (resource, user, media, options) => {
    assert.equal(media, null);
    f.calls.push({
      kind: 'insert',
      user,
      options,
      labels: [...resource.labelIds],
    });
    const raw = Buffer.from(resource.raw, 'base64url').toString('utf8');
    const headers = raw
      .split('\r\n\r\n')[0]
      .split('\r\n')
      .map((line) => {
        const colon = line.indexOf(':');
        return {
          name: line.slice(0, colon),
          value: line.slice(colon + 1).trim(),
        };
      });
    const id = 'a' + (records.length + 1);
    records.push({
      id,
      labelIds: [...resource.labelIds],
      internalDate: String(
        Date.parse(headers.find((h) => h.name === 'Date').value),
      ),
      payload: { headers },
    });
    assert.match(raw, /No applicant data/);
    return { id };
  };
  f.gmail.Users.Messages.batchDelete = ({ ids }, user) => {
    f.calls.push({ kind: 'delete', ids: [...ids], user });
    for (const id of ids)
      records.splice(
        records.findIndex((r) => r.id === id),
        1,
      );
  };
  return { ...f, records };
}

test('synthetic qualification stays inert by default and never reuses the production or an existing label', () => {
  const f = qualificationFixture();
  assert.throws(() => f.context.createIntakeRetentionFixtures(), /disabled/);
  assert.ok(
    !f.calls.some((c) => c.kind === 'create-label' || c.kind === 'insert'),
  );
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  f.properties.PEGASOFT_GMAIL_TEST_LABEL_NAME = 'Synthetic intake';
  assert.throws(() => f.context.createIntakeRetentionFixtures(), /disabled/);
  f.properties.PEGASOFT_GMAIL_TEST_LABEL_NAME = 'Another existing label';
  f.gmail.Users.Labels.list = () => ({
    labels: [{ name: 'Another existing label', id: 'Label_existing' }],
  });
  assert.throws(
    () => f.context.createIntakeRetentionFixtures(),
    /existing labels/,
  );
});

test('synthetic qualification creates three age/content controls without sending or modifying existing mail', () => {
  const f = qualificationFixture();
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  const result = f.context.createIntakeRetentionFixtures();
  assert.equal(result.created, 3);
  assert.equal(result.sent, 0);
  assert.equal(result.deleted, 0);
  assert.equal(f.records.length, 3);
  assert.equal(Number(f.records[0].internalDate), now - 31 * 86400000);
  assert.equal(Number(f.records[1].internalDate), now - 86400000);
  assert.ok(
    f.records.every(
      (r) => r.labelIds.length === 1 && r.labelIds[0] === 'Label_test',
    ),
  );
  assert.ok(
    f.calls
      .filter((c) => c.kind === 'insert')
      .every((c) => c.options.internalDateSource === 'dateHeader'),
  );
  assert.throws(
    () => f.context.createIntakeRetentionFixtures(),
    /already recorded/,
  );
});

test('synthetic qualification preview selects one expired fixture and preserves both controls', () => {
  const f = qualificationFixture();
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  f.context.createIntakeRetentionFixtures();
  const result = f.context.previewIntakeRetentionFixtures();
  assert.equal(result.eligible, 1);
  assert.equal(result.controlsProtected, 2);
  assert.equal(result.deleted, 0);
  assert.equal(f.properties.PEGASOFT_GMAIL_FIXTURE_PREVIEWED, 'true');
  assert.equal(f.properties.PEGASOFT_GMAIL_DELETE_READY, undefined);
  assert.ok(!f.calls.some((c) => c.kind === 'delete'));
});

test('synthetic qualification rejects changed config, foreign membership and markers before deletion', () => {
  for (const mutate of [
    (f) => {
      f.properties.PEGASOFT_GMAIL_INTAKE_SENDER = 'changed@example.test';
    },
    (f) => {
      f.records[0].labelIds.push('Label_intake');
    },
    (f) => {
      f.records[0].payload.headers.find(
        (h) => h.name === 'X-Pegasoft-Retention-Fixture',
      ).value = 'wrong';
    },
    (f) => {
      f.records.push(message('aff'));
    },
    (f) => {
      f.gmail.Users.Messages.list = () => ({
        messages: [{ id: 'a1' }, { id: 'a1' }, { id: 'a2' }],
      });
    },
  ]) {
    const f = qualificationFixture();
    f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
    f.context.createIntakeRetentionFixtures();
    mutate(f);
    assert.throws(() => f.context.previewIntakeRetentionFixtures());
    assert.ok(!f.calls.some((c) => c.kind === 'delete'));
  }
});

test('synthetic fixture deletion is separately armed and requests only the known expired ID once', () => {
  const f = qualificationFixture();
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  f.context.createIntakeRetentionFixtures();
  assert.throws(
    () => f.context.deleteExpiredIntakeRetentionFixture(),
    /not authorized/,
  );
  f.context.previewIntakeRetentionFixtures();
  assert.throws(
    () => f.context.deleteExpiredIntakeRetentionFixture(),
    /not authorized/,
  );
  f.properties.PEGASOFT_GMAIL_FIXTURE_DELETE_READY = 'true';
  assert.equal(f.context.deleteExpiredIntakeRetentionFixture().requested, 1);
  assert.deepEqual(f.calls.find((c) => c.kind === 'delete').ids, ['a1']);
  assert.deepEqual(
    f.records.map((r) => r.id),
    ['a2', 'a3'],
  );
  assert.equal(f.properties.PEGASOFT_GMAIL_DELETE_READY, undefined);
  assert.throws(
    () => f.context.deleteExpiredIntakeRetentionFixture(),
    /complete/,
  );
});

test('synthetic creation failure preserves partial IDs and never auto-deletes or retries', () => {
  const f = qualificationFixture();
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  const insert = f.gmail.Users.Messages.insert;
  let count = 0;
  f.gmail.Users.Messages.insert = (...args) => {
    if (++count === 2) throw new Error('synthetic API failure');
    return insert(...args);
  };
  assert.throws(
    () => f.context.createIntakeRetentionFixtures(),
    /synthetic API failure/,
  );
  const state = JSON.parse(f.properties.PEGASOFT_GMAIL_FIXTURE_STATE);
  assert.equal(state.status, 'preparing');
  assert.equal(state.messages.length, 1);
  assert.ok(!f.calls.some((c) => c.kind === 'delete'));
  assert.throws(
    () => f.context.createIntakeRetentionFixtures(),
    /already recorded/,
  );
});

test('explicit recovery resumes only an empty recorded fixture label without duplication', () => {
  const f = qualificationFixture();
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  const insert = f.gmail.Users.Messages.insert;
  f.gmail.Users.Messages.insert = () => {
    throw new Error('before insertion');
  };
  assert.throws(
    () => f.context.createIntakeRetentionFixtures(),
    /before insertion/,
  );
  f.gmail.Users.Messages.insert = insert;
  assert.equal(f.context.resumeEmptyIntakeRetentionFixtures().created, 3);
  assert.equal(f.calls.filter((c) => c.kind === 'create-label').length, 1);
  assert.equal(f.records.length, 3);
  assert.throws(
    () => f.context.resumeEmptyIntakeRetentionFixtures(),
    /empty recorded/,
  );
  assert.equal(f.context.previewIntakeRetentionFixtures().eligible, 1);
});

test('empty-fixture recovery rejects partial insertions, foreign mail and config changes', () => {
  for (const mutate of [
    (f) => {
      f.records.push(message('b'));
    },
    (f) => {
      const s = JSON.parse(f.properties.PEGASOFT_GMAIL_FIXTURE_STATE);
      s.messages.push({ id: 'b', kind: 'expired' });
      f.properties.PEGASOFT_GMAIL_FIXTURE_STATE = JSON.stringify(s);
    },
    (f) => {
      f.properties.PEGASOFT_GMAIL_INTAKE_SENDER = 'changed@example.test';
    },
    (f) => {
      f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'false';
    },
  ]) {
    const f = qualificationFixture();
    f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
    const insert = f.gmail.Users.Messages.insert;
    f.gmail.Users.Messages.insert = () => {
      throw new Error('before insertion');
    };
    assert.throws(() => f.context.createIntakeRetentionFixtures());
    f.gmail.Users.Messages.insert = insert;
    mutate(f);
    assert.throws(() => f.context.resumeEmptyIntakeRetentionFixtures());
    assert.ok(!f.calls.some((c) => c.kind === 'insert' || c.kind === 'delete'));
  }
});

test('fixture diagnostics reveal only boolean identity checks and never mutate messages', () => {
  const f = qualificationFixture();
  f.properties.PEGASOFT_GMAIL_FIXTURE_CREATE_READY = 'true';
  f.context.createIntakeRetentionFixtures();
  f.calls.length = 0;
  f.logs.length = 0;
  const checks = f.context.inspectIntakeRetentionFixtures();
  assert.equal(checks.length, 3);
  assert.ok(
    checks.every(
      (c) =>
        c.idMatches && c.testLabel && !c.productionLabel && c.markerMatches,
    ),
  );
  assert.ok(f.calls.every((c) => c.kind === 'get'));
  assert.ok(!f.logs.join().match(/owner@|intake@|12345678|Label_/));
});
