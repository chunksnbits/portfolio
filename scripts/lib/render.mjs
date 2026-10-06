import { escapeHtml, inlineText, lineError, renderInline } from './markdown.mjs';
import { PROJECTS } from './portfolio.mjs';

// Section that also gets the email, LinkedIn, GitHub and PDF buttons.
const CONTACT = 'contact';

// Image titles that pick a frame. Any other title is a caption under a browser frame.
const FRAMES = ['phone', 'plain'];

// Image title that turns a project's image into the backdrop of its screen.
const KEYVISUAL = 'keyvisual';

// Tallest frame, as height over width. A taller capture scrolls inside the frame on hover.
const MAX_FRAME_RATIO = { browser: 1.15, phone: 1.78 };

// Hover-scroll speed: seconds per frame width the capture travels.
const SCROLL_SECONDS_PER_WIDTH = 2.4;

// Words of the page itself, as opposed to the content in portfolio.md.
const UI = {
  de: {
    locale: 'de_DE',
    language: 'Deutsch',
    skip: 'Zum Inhalt springen',
    sections: 'Abschnitte',
    print: 'Als PDF speichern',
    darkTheme: 'Dunkles Design',
    writeEmail: 'E-Mail schreiben',
    tags: 'Technologien',
  },
  en: {
    locale: 'en_US',
    language: 'English',
    skip: 'Skip to content',
    sections: 'Sections',
    print: 'Save as PDF',
    darkTheme: 'Dark theme',
    writeEmail: 'Write an email',
    tags: 'Technologies',
  },
};

// Applies a theme picked on an earlier visit before the first paint, so the page doesn't flash.
const THEME_BOOT =
  "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

// Outline icons from Lucide (ISC license), drawn with currentColor.
const ICONS = {
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  linkedin:
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  github:
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  download:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};

const FONTS = ['inter', 'plus-jakarta-sans', 'jetbrains-mono'];

/**
 * Renders one language version of the portfolio as a complete HTML page.
 *
 * `base` leads from the page back to the site root ('' for the root page, '../' for en/).
 * `path` and `alternate.path` place this page and the other language below `homepage`.
 * `images` is the manifest from scripts/images.mjs, keyed by published path.
 */
export function renderPage(portfolio, { base, homepage, path, alternate, images, ogImage = null }) {
  const { meta, sections } = portfolio;
  const ui = UI[meta.lang];
  if (!ui) {
    throw new Error(`frontmatter: lang "${meta.lang}" has no interface words, add them to UI in render.mjs`);
  }
  const context = { meta, ui, base, homepage, path, alternate, images, ogImage };

  return `<!doctype html>
<html lang="${meta.lang}">
<head>
${renderHead(context)}
</head>
<body>
<a class="skip-link" href="#main">${ui.skip}</a>
<div class="spotlight" aria-hidden="true"></div>
<div class="layout">
${renderRail(sections, context)}
<main class="content" id="main">
${sections.map((section, index) => renderSection(section, index, context)).join('\n')}
</main>
</div>
</body>
</html>
`;
}

function renderHead({ meta, ui, base, homepage, path, alternate, ogImage }) {
  const url = homepage + path;
  const alternateUrl = homepage + alternate.path;
  const title = escapeHtml(`${inlineText(meta.name)} · ${inlineText(meta.title)}`);
  const description = escapeHtml(inlineText(meta.description));
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: meta.name,
    jobTitle: inlineText(meta.title),
    url,
    sameAs: [meta.github, meta.linkedin],
  };

  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="${meta.lang}" href="${url}">`,
    `<link rel="alternate" hreflang="${alternate.lang}" href="${alternateUrl}">`,
    `<link rel="alternate" hreflang="x-default" href="${meta.lang === 'en' ? url : alternateUrl}">`,
    '<meta property="og:type" content="profile">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${ui.locale}">`,
    ogImage ? `<meta property="og:image" content="${ogImage}">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
    '<meta name="color-scheme" content="dark light">',
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">`,
    ...FONTS.map(
      (font) => `<link rel="preload" href="${base}assets/fonts/${font}.woff2" as="font" type="font/woff2" crossorigin>`,
    ),
    `<link rel="stylesheet" href="${base}assets/styles.css">`,
    `<script>${THEME_BOOT}</script>`,
    `<script src="${base}assets/main.js" defer></script>`,
    `<script type="application/ld+json">${JSON.stringify(person).replaceAll('<', '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderRail(sections, context) {
  const { meta, ui, base, alternate } = context;
  const nav = sections
    .map(
      (section, index) =>
        `<li><a class="nav__link" href="#${section.id}"><span class="nav__number">${number(index)}</span><span class="nav__label">${inline(section.title, context)}</span></a></li>`,
    )
    .join('\n');

  return `<header class="rail">
<div class="rail__intro">
<p class="status"><span class="status__dot" aria-hidden="true"></span>${inline(meta.status, context)}</p>
<h1 class="rail__name">${escapeHtml(meta.name)}</h1>
<p class="rail__title">${inline(meta.title, context)}</p>
<p class="rail__subtitle">${inline(meta.subtitle, context)}</p>
<p class="rail__text">${inline(meta.intro, context)}</p>
<nav class="nav" aria-label="${ui.sections}">
<ol class="nav__list">
${nav}
</ol>
</nav>
</div>
<div class="rail__footer">
<ul class="contact-list">
<li>${icon('pin')}<span>${inline(meta.location, context)}</span></li>
<li><a href="mailto:${escapeHtml(meta.email)}">${icon('mail')}<span>${escapeHtml(meta.email)}</span></a></li>
<li>${profileLink(meta.linkedin, 'LinkedIn', 'linkedin')}</li>
<li>${profileLink(meta.github, 'GitHub', 'github')}</li>
</ul>
<div class="switches">
<button class="button button--small" type="button" data-print>${icon('download')}${ui.print}</button>
<a class="language" href="${base}${alternate.path}" hreflang="${alternate.lang}" lang="${alternate.lang}"><span aria-hidden="true">${alternate.lang.toUpperCase()}</span><span class="visually-hidden">${UI[alternate.lang].language}</span></a>
<button class="theme-toggle" type="button" aria-pressed="false" aria-label="${ui.darkTheme}" data-theme-toggle>${icon('sun')}${icon('moon')}</button>
</div>
</div>
</header>`;
}

function renderSection(section, index, context) {
  if (section.id === PROJECTS) {
    return renderProjects(section, index, context);
  }
  const titleId = `${section.id}-title`;
  const entries = section.entries.map((entry) => renderEntry(entry, context)).join('\n');

  return `<section class="screen screen--${section.id}" id="${section.id}" aria-labelledby="${titleId}" data-nav>
<div class="screen__inner">
<h2 class="eyebrow" id="${titleId}">${eyebrow(index, section.title, context)}</h2>
${renderBlocks(section.blocks, context, { lead: true })}
${section.id === CONTACT ? renderActions(context) : ''}
${entries ? `<div class="entries">\n${entries}\n</div>` : ''}
</div>
</section>`;
}

function renderProjects(section, index, context) {
  if (section.blocks.length > 0) {
    throw lineError(section.blocks[0].line, `the ${PROJECTS} section takes only ### projects`);
  }
  const titleId = `${section.id}-title`;
  const total = section.entries.length;
  const projects = section.entries.map((entry, position) => {
    const visuals = entry.blocks.filter(isVisual);
    const text = entry.blocks.filter((block) => !isVisual(block) && !isKeyvisual(block));
    const keyvisual = keyvisualOf(entry);
    const keyvisualAttribute = keyvisual ? ` data-keyvisual="${publishedPath(keyvisual.src, keyvisual.line)}"` : '';
    const projectTitleId = `${entry.id}-title`;

    return `<section class="screen screen--project" id="${entry.id}" aria-labelledby="${projectTitleId}"${keyvisualAttribute}>
<div class="screen__inner">
<article class="panel${visuals.length > 0 ? '' : ' panel--text'}">
<p class="eyebrow panel__eyebrow" aria-hidden="true"><span>${eyebrow(index, section.title, context)}</span><span class="panel__counter">${position + 1} / ${total}</span></p>
<header class="panel__header">
<h3 class="panel__title" id="${projectTitleId}">${inline(entry.title, context)}</h3>
${renderMeta(entry.meta, context)}
</header>
<div class="panel__body">
${visuals.length > 0 ? `<div class="panel__visual">\n${visuals.map((block) => renderVisual(block, context)).join('\n')}\n</div>` : ''}
<div class="panel__text">
${renderBlocks(text, context)}
</div>
</div>
</article>
</div>
</section>`;
  });

  return `<section class="projects" id="${section.id}" aria-labelledby="${titleId}" data-nav>
<h2 class="visually-hidden" id="${titleId}">${inline(section.title, context)}</h2>
${renderKeyvisuals(section.entries, context)}
${projects.join('\n')}
</section>`;
}

function renderEntry(entry, context) {
  return `<article class="entry"${entry.id ? ` id="${entry.id}"` : ''}>
<h3 class="entry__title">${inline(entry.title, context)}</h3>
${renderMeta(entry.meta, context)}
${renderBlocks(entry.blocks, context)}
</article>`;
}

function renderMeta(meta, context) {
  if (!meta) return '';
  const details = meta.details
    ? `<span class="meta__separator" aria-hidden="true"> · </span><span class="meta__details">${inline(meta.details, context)}</span>`
    : '';
  return `<p class="meta"><span class="meta__period">${inline(meta.period, context)}</span>${details}</p>`;
}

function renderBlocks(blocks, context, { lead = false } = {}) {
  let leadPending = lead;
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph': {
          const className = leadPending ? ' class="lead"' : '';
          leadPending = false;
          return `<p${className}>${inline(block.text, context)}</p>`;
        }
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          const items = block.items.map((item) => `<li>${inline(item, context)}</li>`).join('');
          return `<${tag} class="list">${items}</${tag}>`;
        }
        case 'tags':
          return `<ul class="tags" aria-label="${context.ui.tags}">${block.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`;
        case 'image':
          return renderFigure(block, context);
        default:
          throw lineError(block.line, `${block.type} is not supported here`);
      }
    })
    .join('\n');
}

// Images and numbered lists form the visual column of a project panel.
function isVisual(block) {
  return (block.type === 'image' && !isKeyvisual(block)) || (block.type === 'list' && block.ordered);
}

function isKeyvisual(block) {
  return block.type === 'image' && block.title === KEYVISUAL;
}

function keyvisualOf(entry) {
  const [keyvisual = null, second] = entry.blocks.filter(isKeyvisual);
  if (second) {
    throw lineError(second.line, `"${entry.title}" already has a keyvisual on line ${keyvisual.line}`);
  }
  return keyvisual;
}

// One layer per distinct keyvisual, which styles.css spreads across the window behind the projects.
// Projects of the same customer share an image, and main.js shows the layer of the screen being read.
function renderKeyvisuals(entries, context) {
  const files = new Map();
  for (const entry of entries) {
    const keyvisual = keyvisualOf(entry);
    if (keyvisual) files.set(publishedPath(keyvisual.src, keyvisual.line), keyvisual);
  }
  if (files.size === 0) return '';

  const layers = [...files.values()].map((keyvisual) => {
    const { file, image } = processedImage(keyvisual, context);
    const avif = image.avif ? `<source type="image/avif" srcset="${context.base}${image.avif}">` : '';
    return `<picture class="keyvisual" data-keyvisual="${file}">${avif}<img src="${context.base}${file}" alt="" loading="lazy" decoding="async" fetchpriority="low"></picture>`;
  });
  return `<div class="keyvisuals" aria-hidden="true">\n${layers.join('\n')}\n</div>`;
}

function renderVisual(block, context) {
  if (block.type === 'image') {
    return renderFigure(block, context);
  }
  const steps = block.items.map((item) => {
    // "**Title**: description" puts the title on its own line, without the colon.
    const titled = item.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    const content = titled
      ? `<strong>${inline(titled[1], context)}</strong><span>${inline(titled[2], context)}</span>`
      : inline(item, context);
    return `<li class="flow__step">${content}</li>`;
  });
  return `<ol class="flow">\n${steps.join('\n')}\n</ol>`;
}

function renderFigure(block, context) {
  if (isKeyvisual(block)) {
    throw lineError(block.line, 'a keyvisual belongs under a ### project in the projects section');
  }
  const { file, image } = processedImage(block, context);

  const frame = FRAMES.includes(block.title) ? block.title : 'browser';
  const caption = frame === 'browser' ? block.title : null;
  const width = Math.round(image.width / image.density);
  const height = Math.round(image.height / image.density);
  const ratio = height / width;
  const style = [`--natural-width: ${width}px`];
  let scrolls = false;

  if (frame !== 'plain') {
    const frameRatio = Math.min(ratio, MAX_FRAME_RATIO[frame]);
    style.push(`--frame-ratio: ${round(frameRatio)}`);
    scrolls = ratio > frameRatio;
    if (scrolls) {
      style.push(`--scroll-duration: ${round((ratio - frameRatio) * SCROLL_SECONDS_PER_WIDTH)}s`);
    }
  }

  const picture = `<picture>${image.avif ? `<source type="image/avif" srcset="${context.base}${image.avif}">` : ''}<img src="${context.base}${file}" width="${width}" height="${height}" alt="${escapeHtml(inlineText(block.alt))}" loading="lazy" decoding="async"></picture>`;
  const bar = frame === 'browser' ? '<div class="frame__bar" aria-hidden="true"><span></span><span></span><span></span></div>' : '';

  return `<figure class="frame frame--${frame}${scrolls ? ' frame--scrolls' : ''}" style="${style.join('; ')}">
${bar}<div class="frame__viewport">${picture}</div>${caption ? `<figcaption class="frame__caption">${inline(caption, context)}</figcaption>` : ''}
</figure>`;
}

function renderActions({ meta, ui }) {
  return `<div class="actions">
<a class="button button--primary" href="mailto:${escapeHtml(meta.email)}">${icon('mail')}${ui.writeEmail}</a>
<a class="button" href="${escapeHtml(meta.linkedin)}">${icon('linkedin')}LinkedIn</a>
<a class="button" href="${escapeHtml(meta.github)}">${icon('github')}GitHub</a>
<button class="button" type="button" data-print>${icon('download')}${ui.print}</button>
</div>`;
}

// On screen the link shows the network's name, in print its address.
function profileLink(url, name, iconName) {
  const address = decodeURI(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
  return `<a href="${escapeHtml(url)}">${icon(iconName)}<span class="screen-only">${name}</span><span class="print-only">${escapeHtml(address)}</span></a>`;
}

function eyebrow(index, title, context) {
  return `<span class="eyebrow__number" aria-hidden="true">${number(index)} //</span> ${inline(title, context)}`;
}

function inline(text, { base }) {
  return renderInline(text, { href: (url) => (url.startsWith('site/') ? base + url.slice('site/'.length) : url) });
}

function processedImage(block, context) {
  const file = publishedPath(block.src, block.line);
  const image = context.images[file];
  if (!image) {
    throw lineError(block.line, `${block.src} has no processed copy, run "npm run images"`);
  }
  return { file, image };
}

function publishedPath(src, line) {
  if (!src.startsWith('site/')) {
    throw lineError(line, `${src} must point into site/, e.g. site/assets/img/name.webp`);
  }
  return src.slice('site/'.length);
}

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

function number(index) {
  return String(index + 1).padStart(2, '0');
}

function round(value) {
  return Math.round(value * 100) / 100;
}
