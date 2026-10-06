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

test('rejects a keyvisual outside a project', () => {
  assert.throws(() => renderBody(DEFAULT_BODY.replace("Let's talk.", `Let's talk.\n\n${KEYVISUAL}`)), /line \d+.*keyvisual/);
});

test('rejects a second keyvisual in one project', () => {
  assert.throws(
    () => renderBody(DEFAULT_BODY.replace('Lead developer\n', `Lead developer\n\n${KEYVISUAL}\n${KEYVISUAL}\n`)),
    /line \d+.*keyvisual/,
  );
});
