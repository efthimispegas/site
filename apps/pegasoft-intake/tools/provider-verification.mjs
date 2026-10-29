/** Reads Worker metadata only; never fetches CVs or returns provider error bodies. */
export async function verifyProvider({
  expected,
  token,
  apiOrigin,
  fetcher = fetch,
}) {
  if (apiOrigin !== 'https://api.cloudflare.com')
    throw Error('Invalid provider API origin');
  if (!token) throw Error('Missing deployment credential');
  const base = `${apiOrigin}/client/v4/accounts/${expected.account}/workers/scripts/${expected.worker}`;
  async function get(path) {
    const response = await fetcher(base + path, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error('Provider verification request failed');
    const json = await response.json();
    if (json.success !== true || !json.result)
      throw Error('Provider verification failed');
    return json.result;
  }
  const settings = await get('/settings');
  const values = new Map(
    (settings.bindings || []).map((binding) => [binding.name, binding]),
  );
  const allowed = new Set([
    ...Object.keys(expected.vars),
    ...expected.secretNames,
    'PRIVATE_APPLICATIONS',
    'EMAIL',
    'LIMITER',
  ]);
  if (
    [...values.keys()].some((name) => !allowed.has(name)) ||
    settings.observability?.enabled === true
  )
    throw Error('Unexpected provider binding or logging');
  for (const name of expected.secretNames)
    if (values.get(name)?.type !== 'secret_text')
      throw Error('Missing runtime secret');
  for (const [name, value] of Object.entries(expected.vars)) {
    if (
      values.get(name)?.type !== 'plain_text' ||
      values.get(name)?.text !== value
    )
      throw Error('Runtime configuration mismatch');
  }
  const bucket = values.get('PRIVATE_APPLICATIONS'),
    email = values.get('EMAIL'),
    limiter = values.get('LIMITER');
  if (
    bucket?.type !== 'r2_bucket' ||
    bucket.bucket_name !== expected.bucket ||
    bucket.jurisdiction !== 'eu' ||
    email?.type !== 'send_email' ||
    email.destination_address !== expected.vars.PEGASOFT_INTAKE_RECIPIENT ||
    limiter?.type !== 'ratelimit' ||
    String(limiter.namespace_id) !== expected.namespace ||
    limiter.simple?.limit !== expected.limit ||
    limiter.simple?.period !== 60
  )
    throw Error('Private provider binding mismatch');
  const subdomain = await get('/subdomain');
  if (subdomain.enabled !== false || subdomain.previews_enabled !== false)
    throw Error('Unexpected public Worker endpoint');
  const schedules = await get('/schedules');
  if (
    schedules.schedules?.length !== 1 ||
    schedules.schedules[0].cron !== expected.cron
  )
    throw Error('Expiry schedule mismatch');
  return {
    revision: expected.revision,
    enabled: false,
    workersDevEnabled: false,
    previewUrlsEnabled: false,
    settingsVerified: true,
    deliveryVerified: false,
  };
}
