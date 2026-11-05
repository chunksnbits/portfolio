import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const HOOK = new URL('../scripts/pre-push', import.meta.url).pathname;

function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'init.defaultBranch=master', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    // The user's own git config, like commit signing or a hooks folder, stays out of the scratch repositories.
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
}

function commit(cwd, file, text = file) {
  mkdirSync(dirname(join(cwd, file)), { recursive: true });
  writeFileSync(join(cwd, file), text);
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '--quiet', '-m', `add ${file}`);
}

function pushes(cwd, ...args) {
  try {
    git(cwd, 'push', '--quiet', ...args);
    return true;
  } catch {
    return false;
  }
}

// Runs `use` with a scratch remote and a clone of it that has the hook installed, as DEVELOPMENT.md describes.
function withClone(use) {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-hook-'));
  try {
    const remote = join(root, 'remote.git');
    const clone = join(root, 'clone');
    git(root, 'init', '--quiet', '--bare', remote);
    git(root, 'clone', '--quiet', remote, clone);
    copyFileSync(HOOK, join(clone, '.git', 'hooks', 'pre-push'));
    chmodSync(join(clone, '.git', 'hooks', 'pre-push'), 0o755);
    commit(clone, 'README.md');
    git(clone, 'push', '--quiet', 'origin', 'HEAD:master');
    use({ root, remote, clone });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('refuses a push whose commits add a file in variants/', () => {
  withClone(({ clone }) => {
    commit(clone, 'variants/acme/variant.json');

    assert.equal(pushes(clone, 'origin', 'HEAD:master'), false);
    assert.equal(pushes(clone, 'origin', 'HEAD:feature'), false);
  });
});

test('refuses a merge whose side branch added variants/ and removed it again', () => {
  withClone(({ clone }) => {
    git(clone, 'switch', '--quiet', '-c', 'side');
    commit(clone, 'variants/acme.txt');
    git(clone, 'rm', '--quiet', '-r', 'variants');
    git(clone, 'commit', '--quiet', '-m', 'remove variants');
    git(clone, 'switch', '--quiet', 'master');
    commit(clone, 'CHANGELOG.md');
    git(clone, 'merge', '--quiet', '--no-ff', '-m', 'merge side', 'side');

    assert.equal(pushes(clone, 'origin', 'master'), false);
  });
});

test('refuses a force push over a remote commit the clone has never fetched', () => {
  withClone(({ root, remote, clone }) => {
    const other = join(root, 'other');
    git(root, 'clone', '--quiet', remote, other);
    commit(other, 'elsewhere.md');
    git(other, 'push', '--quiet', 'origin', 'master');
    commit(clone, 'variants/acme/variant.json');

    assert.equal(pushes(clone, '--force', 'origin', 'HEAD:master'), false);
  });
});

test('lets clean pushes, new branches and deletions through', () => {
  withClone(({ clone }) => {
    commit(clone, 'site/index.html');

    assert.equal(pushes(clone, 'origin', 'HEAD:master'), true);
    assert.equal(pushes(clone, 'origin', 'HEAD:feature'), true);
    assert.equal(pushes(clone, 'origin', '--delete', 'feature'), true);
  });
});
