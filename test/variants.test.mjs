import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSlug, OFFICIAL_TITLE, selectVariants, toVariant, variantPages } from '../scripts/lib/variants.mjs';

const SETTINGS = {
  company: 'Acme',
  role: 'Senior Software Engineer',
  title: OFFICIAL_TITLE,
  job: 'https://acme.example/jobs/42',
  language: 'de',
  published: false,
  theme: 'light',
};

// Same shape as PAGES in scripts/build.mjs.
const PAGES = [
  { source: 'portfolio.de.md', cvSource: 'cv.de.md', path: '', base: '' },
  { source: 'portfolio.md', cvSource: 'cv.md', path: 'en/', base: '../' },
];

test('reads a variant from its folder name and settings', () => {
  assert.deepEqual(toVariant('acme', SETTINGS), { slug: 'acme', ...SETTINGS });
});

test('shows a variant in the dark theme unless it picks the light one', () => {
  const { theme, ...settings } = SETTINGS;

  assert.equal(toVariant('acme', settings).theme, 'dark');
});

test('rejects a folder name that is not a lowercase path segment, or that the site already uses', () => {
  for (const slug of ['Acme', 'acme corp', 'acme_corp', '-acme', 'acme-', 'en', 'cv', 'assets', 'docs']) {
    assert.throws(() => toVariant(slug, SETTINGS), /variants\/.*: /, slug);
  }
});

test('checks a folder name on its own, before a new variant has settings', () => {
  assert.doesNotThrow(() => checkSlug('acme-cloud'));
  assert.throws(() => checkSlug('en'), /variants\/en\/variant\.json: "en" is a path of the base site/);
});

test('rejects a missing, unknown or invalid setting, naming the variant and the setting', () => {
  const { company, ...withoutCompany } = SETTINGS;
  const { title, ...withoutTitle } = SETTINGS;
  const cases = [
    [withoutCompany, /company/],
    [withoutTitle, /title/],
    [{ ...SETTINGS, title: 'Senior Software Engineer' }, /title must be "Staff Software Engineer"/],
    [{ ...SETTINGS, color: 'blue' }, /unknown.*color/],
    [{ ...SETTINGS, company: 42 }, /company and role must be text/],
    [{ ...SETTINGS, job: 'acme.example/jobs/42' }, /job/],
    [{ ...SETTINGS, language: 'fr' }, /language/],
    [{ ...SETTINGS, published: 'yes' }, /published/],
    [{ ...SETTINGS, theme: 'blue' }, /theme/],
  ];
  for (const [settings, message] of cases) {
    assert.throws(() => toVariant('acme', settings), message, JSON.stringify(settings));
    assert.throws(() => toVariant('acme', settings), /variants\/acme\/variant\.json/);
  }
});

test('places the pages of a variant below its folder, one level deeper than the base pages, and names the base files they change', () => {
  assert.deepEqual(variantPages(toVariant('acme', SETTINGS), PAGES), [
    { source: 'variants/acme/portfolio.de.md', cvSource: 'variants/acme/cv.de.md', path: 'acme/', base: '../', extends: 'portfolio.de.md', cvExtends: 'cv.de.md' },
    { source: 'variants/acme/portfolio.md', cvSource: 'variants/acme/cv.md', path: 'acme/en/', base: '../../', extends: 'portfolio.md', cvExtends: 'cv.md' },
  ]);
});

test('builds every variant by default, or one by name', () => {
  const first = toVariant('first', { ...SETTINGS, published: true });
  const second = toVariant('second', { ...SETTINGS, published: false });

  assert.deepEqual(selectVariants([first, second]), [first, second]);
  assert.deepEqual(selectVariants([first, second], { only: 'second' }), [second]);
  assert.throws(() => selectVariants([first, second], { only: 'other' }), /"other"/);
});
