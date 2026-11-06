import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const feature = /^feature\/pegasoft-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const release = /^release\/(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const bot = /^dependabot\/.+/;

export function validateBranch({ event, head, base, version }) {
  if (
    !['main', 'develop'].includes(head) &&
    !feature.test(head) &&
    !release.test(head) &&
    !bot.test(head)
  ) {
    throw new Error(
      'Use feature/pegasoft-<scope> or release/<major>.<minor>.<patch>.',
    );
  }
  if (release.test(head) && head.slice(8) !== version) {
    throw new Error('Release branch must match the website package version.');
  }
  if (event !== 'pull_request') return;
  const valid =
    (base === 'develop' &&
      (feature.test(head) || bot.test(head) || head === 'main')) ||
    (release.test(base) && feature.test(head)) ||
    (base === 'main' && release.test(head));
  if (!valid)
    throw new Error(
      'Route feature/dependency PRs to develop, release fixes to release/<version>, and release PRs to main.',
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const payload = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'),
  );
  const app = JSON.parse(
    readFileSync('apps/pegasoft-concept/package.json', 'utf8'),
  );
  validateBranch({
    event: process.env.GITHUB_EVENT_NAME,
    head: payload.pull_request?.head.ref ?? process.env.GITHUB_REF_NAME,
    base: payload.pull_request?.base.ref,
    version: app.version,
  });
  console.log('Pegasoft branch name, version and PR route passed.');
}
