import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderLetter, toLetter, wrapDocument } from '../scripts/lib/documents.mjs';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { toPortfolio } from '../scripts/lib/portfolio.mjs';
import { portfolioSource } from './fixtures.mjs';

const letterSource = ({ lang = 'de', date = '2026-11-01', subject = 'Bewerbung als Senior Software Engineer', extra = '', body = LETTER_BODY } = {}) =>
  [
    '---',
    `lang: ${lang}`,
    'to: Acme GmbH + Recruiting + Hauptstraße 1 + 10115 Berlin',
    `date: ${date}`,
    `subject: ${subject}`,
    'greeting: Guten Tag,',
    'closing: Viele Grüße',
    extra,
    '---',
    '',
    body,
  ].join('\n');

const LETTER_BODY = `Ich baue Web- und Mobile-Systeme.

Bei ZEISS habe ich ==die App== geleitet, siehe [Portfolio](site/docs/paper.pdf).
`;

const meta = (lang = 'de') => toPortfolio(parseMarkdown(portfolioSource({ lang }))).meta;
const STYLES = ['.doc { color: #12151d; }', ':root { --primary: #0058ab; }'];
const LETTER_OPTIONS = {
  meta: meta(),
  homepage: 'https://chunksnbits.github.io/portfolio/',
  portfolioPath: 'acme/',
  styles: STYLES,
};
const renderLetterSource = (source = letterSource(), options = LETTER_OPTIONS) => renderLetter(toLetter(parseMarkdown(source)), options);

test('reads the letter settings and its paragraphs', () => {
  const letter = toLetter(parseMarkdown(letterSource()));

  assert.deepEqual(letter.meta.to, ['Acme GmbH', 'Recruiting', 'Hauptstraße 1', '10115 Berlin']);
  assert.equal(letter.meta.subject, 'Bewerbung als Senior Software Engineer');
  assert.deepEqual(letter.paragraphs, [
    'Ich baue Web- und Mobile-Systeme.',
    'Bei ZEISS habe ich ==die App== geleitet, siehe [Portfolio](site/docs/paper.pdf).',
  ]);
});

test('rejects a letter with a missing or unknown setting, a date not written as YYYY-MM-DD, or more than paragraphs', () => {
  const cases = [
    [letterSource().replace('subject: Bewerbung als Senior Software Engineer\n', ''), /frontmatter: missing subject/],
    [letterSource({ extra: 'signature: Daniel' }), /frontmatter: unknown signature/],
    [letterSource({ date: '1. November 2026' }), /date.*YYYY-MM-DD/],
    [letterSource({ date: '2026-02-30' }), /date.*2026-02-30/],
    [letterSource({ body: '## Experience\n\nText.' }), /line \d+: .*paragraphs/],
    [letterSource({ body: 'Text.\n\n- a list' }), /line \d+: .*paragraphs/],
  ];
  for (const [source, message] of cases) {
    assert.throws(() => toLetter(parseMarkdown(source)), message, source);
  }
});

test('heads the letter with the sender from the portfolio and their tailored page', () => {
  const html = renderLetterSource();

  assert.match(html, /<html lang="de">/);
  assert.match(html, /<p class="sender__name">Daniel Eissing<\/p>/);
  assert.match(html, /<p class="sender__title">Senior Software Engineer<\/p>/);
  assert.match(html, /<a href="mailto:me@example\.com">me@example\.com<\/a>/);
  assert.match(html, /<a href="https:\/\/chunksnbits\.github\.io\/portfolio\/acme\/"[^>]*>chunksnbits\.github\.io\/portfolio\/acme<\/a>/);
});

test('addresses the recipient, dates the letter at the sender\'s place and signs it with their name', () => {
  const html = renderLetterSource();

  assert.match(html, /<address class="letter__to">Acme GmbH<br>Recruiting<br>Hauptstraße 1<br>10115 Berlin<\/address>/);
  assert.match(html, /<p class="letter__date">Fulda, 1\. November 2026<\/p>/);
  assert.match(html, /<h1 class="letter__subject">Bewerbung als Senior Software Engineer<\/h1>/);
  assert.match(html, /<div class="letter__body">\s*<p>Guten Tag,<\/p>\s*<p>Ich baue Web- und Mobile-Systeme\.<\/p>/);
  assert.match(html, /<mark>die App<\/mark>/);
  assert.match(html, /<p class="letter__closing">Viele Grüße<\/p>\s*<p class="letter__signature">Daniel Eissing<\/p>\s*<\/div>/);
});

test('emphasizes the part of the subject written in *asterisks*, like the house style\'s one emphasis per headline', () => {
  const html = renderLetterSource(letterSource({ subject: 'Bewerbung als *Senior Software Engineer*' }));

  assert.match(html, /<h1 class="letter__subject">Bewerbung als <em>Senior Software Engineer<\/em><\/h1>/);
  assert.match(html, /<title>Daniel Eissing · Bewerbung als Senior Software Engineer<\/title>/);
});

test('writes the date the way the letter\'s language does', () => {
  const html = renderLetterSource(letterSource({ lang: 'en' }), { ...LETTER_OPTIONS, meta: meta('en') });

  assert.match(html, /<p class="letter__date">Fulda, 1 November 2026<\/p>/);
});

test('links site paths in a document to the published site', () => {
  assert.match(renderLetterSource(), /href="https:\/\/chunksnbits\.github\.io\/portfolio\/docs\/paper\.pdf"/);
});

test('carries its styles inline, in the given order, so the page stands on its own', () => {
  const html = renderLetterSource();

  assert.match(html, /<style>\n\.doc \{ color: #12151d; \}\n<\/style>\n<style>\n:root \{ --primary: #0058ab; \}\n<\/style>/);
  assert.doesNotMatch(html, /<link rel="stylesheet"/);
});

test('rejects a letter in another language than the portfolio it takes the sender from', () => {
  assert.throws(() => renderLetterSource(letterSource({ lang: 'en' })), /frontmatter: .*"en".*"de"/);
});

test('wraps a document body into a page in its language, with its title and the styles inline', () => {
  const html = wrapDocument({ lang: 'de', title: 'Acme · Interview-Brief', body: '<main class="doc brief">\n<h1>Acme</h1>\n</main>', styles: STYLES });

  assert.match(html, /^<!doctype html>\n<html lang="de">/);
  assert.match(html, /<title>Acme · Interview-Brief<\/title>/);
  assert.match(html, /<style>\n\.doc \{ color: #12151d; \}\n<\/style>/);
  assert.match(html, /<body>\n<main class="doc brief">\n<h1>Acme<\/h1>\n<\/main>\n<\/body>/);
});

test('escapes the title of a wrapped document', () => {
  assert.match(wrapDocument({ lang: 'en', title: 'A & B <C>', body: '', styles: [] }), /<title>A &amp; B &lt;C&gt;<\/title>/);
});
