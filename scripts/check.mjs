// Checks the built pages in headless Chrome, for both languages:
// - the rail fits the viewport below, and nothing scrolls sideways
// - the printed CV stays within two A4 pages, and the one-page CV within one
// - text and controls meet the WCAG 2.2 AA contrast minimums, in the light and the dark theme
//
// Options:
// - --shots <dir>: also save a screenshot per screen and both CVs as PDF, for review
// - --theme light|dark: theme for the screenshots (default: dark)
// - --mobile: add the same screenshots at phone width
// - --scale <n>: device pixel ratio of the screenshots, e.g. 2 for a Retina display (default: 1)
// - --og: redraw the link preview images site/og-<lang>.png from the top of each page, then rebuild
//
// NOTE: needs Google Chrome or Chromium. Set CHROME_PATH if it isn't found.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { build, CV_PATH, DIST, PAGES, ROOT } from './build.mjs';
import { serve } from './lib/server.mjs';

// A 13" MacBook Air at its default 1470×956, minus the menu bar, Chrome's toolbars and the Dock.
const VIEWPORT = { width: 1440, height: 760 };
const PHONE = { width: 390, height: 844 };
// Size LinkedIn and other link previews show.
const PREVIEW = { width: 1200, height: 630 };
const MAX_CV_PAGES = 2;
// The 150 ms main.js waits before showing a keyvisual, plus its longest transition in styles.css.
const KEYVISUAL_FOCUS_MS = 2000;

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

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

// Runs in the page and lists text below 4.5:1 (3:1 when large) and controls whose outline is below 3:1.
// see: https://www.w3.org/TR/WCAG22/#contrast-minimum
//
// NOTE: only solid colors count. Text over a screenshot or an image is not checked.
function auditContrast() {
  // Links and buttons fade their colors, so right after a theme switch they still show the old theme.
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.append(still);
  // A panel that hasn't slid in yet is faded. The audit checks every panel in place.
  const panels = [...document.querySelectorAll('.panel')];
  panels.forEach((panel) => panel.style.setProperty('animation', 'none'));

  const failures = [];
  const checked = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const element = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent.trim() || checked.has(element) || !isVisible(element)) continue;
    checked.add(element);

    const style = getComputedStyle(element);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const background = backgroundBehind(element);
    const ratio = contrast(blend(withOpacity(parse(style.color), element), background), background);
    const minimum = large ? 3 : 4.5;
    if (ratio < minimum) failures.push(`${describe(element)} text ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
  }

  for (const control of document.querySelectorAll('.button, .language, .theme-toggle')) {
    if (!isVisible(control)) continue;
    const style = getComputedStyle(control);
    const page = backgroundBehind(control.parentElement);
    const fill = parse(style.backgroundColor);
    const edge = blend(fill[3] >= 1 ? fill : parse(style.borderTopColor), page);
    const ratio = contrast(edge, page);
    if (ratio < 3) failures.push(`${describe(control)} outline ${ratio.toFixed(2)}:1, needs 3:1`);
  }

  panels.forEach((panel) => panel.style.removeProperty('animation'));
  still.remove();
  return failures;

  function isVisible(element) {
    const { width, height } = element.getBoundingClientRect();
    return width > 0 && height > 0 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('.visually-hidden');
  }

  // Stacks the backgrounds of the element and its ancestors until one is opaque.
  // A gradient counts as its most opaque color, e.g. the amber of a highlight.
  function backgroundBehind(element) {
    const layers = [];
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      const gradient = (style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).map(parse);
      const color = gradient.sort((a, b) => b[3] - a[3])[0] ?? parse(style.backgroundColor);
      if (color[3] > 0) layers.push(color);
      if (color[3] >= 1) break;
    }
    return layers.reduceRight((under, layer) => blend(layer, under), [255, 255, 255, 1]);
  }

  function withOpacity(color, element) {
    let alpha = color[3];
    for (let current = element; current; current = current.parentElement) {
      alpha *= Number(getComputedStyle(current).opacity);
    }
    return [color[0], color[1], color[2], alpha];
  }

  // Reads rgb(), rgba() and color(srgb …), the forms Chrome reports computed colors in.
  function parse(value) {
    const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
    if (srgb) return [srgb[1] * 255, srgb[2] * 255, srgb[3] * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
    const [r = 0, g = 0, b = 0, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number);
    return value === 'transparent' ? [0, 0, 0, 0] : [r, g, b, a];
  }

  function blend([r, g, b, a], [r2, g2, b2]) {
    return [r * a + r2 * (1 - a), g * a + g2 * (1 - a), b * a + b2 * (1 - a), 1];
  }

  function contrast(first, second) {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function luminance([r, g, b]) {
    const linear = (channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }

  function describe(element) {
    const name = element.className ? `.${String(element.className).trim().split(/\s+/).join('.')}` : '';
    return `<${element.tagName.toLowerCase()}${name}> "${element.textContent.trim().slice(0, 32)}"`;
  }
}

const { values: options } = parseArgs({
  options: {
    shots: { type: 'string' },
    theme: { type: 'string', default: 'dark' },
    mobile: { type: 'boolean', default: false },
    og: { type: 'boolean', default: false },
    scale: { type: 'string', default: '1' },
  },
});

await build();
const server = await serve(DIST);
const chrome = await launchChrome();
const failures = [];

try {
  for (const page of PAGES) {
    const tab = await openTab(chrome.client, server.url + page.path, { ...VIEWPORT, theme: options.theme });
    const lang = await evaluate(tab.send, 'document.documentElement.lang');
    const result = await evaluate(tab.send, MEASURE);

    console.log(`\n${page.source}`);
    const railOver = result.rail.needed > result.rail.available;
    console.log(`  ${railOver ? '✗' : '✓'} ${'rail'.padEnd(18)} ${String(result.rail.needed).padStart(4)} / ${result.rail.available}`);
    if (railOver) failures.push(`${page.source}: the rail is ${result.rail.needed - result.rail.available} px too tall`);
    if (result.sideways > 0) failures.push(`${page.source}: the page scrolls sideways by ${result.sideways} px`);

    failures.push(...(await auditThemes(tab, page.source, 'contrast')));

    const pdf = await printPdf(tab);
    const cvPages = countPages(pdf);
    console.log(`  ${cvPages > MAX_CV_PAGES ? '✗' : '✓'} ${'printed CV'.padEnd(18)} ${cvPages} of ${MAX_CV_PAGES} pages`);
    if (cvPages > MAX_CV_PAGES) failures.push(`${page.source}: the printed CV has ${cvPages} pages`);

    if (options.shots) {
      await saveShots(tab, options.shots, lang, result.screens, pdf);
    }
    await tab.close();

    const cv = await openTab(chrome.client, server.url + page.path + CV_PATH, { ...VIEWPORT, theme: options.theme });
    failures.push(...(await auditThemes(cv, page.cvSource, 'CV contrast')));
    const sheet = await printPdf(cv);
    const sheets = countPages(sheet);
    console.log(`  ${sheets > 1 ? '✗' : '✓'} ${'one-page CV'.padEnd(18)} ${sheets} of 1 page`);
    if (sheets > 1) failures.push(`${page.cvSource}: the one-page CV prints on ${sheets} pages`);
    if (options.shots) {
      await mkdir(options.shots, { recursive: true });
      await writeFile(join(options.shots, `${lang}-cv-one-page.pdf`), sheet);
    }
    await cv.close();

    if (options.shots && options.mobile) {
      const phone = await openTab(chrome.client, server.url + page.path, { ...PHONE, theme: options.theme });
      const { screens } = await evaluate(phone.send, MEASURE);
      await saveShots(phone, options.shots, `${lang}-phone`, screens);
      await phone.close();
    }

    if (options.og) {
      const preview = await openTab(chrome.client, server.url + page.path, { ...PREVIEW, theme: 'dark' });
      await scrollTo(preview, 0);
      await screenshot(preview, join(ROOT, 'site', `og-${lang}.png`));
      await preview.close();
    }
  }
  if (options.og) {
    await build();
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

async function saveShots(tab, folder, lang, screens, pdf = null) {
  await mkdir(folder, { recursive: true });
  if (pdf) await writeFile(join(folder, `${lang}-cv.pdf`), pdf);
  await scrollTo(tab, 0);
  await screenshot(tab, join(folder, `${lang}-${options.theme}-00-top.png`));
  // The first project halfway through its slide-in.
  // It comes before the screens, because a panel that has slid all the way in stays in place.
  await scrollTo(tab, `document.querySelector('.screen--project').offsetTop - innerHeight * 0.55`);
  await screenshot(tab, join(folder, `${lang}-${options.theme}-sliding.png`));
  for (const [index, screen] of screens.entries()) {
    await scrollTo(tab, `document.getElementById('${screen.id}').offsetTop`);
    if (screen.keyvisual) await new Promise((done) => setTimeout(done, KEYVISUAL_FOCUS_MS));
    await screenshot(tab, join(folder, `${lang}-${options.theme}-${String(index + 1).padStart(2, '0')}-${screen.id}.png`));
  }
}

// Audits the contrast in the light and the dark theme, prints a line for each, and returns the problems.
// The tab is left in the theme the screenshots use.
async function auditThemes(tab, source, label) {
  const problems = [];
  for (const theme of ['light', 'dark']) {
    await setTheme(tab, theme);
    const found = await evaluate(tab.send, `(${auditContrast})()`);
    console.log(`  ${found.length > 0 ? '✗' : '✓'} ${`${label}, ${theme}`.padEnd(18)} ${found.length} below the minimum`);
    problems.push(...found.map((problem) => `${source}, ${theme} theme: ${problem}`));
  }
  await setTheme(tab, options.theme);
  return problems;
}

async function printPdf(tab) {
  const { data } = await tab.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  return Buffer.from(data, 'base64');
}

function countPages(pdf) {
  return pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

async function scrollTo(tab, top) {
  await evaluate(
    tab.send,
    `window.scrollTo({ top: ${top}, behavior: 'instant' });
     Promise.all([...document.images].filter((image) => image.getBoundingClientRect().top < innerHeight * 2).map((image) => { image.loading = 'eager'; return image.decode().catch(() => {}); }))
       .then(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))`,
  );
}

async function screenshot(tab, file) {
  const { data } = await tab.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(file, Buffer.from(data, 'base64'));
}

async function launchChrome() {
  const path = CHROME_PATHS.find((candidate) => candidate && existsSync(candidate));
  if (!path) {
    throw new Error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.');
  }
  const profile = mkdtempSync(join(tmpdir(), 'portfolio-chrome-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    'about:blank',
  ];
  // Ubuntu runners block the user namespaces Chrome's sandbox needs, so Chrome refuses to start with it.
  if (process.platform === 'linux') args.unshift('--no-sandbox');

  const process_ = spawn(path, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    process_.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    process_.on('exit', (code) => reject(new Error(`Chrome exited with ${code}:\n${output}`)));
  });
  const client = await connect(endpoint);

  return {
    client,
    close: async () => {
      client.close();
      process_.kill();
      await new Promise((done) => process_.once('exit', done));
      await removeProfile(profile);
    },
  };
}

// Deletes Chrome's temporary profile, trying again for up to 2 s while Chrome's helper processes finish writing to it.
// On Linux they can still write for a moment after Chrome exits, and rmSync's own retries never delete those late files.
// A profile left behind in the temp folder doesn't affect the checks, so a last failure only warns.
async function removeProfile(profile) {
  for (let attempt = 1; ; attempt++) {
    try {
      rmSync(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 10) {
        console.warn(`\nCouldn't delete Chrome's temporary profile ${profile}: ${error.message}`);
        return;
      }
      await new Promise((done) => setTimeout(done, 200));
    }
  }
}

// Picks the theme the way the theme toggle does, since the page ignores the system's color scheme.
async function setTheme(tab, theme) {
  await evaluate(tab.send, `document.documentElement.dataset.theme = '${theme}'`);
}

async function openTab(client, url, { width, height, theme }) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => client.send(method, params, sessionId);

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: Number(options.scale),
    mobile: width < 800,
  });
  const loaded = client.once('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url });
  await loaded;
  await evaluate(send, 'document.fonts.ready.then(() => true)');

  const tab = { send, close: () => client.send('Target.closeTarget', { targetId }) };
  await setTheme(tab, theme);
  return tab;
}

async function evaluate(send, expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

// A minimal Chrome DevTools Protocol client over Node's built-in WebSocket.
function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const listeners = new Set();
  let lastId = 0;

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id === undefined) {
      for (const listener of listeners) listener(message);
      return;
    }
    const call = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) call.reject(new Error(`${call.method}: ${message.error.message}`));
    else call.resolve(message.result);
  });

  const client = {
    send(method, params = {}, sessionId) {
      const id = ++lastId;
      socket.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(id, { method, resolve, reject }));
    },
    once(method, sessionId) {
      return new Promise((resolve) => {
        const listener = (message) => {
          if (message.method !== method || message.sessionId !== sessionId) return;
          listeners.delete(listener);
          resolve(message.params);
        };
        listeners.add(listener);
      });
    },
    close: () => socket.close(),
  };

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve(client), { once: true });
    socket.addEventListener('error', () => reject(new Error(`Cannot connect to Chrome at ${url}`)), { once: true });
  });
}
