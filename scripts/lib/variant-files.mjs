// Checks the code a variant brings, and strips the comments from its files that go online.
// see: DEVELOPMENT.md, "Templates"
//
// The build runs a variant's template.mjs in Node, and its page.js runs in every visitor's browser.
// An LLM writes both after reading job postings and company sites, so the build refuses code that
// reaches past its job: into Node, onto the network, or into code built from text.
//
// NOTE: this is a lint against mistakes, not a sandbox. A file written to get past it, e.g. with names in strings, gets through.
import { basename } from 'node:path';
import { Script } from 'node:vm';

// Names a script may not use in its code. Strings, template text and comments don't count.
const FORBIDDEN = {
  'template.mjs': {
    names: ['import', 'require', 'process', 'global', 'globalThis', 'fetch', 'WebSocket', 'EventSource', 'eval', 'Function', 'constructor', '__proto__'],
    reason: 'A template only composes the kit it gets, see DEVELOPMENT.md, "Templates".',
  },
  'page.js': {
    // The page's Content-Security-Policy already stops code built from text, so constructor stays allowed for classes.
    names: ['import', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'eval', 'Function'],
    reason: 'page.js only drives the page, which loads nothing from other sites.',
  },
};

// An export besides `export default`, like `export … from`, which loads a module without the word import.
const OTHER_EXPORT = /(?<![\w$.])export(?![\w$])(?!\s+default(?![\w$]))/;

// A url() or @import target with a scheme, like https: or data:, or one starting with // for another host.
const FOREIGN_CSS = /url\(\s*['"]?\s*(?:[a-z][a-z0-9+.-]*:|\/\/)|@import\s+['"]\s*(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

// Words after which a slash starts a regular expression, not a division.
const BEFORE_EXPRESSION = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/** Throws if a variant's template.mjs uses a name or an export it may not, naming its line. `file` is its path for the message. */
export function checkTemplate(file, source) {
  const code = codeOf(source);
  const otherExport = OTHER_EXPORT.exec(code);
  if (otherExport) {
    throw new Error(`${file} exports something besides its default function on line ${lineAt(source, otherExport.index)}. A template exports only its render function, and loads no other module.`);
  }
  refuseEscapes(file, source, code);
  refuseNames(file, source, code, FORBIDDEN['template.mjs']);
}

/**
 * Returns a variant's page.css, cv.css or page.js the way it goes online, without its comments.
 * Throws if a stylesheet loads a file from outside the site, if page.js uses a name it may not, or if page.js doesn't compile.
 */
export function publishedSource(file, source) {
  if (file.endsWith('.css')) {
    const stripped = stripComments(source, 'css');
    // The stripped text is what goes online, so it's checked as well.
    for (const [text, where] of [[source, ''], [stripped, ' once its comments are gone']]) {
      const foreign = FOREIGN_CSS.exec(blank(text, 'css', ['comment']));
      if (foreign) {
        throw new Error(`${file} loads a file from outside the site on line ${lineAt(text, foreign.index)}${where}. A variant's stylesheets load only files of the site.`);
      }
    }
    return stripped;
  }
  compile(file, source);
  const code = codeOf(source);
  refuseEscapes(file, source, code);
  refuseNames(file, source, code, FORBIDDEN[basename(file)]);
  const stripped = stripComments(source, 'js');
  compile(file, stripped, 'scripts/lib/variant-files.mjs broke it while stripping its comments. ');
  return stripped;
}

/**
 * Returns a stylesheet or a script without its comments, and everything else as written.
 * A line that held nothing but a comment goes with it.
 * `language` is 'css' or 'js'.
 */
export function stripComments(source, language) {
  let result = '';
  let lines = 0;
  // Lines of the result that held a comment.
  const touched = new Set();
  for (const token of tokenize(source, language)) {
    const text = source.slice(token.start, token.end);
    if (token.kind !== 'comment') {
      result += text;
      lines += newlines(text);
      continue;
    }
    touched.add(lines);
    // A comment keeps the tokens on its sides apart: return/**/x is return x, and 1px/**/2px two lengths.
    // In CSS only an empty comment does that, since whitespace would turn .a/**/.b into a descendant selector.
    const between = /\S/.test(result.at(-1) ?? '') && /\S/.test(source[token.end] ?? '');
    if (language === 'css' && between) {
      result += '/**/';
    } else if (text.includes('\n')) {
      // A comment across lines still ends its line, which can end a statement in a script.
      result += '\n';
      lines += 1;
      touched.add(lines);
    } else if (between) {
      result += ' ';
    }
  }
  return result
    .split('\n')
    .filter((line, index) => !touched.has(index) || line.trim() !== '')
    .join('\n');
}

// A script with its strings, regular expressions and comments blanked: the code the checks below read.
function codeOf(source) {
  return blank(source, 'js', ['comment', 'string', 'regex']);
}

function refuseNames(file, source, code, { names, reason }) {
  const match = new RegExp(`(?<![\\w$])(?:${names.join('|')})(?![\\w$])`).exec(code);
  if (match) throw new Error(`${file} uses ${match[0]} on line ${lineAt(source, match.index)}. ${reason}`);
}

// Outside strings, regular expressions and comments, a backslash can only start an escape in a name, like proc\u0065ss.
function refuseEscapes(file, source, code) {
  const escape = code.indexOf('\\');
  if (escape !== -1) {
    throw new Error(
      `${file} writes a name with an escape on line ${lineAt(source, escape)}, which hides the name from this check. A regular expression right after if (…) reads the same, so give it a variable of its own.`,
    );
  }
}

function compile(file, source, cause = '') {
  try {
    new Script(source, { filename: file });
  } catch (error) {
    throw new Error(`${file}: ${cause}${error.message}`);
  }
}

// The source with the tokens of `kinds` turned into spaces, so every other character keeps its offset and line.
function blank(source, language, kinds) {
  return tokenize(source, language)
    .map((token) => {
      const text = source.slice(token.start, token.end);
      return kinds.includes(token.kind) ? text.replace(/[^\n]/g, ' ') : text;
    })
    .join('');
}

// Splits a stylesheet or a script into tokens that cover it in order, each `{ kind, start, end }`:
// - code: everything else, including the ${} expressions inside a template literal
// - string: a quoted string, the text of a template literal, or an unquoted CSS url()
// - regex: a regular expression literal
// - comment: a comment with its delimiters
function tokenize(source, language) {
  const tokens = [];
  let codeStart = 0;
  let i = 0;
  const take = (kind, end) => {
    if (i > codeStart) tokens.push({ kind: 'code', start: codeStart, end: i });
    tokens.push({ kind, start: i, end });
    i = end;
    codeStart = end;
  };

  // For a script: the open template literals, innermost last, each with the braces open in its current ${} expression.
  const templates = [];
  let slashStartsRegex = true;
  // Takes a template literal's text from `i` up to its closing backtick or its next ${, scanning from `from`.
  const templateText = (from) => {
    const { end, closed } = templateTextEnd(source, from);
    take('string', end);
    if (closed) {
      templates.pop();
      slashStartsRegex = false;
    } else {
      // The ${ goes with the expression's code.
      i += 2;
      slashStartsRegex = true;
    }
  };

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];
    const regex = language === 'js' && char === '/' && slashStartsRegex ? regexEnd(source, i) : -1;
    if (char === '/' && next === '*') {
      take('comment', blockCommentEnd(source, i));
    } else if (char === '"' || char === "'") {
      take('string', quoteEnd(source, i));
      slashStartsRegex = false;
    } else if (language === 'css') {
      const url = unquotedUrlEnd(source, i);
      if (url) take('string', url);
      else i += 1;
    } else if (char === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', i);
      take('comment', lineEnd === -1 ? source.length : lineEnd);
    } else if (char === '`') {
      templates.push(0);
      templateText(i + 1);
    } else if (regex !== -1) {
      take('regex', regex);
      slashStartsRegex = false;
    } else if (/[\w$]/.test(char)) {
      let end = i;
      while (end < source.length && /[\w$]/.test(source[end])) end += 1;
      slashStartsRegex = BEFORE_EXPRESSION.has(source.slice(i, end));
      i = end;
    } else if (char === '}' && templates.at(-1) === 0) {
      i += 1;
      templateText(i);
    } else {
      if (char === '{' && templates.length > 0) templates[templates.length - 1] += 1;
      if (char === '}' && templates.length > 0) templates[templates.length - 1] -= 1;
      if (!/\s/.test(char)) slashStartsRegex = char !== ')' && char !== ']';
      i += 1;
    }
  }
  if (i > codeStart) tokens.push({ kind: 'code', start: codeStart, end: i });
  return tokens;
}

// Where the text of a template literal starting at `from` ends: after its closing backtick, or at a ${.
function templateTextEnd(source, from) {
  for (let j = from; j < source.length; j++) {
    if (source[j] === '\\') j += 1;
    else if (source[j] === '`') return { end: j + 1, closed: true };
    else if (source[j] === '$' && source[j + 1] === '{') return { end: j, closed: false };
  }
  return { end: source.length, closed: true };
}

function quoteEnd(source, from) {
  for (let j = from + 1; j < source.length; j++) {
    if (source[j] === '\\') j += 1;
    else if (source[j] === source[from]) return j + 1;
    else if (source[j] === '\n') return j;
  }
  return source.length;
}

function blockCommentEnd(source, from) {
  const end = source.indexOf('*/', from + 2);
  return end === -1 ? source.length : end + 2;
}

// Where a regular expression literal starting at `from` ends, after its flags, or -1 if the line ends first.
function regexEnd(source, from) {
  let inClass = false;
  for (let j = from + 1; j < source.length; j++) {
    const char = source[j];
    if (char === '\\') j += 1;
    else if (char === '\n') return -1;
    else if (inClass) inClass = char !== ']';
    else if (char === '[') inClass = true;
    else if (char === '/') {
      let end = j + 1;
      while (end < source.length && /[a-z]/i.test(source[end])) end += 1;
      return end;
    }
  }
  return -1;
}

// Where an unquoted url(…) starting at `from` ends, or 0 if none starts there.
// Its address may hold a /* that isn't a comment.
function unquotedUrlEnd(source, from) {
  if (source.slice(from, from + 4).toLowerCase() !== 'url(' || /[\w-]/.test(source[from - 1] ?? '')) return 0;
  const address = source.slice(from + 4).match(/^\s*([^'"\s)][^)]*)?\)/);
  return address && address[1] ? from + 4 + address[0].length : 0;
}

function lineAt(source, index) {
  return newlines(source.slice(0, index)) + 1;
}

function newlines(text) {
  let count = 0;
  for (const char of text) if (char === '\n') count += 1;
  return count;
}
