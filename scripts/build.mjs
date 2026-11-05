// Builds the site into dist/: a page and a one-page CV per language from the Markdown files, plus everything in site/.
// Each variant in variants/ adds the same pages below its folder name, see scripts/lib/variants.mjs.
//
// Usage: npm run build [-- --drafts] [-- --variant <slug>]
import { access, cp, lstat, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { parseMarkdown } from './lib/markdown.mjs';
import { applyOverlay } from './lib/overlay.mjs';
import { compareStructure } from './lib/parity.mjs';
import { toCv, toPortfolio } from './lib/portfolio.mjs';
import { renderCv, renderPage } from './lib/render.mjs';
import { checkTemplate, publishedSource } from './lib/variant-files.mjs';
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
// Files of a variant that go online when they exist, without their comments: its stylesheets and its script.
const PUBLISHED_FILES = ['page.css', 'cv.css', 'page.js'];
// Folders of a variant that go online, and the only files each may hold.
const PUBLISHED_FOLDERS = {
  fonts: { files: /^(?:[\w.-]+\.woff2|LICENSE[\w.-]*\.txt)$/, holds: 'woff2 fonts and their LICENSE*.txt' },
  img: { files: /^[\w.-]+\.(?:webp|avif)$/, holds: 'WebP and AVIF images' },
};

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
  // Every page renders, and every variant's files are read and checked, before dist/ is cleared,
  // so an invalid file leaves the last build in place.
  const pages = [];
  const publications = [];
  for (const site of sites) {
    const design = site.variant ? await checkVariant(site.variant) : null;
    if (site.variant) publications.push(await readPublication(site.variant));
    pages.push(...(await renderSite(site, { homepage, design, ...assets })));
  }

  await rm(DIST, { recursive: true, force: true });
  await cp(join(ROOT, 'site'), DIST, {
    recursive: true,
    filter: (source) => !source.endsWith('manifest.json') && !source.endsWith('.DS_Store') && !source.startsWith(LOGOS) && !source.startsWith(BADGES),
  });
  for (const publication of publications) await publishVariant(publication);
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
      throw new Error(`${folder}/${file} is missing. A variant brings its own page, see DEVELOPMENT.md, "Templates".`);
    }
  }
  checkTemplate(`${folder}/template.mjs`, await readFile(join(source, 'template.mjs'), 'utf8'));

  const optional = async (file) => ((await exists(join(source, file))) ? `${variant.slug}/${file}` : null);
  const fonts = (await publishedFolder(variant, 'fonts')).filter((file) => file.endsWith('.woff2'));
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
    throw new Error(`${folder}/template.mjs must export a default function that renders the page's body, see DEVELOPMENT.md, "Templates".`);
  }
  return template;
}

// Reads what a variant puts online: its stylesheets and script without their comments, and the files of its fonts/ and img/.
// Throws on a file that can't go online.
async function readPublication(variant) {
  const source = join(ROOT, VARIANTS, variant.slug);
  const texts = [];
  for (const file of PUBLISHED_FILES) {
    const info = await lstat(join(source, file)).catch(() => null);
    if (!info) continue;
    if (!info.isFile()) throw new Error(`${VARIANTS}/${variant.slug}/${file} can't go online: it is a link or a folder, not a file.`);
    texts.push({ file, text: publishedSource(`${VARIANTS}/${variant.slug}/${file}`, await readFile(join(source, file), 'utf8')) });
  }
  const copies = [];
  for (const name of Object.keys(PUBLISHED_FOLDERS)) {
    copies.push(...(await publishedFolder(variant, name)).map((file) => `${name}/${file}`));
  }
  return { slug: variant.slug, texts, copies };
}

// Writes what readPublication() read to dist/<slug>/.
// Anything else in a variant's folder, like its template, notes or captures outside private/, stays behind.
async function publishVariant({ slug, texts, copies }) {
  const source = join(ROOT, VARIANTS, slug);
  const target = join(DIST, slug);
  for (const { file, text } of texts) await write(join(target, file), text);
  for (const file of copies) {
    await mkdir(dirname(join(target, file)), { recursive: true });
    await cp(join(source, file), join(target, file));
  }
}

// Lists the files of a variant's fonts/ or img/ that go online, and throws on any other entry in it.
// A link would put whatever it points at online, a private file included.
async function publishedFolder(variant, name) {
  const folder = join(ROOT, VARIANTS, variant.slug, name);
  const info = await lstat(folder).catch(() => null);
  if (!info) return [];
  if (!info.isDirectory()) throw new Error(`${VARIANTS}/${variant.slug}/${name} can't go online: it is a link or a file, not a folder.`);
  const { files, holds } = PUBLISHED_FOLDERS[name];
  const entries = (await readdir(folder, { withFileTypes: true })).filter((entry) => entry.name !== '.DS_Store');
  const stray = entries.find((entry) => !entry.isFile() || !files.test(entry.name));
  if (stray) {
    throw new Error(
      `${VARIANTS}/${variant.slug}/${name}/${stray.name} can't go online: ${name}/ holds only ${holds}, as plain files. Keep other files, like an image's source, in private/.`,
    );
  }
  return entries.map((entry) => entry.name).sort();
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
  if (differences.length === 0) return;
  // CI's log is public, and a variant's differences quote its headings and links.
  if (process.env.CI && first.startsWith(`${VARIANTS}/`)) {
    console.warn(`Warning: ${first} and ${second} differ in structure in ${differences.length} places. Run npm run build to list them.`);
    return;
  }
  console.warn(`Warning: ${first} and ${second} differ in structure:\n- ${differences.join('\n- ')}`);
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
