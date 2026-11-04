// Builds the site into dist/: a page and a one-page CV per language from the Markdown files, plus everything in site/.
// Each variant in variants/ adds the same pages below its folder name, see scripts/lib/variants.mjs.
//
// Usage: npm run build [-- --drafts] [-- --variant <slug>]
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseMarkdown } from './lib/markdown.mjs';
import { applyOverlay } from './lib/overlay.mjs';
import { compareStructure } from './lib/parity.mjs';
import { toCv, toPortfolio } from './lib/portfolio.mjs';
import { renderCv, renderPage } from './lib/render.mjs';
import { selectVariants, toVariant, VARIANTS, variantPages } from './lib/variants.mjs';

export const ROOT = new URL('..', import.meta.url).pathname;
export const DIST = join(ROOT, 'dist');
// One-color SVG logos and colored certification badges.
// The pages inline them, so they aren't published as files.
const LOGOS = join(ROOT, 'site/assets/logos');
const BADGES = join(ROOT, 'site/assets/badges');

// - source: Markdown file of the page in the repository root
// - cvSource: Markdown file of the page's one-page CV
// - path: where the page is published below the homepage
// - base: the way from the page back to the site root
export const PAGES = [
  { source: 'portfolio.de.md', cvSource: 'cv.de.md', path: '', base: '' },
  { source: 'portfolio.md', cvSource: 'cv.md', path: 'en/', base: '../' },
];

// Where a page's one-page CV is published, below the page.
export const CV_PATH = 'cv/';

// Files a variant's page can't be built without: template.mjs renders it, page.css styles it.
const REQUIRED_FILES = ['template.mjs', 'page.css'];
// Files and folders of a variant that go online when they exist: its stylesheets, its script, its fonts and its images.
const PUBLISHED_FILES = ['page.css', 'cv.css', 'page.js'];
const PUBLISHED_FOLDERS = ['fonts', 'img'];

/**
 * Builds the base pages and the selected variants into dist/ and throws if a file is invalid.
 * By default it builds the published variants, which is what a deploy puts online.
 * `drafts` and `only` work as in `selectVariants`. Resolves with the variants it built.
 * A structural difference between the two languages only prints a warning.
 */
export async function build({ drafts = false, only = null } = {}) {
  const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const assets = {
    images: JSON.parse(await readFile(join(ROOT, 'site/assets/img/manifest.json'), 'utf8')),
    logos: await loadSvgs(LOGOS, 'assets/logos'),
    badges: await loadSvgs(BADGES, 'assets/badges'),
  };
  const variants = selectVariants(await loadVariants(), { drafts, only });
  const sites = await Promise.all(
    [{ pages: PAGES, variant: null }, ...variants.map((variant) => ({ pages: variantPages(variant, PAGES), variant }))].map(loadSite),
  );
  // Every page renders before dist/ is cleared, so an invalid file leaves the last build in place.
  const pages = [];
  for (const site of sites) {
    const design = site.variant ? await checkVariant(site.variant) : null;
    pages.push(...(await renderSite(site, { homepage, design, ...assets })));
  }

  await rm(DIST, { recursive: true, force: true });
  await cp(join(ROOT, 'site'), DIST, {
    recursive: true,
    filter: (source) => !source.endsWith('manifest.json') && !source.endsWith('.DS_Store') && !source.startsWith(LOGOS) && !source.startsWith(BADGES),
  });
  for (const variant of variants) await publishVariant(variant);
  for (const { file, html } of pages) await write(file, html);
  return variants;
}

/**
 * Reads every variant in variants/, published or not, sorted by folder name.
 * Skips a folder without a variant.json, such as one that only holds private files, and hidden folders.
 * variants/ is a clone of the private variants repository, so it holds a .git folder.
 */
export async function loadVariants() {
  const folder = join(ROOT, VARIANTS);
  let entries;
  try {
    entries = await readdir(folder, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const variants = [];
  const folders = entries.filter((candidate) => candidate.isDirectory() && !candidate.name.startsWith('.'));
  for (const entry of folders.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(VARIANTS, entry.name, 'variant.json');
    let settings;
    try {
      settings = JSON.parse(await readFile(join(ROOT, file), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Warning: skipped ${VARIANTS}/${entry.name}/, it has no variant.json`);
        continue;
      }
      throw new Error(`${file}: ${error.message}`);
    }
    variants.push(toVariant(entry.name, settings));
  }
  return variants;
}

async function loadSite(site) {
  const [first, second] = site.pages;
  const portfolios = await Promise.all(site.pages.map((page) => load(page.source, page.extends, toPortfolio)));
  const cvs = await Promise.all(site.pages.map((page) => load(page.cvSource, page.cvExtends, toCv)));
  warnOnDrift(first.source, second.source, compareStructure(...portfolios));
  warnOnDrift(first.cvSource, second.cvSource, compareStructure(...cvs));
  return { ...site, portfolios, cvs };
}

// Renders the portfolio and the one-page CV of each language of a site, the base site or a variant.
// `design` is the variant's template, stylesheets, script, fonts and theme from checkVariant(), or null for the base site.
// Resolves with each page's file in dist/ and its HTML.
async function renderSite({ pages, variant, portfolios, cvs }, { homepage, design, images, logos, badges }) {
  const rendered = [];
  for (const [index, page] of pages.entries()) {
    const alternateIndex = (index + 1) % pages.length;
    const alternate = pages[alternateIndex];
    const lang = portfolios[index].meta.lang;
    const alternateLang = portfolios[alternateIndex].meta.lang;
    // Variants get no link preview, since the preview images show the base site's look.
    const ogImage = !variant && (await exists(join(ROOT, 'site', `og-${lang}.png`))) ? `${homepage}og-${lang}.png` : null;
    const html = prefixErrors(page.source, () =>
      renderPage(portfolios[index], {
        base: page.base,
        homepage,
        path: page.path,
        cvPath: page.path + CV_PATH,
        alternate: { lang: alternateLang, path: alternate.path },
        images,
        logos,
        badges,
        ogImage,
        variant: design,
      }),
    );
    rendered.push({ file: join(DIST, page.path, 'index.html'), html });

    const cv = prefixErrors(page.cvSource, () =>
      renderCv(cvs[index], {
        meta: portfolios[index].meta,
        base: `${page.base}../`,
        homepage,
        path: page.path + CV_PATH,
        portfolioPath: page.path,
        alternate: { lang: alternateLang, path: alternate.path + CV_PATH },
        images,
        logos,
        badges,
        variant: design,
      }),
    );
    rendered.push({ file: join(DIST, page.path, CV_PATH, 'index.html'), html: cv });
  }
  return rendered;
}

// Checks that a variant can be published and returns its design, what its pages are built and styled with.
// The fields are listed above pageHead() in scripts/lib/render.mjs.
async function checkVariant(variant) {
  const folder = `${VARIANTS}/${variant.slug}`;
  const source = join(ROOT, folder);
  if (await exists(join(ROOT, 'site', variant.slug))) {
    throw new Error(`${folder}/: site/${variant.slug} already exists, rename the variant's folder`);
  }
  for (const file of REQUIRED_FILES) {
    if (!(await exists(join(source, file)))) {
      throw new Error(`${folder}/${file} is missing. A variant brings its own page, see README.md, "Templates".`);
    }
  }
  const optional = async (file) => ((await exists(join(source, file))) ? `${variant.slug}/${file}` : null);
  const fonts = (await exists(join(source, 'fonts'))) ? (await readdir(join(source, 'fonts'))).filter((file) => file.endsWith('.woff2')) : [];
  return {
    template: await loadTemplate(join(source, 'template.mjs'), folder),
    folder: variant.slug,
    stylesheet: `${variant.slug}/page.css`,
    cvStylesheet: await optional('cv.css'),
    script: await optional('page.js'),
    fonts: fonts.sort().map((file) => `${variant.slug}/fonts/${file}`),
    theme: variant.theme,
  };
}

// Imports a variant's template.mjs and returns its default export, the function that renders the body of its pages.
async function loadTemplate(file, folder) {
  // npm start rebuilds in one process, and Node keeps an imported module for good.
  // A new address per version of the file imports its latest state.
  const { mtimeMs } = await stat(file);
  const { default: template } = await import(`${pathToFileURL(file).href}?version=${mtimeMs}`);
  if (typeof template !== 'function') {
    throw new Error(`${folder}/template.mjs must export a default function that renders the page's body, see README.md, "Templates".`);
  }
  return template;
}

// Copies the only files of a variant that go online to dist/<slug>/.
// Anything else in its folder, like its template, notes or captures outside private/, stays behind.
async function publishVariant(variant) {
  const source = join(ROOT, VARIANTS, variant.slug);
  const target = join(DIST, variant.slug);
  await mkdir(target, { recursive: true });
  for (const file of PUBLISHED_FILES) {
    if (await exists(join(source, file))) await cp(join(source, file), join(target, file));
  }
  for (const folder of PUBLISHED_FOLDERS) {
    if (!(await exists(join(source, folder)))) continue;
    await cp(join(source, folder), join(target, folder), { recursive: true, filter: (file) => !file.endsWith('.DS_Store') });
  }
}

/**
 * Reads and parses a Markdown file of the repository.
 * With `baseSource`, the file is a variant's overlay, and it resolves to the base file with the overlay's changes applied.
 * Errors name the file they come from.
 */
export async function readMarkdown(source, baseSource = null) {
  const parse = async (file) => {
    const markdown = await readFile(join(ROOT, file), 'utf8');
    return prefixErrors(file, () => parseMarkdown(markdown));
  };
  const document = await parse(source);
  if (!baseSource) return document;
  const base = await parse(baseSource);
  return prefixErrors(source, () => applyOverlay(base, document));
}

async function load(source, baseSource, toModel) {
  const document = await readMarkdown(source, baseSource);
  return prefixErrors(source, () => toModel(document));
}

function prefixErrors(source, work) {
  try {
    return work();
  } catch (error) {
    error.message = `${source}: ${error.message}`;
    throw error;
  }
}

function warnOnDrift(first, second, differences) {
  if (differences.length > 0) {
    console.warn(`Warning: ${first} and ${second} differ in structure:\n- ${differences.join('\n- ')}`);
  }
}

async function write(file, html) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

// Reads the SVG files in a folder, keyed by their published path.
async function loadSvgs(folder, published) {
  const files = (await readdir(folder)).filter((file) => file.endsWith('.svg'));
  const sources = await Promise.all(files.map((file) => readFile(join(folder, file), 'utf8')));
  return Object.fromEntries(files.map((file, index) => [`${published}/${file}`, sources[index]]));
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values: options } = parseArgs({ options: { drafts: { type: 'boolean', default: false }, variant: { type: 'string' } } });
  try {
    const variants = await build({ drafts: options.drafts, only: options.variant ?? null });
    const names = variants.map((variant) => `${variant.slug}${variant.published ? '' : ' (draft)'}`);
    console.log(`Built dist/${names.length > 0 ? ` with ${names.join(', ')}` : ''}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
