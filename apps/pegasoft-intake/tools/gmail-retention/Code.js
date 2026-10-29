/* Owner-operated Apps Script. Never import this into the Worker or website. */
/* global Gmail, PropertiesService, LockService, console */
/* exported previewIntakeRetention, deleteExpiredIntakeNotifications */

function intakeMailConfiguration_() {
  const properties = PropertiesService.getScriptProperties();
  const config = {
    mailbox: properties.getProperty('PEGASOFT_GMAIL_MAILBOX'),
    sender: properties.getProperty('PEGASOFT_GMAIL_INTAKE_SENDER'),
    labelId: properties.getProperty('PEGASOFT_GMAIL_LABEL_ID'),
    labelName: properties.getProperty('PEGASOFT_GMAIL_LABEL_NAME'),
    retentionDays: Number(
      properties.getProperty('PEGASOFT_GMAIL_RETENTION_DAYS'),
    ),
  };
  const address =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (
    !address.test(config.mailbox || '') ||
    !address.test(config.sender || '') ||
    (config.labelId && !/^Label_[a-zA-Z0-9_-]+$/.test(config.labelId)) ||
    !config.labelName ||
    config.labelName.length > 100 ||
    /[\r\n]/.test(config.labelName) ||
    config.retentionDays !== 30
  )
    throw new Error(
      'Retention configuration is incomplete or differs from the approved policy.',
    );
  const profile = Gmail.Users.getProfile('me');
  if (profile.emailAddress?.toLowerCase() !== config.mailbox.toLowerCase())
    throw new Error(
      'The signed-in mailbox does not match the configured intake mailbox.',
    );
  if (!config.labelId) {
    const matches = (Gmail.Users.Labels.list('me').labels || []).filter(
      (label) => label.type === 'user' && label.name === config.labelName,
    );
    if (matches.length !== 1 || !/^Label_[a-zA-Z0-9_-]+$/.test(matches[0].id))
      throw new Error(
        'Create the exact dedicated label before previewing retention.',
      );
    config.labelId = matches[0].id;
  }
  const label = Gmail.Users.Labels.get('me', config.labelId);
  if (label.type !== 'user' || label.name !== config.labelName)
    throw new Error(
      'A dedicated user label must match both its configured ID and name.',
    );
  return { config, properties };
}

function intakeSingleAddress_(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return null;
  const text = value.trim();
  // Accept one bare address or one display-name address; never an address list.
  const match = text.match(/^(?:[^<>@,;]*<([^<>\s,;]+)>|([^<>\s,;]+))$/);
  return (match?.[1] || match?.[2] || '').trim().toLowerCase();
}

function intakeMessageEligible_(message, config, cutoff) {
  const headers = message.payload?.headers || [];
  const header = (name) => {
    const values = headers.filter((item) => item.name.toLowerCase() === name);
    return values.length === 1 ? values[0].value : undefined;
  };
  const received = Number(message.internalDate);
  return (
    /^[a-f0-9]+$/i.test(message.id || '') &&
    message.labelIds?.includes(config.labelId) &&
    !message.labelIds.includes('DRAFT') &&
    !message.labelIds.includes('SENT') &&
    Number.isSafeInteger(received) &&
    received > 0 &&
    received <= cutoff &&
    intakeSingleAddress_(header('from')) === config.sender.toLowerCase() &&
    intakeSingleAddress_(header('to')) === config.mailbox.toLowerCase() &&
    /^Website (General|Company owner|Investor|Careers) \[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]$/i.test(
      header('subject') || '',
    )
  );
}

function intakeReadMetadata_(id) {
  return Gmail.Users.Messages.get('me', id, {
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject'],
    fields: 'id,labelIds,internalDate,payload/headers',
  });
}

function intakeRetentionPlan_(config, now) {
  const cutoff = now - config.retentionDays * 86400000;
  const candidates = new Set();
  const tokens = new Set();
  let pageToken;
  do {
    const page = Gmail.Users.Messages.list('me', {
      labelIds: [config.labelId],
      includeSpamTrash: true,
      q: 'before:' + Math.ceil(cutoff / 1000),
      maxResults: 100,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const message of page.messages || []) {
      if (!/^[a-f0-9]+$/i.test(message.id || ''))
        throw new Error('Unexpected message identifier; nothing was deleted.');
      candidates.add(message.id);
    }
    if (candidates.size > 200)
      throw new Error(
        'Retention backlog exceeds the reviewed run limit; nothing was deleted.',
      );
    pageToken = page.nextPageToken;
    if (pageToken && (tokens.has(pageToken) || tokens.size >= 10))
      throw new Error('Unexpected pagination; nothing was deleted.');
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  const ids = [];
  for (const id of candidates) {
    const message = intakeReadMetadata_(id);
    if (message.id !== id)
      throw new Error('Message identity mismatch; nothing was deleted.');
    if (intakeMessageEligible_(message, config, cutoff)) ids.push(id);
  }
  return { cutoff, examined: candidates.size, ids };
}

function intakeWithLock_(operation) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Another retention run is active.');
  try {
    return operation();
  } finally {
    lock.releaseLock();
  }
}

// Preview requires only the read-only manifest. Logs contain counts, never mail data.
function previewIntakeRetention() {
  return intakeWithLock_(() => {
    const { config, properties } = intakeMailConfiguration_();
    const plan = intakeRetentionPlan_(config, Date.now());
    properties.setProperty('PEGASOFT_GMAIL_LABEL_ID', config.labelId);
    properties.setProperty(
      'PEGASOFT_GMAIL_PREVIEW_CONFIG',
      JSON.stringify(config),
    );
    properties.setProperty('PEGASOFT_GMAIL_PREVIEW_AT', String(Date.now()));
    const result = {
      mode: 'preview',
      retentionDays: config.retentionDays,
      cutoff: new Date(plan.cutoff).toISOString(),
      examined: plan.examined,
      eligible: plan.ids.length,
      deleted: 0,
    };
    console.log(JSON.stringify(result));
    return result;
  });
}

// This function stays inert without the separate permission grant and arm property.
// The owner installs an hourly trigger only after reviewing synthetic qualification.
function deleteExpiredIntakeNotifications() {
  return intakeWithLock_(() => {
    const { config, properties } = intakeMailConfiguration_();
    if (
      properties.getProperty('PEGASOFT_GMAIL_DELETE_READY') !== 'true' ||
      properties.getProperty('PEGASOFT_GMAIL_PREVIEW_CONFIG') !==
        JSON.stringify(config)
    )
      throw new Error(
        'Deletion is disabled or the current configuration has not been previewed.',
      );
    const previewAt = Number(
      properties.getProperty('PEGASOFT_GMAIL_PREVIEW_AT'),
    );
    if (
      !Number.isSafeInteger(previewAt) ||
      previewAt <= 0 ||
      previewAt > Date.now()
    )
      throw new Error(
        'A successful preview is required before enabling retention.',
      );
    const plan = intakeRetentionPlan_(config, Date.now());
    // Recheck labels and metadata immediately before the single bounded deletion.
    const ids = plan.ids.filter((id) => {
      const message = intakeReadMetadata_(id);
      return (
        message.id === id &&
        intakeMessageEligible_(message, config, plan.cutoff)
      );
    });
    if (ids.length) Gmail.Users.Messages.batchDelete({ ids }, 'me');
    const result = {
      mode: 'delete-requested',
      retentionDays: config.retentionDays,
      examined: plan.examined,
      requested: ids.length,
    };
    // API acceptance is not readback proof that every message has disappeared.
    console.log(JSON.stringify(result));
    properties.setProperty(
      'PEGASOFT_GMAIL_LAST_SUCCESS_AT',
      new Date().toISOString(),
    );
    return result;
  });
}
