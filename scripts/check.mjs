// Checks the built pages in headless Chrome, for both languages of the base site and of the variants it builds:
// - the rail fits the viewport below, and nothing scrolls sideways
// - the printed CV stays within two A4 pages, and the one-page CV within one
// - text and controls meet the WCAG 2.2 AA contrast minimums, in the light and the dark theme
//
// Options:
// - --drafts: also check the variants that aren't published
// - --variant <slug>: check only this variant, published or not
// - --shots <dir>: also save a screenshot per screen and both CVs as PDF, for review
// - --theme light|dark: theme for the screenshots (default: the theme each page opens in)
// - --mobile: add the same screenshots at phone width
// - --scale <n>: device pixel ratio of the screenshots, e.g. 2 for a Retina display (default: 1)
// - --og: redraw the link preview images site/og-<lang>.png from the top of each page, then rebuild
//
// NOTE: needs Google Chrome or Chromium. Set CHROME_PATH if it isn't found.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { build, CV_PATH, DIST, PAGES, ROOT } from './build.mjs';
import { countPages, evaluate, launchChrome, openTab as openChromeTab, printPdf, screenshot } from './lib/chrome.mjs';
import { auditContrast } from './lib/contrast.mjs';
import { serve } from './lib/server.mjs';
import { variantPages } from './lib/variants.mjs';

// A 13" MacBook Air at its default 1470×956, minus the menu bar, Chrome's toolbars and the Dock.
const VIEWPORT = { width: 1440, height: 760 };
const PHONE = { width: 390, height: 844 };
// Size LinkedIn and other link previews show.
const PREVIEW = { width: 1200, height: 630 };
const MAX_CV_PAGES = 2;
// The 150 ms main.js waits before showing a keyvisual, plus its longest transition in styles.css.
const KEYVISUAL_FOCUS_MS = 2000;

// Runs in the page and reports the screens to capture, the rail's height and the sideways overflow.
const MEASURE = `(() => {
  const rail = document.querySelector('.rail');
  return {
    screens: [...document.querySelectorAll('.screen')].map((screen) => ({
      id: screen.id,
      keyvisual: 'keyvisual' in screen.dataset,
    })),
    rail: { needed: rail.scrollHeight, available: rail.clientHeight },
    sideways: layoutOverflow(),
  };

  // Width the layout itself needs beyond the window. Panels may slide in from off screen and
  // the body clips them, so both are switched off while measuring.
  function layoutOverflow() {
    const panels = [...document.querySelectorAll('.panel')];
    panels.forEach((panel) => panel.style.setProperty('transform', 'none'));
    document.body.style.overflowX = 'visible';
    const overflow = document.documentElement.scrollWidth - innerWidth;
    document.body.style.overflowX = '';
    panels.forEach((panel) => panel.style.removeProperty('transform'));
    return overflow;
  }
})()`;

const { values: options } = parseArgs({
  options: {
    drafts: { type: 'boolean', default: false },
    variant: { type: 'string' },
    shots: { type: 'string' },
    theme: { type: 'string' },
    mobile: { type: 'boolean', default: false },
    og: { type: 'boolean', default: false },
    scale: { type: 'string', default: '1' },
  },
});

const variants = await build({ drafts: options.drafts, only: options.variant ?? null });
// Each page gets a label for its screenshots and the theme it opens in: the base pages open dark.
const pages = [
  ...(options.variant ? [] : PAGES.map((page) => ({ ...page, label: '', theme: 'dark' }))),
  ...variants.flatMap((variant) => variantPages(variant, PAGES).map((page) => ({ ...page, label: variant.slug, theme: variant.theme }))),
];
const server = await serve(DIST);
const chrome = await launchChrome();
const failures = [];

try {
  for (const page of pages) {
    const theme = options.theme ?? page.theme;
    const tab = await openTab(chrome.client, server.url + page.path, { ...VIEWPORT, theme });
    const lang = await evaluate(tab.send, 'document.documentElement.lang');
    const name = [page.label, lang].filter(Boolean).join('-');
    const result = await evaluate(tab.send, MEASURE);

    console.log(`\n${page.source}`);
    const railOver = result.rail.needed > result.rail.available;
    console.log(`  ${railOver ? '✗' : '✓'} ${'rail'.padEnd(18)} ${String(result.rail.needed).padStart(4)} / ${result.rail.available}`);
    if (railOver) failures.push(`${page.source}: the rail is ${result.rail.needed - result.rail.available} px too tall`);
    if (result.sideways > 0) failures.push(`${page.source}: the page scrolls sideways by ${result.sideways} px`);

    failures.push(...(await auditThemes(tab, page.source, 'contrast', theme)));

    const pdf = await printPdf(tab);
    const cvPages = countPages(pdf);
    console.log(`  ${cvPages > MAX_CV_PAGES ? '✗' : '✓'} ${'printed CV'.padEnd(18)} ${cvPages} of ${MAX_CV_PAGES} pages`);
    if (cvPages > MAX_CV_PAGES) failures.push(`${page.source}: the printed CV has ${cvPages} pages`);

    if (options.shots) {
      await saveShots(tab, options.shots, `${name}-${theme}`, result.screens, { file: `${name}-cv.pdf`, pdf });
    }
    await tab.close();

    const cv = await openTab(chrome.client, server.url + page.path + CV_PATH, { ...VIEWPORT, theme });
    failures.push(...(await auditThemes(cv, page.cvSource, 'CV contrast', theme)));
    const sheet = await printPdf(cv);
    const sheets = countPages(sheet);
    console.log(`  ${sheets > 1 ? '✗' : '✓'} ${'one-page CV'.padEnd(18)} ${sheets} of 1 page`);
    if (sheets > 1) failures.push(`${page.cvSource}: the one-page CV prints on ${sheets} pages`);
    if (options.shots) {
      await mkdir(options.shots, { recursive: true });
      await writeFile(join(options.shots, `${name}-cv-one-page.pdf`), sheet);
    }
    await cv.close();

    if (options.shots && options.mobile) {
      const phone = await openTab(chrome.client, server.url + page.path, { ...PHONE, theme });
      const { screens } = await evaluate(phone.send, MEASURE);
      await saveShots(phone, options.shots, `${name}-phone-${theme}`, screens);
      await phone.close();
    }

    if (options.og && !page.label) {
      const preview = await openTab(chrome.client, server.url + page.path, { ...PREVIEW, theme: 'dark' });
      await scrollTo(preview, 0);
      await screenshot(preview, join(ROOT, 'site', `og-${lang}.png`));
      await preview.close();
    }
  }
  if (options.og) {
    await build({ drafts: options.drafts, only: options.variant ?? null });
    console.log('\nRedrew site/og-*.png and rebuilt dist/.');
  }
} finally {
  await chrome.close();
  await server.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');

// Saves the top of the page, a project sliding in and every screen, named "<prefix>-<nn>-<screen>.png".
// `cv` is the printed portfolio, saved as PDF beside them.
async function saveShots(tab, folder, prefix, screens, cv = null) {
  await mkdir(folder, { recursive: true });
  if (cv) await writeFile(join(folder, cv.file), cv.pdf);
  await scrollTo(tab, 0);
  await screenshot(tab, join(folder, `${prefix}-00-top.png`));
  // The first project halfway through its slide-in.
  // It comes before the screens, because a panel that has slid all the way in stays in place.
  await scrollTo(tab, `document.querySelector('.screen--project').offsetTop - innerHeight * 0.55`);
  await screenshot(tab, join(folder, `${prefix}-sliding.png`));
  for (const [index, screen] of screens.entries()) {
    await scrollTo(tab, `document.getElementById('${screen.id}').offsetTop`);
    if (screen.keyvisual) await new Promise((done) => setTimeout(done, KEYVISUAL_FOCUS_MS));
    await screenshot(tab, join(folder, `${prefix}-${String(index + 1).padStart(2, '0')}-${screen.id}.png`));
  }
}

// Audits the contrast in the light and the dark theme, prints a line for each, and returns the problems.
// The tab is left in `theme`, the one the screenshots use.
async function auditThemes(tab, source, label, theme) {
  const problems = [];
  for (const audited of ['light', 'dark']) {
    await setTheme(tab, audited);
    const found = await evaluate(tab.send, `(${auditContrast})()`);
    console.log(`  ${found.length > 0 ? '✗' : '✓'} ${`${label}, ${audited}`.padEnd(18)} ${found.length} below the minimum`);
    problems.push(...found.map((problem) => `${source}, ${audited} theme: ${problem}`));
  }
  await setTheme(tab, theme);
  return problems;
}

async function scrollTo(tab, top) {
  await evaluate(
    tab.send,
    `window.scrollTo({ top: ${top}, behavior: 'instant' });
     Promise.all([...document.images].filter((image) => image.getBoundingClientRect().top < innerHeight * 2).map((image) => { image.loading = 'eager'; return image.decode().catch(() => {}); }))
       .then(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))`,
  );
}

// Picks the theme the way the theme toggle does, since the page ignores the system's color scheme.
async function setTheme(tab, theme) {
  await evaluate(tab.send, `document.documentElement.dataset.theme = '${theme}'`);
}

// Opens a page in the given theme, at the scale the screenshots use.
async function openTab(client, url, { width, height, theme }) {
  const tab = await openChromeTab(client, url, { width, height, scale: Number(options.scale) });
  await setTheme(tab, theme);
  return tab;
}
