import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, renderInline } from '../scripts/lib/markdown.mjs';

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
      { type: 'heading', level: 2, text: 'About', id: 'about' },
      { type: 'paragraph', text: 'First line second line.' },
      { type: 'heading', level: 3, text: 'Card', id: null },
      { type: 'list', ordered: false, items: ['one', 'two continued'] },
      { type: 'list', ordered: true, items: ['step', 'next'] },
    ],
  );
  assert.deepEqual(
    blocks.map((block) => block.line),
    [1, 3, 6, 7, 11],
  );
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

test('rejects syntax outside the supported subset, naming the line', () => {
  const cases = [
    ['# Title', /line 1/],
    ['## Ok {#ok}\n#### Deep', /line 2/],
    ['- item\n  - nested', /line 2/],
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

test('renders inline formatting and escapes HTML', () => {
  assert.equal(
    renderInline('**Lead** with *care* and ==focus==, `<code> **raw**` & <b>'),
    '<strong>Lead</strong> with <em>care</em> and <mark>focus</mark>, <code>&lt;code&gt; **raw**</code> &amp; &lt;b&gt;',
  );
});

test('renders links and percent-encodes non-ASCII characters in the href', () => {
  assert.equal(
    renderInline('[Profile](https://www.linkedin.com/in/daniel-eißing) and [paper](site/docs/a_b_c.pdf)'),
    '<a href="https://www.linkedin.com/in/daniel-ei%C3%9Fing">Profile</a> and <a href="site/docs/a_b_c.pdf">paper</a>',
  );
});

test('leaves underscores alone', () => {
  assert.equal(renderInline('snake_case_name'), 'snake_case_name');
});
