/** Only this public value may flow from build environment into generated HTML. */
export function deploymentConfig(environment, { production = false } = {}) {
  const value = environment.PEGASOFT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    if (production)
      throw Error(
        'Set PEGASOFT_PUBLIC_SITE_URL in the app .env or build environment before building.',
      );
    return { origin: '' };
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error('PEGASOFT_PUBLIC_SITE_URL must be an absolute HTTPS origin.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw Error(
      'PEGASOFT_PUBLIC_SITE_URL must be an HTTPS origin without credentials, path, query or fragment.',
    );
  return { origin: url.origin };
}

/** Local server settings never enter client bundles or public metadata. */
export function developmentConfig(environment) {
  const port = (key, fallback) => {
    const value = Number(environment[key] || fallback);
    if (!Number.isInteger(value) || value < 1 || value > 65535)
      throw Error(key + ' must be a valid TCP port.');
    return value;
  };
  return {
    host: environment.PEGASOFT_DEV_HOST || '127.0.0.1',
    devPort: port('PEGASOFT_DEV_PORT', 8770),
    previewPort: port('PEGASOFT_PREVIEW_PORT', 8771),
  };
}

/** Indexing is a release decision, never implied by Vite's production build mode. */
export function indexingConfig(
  environment,
  { origin = '', production = false } = {},
) {
  const target = environment.PEGASOFT_DEPLOYMENT_ENV?.trim() || 'development';
  if (!['development', 'production'].includes(target))
    throw Error('PEGASOFT_DEPLOYMENT_ENV must be development or production.');
  if (target === 'production') {
    const expected = deploymentConfig(
      { PEGASOFT_PUBLIC_SITE_URL: environment.PEGASOFT_PRODUCTION_SITE_URL },
      { production: true },
    ).origin;
    if (origin !== expected)
      throw Error(
        'Indexable production builds require the configured production origin.',
      );
    if (environment.PEGASOFT_INCLUDE_INSPECTORS === 'true')
      throw Error('Production indexing cannot include inspector pages.');
  }
  return { indexable: production && target === 'production' };
}
