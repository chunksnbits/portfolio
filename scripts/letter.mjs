// Drafts a variant's cover letters in German and English with Antigravity (agy), on Gemini.
// see: DEVELOPMENT.md, "Cover letters and brief"
//
// Usage: npm run letter -- <slug> [--lang de|en] [--model <id>] [--force]
//
// Drafts both languages by default. Pass --lang to redraft only one, leaving the other's file untouched
// even with --force, so an edited letter in one language survives a redraft of the other.
// The instructions are in scripts/letter.prompt.md.
// agy gets them with the posting (private/job.md), the company research (private/research.md),
// Daniel's profile without its personal details, the tailored portfolio and variants/VOICE.md.
// The drafts land in private/cover-letter.<lang>.md for Daniel to edit.
// `npm run docs -- <slug>` prints them.
//
// NOTE: agy runs in an empty temporary folder, so it sees only the prompt and never the repository.
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadVariants, PAGES, readMarkdown, ROOT } from './build.mjs';
import { toLetter } from './lib/documents.mjs';
import { parseMarkdown, printMarkdown } from './lib/markdown.mjs';
import { VARIANTS, variantPages } from './lib/variants.mjs';

// Gemini at its highest effort in agy.
// `agy models` lists the alternatives.
const DEFAULT_MODEL = 'gemini-4-argon-high';
const TIMEOUT_MS = 15 * 60 * 1000;
// Where Daniel's verified profile, the source of every claim, may live.
// PROFILE replaces both paths.
const PROFILES = process.env.PROFILE
  ? [process.env.PROFILE]
  : [join(homedir(), 'job-search', 'profile.md'), join(homedir(), 'Workspace', 'private', 'job-search', 'profile.md')];
// Section of the profile with birth date and contact details, which a letter doesn't need.
const PERSONAL_SECTION = /^## Basics\n[\s\S]*?(?=^## )/m;

const LETTER = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'greeting', 'paragraphs', 'closing'],
  properties: {
    subject: { type: 'string' },
    greeting: { type: 'string' },
    paragraphs: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'string' } },
    closing: { type: 'string' },
  },
};
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['to', 'de', 'en', 'notes'],
  properties: { to: { type: 'array', items: { type: 'string' } }, de: LETTER, en: LETTER, notes: { type: 'string' } },
};

const { values: options, positionals } = parseArgs({
  options: { model: { type: 'string', default: DEFAULT_MODEL }, force: { type: 'boolean', default: false }, lang: { type: 'string' } },
  allowPositionals: true,
});
const [slug] = positionals;
if (options.lang && !['de', 'en'].includes(options.lang)) {
  console.error('--lang must be "de" or "en"');
  process.exit(1);
}

try {
  await draft(slug);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function draft(name) {
  if (!name) throw new Error('Usage: npm run letter -- <slug> [--lang de|en] [--model <id>] [--force]');
  const variant = (await loadVariants()).find((candidate) => candidate.slug === name);
  if (!variant) throw new Error(`There is no variant "${name}" in ${VARIANTS}/.`);
  const folder = join(ROOT, VARIANTS, name, 'private');
  const langs = options.lang ? [options.lang] : ['de', 'en'];
  const targets = langs.map((lang) => ({ lang, file: join(folder, `cover-letter.${lang}.md`) }));
  // Checked again on writing, since agy takes minutes and Daniel may start a letter meanwhile.
  for (const { file } of targets) {
    if (!options.force && (await exists(file))) throw new Error(overwriteError(file));
  }

  const read = (file, fallback = null) => readFile(file, 'utf8').catch((error) => (fallback !== null && error.code === 'ENOENT' ? fallback : Promise.reject(error)));
  // Gemini reads the tailored portfolio as a whole, not just the variant's changes to the base.
  const portfolio = await Promise.all(variantPages(variant, PAGES).map(async (page) => printMarkdown(await readMarkdown(page.source, page.extends))));
  const profileFile = await findProfile();
  const profile = await read(profileFile);
  if (!PERSONAL_SECTION.test(profile)) {
    throw new Error(`${profileFile} has no "## Basics" section followed by another section, so its birth date and contact details would go to Gemini.`);
  }
  const prompt = [
    await read(join(ROOT, 'scripts/letter.prompt.md')),
    `## Frame\n\n- Company: ${variant.company}\n- Role: ${variant.role}\n- Posting: ${variant.job}\n- Language of the posting: ${variant.language}`,
    `## Voice\n\n${await read(join(ROOT, VARIANTS, 'VOICE.md'))}`,
    `## Posting\n\n${await read(join(folder, 'job.md'))}`,
    `## Company research\n\n${await read(join(folder, 'research.md'), 'None yet.')}`,
    `## Profile\n\n${profile.replace(PERSONAL_SECTION, '')}`,
    `## Tailored portfolio\n\n${portfolio.join('\n\n')}`,
  ].join('\n\n');

  console.log(`Asking ${options.model} through agy for both letters …`);
  const reply = await askAntigravity(prompt);
  const date = new Date().toISOString().slice(0, 10);
  // Both letters pass the Markdown subset before either is written, so a bad reply leaves no half-done pair.
  const letters = targets.map((target) => {
    const markdown = toMarkdown(target.lang, reply.to, reply[target.lang], date);
    toLetter(parseMarkdown(markdown));
    return { ...target, markdown };
  });
  for (const { lang, file, markdown } of letters) {
    try {
      await writeFile(file, markdown, { flag: options.force ? 'w' : 'wx' });
    } catch (error) {
      throw error.code === 'EEXIST' ? new Error(overwriteError(file)) : error;
    }
    const words = reply[lang].paragraphs.join(' ').split(/\s+/).length;
    const dashes = /[—–]/.test(reply[lang].paragraphs.join(' ')) ? ', has dashes between clauses' : '';
    console.log(`Wrote ${file} (${words} words${dashes})`);
  }
  console.log(`\nGemini's notes: ${reply.notes}\nCheck every claim, then print with: npm run docs -- ${name}`);
}

// Runs one prompt through agy and resolves with its reply, checked against SCHEMA.
async function askAntigravity(prompt) {
  const workspace = await mkdtemp(join(tmpdir(), 'portfolio-letter-'));
  try {
    const schemaFile = join(workspace, 'schema.json');
    await writeFile(schemaFile, JSON.stringify(SCHEMA));
    const env = { ...process.env };
    // An IDE-exported project makes the Google login ask that project for a licence, which fails.
    delete env.GOOGLE_CLOUD_PROJECT;
    delete env.GOOGLE_CLOUD_PROJECT_ID;
    const args = ['-p', prompt, '--output-format', 'json', '--json-schema', schemaFile, '--model', options.model, '--sandbox'];
    const { stdout, stderr, code } = await run('agy', args, { cwd: workspace, env });

    let envelope;
    try {
      envelope = JSON.parse(stdout);
    } catch {
      throw new Error(`agy exited with ${code}: ${(stderr || stdout).trim().slice(0, 400)}`);
    }
    if (envelope.status !== 'SUCCESS' || !envelope.response?.trim()) {
      throw new Error(`agy ended with status ${envelope.status} and no letter.`);
    }
    const reply = parseJson(envelope.response);
    for (const lang of ['de', 'en']) {
      const letter = reply[lang];
      const valid = letter && ['subject', 'greeting', 'closing'].every((key) => typeof letter[key] === 'string') && Array.isArray(letter.paragraphs);
      if (!valid || !Array.isArray(reply.to)) throw new Error(`agy's reply misses parts of the ${lang} letter:\n${envelope.response.slice(0, 400)}`);
    }
    return reply;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

// Reads the JSON object in a reply: the whole text, a ```json fence, or the outermost braces.
function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1];
  const braced = text.includes('{') ? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1) : null;
  for (const candidate of [text, fenced, braced]) {
    try {
      if (candidate?.trim()) return JSON.parse(candidate);
    } catch {
      // Tries the next form.
    }
  }
  throw new Error(`agy's reply holds no JSON object:\n${text.slice(0, 400)}`);
}

// Writes a letter in the Markdown that toLetter() reads: its frame in the frontmatter, one line per paragraph.
function toMarkdown(lang, to, letter, date) {
  // The Markdown subset rejects a typed middle dot and HTML entities, and every value must stay on one line.
  const line = (text) => text.replaceAll('·', ',').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();
  return [
    '---',
    `lang: ${lang}`,
    `to: ${to.map(line).join(' + ')}`,
    `date: ${date}`,
    `subject: ${line(letter.subject)}`,
    `greeting: ${line(letter.greeting)}`,
    `closing: ${line(letter.closing)}`,
    '---',
    '',
    letter.paragraphs.map(line).join('\n\n'),
    '',
  ].join('\n');
}

function run(command, args, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} ran longer than ${TIMEOUT_MS / 60000} minutes.`));
    }, TIMEOUT_MS);
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error.code === 'ENOENT' ? new Error(`${command} is not on PATH. Install Antigravity's CLI first.`) : error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

function overwriteError(file) {
  return `${file} exists and may hold your edits. Pass --force to replace it, or --lang to draft only the other language.`;
}

async function findProfile() {
  for (const file of PROFILES) {
    if (await exists(file)) return file;
  }
  throw new Error(`Daniel's profile.md is in none of ${PROFILES.join(', ')}. Set PROFILE to its path.`);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
