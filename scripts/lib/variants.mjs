// Variants: visually tailored copies of the portfolio, one per job application, each published below its own folder name.
// see: DEVELOPMENT.md, "Variants"
//
// A variant lives in variants/<slug>/ with a variant.json, a theme.css and an unchanged overlay for each base Markdown file.
// The base site and every published variant build into one dist/, so they go online and come down independently.
import { join } from 'node:path';

/** Folder below the repository root that holds one folder per variant. */
export const VARIANTS = 'variants';

// A folder name is one lowercase path segment, e.g. "acme" or "acme-cloud".
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Top-level paths of the base site that a variant's pages would collide with.
const RESERVED = ['assets', 'cv', 'docs', 'en'];

const LANGUAGES = ['de', 'en'];
const THEMES = ['dark', 'light'];
export const OFFICIAL_TITLE = 'Senior Staff Engineer';

// - company: name of the company, e.g. in document titles
// - role: job title as the posting writes it
// - title: Daniel's official title, used unchanged by every variant
// - job: address of the posting
// - language: language of the posting, which the cover letter and the first link sent lead with
// - theme: theme the pages open in, until the visitor switches
// - published: legacy flag kept optional for backwards compatibility; all variants build and deploy
const REQUIRED = ['company', 'role', 'title', 'job', 'language'];
const OPTIONAL = { theme: 'dark', published: false };

/**
 * Validates a variant's variant.json and returns its settings with its `slug`, the folder name.
 * Throws on an invalid folder name and on a missing, unknown or invalid setting.
 */
export function toVariant(slug, settings) {
  const fail = (message) => {
    throw new Error(`${VARIANTS}/${slug}/variant.json: ${message}`);
  };
  checkSlug(slug);

  const missing = REQUIRED.filter((key) => settings[key] === undefined || settings[key] === '');
  if (missing.length > 0) fail(`missing ${missing.join(', ')}`);
  const known = [...REQUIRED, ...Object.keys(OPTIONAL)];
  const unknown = Object.keys(settings).filter((key) => !known.includes(key));
  if (unknown.length > 0) fail(`unknown ${unknown.join(', ')}. Allowed: ${known.join(', ')}`);

  const variant = { slug, ...OPTIONAL, ...settings };
  if (typeof variant.company !== 'string' || typeof variant.role !== 'string') fail('company and role must be text');
  if (variant.title !== OFFICIAL_TITLE) fail(`title must be "${OFFICIAL_TITLE}"`);
  if (!/^https?:\/\//.test(variant.job)) fail(`job must be the address of the posting, starting with https://`);
  if (!LANGUAGES.includes(variant.language)) fail(`language must be one of ${LANGUAGES.join(', ')}`);
  if (typeof variant.published !== 'boolean') fail('published must be true or false');
  if (!THEMES.includes(variant.theme)) fail(`theme must be one of ${THEMES.join(', ')}`);
  return variant;
}

/** Throws if `slug` can't name a variant's folder, which is also its path below the homepage. */
export function checkSlug(slug) {
  const fail = (message) => {
    throw new Error(`${VARIANTS}/${slug}/variant.json: ${message}`);
  };
  if (!SLUG.test(slug)) fail(`"${slug}" is no folder name for a variant. Use lowercase letters, digits and dashes, e.g. "acme-cloud".`);
  if (RESERVED.includes(slug)) fail(`"${slug}" is a path of the base site. Name the folder after the company instead.`);
}

/**
 * Lists the pages of a variant, shaped like the base `pages` they mirror.
 * Sources move into the variant's folder, and each page moves one folder deeper, below the variant's slug.
 * `extends` and `cvExtends` name the base files that `source` and `cvSource` change.
 */
export function variantPages(variant, pages) {
  return pages.map((page) => ({
    source: join(VARIANTS, variant.slug, page.source),
    cvSource: join(VARIANTS, variant.slug, page.cvSource),
    path: `${variant.slug}/${page.path}`,
    base: `../${page.base}`,
    extends: page.source,
    cvExtends: page.cvSource,
  }));
}

/**
 * Picks the variants to build.
 * By default every variant in variants/ is included; `only` picks one variant by its slug.
 */
export function selectVariants(variants, { only = null } = {}) {
  if (only) {
    const variant = variants.find((candidate) => candidate.slug === only);
    if (!variant) throw new Error(`There is no variant "${only}" in ${VARIANTS}/.`);
    return [variant];
  }
  return variants;
}
