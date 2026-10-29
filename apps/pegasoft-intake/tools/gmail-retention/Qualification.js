/* Optional owner-operated synthetic qualification; never a scheduled entry point. */
/* global Gmail, PropertiesService, Utilities, console, intakeWithLock_, intakeMailConfiguration_, intakeRetentionPlan_ */
/* exported createIntakeRetentionFixtures, resumeEmptyIntakeRetentionFixtures, previewIntakeRetentionFixtures, inspectIntakeRetentionFixtures, deleteExpiredIntakeRetentionFixture */

function intakeFixtureState_() {
  const { config, properties } = intakeMailConfiguration_();
  const state = JSON.parse(
    properties.getProperty('PEGASOFT_GMAIL_FIXTURE_STATE') || 'null',
  );
  if (
    !state ||
    state.status !== 'complete' ||
    state.config !== JSON.stringify(config) ||
    !/^Label_[a-zA-Z0-9_-]+$/.test(state.labelId || '') ||
    state.labelId === config.labelId ||
    !/^[0-9a-f-]{36}$/i.test(state.reference || '') ||
    !Array.isArray(state.messages) ||
    state.messages.length !== 3 ||
    new Set(state.messages.map((message) => message.id)).size !== 3 ||
    ['expired', 'recent', 'unrelated'].some(
      (kind) =>
        state.messages.filter((message) => message.kind === kind).length !== 1,
    ) ||
    state.messages.some((message) => !/^[a-f0-9]+$/i.test(message.id || ''))
  )
    throw new Error('A complete, isolated synthetic fixture set is required.');
  const label = Gmail.Users.Labels.get('me', state.labelId);
  if (label.type !== 'user' || label.name !== state.labelName)
    throw new Error('Synthetic fixture label changed.');
  return { config, properties, state };
}

function intakeFixturePlan_() {
  const { config, properties, state } = intakeFixtureState_();
  // Inspect only the test label. Unknown or missing messages stop qualification.
  const list = Gmail.Users.Messages.list('me', {
    labelIds: [state.labelId],
    includeSpamTrash: true,
    maxResults: 4,
  });
  const known = new Set(state.messages.map((message) => message.id));
  if (
    list.nextPageToken ||
    list.messages?.length !== 3 ||
    new Set(list.messages.map((message) => message.id)).size !== 3 ||
    list.messages.some((message) => !known.has(message.id))
  )
    throw new Error(
      'Synthetic fixture membership changed; nothing was deleted.',
    );
  for (const fixture of state.messages) {
    const message = Gmail.Users.Messages.get('me', fixture.id, {
      format: 'metadata',
      metadataHeaders: ['X-Pegasoft-Retention-Fixture'],
      fields: 'id,labelIds,payload/headers',
    });
    const markers = (message.payload?.headers || []).filter(
      (header) => header.name.toLowerCase() === 'x-pegasoft-retention-fixture',
    );
    if (
      message.id !== fixture.id ||
      !message.labelIds?.includes(state.labelId) ||
      message.labelIds.includes(config.labelId) ||
      markers.length !== 1 ||
      markers[0].value !== state.reference + ':' + fixture.kind
    )
      throw new Error(
        'Synthetic fixture identity changed; nothing was deleted.',
      );
  }
  const testConfig = {
    ...config,
    labelId: state.labelId,
    labelName: state.labelName,
  };
  const plan = intakeRetentionPlan_(testConfig, Date.now());
  const expiredId = state.messages.find(
    (message) => message.kind === 'expired',
  ).id;
  if (plan.ids.length !== 1 || plan.ids[0] !== expiredId)
    throw new Error(
      'Synthetic selection differs from the expected single expired message.',
    );
  return { properties, state, expiredId };
}

function createIntakeRetentionFixtures() {
  return intakeWithLock_(() => {
    const { config, properties } = intakeMailConfiguration_();
    const labelName = properties.getProperty('PEGASOFT_GMAIL_TEST_LABEL_NAME');
    if (
      properties.getProperty('PEGASOFT_GMAIL_FIXTURE_CREATE_READY') !==
        'true' ||
      properties.getProperty('PEGASOFT_GMAIL_FIXTURE_STATE') ||
      !labelName ||
      labelName.length > 100 ||
      /[\r\n]/.test(labelName) ||
      labelName === config.labelName
    )
      throw new Error(
        'Synthetic fixture creation is disabled or already recorded.',
      );
    const labels = Gmail.Users.Labels.list('me').labels || [];
    if (labels.some((label) => label.name === labelName))
      throw new Error(
        'Choose a new dedicated test label; existing labels are not reused.',
      );
    const state = {
      status: 'preparing',
      config: JSON.stringify(config),
      labelName,
      reference: Utilities.getUuid(),
      messages: [],
    };
    const save = () =>
      properties.setProperty(
        'PEGASOFT_GMAIL_FIXTURE_STATE',
        JSON.stringify(state),
      );
    save();
    const label = Gmail.Users.Labels.create(
      {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
      'me',
    );
    if (
      !/^Label_[a-zA-Z0-9_-]+$/.test(label.id || '') ||
      label.id === config.labelId
    )
      throw new Error('Unexpected synthetic label identifier.');
    state.labelId = label.id;
    save();
    return intakeInsertFixtures_(config, properties, state);
  });
}

// Explicit recovery only for a recorded label with zero inserted messages.
// Any partial insertion, unknown membership or config drift stops recovery.
function resumeEmptyIntakeRetentionFixtures() {
  return intakeWithLock_(() => {
    const { config, properties } = intakeMailConfiguration_();
    const state = JSON.parse(
      properties.getProperty('PEGASOFT_GMAIL_FIXTURE_STATE') || 'null',
    );
    if (
      properties.getProperty('PEGASOFT_GMAIL_FIXTURE_CREATE_READY') !==
        'true' ||
      !state ||
      state.status !== 'preparing' ||
      state.config !== JSON.stringify(config) ||
      state.labelName !==
        properties.getProperty('PEGASOFT_GMAIL_TEST_LABEL_NAME') ||
      state.labelName === config.labelName ||
      !/^Label_[a-zA-Z0-9_-]+$/.test(state.labelId || '') ||
      state.labelId === config.labelId ||
      !/^[0-9a-f-]{36}$/i.test(state.reference || '') ||
      !Array.isArray(state.messages) ||
      state.messages.length !== 0
    )
      throw new Error(
        'Only an unchanged empty recorded fixture can be resumed.',
      );
    const label = Gmail.Users.Labels.get('me', state.labelId);
    const membership = Gmail.Users.Messages.list('me', {
      labelIds: [state.labelId],
      includeSpamTrash: true,
      maxResults: 1,
    });
    if (
      label.type !== 'user' ||
      label.name !== state.labelName ||
      membership.nextPageToken ||
      (membership.messages || []).length
    )
      throw new Error('Recorded fixture label is not empty or changed.');
    return intakeInsertFixtures_(config, properties, state);
  });
}

function intakeInsertFixtures_(config, properties, state) {
  const save = () =>
    properties.setProperty(
      'PEGASOFT_GMAIL_FIXTURE_STATE',
      JSON.stringify(state),
    );
  const createdAt = Date.now();
  for (const kind of ['expired', 'recent', 'unrelated']) {
    const ageDays = kind === 'recent' ? 1 : 31;
    const subject =
      kind === 'unrelated'
        ? 'SYNTHETIC RETENTION CONTROL ' + state.reference
        : 'Website General [' + state.reference + ']';
    const mime = [
      'From: ' + config.sender,
      'To: ' + config.mailbox,
      'Date: ' + new Date(createdAt - ageDays * 86400000).toUTCString(),
      'Subject: ' + subject,
      'X-Pegasoft-Retention-Fixture: ' + state.reference + ':' + kind,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      'SYNTHETIC RETENTION QUALIFICATION ONLY.',
      'No applicant data. Inserted into this owner mailbox; not sent to anyone.',
      'Control: ' + kind,
    ].join('\r\n');
    // Insert is not send/import of a real message. Preserve Date for age controls.
    const message = Gmail.Users.Messages.insert(
      {
        raw: Utilities.base64EncodeWebSafe(mime),
        labelIds: [state.labelId],
      },
      'me',
      null, // Apps Script reserves the third argument for media upload.
      { internalDateSource: 'dateHeader' },
    );
    if (!/^[a-f0-9]+$/i.test(message.id || ''))
      throw new Error('Unexpected synthetic message identifier.');
    state.messages.push({ kind, id: message.id });
    save();
  }
  state.status = 'complete';
  save();
  const result = {
    mode: 'synthetic-created',
    created: 3,
    sent: 0,
    deleted: 0,
  };
  console.log(JSON.stringify(result));
  return result;
}

function previewIntakeRetentionFixtures() {
  return intakeWithLock_(() => {
    const { properties } = intakeFixturePlan_();
    properties.setProperty('PEGASOFT_GMAIL_FIXTURE_PREVIEWED', 'true');
    const result = {
      mode: 'synthetic-preview',
      fixtures: 3,
      eligible: 1,
      controlsProtected: 2,
      deleted: 0,
    };
    console.log(JSON.stringify(result));
    return result;
  });
}

function deleteExpiredIntakeRetentionFixture() {
  return intakeWithLock_(() => {
    const properties = PropertiesService.getScriptProperties();
    if (
      properties.getProperty('PEGASOFT_GMAIL_FIXTURE_DELETE_READY') !==
        'true' ||
      properties.getProperty('PEGASOFT_GMAIL_FIXTURE_PREVIEWED') !== 'true'
    )
      throw new Error(
        'Deletion of the single expired synthetic fixture is not authorized.',
      );
    const { state, expiredId } = intakeFixturePlan_();
    Gmail.Users.Messages.batchDelete({ ids: [expiredId] }, 'me');
    state.status = 'expired-delete-requested';
    properties.setProperty(
      'PEGASOFT_GMAIL_FIXTURE_STATE',
      JSON.stringify(state),
    );
    const result = {
      mode: 'synthetic-delete-requested',
      requested: 1,
      controls: 2,
    };
    // Verify actual disappearance separately; do not equate API acceptance with it.
    console.log(JSON.stringify(result));
    return result;
  });
}

// Read-only provider diagnostics: booleans/counts only, never addresses or IDs.
function inspectIntakeRetentionFixtures() {
  return intakeWithLock_(() => {
    const { config, state } = intakeFixtureState_();
    const checks = state.messages.map((fixture) => {
      const message = Gmail.Users.Messages.get('me', fixture.id, {
        format: 'metadata',
        metadataHeaders: ['X-Pegasoft-Retention-Fixture'],
        fields: 'id,labelIds,payload/headers',
      });
      const markers = (message.payload?.headers || []).filter(
        (h) => h.name.toLowerCase() === 'x-pegasoft-retention-fixture',
      );
      return {
        kind: fixture.kind,
        idMatches: message.id === fixture.id,
        testLabel: (message.labelIds || []).includes(state.labelId),
        productionLabel: (message.labelIds || []).includes(config.labelId),
        markerCount: markers.length,
        markerMatches:
          markers.length === 1 &&
          markers[0].value === state.reference + ':' + fixture.kind,
      };
    });
    console.log(
      JSON.stringify({ mode: 'synthetic-metadata-check', checks, deleted: 0 }),
    );
    return checks;
  });
}
