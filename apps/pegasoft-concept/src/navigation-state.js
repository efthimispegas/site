/** Route state, independent of hover, focus, browser history and language. */
export function isInsightsPath(pathname) {
  return /^\/(?:en|el)\/insights(?:\/|$)/.test(pathname);
}
