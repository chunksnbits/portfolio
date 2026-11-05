// Applies an overlay to the base file it changes.
// see: DEVELOPMENT.md, "Variant files"
//
// An overlay is one of a variant's Markdown files, e.g. variants/acme/portfolio.md, and holds only its changes to portfolio.md.
// Each heading in it finds a section of the base by its {#id}, or an entry by its {#id} or title.
// The content under the heading replaces the base content of the same kind, and the kinds it leaves out stay.
// The flags {.new}, {.remove} and {.reorder} in the heading's braces add, drop and sort.
//
// Both files arrive from parseMarkdown, and the result has the same shape, so toPortfolio and toCv read it like a base file.
import { lineError } from './markdown.mjs';
import { META_LINE } from './portfolio.mjs';

const FLAGS = ['new', 'remove', 'reorder'];

/**
 * Applies `overlay`, a variant's parsed Markdown file, to `base`, the parsed base file it changes.
 * Returns the merged document without flags.
 * Throws with the overlay's line number on a change it can't place.
 */
export function applyOverlay(base, overlay) {
  const sections = mergeUnits(outline(base.blocks), outline(overlay.blocks), {
    lookup: (heading, sections) => sections.find((section) => section.heading.id === heading.id) ?? null,
    owner: 'the base file',
    noun: 'section',
    create: newSection,
    merge: (section, change) => ({
      heading: { ...section.heading, text: change.heading.text },
      blocks: mergeContent(section.blocks, change.blocks, false),
      entries: mergeEntries(section, change),
    }),
  });
  return { frontmatter: mergeFrontmatter(base.frontmatter, overlay.frontmatter), blocks: flatten(sections) };
}

function mergeEntries(section, change) {
  const owner = `section "${section.heading.id}" of the base file`;
  return mergeUnits(section.entries, change.entries, {
    lookup: (heading, entries) => {
      if (heading.id) return entries.find((entry) => entry.heading.id === heading.id) ?? null;
      const matches = entries.filter((entry) => entry.heading.text === heading.text);
      if (matches.length > 1) {
        throw lineError(heading.line, `${owner} has several entries "${heading.text}". Give the one to change an id there`);
      }
      return matches[0] ?? null;
    },
    owner,
    noun: 'entry',
    create: (entry) => ({ heading: { ...entry.heading, flags: [] }, blocks: entry.blocks }),
    merge: (entry, change) => ({
      heading: { ...entry.heading, text: change.heading.text },
      blocks: mergeContent(entry.blocks, change.blocks, true),
    }),
    reorder: change.heading.flags.includes('reorder'),
  });
}

// Merges the overlay's sections into the base's, or the entries of one section into the base section's.
// Units keep the base order, with two exceptions:
// - a unit marked {.new} goes after the unit above it in the overlay, or first
// - with `reorder`, the units the overlay names go first, in the overlay's order
// `owner` and `noun` only name the units in error messages.
function mergeUnits(base, overlay, { lookup, owner, noun, create, merge, reorder = false }) {
  // `line` is where the overlay changed the base unit, and `unit` is null once it is removed.
  const slots = base.map((unit) => ({ base: unit, unit, line: null }));
  const named = [];
  for (const change of overlay) {
    const { heading } = change;
    checkHeading(heading, noun);
    const target = lookup(heading, base);
    const name = heading.id ? `{#${heading.id}}` : `"${heading.text}"`;
    let slot;
    if (heading.flags.includes('new')) {
      if (target) throw lineError(heading.line, `${owner} already has ${noun === 'entry' ? 'an' : 'a'} ${noun} ${name}. Drop {.new} to change it`);
      slot = { base: null, unit: create(change), line: heading.line };
      slots.splice(named.length > 0 ? slots.indexOf(named.at(-1)) + 1 : 0, 0, slot);
    } else {
      if (!target) throw lineError(heading.line, `${owner} has no ${noun} ${name}. ${missingHint(heading, noun)}`);
      slot = slots.find((candidate) => candidate.base === target);
      if (slot.line !== null) throw lineError(heading.line, `"${heading.text}" is changed twice, also on line ${slot.line}`);
      slot.line = heading.line;
      if (heading.flags.includes('remove')) {
        if (change.blocks.length > 0 || change.entries?.length > 0) {
          throw lineError(heading.line, `"${heading.text}" is removed, so it takes no content`);
        }
        slot.unit = null;
      } else {
        slot.unit = merge(target, change);
      }
    }
    named.push(slot);
  }
  const ordered = reorder ? [...named, ...slots.filter((slot) => !named.includes(slot))] : slots;
  return ordered.filter((slot) => slot.unit !== null).map((slot) => slot.unit);
}

function checkHeading(heading, noun) {
  const unknown = heading.flags.find((flag) => !FLAGS.includes(flag));
  if (unknown) throw lineError(heading.line, `unknown flag {.${unknown}}. Use {.new}, {.remove} or {.reorder}`);
  if (heading.flags.includes('new') && heading.flags.includes('remove')) {
    throw lineError(heading.line, 'mark a heading {.new} or {.remove}, not both');
  }
  if (noun === 'entry' && heading.flags.includes('reorder')) {
    throw lineError(heading.line, '{.reorder} only sorts the entries of a ## section');
  }
  if (noun === 'section' && !heading.id) {
    throw lineError(heading.line, `section "${heading.text}" needs an id, e.g. ## ${heading.text} {#name}`);
  }
}

function missingHint(heading, noun) {
  if (noun === 'section') return `Mark a new one {#${heading.id} .new}`;
  return heading.id ? 'To rename an entry, give it this id in the base file first' : 'Mark a new one {.new}';
}

// A new section is taken as written, and so are its entries.
function newSection({ heading, blocks, entries }) {
  for (const entry of entries) {
    if (entry.heading.flags.length > 0) {
      throw lineError(entry.heading.line, `"${entry.heading.text}" is in a new section, so it takes no flags`);
    }
  }
  return { heading: { ...heading, flags: [] }, blocks, entries };
}

// Replaces each kind of content the overlay has, and keeps the kinds it leaves out.
// The overlay's blocks of one kind go where the base had its first block of that kind.
// A kind the base lacks goes after the kind above it in the overlay, but never before an entry's meta line.
function mergeContent(base, overlay, inEntry) {
  const tag = (blocks) => blocks.map((block, index) => ({ block, kind: kindOf(block, index, inEntry) }));
  const changes = tag(overlay);
  const kinds = [...new Set(changes.map((change) => change.kind))];
  const ofKind = (kind) => changes.filter((change) => change.kind === kind);

  const merged = [];
  const placed = new Set();
  for (const item of tag(base)) {
    if (!kinds.includes(item.kind)) merged.push(item);
    else if (!placed.has(item.kind)) {
      placed.add(item.kind);
      merged.push(...ofKind(item.kind));
    }
  }
  for (const [index, kind] of kinds.entries()) {
    if (placed.has(kind)) continue;
    let at = merged[0]?.kind === 'meta' ? 1 : 0;
    if (index > 0) at = merged.findLastIndex((item) => item.kind === kinds[index - 1]) + 1;
    merged.splice(at, 0, ...ofKind(kind));
    placed.add(kind);
  }
  return merged.map((item) => item.block);
}

// The kinds of content an overlay replaces one by one:
// - meta: an entry's first line, when it opens with a year
// - text: paragraphs, with the [show more] marker between them
// - list, flow: a bullet list, a numbered list
// - image, tags
function kindOf(block, index, inEntry) {
  if (block.type === 'paragraph') return inEntry && index === 0 && META_LINE.test(block.text) ? 'meta' : 'text';
  if (block.type === 'more') return 'text';
  if (block.type === 'list') return block.ordered ? 'flow' : 'list';
  return block.type;
}

function mergeFrontmatter(base, overlay) {
  if (overlay.lang !== undefined && overlay.lang !== base.lang) {
    throw new SyntaxError(`frontmatter: lang stays "${base.lang}", as in the base file`);
  }
  return { ...base, ...overlay };
}

// Groups blocks into sections, each with its heading, its own blocks and its entries.
function outline(blocks) {
  const sections = [];
  for (const block of blocks) {
    const section = sections.at(-1);
    if (block.type === 'heading' && block.level === 2) sections.push({ heading: block, blocks: [], entries: [] });
    else if (!section) throw lineError(block.line, 'the content must start with a ## section');
    else if (block.type === 'heading') section.entries.push({ heading: block, blocks: [] });
    else (section.entries.at(-1) ?? section).blocks.push(block);
  }
  return sections;
}

function flatten(sections) {
  return sections.flatMap((section) => [section.heading, ...section.blocks, ...section.entries.flatMap((entry) => [entry.heading, ...entry.blocks])]);
}
