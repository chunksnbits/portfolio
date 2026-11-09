// Commits every change in variants/ and pushes it to the private repository chunksnbits/portfolio-variants.
// see: DEVELOPMENT.md, "Publishing and taking down"
//
// Usage: npm run publish [-m <message>]
// Without -m, it lists the changes and asks for the commit message.
//
// A push to main of chunksnbits/portfolio-variants starts its Deploy workflow, which runs the portfolio's Pages workflow on main.
// So the published variants go online, and the unpublished ones come down, a few minutes after the push.
//
// NOTE: npm keeps -m and --message for itself and hands the value over in npm_config_message.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { VARIANTS } from './lib/variants.mjs';

// Branch of the variants repository that the Pages workflow builds, and the only one whose push deploys.
const BRANCH = 'main';
// Address of the variants repository, over ssh or https.
const ORIGIN = /[:/]chunksnbits\/portfolio-variants(\.git)?$/;

// npm runs scripts from the repository root, and the tests run this one in a scratch copy of it.
const folder = join(process.cwd(), VARIANTS);
// git sets GIT_DIR and the other repository variables for hooks and aliases.
// E.g. a command under git rebase -x in a linked worktree inherits GIT_DIR.
// These variables win over -C, so git would commit the variants into the public repository and push them there.
const LOCAL = execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' }).split('\n');
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !LOCAL.includes(name)));

try {
  const { values: options } = parseArgs({ options: { message: { type: 'string', short: 'm' } } });
  await publish(options.message ?? process.env.npm_config_message);
} catch (error) {
  console.error(error.message);
  if (error.code?.startsWith('ERR_PARSE_ARGS')) console.error('Usage: npm run publish [-m "<message>"]');
  process.exit(1);
}

async function publish(message) {
  // npm publish --dry-run runs a script named "publish" too, even in a private package.
  if (process.env.npm_command === 'publish') throw new Error('npm publish ran this script. Run npm run publish instead.');
  // npm keeps --dry-run for itself and runs the script anyway.
  if (process.env.npm_config_dry_run === 'true') {
    throw new Error(`npm run publish has no dry run. git -C ${VARIANTS} status shows what it would commit.`);
  }
  // Without a clone of its own in variants/, git would commit in the public repository around it.
  if (!isVariantsClone()) {
    throw new Error(`${VARIANTS}/ is not a clone of chunksnbits/portfolio-variants. See DEVELOPMENT.md, "Variants".`);
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== BRANCH) throw new Error(`${VARIANTS}/ is on branch ${branch}. Only a push to ${BRANCH} deploys, so switch to it first.`);

  if (git('status', '--porcelain')) {
    show('status', '--short');
    const subject = await commitMessage(message);
    show('add', '--all');
    show('commit', '--quiet', '-m', subject);
  }
  if (git('rev-list', '--count', `origin/${BRANCH}..HEAD`) === '0') {
    console.log(`Nothing to publish: ${VARIANTS}/ has no changes, and ${BRANCH} matches the remote.`);
    return;
  }
  show('push', '--quiet', 'origin', BRANCH);
  console.log(`Pushed ${VARIANTS}/ to chunksnbits/portfolio-variants. The site deploys with its published variants in a few minutes.`);
  console.log('Follow the deploy with: gh run list -R chunksnbits/portfolio --workflow Pages');
}

// Takes the message from -m, or asks for it when someone runs the script in a terminal.
async function commitMessage(given) {
  if (given?.trim()) return given.trim();
  if (!process.stdin.isTTY) throw new Error('Pass the commit message: npm run publish -m "<message>"');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await prompt.question('Commit message: ')).trim();
    if (!answer) throw new Error('No commit message, nothing committed.');
    return answer;
  } finally {
    prompt.close();
  }
}

// Reports whether variants/ is the top folder of a clone of the variants repository.
function isVariantsClone() {
  try {
    return realpathSync(git('rev-parse', '--show-toplevel')) === realpathSync(folder) && ORIGIN.test(git('remote', 'get-url', 'origin'));
  } catch {
    return false;
  }
}

function git(...args) {
  return execFileSync('git', ['-C', folder, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env }).trim();
}

// Runs a git command whose output belongs on the terminal.
function show(...args) {
  execFileSync('git', ['-C', folder, ...args], { stdio: 'inherit', env });
}
