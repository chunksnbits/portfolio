import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { checkTemplate, publishedSource, stripComments } from '../scripts/lib/variant-files.mjs';

test('strips the comments from a stylesheet, and a line that only held a comment goes with it', () => {
  const css = [
    '/* Header',
    ' * of the file. */',
    '.a { color: red; } /* why */',
    '  /* alone */',
    '.b { content: "/* kept */"; background: url(img/a/*b*/c.webp); }',
    '',
  ].join('\n');

  assert.equal(stripComments(css, 'css'), ['.a { color: red; } ', '.b { content: "/* kept */"; background: url(img/a/*b*/c.webp); }', ''].join('\n'));
});

test('strips the comments from a script, and keeps strings, template literals and regular expressions that look like one', () => {
  const js = [
    '// Header.',
    "const url = 'https://example.com/*x*/'; // trailing",
    'const path = `a//b ${"/*"} ${{ k: 1 }.k} c`;',
    'const re = /\\/\\*[/*]+/g; /* block */ const half = 4 / 2 / 1;',
    'const text = "it\'s // fine";',
    '/*',
    ' * Multi-line.',
    ' */',
    'run();',
    '',
  ].join('\n');

  assert.equal(
    stripComments(js, 'js'),
    [
      "const url = 'https://example.com/*x*/'; ",
      'const path = `a//b ${"/*"} ${{ k: 1 }.k} c`;',
      'const re = /\\/\\*[/*]+/g;  const half = 4 / 2 / 1;',
      'const text = "it\'s // fine";',
      'run();',
      '',
    ].join('\n'),
  );
});

test('leaves a line break where a comment across lines stood, so the statement still ends there', () => {
  const js = 'function f() {\n  return /* nothing\n  */ 1;\n}\nf();';

  assert.equal(vm.runInNewContext(js), undefined);
  assert.equal(vm.runInNewContext(stripComments(js, 'js')), undefined);
});

test('strips main.js down to code that still compiles', async () => {
  const source = await readFile(new URL('../site/assets/main.js', import.meta.url), 'utf8');
  const stripped = stripComments(source, 'js');

  assert.doesNotThrow(() => new vm.Script(stripped));
  assert.doesNotMatch(stripped, /^\s*\/\//m);
  assert.ok(stripped.length < source.length * 0.9);
});

test('refuses a template that reaches past its kit, naming the name and its line', () => {
  const cases = [
    ["import { readFile } from 'node:fs';\nexport default () => '';", /template\.mjs uses import on line 1\. A template only composes/],
    ['export default function render() {\n  return process.env.HOME;\n}', /uses process on line 2/],
    ['export default (page, kit) => kit.constructor.constructor("return 1")();', /uses constructor on line 1/],
    ['export default async () => (await fetch("/x")).text();', /uses fetch on line 1/],
    ['export default () => globalThis.x;', /uses globalThis/],
  ];
  for (const [source, message] of cases) {
    assert.throws(() => checkTemplate('variants/acme/template.mjs', source), message, source);
  }
});

test('lets a template name those words in its markup, strings and comments', () => {
  const source = [
    '// Each step of the process, see the import notes.',
    'export default function render({ sections }, kit) {',
    '  const processEntry = (entry) => `<p class="import">${kit.text("fetch")}</p>`;',
    "  return sections.map(processEntry).join('');",
    '}',
  ].join('\n');

  assert.doesNotThrow(() => checkTemplate('variants/acme/template.mjs', source));
});

test('publishes a stylesheet and a script without their comments', () => {
  assert.equal(publishedSource('variants/acme/page.css', '/* Notes, see private/design.md. */\n.a { color: red; }\n'), '.a { color: red; }\n');
  assert.equal(publishedSource('variants/acme/page.js', "// Notes.\ndocument.body.dataset.ready = 'yes';\n"), "document.body.dataset.ready = 'yes';\n");
});

test('refuses page.js that reaches the network or builds code from text', () => {
  for (const source of ["fetch('/x');", "navigator.sendBeacon('/x');", "new WebSocket('wss://x.example');", "eval('1');", "import('./x.js');"]) {
    assert.throws(() => publishedSource('variants/acme/page.js', source), /variants\/acme\/page\.js uses \w+ on line 1/, source);
  }
});

test('refuses page.js that is no valid script', () => {
  assert.throws(() => publishedSource('variants/acme/page.js', 'const = 1;'), /variants\/acme\/page\.js: /);
});

test('refuses a stylesheet that loads a file from another site or from a data address, naming the line', () => {
  const cases = [
    '@import url(https://fonts.example/a.css);',
    "@import '//fonts.example/a.css';",
    '.a {\n  background: url("https://x.example/a.png");\n}',
    '.a { background: url(//x.example/a.png); }',
    ".a { background: url('data:image/png;base64,AA'); }",
  ];
  for (const source of cases) {
    assert.throws(() => publishedSource('variants/acme/page.css', source), /variants\/acme\/page\.css loads a file from outside the site on line \d/, source);
  }
  assert.throws(() => publishedSource('variants/acme/cv.css', '.a {\n  background: url("https://x.example/a.png");\n}'), /cv\.css loads a file from outside the site on line 2/);
});

test('lets a stylesheet load files of the site and name addresses in its comments and text', () => {
  const source = [
    '/* Barlow, from https://fonts.example/barlow. */',
    "@font-face { font-family: Barlow; src: url('fonts/barlow-500.woff2') format('woff2'); }",
    '.a { background: url(img/hero.webp); }',
    ".b { font-family: Inter; src: url('../assets/fonts/inter.woff2'); }",
    '.c::after { content: "https://example.com"; }',
  ].join('\n');

  assert.doesNotThrow(() => publishedSource('variants/acme/page.css', source));
});

test('refuses a template that exports anything but its default, or hides a name behind an escape', () => {
  const cases = [
    ["export { default } from 'data:text/javascript,export default () => 1';", /template\.mjs exports something besides its default function on line 1/],
    ["export * from './helper.mjs';\nexport default () => '';", /exports something besides its default function on line 1/],
    ["const x = 1;\nexport { x };\nexport default () => '';", /on line 2/],
    ['export default () => proc\\u0065ss.pid;', /template\.mjs writes a name with an escape on line 1/],
    ["export default () => { new WebSocket('wss://x.example'); return ''; };", /uses WebSocket on line 1/],
  ];
  for (const [source, message] of cases) {
    assert.throws(() => checkTemplate('variants/acme/template.mjs', source), message, source);
  }
  assert.throws(() => publishedSource('variants/acme/page.js', "fe\\u0074ch('/x');"), /page\.js writes a name with an escape/);
});

test('keeps tokens apart where a comment between them goes', () => {
  assert.equal(stripComments('return/**/x;', 'js'), 'return x;');
  assert.equal(vm.runInNewContext(stripComments('(function () { var x = 7; return/**/x; })()', 'js')), 7);
  assert.equal(stripComments('.a/**/.b { margin: 1px/**/2px; } /* why */', 'css'), '.a/**/.b { margin: 1px/**/2px; } ');
  assert.equal(stripComments('.a/* across\n lines */.c, a/*\n*/:hover {}', 'css'), '.a/**/.c, a/**/:hover {}');
});

test('lets page.js declare classes', () => {
  const source = 'class Slider {\n  constructor(root) {\n    this.root = root;\n  }\n}\nnew Slider(document.body);\n';

  assert.equal(publishedSource('variants/acme/page.js', source), source);
});
