// Builds the site into dist/: a page and a one-page CV per language from the Markdown files, plus everything in site/.
import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseMarkdown } from './lib/markdown.mjs';
import { compareStructure } from './lib/parity.mjs';
import { toCv, toPortfolio } from './lib/portfolio.mjs';
import { renderCv, renderPage } from './lib/render.mjs';

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

/**
 * Builds both language pages and their CVs into dist/ and throws if a file is invalid.
 * A structural difference between the two languages only prints a warning.
 */
export async function build() {
  const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const images = JSON.parse(await readFile(join(ROOT, 'site/assets/img/manifest.json'), 'utf8'));
  const logos = await loadSvgs(LOGOS, 'assets/logos');
  const badges = await loadSvgs(BADGES, 'assets/badges');
  const [first, second] = await Promise.all(PAGES.map((page) => load(page.source, toPortfolio)));
  const [firstCv, secondCv] = await Promise.all(PAGES.map((page) => load(page.cvSource, toCv)));
  warnOnDrift(PAGES[0].source, PAGES[1].source, compareStructure(first, second));
  warnOnDrift(PAGES[0].cvSource, PAGES[1].cvSource, compareStructure(firstCv, secondCv));

  await rm(DIST, { recursive: true, force: true });
  await cp(join(ROOT, 'site'), DIST, {
    recursive: true,
    filter: (source) => !source.endsWith('manifest.json') && !source.endsWith('.DS_Store') && !source.startsWith(LOGOS) && !source.startsWith(BADGES),
  });

  const pages = [
    { ...PAGES[0], portfolio: first, cv: firstCv, alternate: PAGES[1], alternatePortfolio: second },
    { ...PAGES[1], portfolio: second, cv: secondCv, alternate: PAGES[0], alternatePortfolio: first },
  ];
  for (const page of pages) {
    const lang = page.portfolio.meta.lang;
    const alternateLang = page.alternatePortfolio.meta.lang;
    const ogImage = (await exists(join(ROOT, 'site', `og-${lang}.png`))) ? `${homepage}og-${lang}.png` : null;
    const html = prefixErrors(page.source, () =>
      renderPage(page.portfolio, {
        base: page.base,
        homepage,
        path: page.path,
        cvPath: page.path + CV_PATH,
        alternate: { lang: alternateLang, path: page.alternate.path },
        images,
        logos,
        badges,
        ogImage,
      }),
    );
    await write(join(DIST, page.path, 'index.html'), html);

    const cv = prefixErrors(page.cvSource, () =>
      renderCv(page.cv, {
        meta: page.portfolio.meta,
        base: `${page.base}../`,
        homepage,
        path: page.path + CV_PATH,
        portfolioPath: page.path,
        alternate: { lang: alternateLang, path: page.alternate.path + CV_PATH },
        images,
        logos,
        badges,
      }),
    );
    await write(join(DIST, page.path, CV_PATH, 'index.html'), cv);
  }
}

async function load(source, toModel) {
  const markdown = await readFile(join(ROOT, source), 'utf8');
  return prefixErrors(source, () => toModel(parseMarkdown(markdown)));
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
  try {
    await build();
    console.log('Built dist/');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
