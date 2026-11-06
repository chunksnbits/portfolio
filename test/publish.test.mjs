import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SCRIPT = new URL('../scripts/publish.mjs', import.meta.url).pathname;

// The user's own git config, like commit signing, stays out of the scratch repositories.
// npm test sets npm_command and may set npm_config_message or npm_config_dry_run, which the script reads.
// GIT_DIR and the other repository variables that git sets for hooks and aliases would win over each cwd here.
const LOCAL = execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' }).split('\n');
const { npm_command, npm_config_message, npm_config_dry_run, ...inherited } = process.env;
const ENV = {
  ...Object.fromEntries(Object.entries(inherited).filter(([name]) => !LOCAL.includes(name))),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: ENV,
  }).trim();
}

function write(cwd, file, text = file) {
  mkdirSync(dirname(join(cwd, file)), { recursive: true });
  writeFileSync(join(cwd, file), text);
}

function commit(cwd, file) {
  write(cwd, file);
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '--quiet', '-m', `add ${file}`);
}

// Runs the script from the portfolio's root, as npm does, with stdin that nobody types into.
function publish(cwd, args = [], env = {}) {
  const run = spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8', input: '', env: { ...ENV, ...env } });
  return { status: run.status, output: run.stdout + run.stderr };
}

// Runs `use` with a scratch portfolio whose variants/ is a clone of a scratch remote, as DEVELOPMENT.md describes.
function withVariants(use) {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-publish-'));
  try {
    const remote = join(root, 'chunksnbits', 'portfolio-variants.git');
    const portfolio = join(root, 'portfolio');
    const variants = join(portfolio, 'variants');
    git(root, 'init', '--quiet', '--bare', remote);
    mkdirSync(portfolio);
    git(portfolio, 'init', '--quiet');
    commit(portfolio, 'README.md');
    git(portfolio, 'clone', '--quiet', remote, variants);
    commit(variants, 'README.md');
    git(variants, 'push', '--quiet', 'origin', 'main');
    use({ root, remote, portfolio, variants });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const lastPushed = (remote) => git(remote, 'log', '-1', '--format=%s', 'main');

test('commits every change with the message from -m and pushes it to main', () => {
  withVariants(({ remote, portfolio, variants }) => {
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme']).status, 0);
    assert.equal(lastPushed(remote), 'publish acme');
    assert.match(git(remote, 'ls-tree', '-r', '--name-only', 'main'), /^acme\/variant\.json$/m);
    assert.equal(git(variants, 'status', '--porcelain'), '');
  });
});

test('takes the message that npm run publish -m hands over', () => {
  withVariants(({ remote, portfolio, variants }) => {
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, [], { npm_config_message: 'publish acme' }).status, 0);
    assert.equal(lastPushed(remote), 'publish acme');
  });
});

test('refuses changes without a message when nobody can type one', () => {
  withVariants(({ remote, portfolio, variants }) => {
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio).status, 1);
    assert.equal(lastPushed(remote), 'add README.md');
    assert.notEqual(git(variants, 'status', '--porcelain'), '');
  });
});

test('pushes commits made before, without asking for a message', () => {
  withVariants(({ remote, portfolio, variants }) => {
    commit(variants, 'acme/variant.json');

    assert.equal(publish(portfolio).status, 0);
    assert.equal(lastPushed(remote), 'add acme/variant.json');
  });
});

test('says so when there is nothing to publish', () => {
  withVariants(({ portfolio }) => {
    const run = publish(portfolio);

    assert.equal(run.status, 0);
    assert.match(run.output, /Nothing to publish/);
  });
});

test('refuses a branch other than main, whose push would not deploy', () => {
  withVariants(({ remote, portfolio, variants }) => {
    git(variants, 'checkout', '--quiet', '-b', 'draft');
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme']).status, 1);
    assert.equal(lastPushed(remote), 'add README.md');
    assert.equal(git(remote, 'branch', '--list', 'draft'), '');
  });
});

test('refuses a variants/ that is no clone of its own, and leaves the public repository around it alone', () => {
  withVariants(({ portfolio, variants }) => {
    rmSync(join(variants, '.git'), { recursive: true });
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme']).status, 1);
    assert.equal(git(portfolio, 'rev-list', '--count', 'HEAD'), '1');
    assert.match(git(portfolio, 'status', '--porcelain'), /^\?\? variants\/$/m);
  });
});

test('ignores a GIT_DIR that points at the public repository, and publishes from variants/', () => {
  withVariants(({ remote, portfolio, variants }) => {
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme'], { GIT_DIR: join(portfolio, '.git') }).status, 0);
    assert.equal(git(portfolio, 'rev-list', '--count', 'HEAD'), '1');
    assert.equal(lastPushed(remote), 'publish acme');
  });
});

test('refuses a clone of another repository', () => {
  withVariants(({ root, portfolio, variants }) => {
    git(root, 'init', '--quiet', '--bare', join(root, 'chunksnbits', 'portfolio.git'));
    git(variants, 'remote', 'set-url', 'origin', join(root, 'chunksnbits', 'portfolio.git'));
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme']).status, 1);
    assert.notEqual(git(variants, 'status', '--porcelain'), '');
  });
});

test('refuses npm run publish --dry-run, since npm keeps the flag and runs the script anyway', () => {
  withVariants(({ remote, portfolio, variants }) => {
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme'], { npm_config_dry_run: 'true' }).status, 1);
    assert.equal(lastPushed(remote), 'add README.md');
    assert.notEqual(git(variants, 'status', '--porcelain'), '');
  });
});

test('refuses to run as a step of npm publish', () => {
  withVariants(({ remote, portfolio, variants }) => {
    write(variants, 'acme/variant.json');

    assert.equal(publish(portfolio, ['-m', 'publish acme'], { npm_command: 'publish' }).status, 1);
    assert.equal(lastPushed(remote), 'add README.md');
  });
});
