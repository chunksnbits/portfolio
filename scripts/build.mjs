// Builds the site into dist/: one page per language from the Markdown files, plus everything in site/.
import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseMarkdown } from './lib/markdown.mjs';
import { compareStructure } from './lib/parity.mjs';
import { toPortfolio } from './lib/portfolio.mjs';
import { renderPage } from './lib/render.mjs';

export const ROOT = new URL('..', import.meta.url).pathname;
export const DIST = join(ROOT, 'dist');
// One-color SVG logos and colored certification badges.
// The pages inline them, so they aren't published as files.
const LOGOS = join(ROOT, 'site/assets/logos');
const BADGES = join(ROOT, 'site/assets/badges');

// - source: Markdown file in the repository root
// - path: where the page is published below the homepage
// - base: the way from the page back to the site root
export const PAGES = [
  { source: 'portfolio.de.md', path: '', base: '' },
  { source: 'portfolio.md', path: 'en/', base: '../' },
];

/**
 * Builds both language pages into dist/ and throws if a file is invalid.
 * A structural difference between the two languages only prints a warning.
 */
export async function build() {
  const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const images = JSON.parse(await readFile(join(ROOT, 'site/assets/img/manifest.json'), 'utf8'));
  const logos = await loadSvgs(LOGOS, 'assets/logos');
  const badges = await loadSvgs(BADGES, 'assets/badges');
  const [first, second] = await Promise.all(PAGES.map((page) => load(page.source)));

  const differences = compareStructure(first, second);
  if (differences.length > 0) {
    console.warn(
      `Warning: ${PAGES[0].source} and ${PAGES[1].source} differ in structure:\n- ${differences.join('\n- ')}`,
    );
  }

  await rm(DIST, { recursive: true, force: true });
  await cp(join(ROOT, 'site'), DIST, {
    recursive: true,
    filter: (source) => !source.endsWith('manifest.json') && !source.endsWith('.DS_Store') && !source.startsWith(LOGOS) && !source.startsWith(BADGES),
  });

  const pages = [
    { ...PAGES[0], portfolio: first, alternate: PAGES[1], alternatePortfolio: second },
    { ...PAGES[1], portfolio: second, alternate: PAGES[0], alternatePortfolio: first },
  ];
  for (const page of pages) {
    const lang = page.portfolio.meta.lang;
    const ogImage = (await exists(join(ROOT, 'site', `og-${lang}.png`))) ? `${homepage}og-${lang}.png` : null;
    const html = renderPage(page.portfolio, {
      base: page.base,
      homepage,
      path: page.path,
      alternate: { lang: page.alternatePortfolio.meta.lang, path: page.alternate.path },
      images,
      logos,
      badges,
      ogImage,
    });
    const file = join(DIST, page.path, 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  }
}

async function load(source) {
  const markdown = await readFile(join(ROOT, source), 'utf8');
  try {
    return toPortfolio(parseMarkdown(markdown));
  } catch (error) {
    error.message = `${source}: ${error.message}`;
    throw error;
  }
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
