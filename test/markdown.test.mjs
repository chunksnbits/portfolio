import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, printMarkdown, renderInline } from '../scripts/lib/markdown.mjs';
import { portfolioSource } from './fixtures.mjs';

test('reads flat frontmatter and keeps colons inside values', () => {
  const { frontmatter } = parseMarkdown('---\nname: Daniel Eissing\nlocation: Fulda: remote\n---\n');
  assert.deepEqual(frontmatter, { name: 'Daniel Eissing', location: 'Fulda: remote' });
});

test('rejects a frontmatter line without a key', () => {
  assert.throws(() => parseMarkdown('---\nname: Daniel\njust text\n---\n'), /line 3/);
});

test('splits headings with ids, paragraphs and lists into blocks', () => {
  const { blocks } = parseMarkdown(
    [
      '## About {#about}',
      '',
      'First line',
      'second line.',
      '',
      '### Card',
      '- one',
      '- two',
      '  continued',
      '',
      '1. step',
      '2. next',
    ].join('\n'),
  );

  assert.deepEqual(
    blocks.map(({ line, ...block }) => block),
    [
      { type: 'heading', level: 2, text: 'About', id: 'about', flags: [] },
      { type: 'paragraph', text: 'First line second line.' },
      { type: 'heading', level: 3, text: 'Card', id: null, flags: [] },
      {
        type: 'list',
        ordered: false,
        items: [
          { text: 'one', items: [] },
          { text: 'two continued', items: [] },
        ],
      },
      {
        type: 'list',
        ordered: true,
        items: [
          { text: 'step', items: [] },
          { text: 'next', items: [] },
        ],
      },
    ],
  );
  assert.deepEqual(
    blocks.map((block) => block.line),
    [1, 3, 6, 7, 11],
  );
});

test('reads flags like {.remove} next to the id in the braces after a heading', () => {
  const { blocks } = parseMarkdown('## Projects {#projects .reorder}\n\n### Mobile {.remove}\n\n### Card {draft}\n');

  assert.deepEqual(
    blocks.map(({ line, ...block }) => block),
    [
      { type: 'heading', level: 2, text: 'Projects', id: 'projects', flags: ['reorder'] },
      { type: 'heading', level: 3, text: 'Mobile', id: null, flags: ['remove'] },
      { type: 'heading', level: 3, text: 'Card {draft}', id: null, flags: [] },
    ],
  );
});

test('rejects a heading with two ids', () => {
  assert.throws(() => parseMarkdown('## About {#about #me}'), /line 1: .*one id/);
});

test('prints a document as Markdown that reads back to the same frontmatter and blocks', () => {
  const extra = [
    '### Extra {#extra .new}',
    '',
    '- **Fullstack**',
    '  - React',
    '  - Node.js',
    '',
    '![Shop](site/assets/img/shop.webp "Campaign pages")',
    '![](site/assets/img/a.webp "keyvisual ascii")',
    '',
    'Short.',
    '',
    '[show more]',
    '',
    'Long, with a [link](site/docs/a.pdf) and `code`.',
  ].join('\n');
  const document = parseMarkdown(portfolioSource({ body: `## About {#about}\n\nText.\n\n${extra}\n` }));
  const printed = parseMarkdown(printMarkdown(document));
  const withoutLines = (blocks) => blocks.map(({ line, ...block }) => block);

  assert.deepEqual(printed.frontmatter, document.frontmatter);
  assert.deepEqual(withoutLines(printed.blocks), withoutLines(document.blocks));
});

test('prints blocks apart by a blank line and the images of one group line by line', () => {
  const source = '---\nlang: en\n---\n\n## About {#about}\n\nText.\n\n![A](a.webp)\n![B](b.webp "phone")\n\n`React` `Expo`\n';
  assert.equal(printMarkdown(parseMarkdown(source)), source);
  assert.equal(printMarkdown(parseMarkdown('## About {#about}\n')), '## About {#about}\n');
});

test('turns a paragraph of images into one image block per image', () => {
  const { blocks } = parseMarkdown(
    '![Dashboard](site/assets/img/a.webp)\n![On a phone](site/assets/img/b.webp "phone")\n',
  );
  assert.deepEqual(
    blocks.map(({ line, ...block }) => block),
    [
      { type: 'image', alt: 'Dashboard', src: 'site/assets/img/a.webp', title: null },
      { type: 'image', alt: 'On a phone', src: 'site/assets/img/b.webp', title: 'phone' },
    ],
  );
});

test('turns a paragraph of code spans into a tags block', () => {
  const { blocks } = parseMarkdown('`React` `TypeScript` `.NET`\n');
  assert.deepEqual(blocks, [{ type: 'tags', tags: ['React', 'TypeScript', '.NET'], line: 1 }]);
});

test('drops HTML comments and keeps line numbers', () => {
  const { blocks } = parseMarkdown('<!-- note\nfor Daniel\n-->\nText\n');
  assert.deepEqual(blocks, [{ type: 'paragraph', text: 'Text', line: 4 }]);
});

test('reads a [show more] marker on its own line, but not a link of that name', () => {
  const { blocks } = parseMarkdown('First.\n\n[show more]\n\nSee [show more](site/docs/a.pdf).\n');
  assert.deepEqual(blocks, [
    { type: 'paragraph', text: 'First.', line: 1 },
    { type: 'more', line: 3 },
    { type: 'paragraph', text: 'See [show more](site/docs/a.pdf).', line: 5 },
  ]);
});

test('rejects a [show more] marker inside a line of text', () => {
  assert.throws(() => parseMarkdown('First. [show more] Second.\n'), /line 1: .*own line/);
  assert.throws(() => parseMarkdown('- [show more]\n'), /line 1: .*own line/);
});

test('reads lines indented under a bullet list item as its sub-items', () => {
  const { blocks } = parseMarkdown('- **Fullstack**\n  - React\n  - Node.js\n    and .NET\n- **E2E**');

  assert.deepEqual(blocks[0].items, [
    { text: '**Fullstack**', items: ['React', 'Node.js and .NET'] },
    { text: '**E2E**', items: [] },
  ]);
});

test('rejects syntax outside the supported subset, naming the line', () => {
  const cases = [
    ['# Title', /line 1/],
    ['## Ok {#ok}\n#### Deep', /line 2/],
    ['1. step\n  - nested', /line 2/],
    ['Text with ![image](a.webp) inside', /line 1/],
    ['<div>html</div>', /line 1/],
    ['| a | b |', /line 1/],
    ['```js', /line 1/],
    ['> quote', /line 1/],
  ];
  for (const [source, message] of cases) {
    assert.throws(() => parseMarkdown(source), message, source);
  }
});

test('rejects a link or image to an address other than https, http and mailto, naming the line', () => {
  const sources = ['[x](javascript:alert(1))', 'See [x](JavaScript:void(0)).', '![x](data:image/png;base64,AA)', '- [x](file:///etc/passwd)', '[x](site/javascript:alert(1))'];
  for (const source of sources) {
    assert.throws(() => parseMarkdown(`## About {#about}\n\n${source}`), /line 3: link targets must be/, source);
  }
  assert.doesNotThrow(() => parseMarkdown('## About {#about}\n\n[a](https://x.example) [b](http://x.example) [c](mailto:me@example.com) [d](site/docs/a.pdf) [e](#about)'));
});

test('rejects control characters, which browsers drop from an address, naming the line', () => {
  assert.throws(() => parseMarkdown('## About {#about}\n\n[x](\u0001javascript:alert(1))'), /line 3: control characters are not supported/);
});

test('renders inline formatting and escapes HTML', () => {
  assert.equal(
    renderInline('**Lead** with *care* and ==focus==, `<code> **raw**` & <b>'),
    '<strong>Lead</strong> with <em>care</em> and <mark>focus</mark>, <code>&lt;code&gt; **raw**</code> &amp; &lt;b&gt;',
  );
});

test('renders links and percent-encodes non-ASCII characters in the href', () => {
  assert.equal(
    renderInline('[Profile](https://www.linkedin.com/in/daniel-eißing) and [paper](site/docs/a_b_c.pdf)'),
    '<a href="https://www.linkedin.com/in/daniel-ei%C3%9Fing" rel="noopener noreferrer">Profile</a> and <a href="site/docs/a_b_c.pdf">paper</a>',
  );
});

test('sends no referrer along links to other sites, and leaves links within the site alone', () => {
  assert.equal(
    renderInline('[Blog](https://example.com/blog), [old](http://example.com), [paper](site/docs/a.pdf), [top](#about), [mail](mailto:me@example.com)'),
    '<a href="https://example.com/blog" rel="noopener noreferrer">Blog</a>, <a href="http://example.com" rel="noopener noreferrer">old</a>, <a href="site/docs/a.pdf">paper</a>, <a href="#about">top</a>, <a href="mailto:me@example.com">mail</a>',
  );
});

test('leaves underscores alone', () => {
  assert.equal(renderInline('snake_case_name'), 'snake_case_name');
});

test('glues a plus between spaces to the word before it, so no line starts with one', () => {
  assert.equal(
    renderInline('React + Expo + .NET and [paper](site/docs/a.pdf) + ISWC 2011'),
    'React&nbsp;+ Expo&nbsp;+ .NET and <a href="site/docs/a.pdf">paper</a>&nbsp;+ ISWC 2011',
  );
});

test('leaves a plus without spaces alone', () => {
  assert.equal(renderInline('C++ and 15+ years'), 'C++ and 15+ years');
});

test('rejects a typed middle dot and HTML entities, naming the line', () => {
  assert.throws(() => parseMarkdown('---\nlocation: Fulda · remote\n---\n'), /line 2: .*React \+ Expo/);
  assert.throws(() => parseMarkdown('## About {#about}\n\n- React · Expo'), /line 3: .*React \+ Expo/);
  assert.throws(() => parseMarkdown('## About {#about}\n\n- React &middot; Expo'), /line 3: HTML entities/);
  assert.doesNotThrow(() => parseMarkdown('<!-- React · Expo -->\n## About {#about}'));
});
