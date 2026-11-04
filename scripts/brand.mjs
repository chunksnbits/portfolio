// Captures a company's visual language from its live pages, as evidence for a variant's theme.
//
// Usage: npm run brand -- <url>... --out <dir> [--scheme light|dark] [--eval <script>]
//
// --scheme sets the system color scheme the pages see.
// --eval runs a script in each page before the capture.
// E.g. --eval "document.documentElement.dataset.theme = 'light'" switches a site's own theme toggle.
//
// For each page it saves the first screen and the whole page as PNG, and writes one entry per page to <dir>/tokens.json,
// or tokens-<scheme>.json with --scheme, replacing the file of an earlier run:
// - fonts: the font faces the page loaded
// - variables: the CSS custom properties on :root, html or body that hold a color or a font
// - palette: the colors covering the most area, for backgrounds, text and borders
// - elements: the computed type, colors, corners and shadows of headings, text, links, buttons, cards and images
//
// NOTE: a cookie banner covers most first screens. The script declines it where it finds one.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { dismissCookieBanner, evaluate, launchChrome, openTab, screenshot } from './lib/chrome.mjs';

const VIEWPORT = { width: 1440, height: 900 };
// Time a cookie banner and lazy content take to settle after a click or a scroll.
const SETTLE_MS = 1200;

// Runs in the page: scrolls to the end and back in steps, so lazy images and sections load before the full-page capture.
const LOAD_LAZY_CONTENT = `(async () => {
  for (let top = 0; top < document.documentElement.scrollHeight; top += innerHeight * 0.8) {
    scrollTo(0, top);
    await new Promise((done) => setTimeout(done, 120));
  }
  scrollTo(0, 0);
})()`;

// Runs in the page and returns the tokens described at the top of this file.
function extractTokens() {
  const PROBES = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    text: 'main p, p',
    link: 'main p a, main a, a',
    button: 'button, [class*="button"], [class*="btn"], [role="button"]',
    navigation: 'header nav a, nav a, header a',
    label: '[class*="eyebrow"], [class*="kicker"], [class*="overline"], [class*="tag"], [class*="label"]',
    card: '[class*="card"], [class*="tile"], [class*="teaser"]',
    image: 'main img, img',
    footer: 'footer',
  };
  const STYLE = [
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color',
    'backgroundColor', 'backgroundImage', 'borderRadius', 'borderTop', 'boxShadow', 'clipPath', 'objectFit', 'filter',
  ];

  const isVisible = (element) => {
    const { width, height } = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return width > 0 && height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0;
  };

  const fonts = [...new Set([...document.fonts].filter((font) => font.status === 'loaded').map((font) => `${font.family.replaceAll('"', '')} ${font.weight} ${font.style}`))];

  const variables = {};
  const readRules = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules && !rule.selectorText) readRules(rule.cssRules);
      if (!rule.selectorText || !/(^|,\s*)(:root|html|body)\b/.test(rule.selectorText)) continue;
      for (const name of rule.style) {
        const value = rule.style.getPropertyValue(name).trim();
        if (name.startsWith('--') && (/^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i.test(value) || /font/i.test(name))) variables[name] = value;
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      readRules(sheet.cssRules);
    } catch {
      // Stylesheets from another origin can't be read.
    }
  }

  // Weighs backgrounds by area, text by its length and borders by their length, across the whole page.
  const weights = { background: new Map(), text: new Map(), border: new Map() };
  const add = (map, color, weight) => {
    if (!color || /rgba?\([^)]*,\s*0\)$/.test(color) || color === 'transparent') return;
    map.set(color, (map.get(color) ?? 0) + weight);
  };
  for (const element of [...document.body.querySelectorAll('*')].slice(0, 6000)) {
    if (!isVisible(element)) continue;
    const style = getComputedStyle(element);
    const { width, height } = element.getBoundingClientRect();
    add(weights.background, style.backgroundColor, width * height);
    const ownText = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).join('');
    if (ownText) add(weights.text, style.color, ownText.length);
    if (parseFloat(style.borderTopWidth) > 0) add(weights.border, style.borderTopColor, width);
  }
  const top = (map, count) =>
    [...map].sort((a, b) => b[1] - a[1]).slice(0, count).map(([color, weight]) => ({ color, share: Math.round((weight / [...map.values()].reduce((sum, value) => sum + value, 0)) * 1000) / 10 }));
  const palette = { background: top(weights.background, 10), text: top(weights.text, 8), border: top(weights.border, 6) };

  const elements = {};
  for (const [name, selector] of Object.entries(PROBES)) {
    elements[name] = [...document.querySelectorAll(selector)]
      .filter(isVisible)
      .slice(0, 3)
      .map((element) => {
        const style = getComputedStyle(element);
        const { width, height } = element.getBoundingClientRect();
        const entry = {
          tag: element.tagName.toLowerCase(),
          class: String(element.className).slice(0, 80),
          text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 48),
          size: `${Math.round(width)}×${Math.round(height)}`,
        };
        for (const property of STYLE) {
          const value = style[property];
          if (value && !['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)'].includes(value)) entry[property] = value.slice(0, 160);
        }
        return entry;
      });
  }

  return { title: document.title, fonts, variables, palette, elements };
}

const { values: options, positionals: urls } = parseArgs({
  options: { out: { type: 'string' }, scheme: { type: 'string' }, eval: { type: 'string' } },
  allowPositionals: true,
});
if (urls.length === 0 || !options.out) {
  console.error('Usage: npm run brand -- <url>... --out <dir> [--scheme light|dark] [--eval <script>]');
  process.exit(1);
}
await mkdir(options.out, { recursive: true });

const chrome = await launchChrome();
const pages = [];
try {
  for (const [index, url] of urls.entries()) {
    const tab = await openTab(chrome.client, url, { ...VIEWPORT, colorScheme: options.scheme ?? null });
    const rejected = await dismissCookieBanner(tab);
    if (options.eval) await evaluate(tab.send, options.eval);
    await new Promise((done) => setTimeout(done, SETTLE_MS));
    await evaluate(tab.send, LOAD_LAZY_CONTENT);
    await new Promise((done) => setTimeout(done, SETTLE_MS));

    const name = `${String(index + 1).padStart(2, '0')}-${slugOf(url)}${options.scheme ? `-${options.scheme}` : ''}`;
    await screenshot(tab, join(options.out, `${name}-top.png`));
    await screenshot(tab, join(options.out, `${name}-full.png`), { fullPage: true });
    const tokens = await evaluate(tab.send, `(${extractTokens})()`);
    pages.push({ url, capture: name, cookieBannerRejected: rejected, ...tokens });
    console.log(`${name}: ${tokens.title}\n  fonts: ${tokens.fonts.slice(0, 6).join(', ')}\n  top backgrounds: ${tokens.palette.background.slice(0, 4).map((entry) => entry.color).join(', ')}`);
    await tab.close();
  }
} finally {
  await chrome.close();
}
await writeFile(join(options.out, `tokens${options.scheme ? `-${options.scheme}` : ''}.json`), `${JSON.stringify(pages, null, 2)}\n`);
console.log(`\nSaved ${pages.length} page(s) to ${options.out}`);

// Names a capture after its host and path, e.g. "acme-example-de-karriere".
function slugOf(url) {
  const { hostname, pathname } = new URL(url);
  return `${hostname.replace(/^www\./, '')}${pathname}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
