import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, printMarkdown } from '../scripts/lib/markdown.mjs';
import { applyOverlay } from '../scripts/lib/overlay.mjs';
import { toPortfolio } from '../scripts/lib/portfolio.mjs';

const BASE = `---
lang: en
title: Lead Software Engineer
intro: Builds apps.
---

## About {#about}

I build apps.

Since 2010.

- **15 years**
  - in software

### Architecture {#architecture}
Monorepos.

### Leading
Mentoring.

## Projects {#projects}

### AURA {#aura}
2025 – today + ZEISS

![](site/assets/img/a.webp "keyvisual ascii")

1. **Device**: measures
2. **App**: predicts

Companion app.

\`Expo\` \`.NET\`

### FC Bayern {#fcbayern}
2019 – 2022 + fcbayern.com

Relaunch.

\`Gatsby\`

### MediaMarktSaturn {#mms}
2022 – 2023 + webmobile

Pilots.
`;

const merge = (changes, base = BASE) => applyOverlay(parseMarkdown(base), parseMarkdown(changes));
const print = (changes) => printMarkdown(merge(changes));
// Prints expected Markdown the way printMarkdown does, so tests compare content, not blank lines.
const normal = (markdown) => printMarkdown(parseMarkdown(markdown));
const entryTitles = (document, id) => toPortfolio({ ...document, frontmatter: FULL_FRONTMATTER }).sections.find((section) => section.id === id).entries.map((entry) => entry.title);

const FULL_FRONTMATTER = {
  ...Object.fromEntries(['lang', 'name', 'title', 'subtitle', 'status', 'intro', 'location', 'email', 'description'].map((key) => [key, key])),
  github: 'https://github.com/someone',
  linkedin: 'https://www.linkedin.com/in/someone',
};

test('keeps the base as it is when the variant changes nothing', () => {
  assert.equal(print(''), normal(BASE));
  assert.equal(print('<!-- Changes to portfolio.md for Acme. -->\n'), normal(BASE));
});

test('replaces the frontmatter keys the variant sets and keeps the others', () => {
  assert.equal(print('---\ntitle: Senior Software Engineer\n---\n'), normal(BASE.replace('Lead Software Engineer', 'Senior Software Engineer')));
});

test('replaces the text of a section and keeps its list and its entries', () => {
  assert.equal(print('## About {#about}\n\nI build systems.\n'), normal(BASE.replace('I build apps.\n\nSince 2010.', 'I build systems.')));
});

test('changes an entry found by its title', () => {
  assert.equal(print('## About {#about}\n\n### Leading\nCode reviews.\n'), normal(BASE.replace('Mentoring.', 'Code reviews.')));
});

test('replaces the text of a project, with its [show more] marker, and keeps its meta line, keyvisual, flow and tags', () => {
  assert.equal(
    print('## Projects {#projects}\n\n### AURA {#aura}\nShort.\n\n[show more]\n\nLong.\n'),
    normal(BASE.replace('Companion app.', 'Short.\n\n[show more]\n\nLong.')),
  );
});

test('replaces each kind of content on its own: meta line, list, flow, images and tags', () => {
  assert.equal(
    print('## Projects {#projects}\n\n### AURA {#aura}\n2024 – today + ZEISS\n\n`React`\n'),
    normal(BASE.replace('2025 – today + ZEISS', '2024 – today + ZEISS').replace('`Expo` `.NET`', '`React`')),
  );
  assert.equal(print('## About {#about}\n\n- **16 years**\n'), normal(BASE.replace('- **15 years**\n  - in software', '- **16 years**')));
  assert.equal(
    print('## Projects {#projects}\n\n### AURA {#aura}\n1. **Sensor**: measures\n'),
    normal(BASE.replace('1. **Device**: measures\n2. **App**: predicts', '1. **Sensor**: measures')),
  );
});

test('adds content the base entry lacks after the content above it in the variant, and never before the meta line', () => {
  assert.equal(
    print('## Projects {#projects}\n\n### MediaMarktSaturn {#mms}\nPilots.\n\n`Next.js`\n'),
    normal(BASE.replace('Pilots.', 'Pilots.\n\n`Next.js`')),
  );
  assert.equal(
    print('## Projects {#projects}\n\n### FC Bayern {#fcbayern}\n![](site/assets/img/b.webp "plain")\n'),
    normal(BASE.replace('fcbayern.com\n\nRelaunch.', 'fcbayern.com\n\n![](site/assets/img/b.webp "plain")\n\nRelaunch.')),
  );
});

test('renames a section or an entry found by its id', () => {
  assert.equal(
    print('## Profile {#about}\n\n### Lasting architecture {#architecture}\n'),
    normal(BASE.replace('## About {#about}', '## Profile {#about}').replace('### Architecture {#architecture}', '### Lasting architecture {#architecture}')),
  );
});

test('removes a section or an entry marked {.remove}', () => {
  assert.equal(
    print('## About {#about}\n\n### Leading {.remove}\n\n## Projects {#projects .remove}\n'),
    normal(BASE.slice(0, BASE.indexOf('## Projects')).replace('### Leading\nMentoring.\n', '')),
  );
});

test('adds an entry marked {.new} after the heading above it, or first in its section', () => {
  const merged = merge(
    [
      '## About {#about}',
      '',
      '### Pixel to cloud {.new}',
      'Glue.',
      '',
      '## Projects {#projects}',
      '',
      '### FC Bayern {#fcbayern}',
      '',
      '### Shop {#shop .new}',
      '2021 + Acme',
      '',
      'Shop.',
    ].join('\n'),
  );

  assert.deepEqual(entryTitles(merged, 'about'), ['Pixel to cloud', 'Architecture', 'Leading']);
  assert.deepEqual(entryTitles(merged, 'projects'), ['AURA', 'FC Bayern', 'Shop', 'MediaMarktSaturn']);
});

test('adds a section marked {.new} with its entries after the section above it', () => {
  assert.equal(
    print('## About {#about}\n\n## Talks {#talks .new}\n\nOn stage.\n\n### JSConf\n2019\n'),
    normal(BASE.replace('## Projects {#projects}', '## Talks {#talks}\n\nOn stage.\n\n### JSConf\n2019\n\n## Projects {#projects}')),
  );
});

test('orders the entries of a section marked {.reorder} as the variant lists them, then the rest as in the base', () => {
  const merged = merge('## Projects {#projects .reorder}\n\n### MediaMarktSaturn {#mms}\n\n### FC Bayern {#fcbayern}\nRelaunch, rebuilt.\n');

  assert.deepEqual(entryTitles(merged, 'projects'), ['MediaMarktSaturn', 'FC Bayern', 'AURA']);
  assert.match(printMarkdown(merged), /Relaunch, rebuilt\./);
});

test('leaves no flags behind, so the result builds like a base file', () => {
  const merged = merge('## About {#about}\n\n### Card {.new}\nNew.\n\n## Projects {#projects .reorder}\n\n### FC Bayern {#fcbayern}\n');

  assert.doesNotThrow(() => toPortfolio({ ...merged, frontmatter: FULL_FRONTMATTER }));
});

test('rejects a change it cannot place, naming the line in the variant', () => {
  const cases = [
    ['Text.\n', /line 1: the content must start with a ## section/],
    ['## Profile\n', /line 1: section "Profile" needs an id/],
    ['## Talks {#talks}\n', /line 1: the base file has no section \{#talks\}/],
    ['## About {#about}\n\n### Leadership\nText.\n', /line 3: section "about" of the base file has no entry "Leadership"/],
    ['## About {#about}\n\n### Lasting {#lasting}\n', /line 3: section "about" of the base file has no entry \{#lasting\}/],
    ['## About {#about}\n\n### Leading\nA.\n\n### Leading\nB.\n', /line 6: "Leading" is changed twice, also on line 3/],
    ['## About {#about}\n\n### Leading {.new}\n', /line 3: section "about" of the base file already has an entry "Leading"/],
    ['## About {#about .new}\n', /line 1: the base file already has a section \{#about\}/],
    ['## About {#about}\n\n### Leading {.delete}\n', /line 3: unknown flag \{\.delete\}/],
    ['## About {#about}\n\n### Leading {.new .remove}\n', /line 3: .*\{\.new\} or \{\.remove\}/],
    ['## About {#about}\n\n### Leading {.reorder}\n', /line 3: \{\.reorder\} only sorts the entries of a ## section/],
    ['## About {#about}\n\n### Leading {.remove}\nText.\n', /line 3: "Leading" is removed, so it takes no content/],
    ['## Talks {#talks .new}\n\n### Talk {.new}\n', /line 3: "Talk" is in a new section, so it takes no flags/],
    ['---\nlang: de\n---\n', /frontmatter: lang stays "en"/],
  ];
  for (const [changes, message] of cases) {
    assert.throws(() => merge(changes), message, changes);
  }
});

test('asks for an id when the base has several entries of the same title', () => {
  assert.throws(
    () => merge('## About {#about}\n\n### Card\nC.\n', '## About {#about}\n\n### Card\nA.\n\n### Card\nB.\n'),
    /line 3: section "about" of the base file has several entries "Card"/,
  );
});
