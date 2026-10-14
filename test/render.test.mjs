import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { toPortfolio } from '../scripts/lib/portfolio.mjs';
import { renderPage } from '../scripts/lib/render.mjs';
import { DEFAULT_BODY, MANIFEST, portfolioSource } from './fixtures.mjs';

const OPTIONS = {
  base: '../',
  homepage: 'https://chunksnbits.github.io/portfolio/',
  path: 'en/',
  alternate: { lang: 'de', path: '' },
  images: MANIFEST,
};

const render = (options = OPTIONS) => renderPage(toPortfolio(parseMarkdown(portfolioSource())), options);

test('numbers the sections in the nav', () => {
  const html = render();

  assert.match(html, /href="#about"[^>]*>\s*<span class="nav__number">01<\/span>/);
  assert.match(html, /href="#projects"[^>]*>\s*<span class="nav__number">02<\/span>/);
  assert.match(html, /href="#contact"[^>]*>\s*<span class="nav__number">03<\/span>/);
});

test('gives every project its own screen with a counter', () => {
  const html = render();

  assert.match(html, /<section[^>]+id="aura"[\s\S]*?1 \/ 2/);
  assert.match(html, /<section[^>]+id="myzeiss"[\s\S]*?2 \/ 2/);
});

test('points site paths at the published files relative to the page', () => {
  const html = render();

  assert.match(html, /<link rel="stylesheet" href="\.\.\/assets\/styles\.css">/);
  assert.match(html, /<source type="image\/avif" srcset="\.\.\/assets\/img\/desktop\.avif">/);
  assert.match(html, /<img src="\.\.\/assets\/img\/desktop\.webp" width="700" height="1500"/);
  assert.match(html, /href="\.\.\/docs\/paper\.pdf"/);
});

test('links the other language and declares both for search engines', () => {
  const html = render();

  assert.match(html, /<html lang="en"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chunksnbits\.github\.io\/portfolio\/en\/">/);
  assert.match(html, /hreflang="de" href="https:\/\/chunksnbits\.github\.io\/portfolio\/"/);
  assert.match(html, /<a class="language" href="\.\.\/" hreflang="de" lang="de">/);
});

test('rejects an image that has no processed copy', () => {
  assert.throws(() => render({ ...OPTIONS, images: {} }), /desktop\.webp/);
});

const KEYVISUAL = '![](site/assets/img/lens.webp "keyvisual")';
const KEYVISUAL_IMAGES = {
  ...MANIFEST,
  'assets/img/lens.webp': { width: 720, height: 405, density: 1, avif: 'assets/img/lens.avif' },
};
const renderBody = (body) =>
  renderPage(toPortfolio(parseMarkdown(portfolioSource({ body }))), { ...OPTIONS, images: KEYVISUAL_IMAGES });

test('puts a keyvisual behind its project screens, once per image', () => {
  const html = renderBody(
    DEFAULT_BODY.replace('Lead developer\n', `Lead developer\n\n${KEYVISUAL}\n`).replace(
      '2023 – 2025 · ZEISS\n',
      `2023 – 2025 · ZEISS\n\n${KEYVISUAL}\n`,
    ),
  );

  assert.match(
    html,
    /<section class="projects"[^>]*>\s*<h2[^>]*>[^<]*<\/h2>\s*<div class="keyvisuals" aria-hidden="true">\s*<picture class="keyvisual" data-keyvisual="assets\/img\/lens\.webp">/,
  );
  assert.equal(html.match(/<picture class="keyvisual"/g).length, 1);
  assert.equal(html.match(/<img src="\.\.\/assets\/img\/lens\.webp"/g).length, 1, 'one layer, no figure in a panel');
  assert.match(html, /<section[^>]+id="aura"[^>]+data-keyvisual="assets\/img\/lens\.webp"/);
  assert.match(html, /<section[^>]+id="myzeiss"[^>]+data-keyvisual="assets\/img\/lens\.webp"/);
});

test('loads a keyvisual in every layout, as AVIF with a WebP fallback', () => {
  const html = renderBody(DEFAULT_BODY.replace('Lead developer\n', `Lead developer\n\n${KEYVISUAL}\n`));

  assert.match(
    html,
    /<picture class="keyvisual" data-keyvisual="assets\/img\/lens\.webp"><source type="image\/avif" srcset="\.\.\/assets\/img\/lens\.avif"><img src="\.\.\/assets\/img\/lens\.webp" alt=""/,
  );
});

const ASCII_KEYVISUAL = '![](site/assets/img/lens.webp "keyvisual ascii")';

test('draws an ascii keyvisual on a canvas over its image', () => {
  const html = renderBody(DEFAULT_BODY.replace('Lead developer\n', `Lead developer\n\n${ASCII_KEYVISUAL}\n`));

  assert.match(
    html,
    /<div class="keyvisual keyvisual--ascii" data-keyvisual="assets\/img\/lens\.webp"><picture><source type="image\/avif" srcset="\.\.\/assets\/img\/lens\.avif"><img src="\.\.\/assets\/img\/lens\.webp" alt=""[^>]*><\/picture><canvas><\/canvas><\/div>/,
  );
  assert.match(html, /<section[^>]+id="aura"[^>]+data-keyvisual="assets\/img\/lens\.webp"/);
});

test('rejects one keyvisual shown both as a photo and as ascii', () => {
  assert.throws(
    () =>
      renderBody(
        DEFAULT_BODY.replace('Lead developer\n', `Lead developer\n\n${KEYVISUAL}\n`).replace(
          '2023 – 2025 · ZEISS\n',
          `2023 – 2025 · ZEISS\n\n${ASCII_KEYVISUAL}\n`,
        ),
      ),
    /line \d+: .*lens\.webp/,
  );
});

test('rejects a keyvisual outside a project', () => {
  assert.throws(() => renderBody(DEFAULT_BODY.replace("Let's talk.", `Let's talk.\n\n${KEYVISUAL}`)), /line \d+.*keyvisual/);
});

test('rejects a second keyvisual in one project', () => {
  assert.throws(
    () => renderBody(DEFAULT_BODY.replace('Lead developer\n', `Lead developer\n\n${KEYVISUAL}\n${KEYVISUAL}\n`)),
    /line \d+.*keyvisual/,
  );
});

const logo = (viewBox, shape = '<path d="M0 0h10v10H0z"/>') =>
  `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">\n<!-- Source: example.com -->\n${shape}\n</svg>\n`;
const LOGOS = {
  'assets/logos/crest.svg': logo('0 0 100 100'),
  'assets/logos/badge.svg': logo('0 0 150 100'),
  'assets/logos/wordmark.svg': logo('0 0 400 100'),
  'assets/logos/banner.svg': logo('0 0 800 100'),
};
const renderLogos = ({ names = ['crest', 'wordmark'], logos = LOGOS } = {}) => {
  const lines = names.map((name) => `![${name[0].toUpperCase()}${name.slice(1)}](site/assets/logos/${name}.svg "logo")`);
  const body = DEFAULT_BODY.replace('- **13 years** experience\n', `- **13 years** experience\n\n${lines.join('\n')}\n`);
  return renderPage(toPortfolio(parseMarkdown(portfolioSource({ body }))), { ...OPTIONS, logos });
};

test('inlines consecutive logos as one list, named for screen readers', () => {
  const html = renderLogos();

  assert.equal(html.match(/<ul class="logos"/g).length, 1);
  assert.match(
    html,
    /<ul class="logos" role="list">\s*<li><svg class="logo" viewBox="0 0 100 100" width="\d+" height="\d+" role="img" aria-label="Crest">\s*<path d="M0 0h10v10H0z"\/>\s*<\/svg><\/li>\s*<li><svg class="logo" viewBox="0 0 400 100"[^>]* aria-label="Wordmark">/,
  );
  assert.doesNotMatch(html, /Source: example\.com|<\?xml/);
});

test('fits every logo into one box: compact ones fill its height, wide ones its width', () => {
  const [crest, badge, wordmark, banner] = [
    ...renderLogos({ names: ['crest', 'badge', 'wordmark', 'banner'] }).matchAll(/<svg class="logo"[^>]* width="(\d+)" height="(\d+)"/g),
  ].map(([, width, height]) => ({ width: Number(width), height: Number(height) }));

  assert.equal(crest.height, badge.height);
  assert.equal(wordmark.width, banner.width);
  assert.ok(crest.width < badge.width && banner.height < wordmark.height);
});

test('rejects a logo with colors of its own', () => {
  const colored = { ...LOGOS, 'assets/logos/crest.svg': logo('0 0 100 100', '<path fill="#dc052d" d="M0 0h10v10H0z"/>') };

  assert.throws(() => renderLogos({ logos: colored }), /line \d+: .*crest\.svg.*fill/);
});

test('rejects a logo that has no file', () => {
  assert.throws(() => renderLogos({ logos: {} }), /line \d+: site\/assets\/logos\/crest\.svg does not exist/);
});
