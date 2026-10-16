import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { toPortfolio } from '../scripts/lib/portfolio.mjs';
import { portfolioSource } from './fixtures.mjs';

const load = (options) => toPortfolio(parseMarkdown(portfolioSource(options)));

test('groups blocks into sections and entries', () => {
  const { sections } = load();

  assert.deepEqual(
    sections.map((section) => [section.id, section.title, section.entries.map((entry) => entry.title)]),
    [
      ['about', 'About', ['Architecture']],
      ['projects', 'Projects', ['AURA', 'MyZEISS']],
      ['contact', 'Contact', []],
    ],
  );
  assert.deepEqual(
    sections[0].blocks.map((block) => block.type),
    ['paragraph', 'list'],
  );
});

test('reads a first line that starts with a year as the entry period and details', () => {
  const [, projects] = load().sections;

  assert.deepEqual(projects.entries[0].meta, {
    period: '2025 – today',
    details: 'ZEISS Spectroscopy + Lead developer',
  });
  assert.deepEqual(
    projects.entries[0].blocks.map((block) => block.type),
    ['list', 'paragraph', 'tags'],
  );
});

test('keeps a first paragraph without a year as body text', () => {
  const [about] = load().sections;

  assert.equal(about.entries[0].meta, null);
  assert.equal(about.entries[0].blocks[0].text, 'Monorepos and design systems.');
});

test('requires the frontmatter keys and rejects unknown ones', () => {
  const missing = portfolioSource().replace('status: Open to senior roles\n', '');
  assert.throws(() => toPortfolio(parseMarkdown(missing)), /status/);

  const unknown = portfolioSource().replace('lang: en', 'lang: en\nlinkdin: typo');
  assert.throws(() => toPortfolio(parseMarkdown(unknown)), /linkdin/);
});

test('rejects broken structure, naming the line', () => {
  const cases = [
    ['Intro before any section.\n\n## About {#about}', /line 15/],
    ['## About', /line 15.*id/],
    ['## About {#about}\n\n## Again {#about}', /line 17.*about/],
    ['## Projects {#projects}\n\n### Without id\n2024 + Client', /line 17.*id/],
  ];
  for (const [body, message] of cases) {
    assert.throws(() => toPortfolio(parseMarkdown(portfolioSource({ body }))), message, body);
  }
});
