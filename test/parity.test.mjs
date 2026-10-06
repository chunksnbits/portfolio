import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { toPortfolio } from '../scripts/lib/portfolio.mjs';
import { compareStructure } from '../scripts/lib/parity.mjs';
import { DEFAULT_BODY, portfolioSource } from './fixtures.mjs';

const load = (options) => toPortfolio(parseMarkdown(portfolioSource(options)));

test('accepts a translation that keeps the structure', () => {
  const german = DEFAULT_BODY.replace('I build ==apps==.', 'Ich baue ==Apps==.')
    .replace('Companion app.', 'Begleit-App.')
    .replace('[paper]', '[Aufsatz]');

  assert.deepEqual(compareStructure(load(), load({ lang: 'de', body: german })), []);
});

test('reports every structural difference with both line numbers', () => {
  const german = DEFAULT_BODY.replace('desktop.webp', 'other.webp')
    .replace('site/docs/paper.pdf', 'site/docs/other.pdf')
    .replace('`Expo` `.NET`', '`Expo`')
    .replace('## Contact {#contact}', '## Kontakt {#kontakt}');

  const differences = compareStructure(load(), load({ lang: 'de', email: 'other@example.com', body: german }));

  assert.equal(differences.length, 5, differences.join('\n'));
  assert.match(differences.join('\n'), /email/);
  assert.match(differences.join('\n'), /desktop\.webp.*other\.webp/);
  assert.match(differences.join('\n'), /paper\.pdf/);
  assert.match(differences.join('\n'), /tags/);
  assert.match(differences.join('\n'), /contact.*kontakt/);
});
