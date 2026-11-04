// The private documents of an application, which never go online: the cover letter and the interview brief.
// see: README.md, "Variants"
//
// Both are pages in Daniel's house style, styled by scripts/documents.css and the variant's own documents.css.
// The styles go inline, so each HTML file opens on its own, like a house-style design doc.
import { escapeHtml, inlineText, lineError, linkRel, renderInline, SEPARATOR } from './markdown.mjs';

// How a letter writes out its date, e.g. "1. November 2026" or "1 November 2026".
const DATE_LOCALES = { de: 'de-DE', en: 'en-GB' };

/**
 * Builds the cover letter model from parsed Markdown.
 *
 * The frontmatter holds the frame of the letter, and the body holds only its paragraphs:
 * `to` lists the recipient's lines separated by " + ", `date` is written as YYYY-MM-DD,
 * and `subject`, `greeting` and `closing` are the lines around the paragraphs.
 */
export function toLetter({ frontmatter, blocks }) {
  checkFrontmatter(frontmatter, ['lang', 'to', 'date', 'subject', 'greeting', 'closing']);
  // Date.parse rolls an impossible day like 2026-02-30 over into the next month, so the date must survive the round trip.
  const parsed = Date.parse(`${frontmatter.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date) || Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== frontmatter.date) {
    throw new SyntaxError(`frontmatter: write the date as YYYY-MM-DD, e.g. 2026-11-01, not "${frontmatter.date}"`);
  }
  const other = blocks.find((block) => block.type !== 'paragraph');
  if (other) {
    throw lineError(other.line, 'a letter holds only paragraphs. The subject, greeting and closing go in the frontmatter.');
  }
  return {
    meta: { ...frontmatter, to: frontmatter.to.split(SEPARATOR) },
    paragraphs: blocks.map((block) => block.text),
  };
}

/**
 * Renders a cover letter as a complete HTML page for one A4 sheet.
 *
 * `meta` is the frontmatter of the portfolio in the letter's language, which supplies the sender.
 * `homepage` and `portfolioPath` give the address of the tailored portfolio named below the sender.
 * `styles` holds CSS sources, inlined in the given order, so the variant's palette goes last.
 */
export function renderLetter(letter, { meta, homepage, portfolioPath, styles }) {
  const { lang, to, date, subject, greeting, closing } = letter.meta;
  if (lang !== meta.lang) {
    throw new Error(`frontmatter: the letter is in "${lang}", its portfolio in "${meta.lang}"`);
  }
  const inline = (text) => renderInline(text, { href: siteHref(homepage) });
  const portfolio = homepage + portfolioPath;
  const contacts = [
    `<a href="mailto:${escapeHtml(meta.email)}">${escapeHtml(meta.email)}</a>`,
    `<a href="${escapeHtml(portfolio)}"${linkRel(portfolio)}>${escapeHtml(address(portfolio))}</a>`,
    `<a href="${escapeHtml(meta.linkedin)}"${linkRel(meta.linkedin)}>${escapeHtml(address(meta.linkedin))}</a>`,
  ];

  return wrapDocument({
    lang,
    title: `${inlineText(meta.name)} · ${inlineText(subject)}`,
    styles,
    body: `<main class="doc letter">
<header class="letter__head">
<p class="sender__name">${escapeHtml(meta.name)}</p>
<p class="sender__title">${inline(meta.title)}</p>
<ul class="sender__contact">${contacts.map((contact) => `<li>${contact}</li>`).join('')}</ul>
</header>
<div class="letter__meta">
<address class="letter__to">${to.map(inline).join('<br>')}</address>
<p class="letter__date">${escapeHtml(placeOf(meta.location))}, ${formatDate(date, lang)}</p>
</div>
<h1 class="letter__subject">${inline(subject)}</h1>
<div class="letter__body">
<p>${inline(greeting)}</p>
${letter.paragraphs.map((paragraph) => `<p>${inline(paragraph)}</p>`).join('\n')}
<p class="letter__closing">${inline(closing)}</p>
<p class="letter__signature">${escapeHtml(meta.name)}</p>
</div>
</main>`,
  });
}

/**
 * Wraps the body of a document, like the interview brief, into a complete HTML page.
 * `title` is plain text. `styles` works as in `renderLetter`.
 */
export function wrapDocument({ lang, title, body, styles }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${styles.map((css) => `<style>\n${css.trim()}\n</style>`).join('\n')}
</head>
<body>
${body}
</body>
</html>
`;
}

function checkFrontmatter(frontmatter, required) {
  const missing = required.filter((key) => !frontmatter[key]);
  if (missing.length > 0) {
    throw new SyntaxError(`frontmatter: missing ${missing.join(', ')}`);
  }
  const unknown = Object.keys(frontmatter).filter((key) => !required.includes(key));
  if (unknown.length > 0) {
    throw new SyntaxError(`frontmatter: unknown ${unknown.join(', ')}. Allowed: ${required.join(', ')}`);
  }
}

// Links to site/ paths lead to the published site, as in the one-page CV.
function siteHref(homepage) {
  return (url) => (url.startsWith('site/') ? homepage + url.slice('site/'.length) : url);
}

// The town of a location such as "Fulda, Germany", for the date line.
function placeOf(location) {
  return inlineText(location).split(',')[0].trim();
}

function formatDate(date, lang) {
  return new Intl.DateTimeFormat(DATE_LOCALES[lang] ?? lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

// Shortens a URL to the address people read and type: no protocol, www or trailing slash.
function address(url) {
  return decodeURI(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
}
