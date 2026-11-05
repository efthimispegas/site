import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const common = resolve(git('rev-parse', '--git-common-dir'));
const directory = resolve(common, 'pegasoft-policy');
const hooks = resolve(directory, 'hooks');
let configured = '';
try {
  configured = git('config', '--get', 'core.hooksPath');
} catch (error) {
  if (error.status !== 1) throw error;
}
if (configured && configured !== hooks) {
  throw new Error(
    'Existing custom Git hooks detected; integrate the policy without replacing them.',
  );
}
for (const name of ['pre-commit', 'pre-push']) {
  if (!configured && existsSync(resolve(common, 'hooks', name))) {
    throw new Error(
      `Existing ${name} detected; preserve and integrate it first.`,
    );
  }
}
mkdirSync(hooks, { recursive: true });
writeFileSync(
  resolve(directory, 'git-workflow.md'),
  readFileSync('docs/deployment/git-workflow.md'),
);
const prologue = `#!/bin/sh
# Pegasoft shared worktree policy. Reinstall from .github/scripts/install-git-policy.mjs.
set -eu
valid_feature() { printf '%s' "$1" | grep -Eq '^feature/pegasoft-[a-z0-9]+(-[a-z0-9]+)*$'; }
valid_release() { printf '%s' "$1" | grep -Eq '^release/(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$'; }
`;
writeFileSync(
  resolve(hooks, 'pre-commit'),
  prologue +
    `
branch=$(git symbolic-ref --quiet --short HEAD) || { echo 'Recovery-only detached checkout: port WIP into its clean feature stream first.' >&2; exit 1; }
if valid_feature "$branch"; then exit 0; fi
if valid_release "$branch" && ! git show-ref --verify --quiet "refs/tags/v\${branch#release/}"; then exit 0; fi
echo 'Commit on an owned feature/pegasoft-* branch, or an unpublished versioned release candidate.' >&2
exit 1
`,
  { mode: 0o755 },
);
writeFileSync(
  resolve(hooks, 'pre-push'),
  prologue +
    `
while read -r local_ref local_sha remote_ref remote_sha; do
  # Deletions are permitted only after the documented preservation/review checks.
  [ "$local_sha" = 0000000000000000000000000000000000000000 ] && continue
  case "$remote_ref" in
    refs/tags/v*)
      [ "$remote_sha" = 0000000000000000000000000000000000000000 ] && continue
      echo 'Published version tags are immutable.' >&2; exit 1 ;;
    refs/heads/*)
      branch=\${remote_ref#refs/heads/}
      if valid_feature "$branch" || valid_release "$branch"; then continue; fi ;;
  esac
  echo 'Direct main/develop pushes and legacy branch names are blocked; integrate through PRs.' >&2
  exit 1
done
`,
  { mode: 0o755 },
);
execFileSync('git', ['config', '--local', 'core.hooksPath', hooks]);
console.log(
  'Installed shared policy hooks and contract for every linked worktree.',
);
