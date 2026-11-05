import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBranch } from './branch-policy.mjs';

for (const [head, base] of [
  ['feature/pegasoft-insights', 'develop'],
  ['feature/pegasoft-hotfix-nav', 'release/1.0.1'],
  ['release/1.0.0', 'main'],
  ['main', 'develop'],
  ['dependabot/npm_and_yarn/nx', 'develop'],
]) {
  test(`accept ${head} -> ${base}`, () => {
    assert.doesNotThrow(() =>
      validateBranch({ event: 'pull_request', head, base, version: '1.0.0' }),
    );
  });
}
for (const [head, base] of [
  ['feature/pegasoft-insights', 'main'],
  ['develop', 'main'],
  ['codex/old', 'develop'],
  ['release/2026-11-05', 'main'],
  ['release/01.0.0', 'main'],
  ['release/1.0.1', 'main'],
  ['dependabot/npm/pkg', 'main'],
]) {
  test(`reject ${head} -> ${base}`, () => {
    assert.throws(() =>
      validateBranch({ event: 'pull_request', head, base, version: '1.0.0' }),
    );
  });
}
test('develop push is verification only', () => {
  assert.doesNotThrow(() =>
    validateBranch({ event: 'push', head: 'develop', version: '1.0.0' }),
  );
});
