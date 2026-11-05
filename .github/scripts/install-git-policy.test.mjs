import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('shared hooks reject recovery/protected writes and preserve the existing pre-push input', (t) => {
  const cwd = mkdtempSync(resolve(tmpdir(), 'pegasoft-git-policy-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  git('init', '-b', 'feature/pegasoft-test');
  git('config', 'user.name', 'Policy fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git(
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--allow-empty',
    '-m',
    'test: baseline',
  );
  mkdirSync(resolve(cwd, 'docs/deployment'), { recursive: true });
  writeFileSync(
    resolve(cwd, 'docs/deployment/git-workflow.md'),
    'Fixture contract',
  );
  writeFileSync(
    resolve(cwd, '.git/hooks/pre-push'),
    '#!/bin/sh\ncat > .git/previous-hook-input\n',
    { mode: 0o755 },
  );
  execFileSync(
    process.execPath,
    [
      resolve(import.meta.dirname, 'install-git-policy.mjs'),
      '--chain-existing',
    ],
    { cwd },
  );
  const hooks = git('config', '--get', 'core.hooksPath');
  const run = (name, input = '') =>
    spawnSync(resolve(hooks, name), [], { cwd, input, encoding: 'utf8' });
  assert.equal(run('pre-commit').status, 0);
  git('switch', '--detach');
  assert.notEqual(run('pre-commit').status, 0);
  git('switch', '-c', 'develop');
  assert.notEqual(run('pre-commit').status, 0);
  const zero = '0'.repeat(40),
    sha = '1'.repeat(40);
  assert.notEqual(
    run('pre-push', `refs/heads/develop ${sha} refs/heads/develop ${zero}\n`)
      .status,
    0,
  );
  const allowed = `refs/heads/feature/pegasoft-test ${sha} refs/heads/feature/pegasoft-test ${zero}\n`;
  assert.equal(run('pre-push', allowed).status, 0);
  assert.equal(
    readFileSync(resolve(cwd, '.git/previous-hook-input'), 'utf8'),
    allowed,
  );
  assert.notEqual(
    run('pre-push', `refs/tags/v1.0.0 ${sha} refs/tags/v1.0.0 ${sha}\n`).status,
    0,
  );
});
