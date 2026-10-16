// The Markdown subset portfolio.md is written in, and nothing more.
// see: README.md, "Writing portfolio.md"
//
// Anything outside it throws with a line number instead of rendering half right.

const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
const IMAGES_ONLY = /^(?:\s*!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\))+\s*$/;
const TAGS_ONLY = /^(?:\s*`[^`]+`)+\s*$/;
const HEADING = /^(#{1,6})\s+(.+?)\s*$/;
const HEADING_ID = /^(.*?)\s*\{#([a-z0-9-]+)\}$/;
const LIST_ITEM = /^(?:(-)|\d+\.)\s+(.*)$/;
const SUBITEM = /^\s{2,}-\s+(.*)$/;
const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
const OFF_SITE = /^https?:\/\//i;
// A line of its own that marks where "Show more" cuts a project's text.
const MORE = /^\[show more\]$/i;
// The marker inside a line of text, which is an error.
// A link named after it, like [show more](url), stays a link.
const MORE_IN_LINE = /\[show more\](?!\()/i;

/** Matches a separator: a plus between spaces, as in `React + Expo`. */
export const SEPARATOR = / +\+ +/g;

const UNSUPPORTED = [
  [/^\s+(?:-|\d+\.)\s/, 'sub-items go under a bullet list item, as "  - item"'],
  [/^\s*</, 'raw HTML is not supported'],
  [/^\s*\|/, 'tables are not supported'],
  [/^\s*(?:```|~~~)/, 'code blocks are not supported'],
  [/^\s*>/, 'block quotes are not supported'],
  [/^\s*[*+]\s/, 'start list items with "- "'],
  [/^\s*(?:-{3,}|\*{3,}|_{3,}|={3,})\s*$/, 'horizontal rules and underlined headings are not supported'],
];

const UNSUPPORTED_ANYWHERE = [
  // A typed · can end up at the start of a line, unlike a separator.
  [/·/, 'write the separator as " + ", e.g. React + Expo'],
  [/&#?\w+;/, 'HTML entities are not supported'],
];

/**
 * Parses portfolio Markdown into its frontmatter and a flat list of blocks.
 *
 * Blocks are `heading` (level 2 or 3, with an optional `{#id}`), `paragraph`, `list`
 * (each item a `{ text, items }` with its sub-items in `items`), `image` (one per image
 * on an images-only line), `tags` (a line of code spans) and `more` (a `[show more]`
 * marker on its own line).
 * Every block carries the 1-based source `line` it starts on.
 */
export function parseMarkdown(source) {
  const lines = stripComments(source.replace(/\r\n?/g, '\n')).split('\n');
  for (const [index, text] of lines.entries()) {
    const unsupported = UNSUPPORTED_ANYWHERE.find(([pattern]) => pattern.test(text));
    if (unsupported) {
      throw lineError(index + 1, unsupported[1]);
    }
  }

  if (lines[0] !== '---') {
    return { frontmatter: {}, blocks: parseBlocks(lines, 0) };
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    throw lineError(1, 'the frontmatter is never closed with ---');
  }
  return {
    frontmatter: parseFrontmatter(lines, 1, end),
    blocks: parseBlocks(lines, end + 1),
  };
}

/**
 * Renders inline Markdown: `code`, [links](href), **strong**, *emphasis*, ==highlights==
 * and `a + b` separators.
 *
 * `href` rewrites each link target before it is written, e.g. to map `site/` paths
 * onto the published site. Emphasis cannot span a link or a code span. A separator
 * stays on the line of the word before it.
 */
export function renderInline(source, { href = (url) => url } = {}) {
  let html = '';
  let last = 0;
  for (const match of source.matchAll(INLINE)) {
    html += formatText(source.slice(last, match.index));
    if (match[1] === undefined) {
      const url = encodeHref(href(match[3]));
      html += `<a href="${escapeHtml(url)}"${linkRel(url)}>${formatText(match[2])}</a>`;
    } else {
      html += `<code>${escapeHtml(match[1])}</code>`;
    }
    last = match.index + match[0].length;
  }
  return html + formatText(source.slice(last));
}

/**
 * Returns the rel attribute, with its leading space, that keeps a link to another site
 * from sending a referrer, or '' for a link within the site.
 */
export function linkRel(url) {
  return OFF_SITE.test(url) ? ' rel="noopener noreferrer"' : '';
}

/** Lists the link targets in inline Markdown, ignoring code spans. */
export function inlineLinks(source) {
  return [...source.matchAll(INLINE)].filter((match) => match[1] === undefined).map((match) => match[3]);
}

/** Strips inline Markdown down to its plain text, for attributes and page titles. */
export function inlineText(source) {
  return source
    .replace(INLINE, (match, code, text) => code ?? text)
    .replace(/\*\*(.+?)\*\*|==(.+?)==|\*(.+?)\*/g, (match, strong, mark, em) => strong ?? mark ?? em);
}

/** Escapes text for HTML content and double-quoted attributes. */
export function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/** Creates a parse error whose message starts with the source line. */
export function lineError(line, message) {
  return new SyntaxError(`line ${line}: ${message}`);
}

// Blanks out comments but keeps their newlines, so later line numbers stay true.
function stripComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ''));
}

function parseFrontmatter(lines, start, end) {
  const frontmatter = {};
  for (let index = start; index < end; index++) {
    if (lines[index].trim() === '') continue;

    const match = lines[index].match(/^([a-z][a-z0-9-]*):\s*(.*)$/);
    if (!match) {
      throw lineError(index + 1, 'expected "key: value"');
    }
    if (match[1] in frontmatter) {
      throw lineError(index + 1, `"${match[1]}" is set twice`);
    }
    frontmatter[match[1]] = match[2].trim();
  }
  return frontmatter;
}

function parseBlocks(lines, start) {
  const blocks = [];
  // Lines of the paragraph being read, each with its line number.
  let paragraph = null;
  let list = null;

  const flush = () => {
    if (paragraph) blocks.push(...paragraphBlocks(paragraph));
    if (list) blocks.push(list);
    paragraph = null;
    list = null;
  };

  for (let index = start; index < lines.length; index++) {
    const line = index + 1;
    const text = lines[index];

    if (text.trim() === '') {
      flush();
      continue;
    }

    if (MORE.test(text.trim())) {
      flush();
      blocks.push({ type: 'more', line });
      continue;
    }
    if (MORE_IN_LINE.test(text)) {
      throw lineError(line, 'put [show more] on its own line');
    }

    const heading = text.match(HEADING);
    if (heading) {
      flush();
      const level = heading[1].length;
      if (level !== 2 && level !== 3) {
        throw lineError(line, 'only ## sections and ### entries are supported');
      }
      const withId = heading[2].match(HEADING_ID);
      blocks.push({
        type: 'heading',
        level,
        text: withId ? withId[1] : heading[2],
        id: withId ? withId[2] : null,
        line,
      });
      continue;
    }

    const item = text.match(LIST_ITEM);
    if (item) {
      const ordered = item[1] === undefined;
      if (paragraph || (list && list.ordered !== ordered)) flush();
      list ??= { type: 'list', ordered, items: [], line };
      list.items.push({ text: item[2].trim(), items: [] });
      continue;
    }

    const subitem = list?.ordered === false ? text.match(SUBITEM) : null;
    if (subitem) {
      list.items.at(-1).items.push(subitem[1].trim());
      continue;
    }

    const unsupported = UNSUPPORTED.find(([pattern]) => pattern.test(text));
    if (unsupported) {
      throw lineError(line, unsupported[1]);
    }

    if (list) {
      if (!/^\s{2,}\S/.test(text)) {
        throw lineError(line, 'separate a paragraph from the list above with a blank line');
      }
      const last = list.items.at(-1);
      if (last.items.length > 0) {
        last.items[last.items.length - 1] += ` ${text.trim()}`;
      } else {
        last.text += ` ${text.trim()}`;
      }
      continue;
    }

    paragraph ??= [];
    paragraph.push({ text: text.trim(), line });
  }
  flush();
  return blocks;
}

function paragraphBlocks(lines) {
  const text = lines.map((entry) => entry.text).join(' ');
  const line = lines[0].line;

  if (IMAGES_ONLY.test(text)) {
    return lines.flatMap((entry) =>
      [...entry.text.matchAll(IMAGE)].map((match) => ({
        type: 'image',
        alt: match[1],
        src: match[2],
        title: match[3] ?? null,
        line: entry.line,
      })),
    );
  }
  const image = lines.find((entry) => entry.text.includes('!['));
  if (image) {
    throw lineError(image.line, 'images must stand on their own lines');
  }
  if (TAGS_ONLY.test(text)) {
    return [{ type: 'tags', tags: [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]), line }];
  }
  return [{ type: 'paragraph', text, line }];
}

function formatText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(SEPARATOR, '&nbsp;+ ');
}

// Percent-encodes only non-ASCII characters, so existing %-escapes stay intact.
function encodeHref(url) {
  return url.replace(/[^\x00-\x7F]/gu, (character) => encodeURIComponent(character));
}
