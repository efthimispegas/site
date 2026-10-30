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
/** Protected CI only. An in-memory HTTPS PUT writes each allowlisted secret to the existing Worker. */
export async function provisionWorkerSecrets(env, fetcher = fetch) {
  deploymentGate(env);
  const { expected } = deploymentConfiguration(env);
  for (const [name, text] of Object.entries(runtimeSecrets(env))) {
    try {
      const response = await fetcher(
        `https://api.cloudflare.com/client/v4/accounts/${expected.account}/workers/scripts/${expected.worker}/secrets`,
        {
          method: 'PUT',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, text, type: 'secret_text' }),
        },
      );
      if (!response.ok)
        throw Error(
          'Private secret provisioning failed; provider details withheld',
        );
      const data = await response.json();
      if (data.success !== true)
        throw Error('Private secret provisioning unconfirmed');
    } catch {
      throw Error(
        'Private secret provisioning failed; provider details withheld',
      );
    }
  }
  return { secretNames: expected.secretNames };
}
