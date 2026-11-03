// Prints a variant's private documents to PDF, next to their sources in variants/<slug>/private/:
// - brief.body.html: the interview brief, the body of a house-style page, at most two A4 pages
// - cover-letter.<lang>.md: one A4 page each, its text from greeting to signature at most half a page
//
// Usage: npm run docs -- <slug>
//
// Each document becomes a self-contained HTML page beside its source, styled by scripts/documents.css
// and the variant's documents.css, then a PDF. A missing document is skipped.
// Every text must meet the WCAG 2.2 AA contrast minimum, as printed.
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadVariants, PAGES, ROOT } from './build.mjs';
import { countPages, evaluate, launchChrome, openTab, printPdf } from './lib/chrome.mjs';
import { auditContrast } from './lib/contrast.mjs';
import { renderLetter, toLetter, wrapDocument } from './lib/documents.mjs';
import { parseMarkdown } from './lib/markdown.mjs';
import { toPortfolio } from './lib/portfolio.mjs';
import { VARIANTS, variantPages } from './lib/variants.mjs';

const MAX_BRIEF_PAGES = 2;
// Half an A4 page, the most a letter's text may take.
const MAX_LETTER_TEXT_MM = 148.5;
// An A4 page in CSS pixels, so the screen layout measures like the printed sheet.
const A4 = { width: 794, height: 1123 };

const { positionals } = parseArgs({ allowPositionals: true });
const [slug] = positionals;
if (!slug) {
  console.error('Usage: npm run docs -- <slug>');
  process.exit(1);
}

const variant = (await loadVariants()).find((candidate) => candidate.slug === slug);
if (!variant) {
  console.error(`There is no variant "${slug}" in ${VARIANTS}/.`);
  process.exit(1);
}
const { homepage } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const folder = join(ROOT, VARIANTS, slug, 'private');
// The sender of each letter comes from the variant's portfolio in its language, and links to that page.
const portfolios = Object.fromEntries(
  await Promise.all(
    variantPages(variant, PAGES).map(async (page) => {
      const { meta } = toPortfolio(parseMarkdown(await readFile(join(ROOT, page.source), 'utf8')));
      return [meta.lang, { meta, path: page.path }];
    }),
  ),
);
const palette = join(ROOT, VARIANTS, slug, 'documents.css');
const styles = [await readFile(join(ROOT, 'scripts/documents.css'), 'utf8'), ...((await exists(palette)) ? [await readFile(palette, 'utf8')] : [])];

const chrome = await launchChrome();
const failures = [];
try {
  if (await exists(join(folder, 'brief.body.html'))) {
    const body = await readFile(join(folder, 'brief.body.html'), 'utf8');
    const title = textOf(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? variant.company);
    await writeFile(join(folder, 'brief.html'), wrapDocument({ lang: variant.language, title, body, styles }));
    const { pdf, contrast } = await print('brief');
    const pages = countPages(pdf);
    console.log(`${pages > MAX_BRIEF_PAGES ? '✗' : '✓'} ${'brief.pdf'.padEnd(20)} ${pages} of ${MAX_BRIEF_PAGES} pages`);
    if (pages > MAX_BRIEF_PAGES) failures.push(`brief.body.html prints on ${pages} pages, shorten it`);
    failures.push(...contrast.map((problem) => `brief.body.html: ${problem}`));
  }
  for (const lang of Object.keys(portfolios)) {
    const name = `cover-letter.${lang}`;
    if (!(await exists(join(folder, `${name}.md`)))) continue;
    const { meta, path } = portfolios[lang];
    let html;
    try {
      html = renderLetter(toLetter(parseMarkdown(await readFile(join(folder, `${name}.md`), 'utf8'))), { meta, homepage, portfolioPath: path, styles });
    } catch (error) {
      throw new Error(`${folder}/${name}.md: ${error.message}`);
    }
    await writeFile(join(folder, `${name}.html`), html);
    const { pdf, contrast, textMm } = await print(name, '.letter__body');
    const pages = countPages(pdf);
    const fits = pages === 1 && textMm <= MAX_LETTER_TEXT_MM;
    console.log(`${fits ? '✓' : '✗'} ${`${name}.pdf`.padEnd(20)} ${pages} page, text ${Math.round(textMm)} of ${MAX_LETTER_TEXT_MM} mm`);
    if (!fits) failures.push(`${name}.md takes ${pages} page(s) and ${Math.round(textMm)} mm of text, shorten it to half a page`);
    failures.push(...contrast.map((problem) => `${name}.md: ${problem}`));
  }
} finally {
  await chrome.close();
}
if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nSaved the HTML pages and PDFs to ${folder}/`);

// Prints <name>.html from the private folder to <name>.pdf, after auditing its contrast as printed.
// With `measure`, it also measures that element's height as printed, in millimeters.
async function print(name, measure = null) {
  const tab = await openTab(chrome.client, pathToFileURL(join(folder, `${name}.html`)).href, A4);
  try {
    await tab.send('Emulation.setEmulatedMedia', { media: 'print' });
    const contrast = await evaluate(tab.send, `(${auditContrast})()`);
    const textMm = measure ? ((await evaluate(tab.send, `document.querySelector('${measure}').getBoundingClientRect().height`)) * 25.4) / 96 : null;
    const pdf = await printPdf(tab);
    await writeFile(join(folder, `${name}.pdf`), pdf);
    return { pdf, contrast, textMm };
  } finally {
    await tab.close();
  }
}

// The plain text of a bit of HTML, for the page title.
function textOf(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
