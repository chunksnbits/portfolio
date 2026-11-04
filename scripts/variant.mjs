// Creates, lists, shows, publishes and takes down variants: tailored copies of the portfolio for one job application.
// see: DEVELOPMENT.md, "Variants"
//
// Usage:
// - npm run variant -- new <name> --job <url> [--company <name>] [--role <title>] [--language de|en]
//   creates variants/<name>-<6 random characters>/, whose folder name is the variant's slug
// - npm run variant -- list
// - npm run variant -- show <slug>
// - npm run variant -- publish <slug>
// - npm run variant -- unpublish <slug>
//
// NOTE: publishing only flips "published" in variant.json. variants/ is a clone of the private repository
// chunksnbits/portfolio-variants, so the change is committed there, and the variant goes online, or comes down,
// with the next run of the portfolio's Pages workflow.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadVariants, PAGES, readMarkdown, ROOT } from './build.mjs';
import { dismissCookieBanner, evaluate, launchChrome, openTab } from './lib/chrome.mjs';
import { printMarkdown } from './lib/markdown.mjs';
import { checkSlug, toVariant, VARIANTS, variantPages } from './lib/variants.mjs';

// Steps that put a change to variant.json online.
const DEPLOY = `commit and push it in ${VARIANTS}/, then run: gh workflow run Pages --ref master`;

// Random characters that end a new variant's folder name, so its address can't be guessed from the company's name.
// 36^6, about 2 billion endings, are too many to try.
const SUFFIX_LENGTH = 6;

// Time a posting that renders in the browser, like most career sites, takes to show its text.
const POSTING_SETTLE_MS = 2500;

// Files of a new variant's page: a plain page that builds, until /tailor replaces it with one in the company's patterns.
// The starter writes "COMPANY" where the variant's company goes.
const STARTER = new URL('variant-starter/', import.meta.url);
const STARTER_FILES = ['template.mjs', 'page.css', 'cv.css'];

const { values: options, positionals } = parseArgs({
  options: {
    job: { type: 'string' },
    company: { type: 'string' },
    role: { type: 'string' },
    language: { type: 'string' },
  },
  allowPositionals: true,
});
const [command, slug] = positionals;
const COMMANDS = { new: create, list, show, publish: (name) => setPublished(name, true), unpublish: (name) => setPublished(name, false) };

if (!COMMANDS[command]) {
  console.error('Usage: npm run variant -- new <slug> --job <url> | list | show <slug> | publish <slug> | unpublish <slug>');
  process.exit(1);
}
try {
  await COMMANDS[command](slug);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Creates variants/<name>-<random>/ with a variant.json, the starter page, one Markdown file per base file
// that changes nothing yet, and the posting's text in private/job.md.
async function create(name) {
  if (!name || !options.job) throw new Error('Usage: npm run variant -- new <name> --job <url>');
  const slug = `${name}-${[...randomBytes(SUFFIX_LENGTH)].map((byte) => (byte % 36).toString(36)).join('')}`;
  checkSlug(slug);
  if ((await loadVariants()).some((variant) => variant.slug === slug)) throw new Error(`${VARIANTS}/${slug}/ already exists.`);

  console.log(`Reading the posting at ${options.job} …`);
  const posting = await readPosting(options.job);
  const settings = {
    company: options.company ?? posting.company,
    role: options.role ?? posting.role,
    job: options.job,
    language: options.language ?? posting.language,
    published: false,
    theme: 'dark',
  };
  const variant = toVariant(slug, settings);

  const folder = join(ROOT, VARIANTS, slug);
  await mkdir(join(folder, 'private'), { recursive: true });
  for (const page of PAGES) {
    for (const source of [page.source, page.cvSource]) {
      await writeFile(join(folder, source), `<!-- Changes to ${source} for ${variant.company}. Format: DEVELOPMENT.md, "Variant files". -->\n`);
    }
  }
  await writeFile(join(folder, 'variant.json'), `${JSON.stringify(settings, null, 2)}\n`);
  for (const file of STARTER_FILES) {
    const starter = await readFile(new URL(file, STARTER), 'utf8');
    await writeFile(join(folder, file), starter.replaceAll('COMPANY', variant.company));
  }
  await writeFile(
    join(folder, 'private', 'job.md'),
    `# ${posting.role}\n\n- Posting: ${options.job}\n- Saved: ${new Date().toISOString().slice(0, 10)}\n- Page title: ${posting.title}\n\n${posting.text}\n`,
  );

  console.log(`Created ${VARIANTS}/${slug}/ for ${variant.company}, "${variant.role}" (${variant.language}).`);
  console.log('Check company, role and language in variant.json, the guesses come from the posting page.');
  console.log(`Preview it with npm start at http://127.0.0.1:4173/portfolio/${slug}/`);
}

async function list() {
  const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const variants = await loadVariants();
  if (variants.length === 0) {
    console.log(`No variants yet. Create one with: npm run variant -- new <slug> --job <url>`);
    return;
  }
  for (const variant of variants) {
    console.log(`${variant.published ? 'published' : 'draft    '}  ${variant.slug.padEnd(24)} ${variant.company}, ${variant.role}`);
    console.log(`           ${homepage}${variant.slug}/`);
  }
}

// Prints each of a variant's Markdown files with its changes applied to the base file, the way the build reads it.
async function show(name) {
  const variant = await findVariant(name);
  for (const page of variantPages(variant, PAGES)) {
    for (const [source, base] of [
      [page.source, page.extends],
      [page.cvSource, page.cvExtends],
    ]) {
      console.log(`<!-- ${source}, applied to ${base} -->\n\n${printMarkdown(await readMarkdown(source, base))}`);
    }
  }
}

async function setPublished(name, published) {
  await findVariant(name);
  const file = join(ROOT, VARIANTS, name, 'variant.json');
  const settings = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, `${JSON.stringify({ ...settings, published }, null, 2)}\n`);
  const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  console.log(
    published
      ? `${name} is published. To put it online at ${homepage}${name}/, ${DEPLOY}.`
      : `${name} is unpublished. To take it down, ${DEPLOY}. Its files stay in ${VARIANTS}/${name}/.`,
  );
}

async function findVariant(name) {
  const variant = (await loadVariants()).find((candidate) => candidate.slug === name);
  if (!variant) throw new Error(`There is no variant "${name}" in ${VARIANTS}/.`);
  return variant;
}

// Reads a posting's text and guesses the company, the role and the language from the page.
async function readPosting(url) {
  const chrome = await launchChrome();
  try {
    const tab = await openTab(chrome.client, url, { width: 1280, height: 900 });
    await dismissCookieBanner(tab);
    await new Promise((done) => setTimeout(done, POSTING_SETTLE_MS));
    return await evaluate(
      tab.send,
      `(() => {
        const meta = (name) => document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]')?.content?.trim();
        const role = document.querySelector('main h1, h1')?.innerText.trim() || document.title;
        const site = meta('og:site_name') || location.hostname.replace(/^www\\./, '').split('.')[0];
        const lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
        return {
          title: document.title,
          role,
          company: site.replace(/\\s*[-|].*$/, '').trim(),
          language: ['de', 'en'].includes(lang) ? lang : 'en',
          text: (document.querySelector('main') ?? document.body).innerText.replace(/\\n{3,}/g, '\\n\\n').trim(),
        };
      })()`,
    );
  } finally {
    await chrome.close();
  }
}
