import { lineError } from './markdown.mjs';

/** Id of the section whose entries each get their own sliding screen. */
export const PROJECTS = 'projects';

const FRONTMATTER_KEYS = [
  'lang',
  'name',
  'title',
  'subtitle',
  'status',
  'intro',
  'location',
  'email',
  'github',
  'linkedin',
  'description',
];

// A meta line opens with a year.
// E.g. "2021 – today · Munich".
const META_LINE = /^\d{4}\b/;

/**
 * Builds the page model from parsed portfolio Markdown.
 *
 * Each `##` heading opens a section and each `###` heading an entry inside it.
 * An entry whose first paragraph starts with a year gets that line as `meta`:
 * its first ` · ` part is the `period`, the rest the `details`.
 * Throws on a missing id or frontmatter key.
 */
export function toPortfolio({ frontmatter, blocks }) {
  checkFrontmatter(frontmatter);

  const sections = [];
  const lines = new Map();
  const claim = (block) => {
    if (lines.has(block.id)) {
      throw lineError(block.line, `id "${block.id}" is already used on line ${lines.get(block.id)}`);
    }
    lines.set(block.id, block.line);
  };

  let entry = null;
  for (const block of blocks) {
    const section = sections.at(-1);

    if (block.type === 'heading' && block.level === 2) {
      if (!block.id) {
        throw lineError(block.line, `section "${block.text}" needs an id, e.g. ## ${block.text} {#name}`);
      }
      claim(block);
      sections.push({ id: block.id, title: block.text, line: block.line, blocks: [], entries: [] });
      entry = null;
    } else if (!section) {
      throw lineError(block.line, 'the content must start with a ## section');
    } else if (block.type === 'heading') {
      if (block.id) {
        claim(block);
      } else if (section.id === PROJECTS) {
        throw lineError(block.line, `project "${block.text}" needs an id, e.g. ### ${block.text} {#name}`);
      }
      entry = { id: block.id, title: block.text, line: block.line, meta: null, blocks: [] };
      section.entries.push(entry);
    } else if (!entry) {
      section.blocks.push(block);
    } else if (entry.blocks.length === 0 && !entry.meta && block.type === 'paragraph' && META_LINE.test(block.text)) {
      const [period, ...details] = block.text.split(' · ');
      entry.meta = { period, details: details.join(' · ') };
    } else {
      entry.blocks.push(block);
    }
  }

  return { meta: frontmatter, sections };
}

function checkFrontmatter(frontmatter) {
  const missing = FRONTMATTER_KEYS.filter((key) => !frontmatter[key]);
  if (missing.length > 0) {
    throw new SyntaxError(`frontmatter: missing ${missing.join(', ')}`);
  }
  const unknown = Object.keys(frontmatter).filter((key) => !FRONTMATTER_KEYS.includes(key));
  if (unknown.length > 0) {
    throw new SyntaxError(`frontmatter: unknown ${unknown.join(', ')}. Allowed: ${FRONTMATTER_KEYS.join(', ')}`);
  }
}
