// Creates, lists, publishes and takes down variants: tailored copies of the portfolio for one job application.
// see: README.md, "Variants"
//
// Usage:
// - npm run variant -- new <slug> --job <url> [--company <name>] [--role <title>] [--language de|en]
// - npm run variant -- list
// - npm run variant -- publish <slug>
// - npm run variant -- unpublish <slug>
//
// NOTE: publishing only flips "published" in variant.json. The variant goes online, or comes down, with the next push to master.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadVariants, PAGES, ROOT } from './build.mjs';
import { dismissCookieBanner, evaluate, launchChrome, openTab } from './lib/chrome.mjs';
import { checkSlug, toVariant, VARIANTS } from './lib/variants.mjs';

// Time a posting that renders in the browser, like most career sites, takes to show its text.
const POSTING_SETTLE_MS = 2500;

const THEME_TEMPLATE = (company) => `/* Theme of the ${company} variant, loaded after styles.css on its pages and after cv.css on its one-page CVs.
 * The design proposal and its reviews are in private/design.md.
 *
 * NOTE: tokens set on :root also reach print, which must stay white. Set print colors under @media print. */
`;

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
const COMMANDS = { new: create, list, publish: (name) => setPublished(name, true), unpublish: (name) => setPublished(name, false) };

if (!COMMANDS[command]) {
  console.error('Usage: npm run variant -- new <slug> --job <url> | list | publish <slug> | unpublish <slug>');
  process.exit(1);
}
try {
  await COMMANDS[command](slug);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Copies the base Markdown files into variants/<slug>/, with a variant.json, an empty theme.css,
// and the posting's text in private/job.md.
async function create(name) {
  if (!name || !options.job) throw new Error('Usage: npm run variant -- new <slug> --job <url>');
  checkSlug(name);
  if ((await loadVariants()).some((variant) => variant.slug === name)) throw new Error(`${VARIANTS}/${name}/ already exists.`);

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
  const variant = toVariant(name, settings);

  const folder = join(ROOT, VARIANTS, name);
  await mkdir(join(folder, 'private'), { recursive: true });
  for (const page of PAGES) {
    for (const source of [page.source, page.cvSource]) await cp(join(ROOT, source), join(folder, source));
  }
  await writeFile(join(folder, 'variant.json'), `${JSON.stringify(settings, null, 2)}\n`);
  await writeFile(join(folder, 'theme.css'), THEME_TEMPLATE(variant.company));
  await writeFile(
    join(folder, 'private', 'job.md'),
    `# ${posting.role}\n\n- Posting: ${options.job}\n- Saved: ${new Date().toISOString().slice(0, 10)}\n- Page title: ${posting.title}\n\n${posting.text}\n`,
  );

  console.log(`Created ${VARIANTS}/${name}/ for ${variant.company}, "${variant.role}" (${variant.language}).`);
  console.log('Check company, role and language in variant.json, the guesses come from the posting page.');
  console.log(`Preview it with npm start at http://127.0.0.1:4173/portfolio/${name}/`);
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

async function setPublished(name, published) {
  const variant = (await loadVariants()).find((candidate) => candidate.slug === name);
  if (!variant) throw new Error(`There is no variant "${name}" in ${VARIANTS}/.`);
  const file = join(ROOT, VARIANTS, name, 'variant.json');
  const settings = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, `${JSON.stringify({ ...settings, published }, null, 2)}\n`);
  const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  console.log(
    published
      ? `${name} is published. Commit and push to master to put it online at ${homepage}${name}/`
      : `${name} is unpublished. Commit and push to master to take it down. Its files stay in ${VARIANTS}/${name}/.`,
  );
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
