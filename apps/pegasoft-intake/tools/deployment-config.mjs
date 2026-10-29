const runtimeKeys = [
  'PEGASOFT_INTAKE_PATH',
  'PEGASOFT_INTAKE_ORIGINS',
  'PEGASOFT_INTAKE_RECIPIENT',
  'PEGASOFT_INTAKE_SENDER',
  'PEGASOFT_CV_RETENTION_DAYS',
  'PEGASOFT_MAX_CV_BYTES',
  'PEGASOFT_MAX_REQUEST_BYTES',
  'PEGASOFT_PRIVACY_VERSION',
  'PEGASOFT_TURNSTILE_VERIFY_URL',
];
const secretKeys = ['PEGASOFT_TURNSTILE_SECRET', 'PEGASOFT_RATE_LIMIT_SALT'];
const address = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function requireValue(env, key, pattern) {
  const value = env[key];
  if (typeof value !== 'string' || !pattern.test(value))
    throw Error(`Invalid ${key}`);
  return value;
}

/** Generates private files only; no credentials or business values belong in Git. */
export function deploymentConfiguration(env) {
  const worker = requireValue(
    env,
    'PEGASOFT_INTAKE_WORKER_NAME',
    /^[a-z0-9][a-z0-9-]{0,62}$/,
  );
  const account = requireValue(env, 'CLOUDFLARE_ACCOUNT_ID', /^[0-9a-f]{32}$/);
  const bucket = requireValue(
    env,
    'PEGASOFT_R2_BUCKET_NAME',
    /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
  );
  const date = requireValue(
    env,
    'PEGASOFT_WORKER_COMPATIBILITY_DATE',
    /^\d{4}-\d{2}-\d{2}$/,
  );
  const revision = requireValue(
    env,
    'PEGASOFT_SOURCE_REVISION',
    /^[0-9a-f]{40}$/,
  );
  const cron = requireValue(
    env,
    'PEGASOFT_INTAKE_CLEANUP_CRON',
    /^[0-9*/,-]+(?: [0-9*/,-]+){4}$/,
  );
  const namespace = requireValue(
    env,
    'PEGASOFT_RATE_LIMIT_NAMESPACE_ID',
    /^[1-9]\d*$/,
  );
  const limit = Number(env.PEGASOFT_RATE_LIMIT_REQUESTS);
  if (
    env.PEGASOFT_R2_JURISDICTION !== 'eu' ||
    env.PEGASOFT_CV_RETENTION_DAYS !== '30' ||
    env.PEGASOFT_MAX_CV_BYTES !== '5000000' ||
    env.PEGASOFT_MAX_REQUEST_BYTES !== '5131072' ||
    env.PEGASOFT_INTAKE_ENABLED !== 'false' ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw Error('Unsafe intake configuration');
  requireValue(env, 'PEGASOFT_INTAKE_RECIPIENT', address);
  requireValue(env, 'PEGASOFT_INTAKE_SENDER', address);
  requireValue(env, 'PEGASOFT_INTAKE_PATH', /^\/[a-zA-Z0-9/_-]+$/);
  const origins = String(env.PEGASOFT_INTAKE_ORIGINS || '').split(',');
  if (
    !origins.length ||
    !origins.every((origin) => {
      const url = new URL(origin);
      return url.protocol === 'https:' && url.origin === origin;
    })
  )
    throw Error('Invalid intake origins');
  const endpoint = new URL(env.PEGASOFT_TURNSTILE_VERIFY_URL);
  if (
    endpoint.origin !== 'https://challenges.cloudflare.com' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/turnstile/v0/siteverify' ||
    endpoint.search ||
    endpoint.hash
  )
    throw Error('Invalid challenge endpoint');
  const vars = Object.fromEntries(
    runtimeKeys.map((key) => [key, String(env[key] || '')]),
  );
  vars.PEGASOFT_INTAKE_ENABLED = 'false';
  vars.PEGASOFT_SOURCE_REVISION = revision;
  const quote = JSON.stringify;
  const toml = [
    `name = ${quote(worker)}`,
    'main = "worker.js"',
    `account_id = ${quote(account)}`,
    `compatibility_date = ${quote(date)}`,
    'workers_dev = false',
    'preview_urls = false',
    'routes = []',
    'upload_source_maps = false',
    '[observability]',
    'enabled = false',
    '[triggers]',
    `crons = [${quote(cron)}]`,
    '[[r2_buckets]]',
    'binding = "PRIVATE_APPLICATIONS"',
    `bucket_name = ${quote(bucket)}`,
    'jurisdiction = "eu"',
    '[[send_email]]',
    'name = "EMAIL"',
    `destination_address = ${quote(vars.PEGASOFT_INTAKE_RECIPIENT)}`,
    '[[ratelimits]]',
    'name = "LIMITER"',
    `namespace_id = ${quote(namespace)}`,
    `simple = { limit = ${limit}, period = 60 }`,
    '[vars]',
    ...Object.entries(vars).map(([key, value]) => `${key} = ${quote(value)}`),
    '',
  ].join('\n');
  const secrets = Object.fromEntries(
    secretKeys.filter((key) => env[key]).map((key) => [key, env[key]]),
  );
  return {
    toml,
    secrets,
    expected: {
      worker,
      account,
      bucket,
      cron,
      namespace,
      limit,
      revision,
      vars,
      secretNames: Object.keys(secrets),
    },
  };
}

export function deploymentGate(env) {
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_SHA !== env.PEGASOFT_SOURCE_REVISION ||
    env.PEGASOFT_INTAKE_DEPLOY_READY !== 'true' ||
    !env.CLOUDFLARE_API_TOKEN
  ) {
    throw Error(
      'Intake deployment requires approved main workflow and environment readiness',
    );
  }
}
