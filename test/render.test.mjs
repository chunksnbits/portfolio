import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { toPortfolio } from '../scripts/lib/portfolio.mjs';
import { renderPage } from '../scripts/lib/render.mjs';
import { MANIFEST, portfolioSource } from './fixtures.mjs';

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
