import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { toCv, toPortfolio } from '../scripts/lib/portfolio.mjs';
import { renderCv, renderPage } from '../scripts/lib/render.mjs';
import { cvSource, DEFAULT_BODY, MANIFEST, portfolioSource } from './fixtures.mjs';

const OPTIONS = {
  base: '../',
  homepage: 'https://chunksnbits.github.io/portfolio/',
  path: 'en/',
  cvPath: 'en/cv/',
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

test('sends other sites no referrer, from the page and from every link to them', () => {
  const body = DEFAULT_BODY.replace("Let's talk.", "Let's talk, see [my blog](https://example.com/blog).");
  const html = renderPage(toPortfolio(parseMarkdown(portfolioSource({ body }))), OPTIONS);
  const offSite = html.match(/<a [^>]*href="https:\/\/[^>]*>/g);

  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.equal(offSite.length, 5, 'LinkedIn and GitHub in the rail and as buttons, and the blog');
  for (const link of offSite) {
    assert.match(link, / rel="noopener noreferrer"/, link);
  }
});

test('links "Save as PDF" in the rail and the contact section to the one-page CV', () => {
  const links = render().match(/<a class="button[^"]*" href="[^"]*" data-print>/g);

  assert.deepEqual(links, [
    '<a class="button button--small" href="../en/cv/" data-print>',
    '<a class="button" href="../en/cv/" data-print>',
  ]);
});

test('glues every separator in a meta line to the word before it', () => {
  assert.match(
    render(),
    /<span class="meta__period">2025 – today<\/span><span class="meta__separator" aria-hidden="true">&nbsp;\+ <\/span><span class="meta__details">ZEISS Spectroscopy&nbsp;\+ Lead developer<\/span>/,
  );
});

test('renders sub-items as a sublist inside their item, with no whitespace a line could break at', () => {
  const body = DEFAULT_BODY.replace('- **13 years** experience\n', '- **13 years** experience\n- **Stack**\n  - React\n  - .NET\n');
  const html = renderPage(toPortfolio(parseMarkdown(portfolioSource({ body }))), OPTIONS);

  assert.match(html, /<li><strong>Stack<\/strong><ul class="sublist"><li>React<\/li><li>\.NET<\/li><\/ul><\/li>/);
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
      '2023 – 2025 + ZEISS\n',
      `2023 – 2025 + ZEISS\n\n${KEYVISUAL}\n`,
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
          '2023 – 2025 + ZEISS\n',
          `2023 – 2025 + ZEISS\n\n${ASCII_KEYVISUAL}\n`,
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

test('shows the whole text of a project without a [show more] marker', () => {
  const html = render();
  const aura = html.slice(html.indexOf('id="aura"'), html.indexOf('id="myzeiss"'));

  assert.match(aura, /<div class="panel__text">\s*<p>Companion app\.<\/p>\s*<ul class="tags"/);
  assert.doesNotMatch(html, /class="more"/);
});

const MARKED = DEFAULT_BODY.replace('Companion app.\n', 'Companion app.\n\n[show more]\n\nIn depth.\n');

test('hides the text after a [show more] marker behind the button, above the tags', () => {
  assert.match(
    renderBody(MARKED),
    /<div class="panel__text">\s*<p>Companion app\.<\/p>\s*<div class="panel__rest" id="aura-rest">\s*<p>In depth\.<\/p>\s*<\/div>\s*<button class="more" type="button" aria-expanded="false" aria-controls="aura-rest">Show more<\/button>\s*<ul class="tags"/,
  );
});

test('cuts a project without visuals at its [show more] marker', () => {
  const html = renderBody(MARKED.replace('1. **Device**: measures\n2. **App**: predicts\n\n', ''));
  const aura = html.slice(html.indexOf('id="aura"'), html.indexOf('id="myzeiss"'));

  assert.match(aura, /<article class="panel panel--text">[\s\S]*<div class="panel__rest"[\s\S]*<button class="more"/);
});

test('rejects a more marker outside a project, twice in one, or without text after it', () => {
  const bodies = [
    DEFAULT_BODY.replace("Let's talk.", "Let's talk.\n\n[show more]\n\nSoon."),
    MARKED.replace('In depth.\n', 'In depth.\n\n[show more]\n\nEven more.\n'),
    DEFAULT_BODY.replace('Companion app.\n', 'Companion app.\n\n[show more]\n'),
  ];
  for (const body of bodies) {
    assert.throws(() => renderBody(body), /line \d+: .*\[show more\]/, body);
  }
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

const BADGE_SVG =
  '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n<!-- Source: example.org -->\n<path fill="#80a33e" d="M0 0h10v10H0z"/>\n<path class="badge__disc" d="M1 1h8v8H1z"/>\n</svg>\n';
const renderBadge = (line, badges = { 'assets/badges/cert.svg': BADGE_SVG }) => {
  const body = DEFAULT_BODY.replace("Let's talk.", `Let's talk.\n\n${line}`);
  return renderPage(toPortfolio(parseMarkdown(portfolioSource({ body }))), { ...OPTIONS, badges });
};

test('inlines a badge with its own colors, hidden from screen readers without alt text', () => {
  const html = renderBadge('![](site/assets/badges/cert.svg "badge")');

  assert.match(
    html,
    /<svg class="badge" viewBox="0 0 100 100" aria-hidden="true">\s*<path fill="#80a33e" d="M0 0h10v10H0z"\/>\s*<path class="badge__disc" d="M1 1h8v8H1z"\/>\s*<\/svg>/,
  );
  assert.doesNotMatch(html, /Source: example\.org|<\?xml/);
});

test('names a badge for screen readers by its alt text', () => {
  assert.match(renderBadge('![PSPO I](site/assets/badges/cert.svg "badge")'), /<svg class="badge" viewBox="0 0 100 100" role="img" aria-label="PSPO I">/);
});

test('rejects a badge that has no file', () => {
  assert.throws(() => renderBadge('![](site/assets/badges/cert.svg "badge")', {}), /line \d+: site\/assets\/badges\/cert\.svg does not exist/);
});

test('rejects a logo that has no file', () => {
  assert.throws(() => renderLogos({ logos: {} }), /line \d+: site\/assets\/logos\/crest\.svg does not exist/);
});

const CV_OPTIONS = {
  meta: toPortfolio(parseMarkdown(portfolioSource())).meta,
  base: '../../',
  homepage: 'https://chunksnbits.github.io/portfolio/',
  path: 'en/cv/',
  portfolioPath: 'en/',
  alternate: { lang: 'de', path: 'cv/' },
};
const renderCvSource = (source = cvSource()) => renderCv(toCv(parseMarkdown(source)), CV_OPTIONS);

test('heads the CV with the name, title and contact details from the portfolio', () => {
  const html = renderCvSource();

  assert.match(html, /<h1 class="cv-header__name">Daniel Eissing<\/h1>/);
  assert.match(html, /<p class="cv-header__title">Senior Software Engineer<\/p>/);
  assert.match(html, /<a href="mailto:me@example\.com">/);
  assert.match(html, /<span>linkedin\.com\/in\/someone<\/span>/);
  assert.match(html, /<span>github\.com\/chunksnbits<\/span>/);
  assert.match(html, /<a href="https:\/\/chunksnbits\.github\.io\/portfolio\/en\/"/);
  assert.match(html, /<span>chunksnbits\.github\.io\/portfolio\/en<\/span>/);
});

test('fills the sidebar from the skills section on, below the contact details', () => {
  const ids = (html) => [...html.matchAll(/<section class="cv-section cv-section--([\w-]+)"/g)].map((match) => match[1]);
  const [main, aside] = renderCvSource().split('<aside');

  assert.deepEqual(ids(main), ['about', 'experience']);
  assert.deepEqual(ids(aside), ['contact', 'skills', 'education']);
});

test('gives each career stop its title, then its period and details', () => {
  assert.match(
    renderCvSource(),
    /<h3 class="entry__title">Senior Software Engineer&nbsp;\+ Satellytes<\/h3>\s*<p class="meta"><span class="meta__period">2021 – today<\/span>[^\n]*<span class="meta__details">Munich, Fulda<\/span>/,
  );
});

test('links site paths to the published site, so a saved PDF links there from anywhere', () => {
  assert.match(renderCvSource(), /href="https:\/\/chunksnbits\.github\.io\/portfolio\/docs\/paper\.pdf"/);
});

test('links back to the portfolio and over to the CV in the other language', () => {
  const html = renderCvSource();

  assert.match(html, /<link rel="stylesheet" href="\.\.\/\.\.\/assets\/cv\.css">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chunksnbits\.github\.io\/portfolio\/en\/cv\/">/);
  assert.match(html, /hreflang="de" href="https:\/\/chunksnbits\.github\.io\/portfolio\/cv\/"/);
  assert.match(html, /<a class="toolbar__link" href="\.\.\/\.\.\/en\/">/);
  assert.match(html, /<a class="toolbar__link" href="\.\.\/\.\.\/cv\/" hreflang="de" lang="de">/);
});

test('rejects a CV in another language than its portfolio', () => {
  assert.throws(() => renderCvSource(cvSource({ lang: 'de' })), /frontmatter: .*"de".*"en"/);
});
