import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSlug, selectVariants, toVariant, variantPages } from '../scripts/lib/variants.mjs';

const SETTINGS = {
  company: 'Acme',
  role: 'Senior Software Engineer',
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
  const cases = [
    [withoutCompany, /company/],
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

test('builds the published variants, every variant for a preview, or one by name', () => {
  const live = toVariant('live', { ...SETTINGS, published: true });
  const draft = toVariant('draft', SETTINGS);

  assert.deepEqual(selectVariants([live, draft]), [live]);
  assert.deepEqual(selectVariants([live, draft], { drafts: true }), [live, draft]);
  assert.deepEqual(selectVariants([live, draft], { only: 'draft' }), [draft]);
  assert.throws(() => selectVariants([live, draft], { only: 'other' }), /"other"/);
});
