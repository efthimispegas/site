import {
  deploymentConfiguration,
  deploymentGate,
  runtimeSecrets,
} from './deployment-config.mjs';
/** Keep runtime credentials out of Wrangler child env, arguments, output and files. */
export function deploymentEnvironment(env) {
  const child = { ...env };
  for (const name of Object.keys(runtimeSecrets(env))) delete child[name];
  child.WRANGLER_SEND_METRICS = 'false';
  return child;
}
/** Protected CI metadata GET only. Owner-provisioned secret values never enter CI. */
export async function verifyWorkerSecrets(env, fetcher = fetch) {
  deploymentGate(env);
  const { expected } = deploymentConfiguration(env);
  try {
    const response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${expected.account}/workers/scripts/${expected.worker}/settings`,
      {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      },
    );
    if (!response.ok) throw Error('unconfirmed');
    const body = await response.json();
    if (body.success !== true || !Array.isArray(body.result?.bindings))
      throw Error('unconfirmed');
    for (const name of expected.secretNames) {
      const matches = body.result.bindings.filter(
        (binding) => binding.name === name,
      );
      if (matches.length !== 1 || matches[0].type !== 'secret_text')
        throw Error('missing');
    }
    return { requiredSecretNames: expected.secretNames };
  } catch {
    throw Error(
      'Required Worker secrets unconfirmed; owner provisioning is required; provider details withheld',
    );
  }
}
