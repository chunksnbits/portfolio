import { escapeHtml, inlineText, lineError, linkRel, renderInline } from './markdown.mjs';
import { PROJECTS } from './portfolio.mjs';

// Section that also gets the email, LinkedIn, GitHub and PDF buttons.
const CONTACT = 'contact';

// Image titles that pick a frame. Any other title is a caption under a browser frame.
const FRAMES = ['phone', 'plain'];

// Image title that turns a project's image into the backdrop of its screen.
const KEYVISUAL = 'keyvisual';

// Keyvisual that main.js draws onto a canvas as colored ASCII art, instead of showing the photo.
const ASCII_KEYVISUAL = 'keyvisual ascii';

// Image title that inlines a one-color SVG from site/assets/logos/, drawn in the logo grey of the theme.
const LOGO = 'logo';

// Box every logo is scaled to fit, as in a logo wall: compact logos fill its height, wide ones its width.
const LOGO_BOX = { width: 168, height: 76 };

// Image title that inlines a colored SVG from site/assets/badges/.
// Its fixed colors stay, the parts with a class take the theme's colors from styles.css.
const BADGE = 'badge';

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
    showMore: 'Mehr anzeigen',
    cv: 'Lebenslauf',
    contact: 'Kontakt',
    portfolio: 'Portfolio',
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
    showMore: 'Show more',
    cv: 'CV',
    contact: 'Contact',
    portfolio: 'Portfolio',
  },
};

// Applies a theme picked on an earlier visit before the first paint, so the page doesn't flash.
const THEME_BOOT =
  "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

// Wires the CV's print button, since the CV page loads no main.js.
const PRINT_BUTTON = "document.querySelector('[data-print]').addEventListener('click',function(){print()})";

// The CV's sidebar holds the contact details, then this section and every section after it.
const CV_SIDEBAR_START = 'skills';

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
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
};

const FONTS = ['inter', 'plus-jakarta-sans', 'jetbrains-mono'];

/**
 * Renders one language version of the portfolio as a complete HTML page.
 *
 * `base` leads from the page back to the site root ('' for the root page, '../' for en/).
 * `path`, `cvPath` and `alternate.path` place this page, its one-page CV and the other language below `homepage`.
 * `images` is the manifest from scripts/images.mjs, keyed by published path.
 * `logos` and `badges` hold the SVG source of each logo and badge, keyed by published path, since the page inlines them.
 */
export function renderPage(portfolio, { base, homepage, path, cvPath, alternate, images, logos = {}, badges = {}, ogImage = null }) {
  const { meta, sections } = portfolio;
  const ui = interfaceWords(meta.lang);
  const context = { meta, ui, base, homepage, path, cvPath, alternate, images, logos, badges, ogImage };

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

/**
 * Renders one language version of the one-page CV as a complete HTML page.
 *
 * `meta` is the frontmatter of the portfolio in the same language, which supplies the header and contact details.
 * `path`, `portfolioPath` and `alternate.path` place this CV, its portfolio and the other language's CV below `homepage`.
 * Links to `site/` paths lead to the published site, so a saved PDF links there wherever it was printed.
 */
export function renderCv(cv, { meta, base, homepage, path, portfolioPath, alternate, images = {}, logos = {}, badges = {} }) {
  if (cv.meta.lang !== meta.lang) {
    throw new Error(`frontmatter: the CV is in "${cv.meta.lang}", its portfolio in "${meta.lang}"`);
  }
  const ui = interfaceWords(meta.lang);
  const context = { meta, ui, base, linkBase: homepage, homepage, path, portfolioPath, alternate, images, logos, badges };
  const start = cv.sections.findIndex((section) => section.id === CV_SIDEBAR_START);
  const main = start === -1 ? cv.sections : cv.sections.slice(0, start);
  const sidebar = start === -1 ? [] : cv.sections.slice(start);

  return `<!doctype html>
<html lang="${meta.lang}">
<head>
${renderCvHead(context)}
</head>
<body>
<nav class="toolbar">
<a class="toolbar__link" href="${base}${portfolioPath}">${icon('arrowLeft')}${ui.portfolio}</a>
${languageLink('toolbar__link', `${base}${alternate.path}`, alternate.lang)}
<button class="button" type="button" data-print>${icon('download')}${ui.print}</button>
</nav>
<main class="sheet">
<header class="cv-header">
<h1 class="cv-header__name">${escapeHtml(meta.name)}</h1>
<p class="cv-header__title">${inline(meta.title, context)}</p>
<p class="cv-header__subtitle">${inline(meta.subtitle, context)}</p>
</header>
<div class="cv-main">
${main.map((section) => renderCvSection(section, context)).join('\n')}
</div>
<aside class="cv-aside">
${renderCvContact(context)}
${sidebar.map((section) => renderCvSection(section, context)).join('\n')}
</aside>
</main>
<script>${PRINT_BUTTON}</script>
</body>
</html>
`;
}

function interfaceWords(lang) {
  const ui = UI[lang];
  if (!ui) {
    throw new Error(`frontmatter: lang "${lang}" has no interface words, add them to UI in render.mjs`);
  }
  return ui;
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
    '<meta name="referrer" content="no-referrer">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    ...languageLinks(meta.lang, url, alternate.lang, alternateUrl),
    '<meta property="og:type" content="profile">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${ui.locale}">`,
    ogImage ? `<meta property="og:image" content="${ogImage}">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
    '<meta name="color-scheme" content="dark">',
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">`,
    ...fontPreloads(base),
    `<link rel="stylesheet" href="${base}assets/styles.css">`,
    `<script>${THEME_BOOT}</script>`,
    `<script src="${base}assets/main.js" defer></script>`,
    `<script type="application/ld+json">${JSON.stringify(person).replaceAll('<', '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderCvHead({ meta, ui, base, homepage, path, alternate }) {
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="referrer" content="no-referrer">',
    `<title>${escapeHtml(`${inlineText(meta.name)} · ${ui.cv}`)}</title>`,
    `<meta name="description" content="${escapeHtml(inlineText(meta.description))}">`,
    ...languageLinks(meta.lang, homepage + path, alternate.lang, homepage + alternate.path),
    '<meta name="color-scheme" content="dark">',
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">`,
    ...fontPreloads(base),
    `<link rel="stylesheet" href="${base}assets/cv.css">`,
    `<script>${THEME_BOOT}</script>`,
  ].join('\n');
}

function languageLinks(lang, url, alternateLang, alternateUrl) {
  return [
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="${lang}" href="${url}">`,
    `<link rel="alternate" hreflang="${alternateLang}" href="${alternateUrl}">`,
    `<link rel="alternate" hreflang="x-default" href="${lang === 'en' ? url : alternateUrl}">`,
  ];
}

function fontPreloads(base) {
  return FONTS.map((font) => `<link rel="preload" href="${base}assets/fonts/${font}.woff2" as="font" type="font/woff2" crossorigin>`);
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
${printLink('button button--small', context)}
${languageLink('language', `${base}${alternate.path}`, alternate.lang)}
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

function renderCvSection(section, context) {
  return [
    `<section class="cv-section cv-section--${section.id}" id="${section.id}">`,
    `<h2 class="cv-section__title">${inline(section.title, context)}</h2>`,
    renderBlocks(section.blocks, context, { lead: true }),
    ...section.entries.map((entry) => renderEntry(entry, context)),
    '</section>',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderCvContact(context) {
  const { meta, ui, homepage, portfolioPath } = context;
  return `<section class="cv-section cv-section--contact">
<h2 class="cv-section__title">${ui.contact}</h2>
<ul class="contact-list">
<li>${icon('pin')}<span>${inline(meta.location, context)}</span></li>
<li><a href="mailto:${escapeHtml(meta.email)}">${icon('mail')}<span>${escapeHtml(meta.email)}</span></a></li>
<li>${addressLink(meta.linkedin, 'linkedin')}</li>
<li>${addressLink(meta.github, 'github')}</li>
<li>${addressLink(homepage + portfolioPath, 'globe')}</li>
</ul>
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
    const marked = text.some((block) => block.type === 'more');
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
${marked ? renderShowMore(entry, text, context) : renderBlocks(text, context)}
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

// Splits a project's text at its [show more] marker, so main.js can hide the rest behind a button.
// The tags stay below the button, always in view.
function renderShowMore(entry, blocks, context) {
  const copy = blocks.filter((block) => block.type !== 'tags');
  const [marker, second] = copy.filter((block) => block.type === 'more');
  if (second) {
    throw lineError(second.line, `"${entry.title}" already has a [show more] marker on line ${marker.line}`);
  }
  const at = copy.indexOf(marker);
  if (at === 0 || at === copy.length - 1) {
    throw lineError(marker.line, 'a [show more] marker needs text before and after it');
  }
  const id = `${entry.id}-rest`;

  return `${renderBlocks(copy.slice(0, at), context)}
<div class="panel__rest" id="${id}">
${renderBlocks(copy.slice(at + 1), context)}
</div>
<button class="more" type="button" aria-expanded="false" aria-controls="${id}">${context.ui.showMore}</button>
${renderBlocks(blocks.filter((block) => block.type === 'tags'), context)}`;
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
    ? `<span class="meta__separator" aria-hidden="true">&nbsp;+ </span><span class="meta__details">${inline(meta.details, context)}</span>`
    : '';
  return `<p class="meta"><span class="meta__period">${inline(meta.period, context)}</span>${details}</p>`;
}

function renderBlocks(blocks, context, { lead = false } = {}) {
  let leadPending = lead;
  return groupLogos(blocks)
    .map((block) => {
      switch (block.type) {
        case 'paragraph': {
          const className = leadPending ? ' class="lead"' : '';
          leadPending = false;
          return `<p${className}>${inline(block.text, context)}</p>`;
        }
        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul';
          const items = block.items.map((item) => `<li>${inline(item.text, context)}${renderSublist(item.items, context)}</li>`).join('');
          return `<${tag} class="list">${items}</${tag}>`;
        }
        case 'tags':
          return `<ul class="tags" aria-label="${context.ui.tags}">${block.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`;
        case 'image':
          return renderFigure(block, context);
        // Safari stops announcing a list that has no bullets. The role restores it, so screen readers still count the logos.
        case 'logos':
          return `<ul class="logos" role="list">\n${block.logos.map((logo) => `<li>${renderLogo(logo, context)}</li>`).join('\n')}\n</ul>`;
        case 'more':
          throw lineError(block.line, 'a [show more] marker belongs under a ### project in the projects section');
        default:
          throw lineError(block.line, `${block.type} is not supported here`);
      }
    })
    .join('\n');
}

// `.sublist li + li::before` in styles.css draws the separator.
// Whitespace between the items would let a line break right before it.
function renderSublist(items, context) {
  if (items.length === 0) return '';
  return `<ul class="sublist">${items.map((item) => `<li>${inline(item, context)}</li>`).join('')}</ul>`;
}

// Images and numbered lists form the visual column of a project panel.
function isVisual(block) {
  return (block.type === 'image' && !isKeyvisual(block) && !isLogo(block)) || (block.type === 'list' && block.ordered);
}

function isKeyvisual(block) {
  return block.type === 'image' && (block.title === KEYVISUAL || block.title === ASCII_KEYVISUAL);
}

function isLogo(block) {
  return block.type === 'image' && block.title === LOGO;
}

// Consecutive logos become one list, which styles.css lays out as a grid.
function groupLogos(blocks) {
  const grouped = [];
  for (const block of blocks) {
    const previous = grouped.at(-1);
    if (!isLogo(block)) grouped.push(block);
    else if (previous?.type === 'logos') previous.logos.push(block);
    else grouped.push({ type: 'logos', logos: [block], line: block.line });
  }
  return grouped;
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
    if (!keyvisual) continue;
    const file = publishedPath(keyvisual.src, keyvisual.line);
    const first = files.get(file);
    if (first && first.title !== keyvisual.title) {
      throw lineError(keyvisual.line, `${keyvisual.src} is a "${first.title}" on line ${first.line}, give both the same title`);
    }
    files.set(file, first ?? keyvisual);
  }
  if (files.size === 0) return '';

  const layers = [...files.values()].map((keyvisual) => {
    const { file, image } = processedImage(keyvisual, context);
    const avif = image.avif ? `<source type="image/avif" srcset="${context.base}${image.avif}">` : '';
    const img = `<img src="${context.base}${file}" alt="" loading="lazy" decoding="async" fetchpriority="low">`;
    // The image stays in the page as the canvas's source, so it loads as lazily as a photo would.
    return keyvisual.title === ASCII_KEYVISUAL
      ? `<div class="keyvisual keyvisual--ascii" data-keyvisual="${file}"><picture>${avif}${img}</picture><canvas></canvas></div>`
      : `<picture class="keyvisual" data-keyvisual="${file}">${avif}${img}</picture>`;
  });
  return `<div class="keyvisuals" aria-hidden="true">\n${layers.join('\n')}\n</div>`;
}

function renderVisual(block, context) {
  if (block.type === 'image') {
    return renderFigure(block, context);
  }
  const steps = block.items.map((item) => {
    // "**Title**: description" puts the title on its own line, without the colon.
    const titled = item.text.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    const content = titled
      ? `<strong>${inline(titled[1], context)}</strong><span>${inline(titled[2], context)}</span>`
      : inline(item.text, context);
    return `<li class="flow__step">${content}</li>`;
  });
  return `<ol class="flow">\n${steps.join('\n')}\n</ol>`;
}

function renderFigure(block, context) {
  if (isKeyvisual(block)) {
    throw lineError(block.line, 'a keyvisual belongs under a ### project in the projects section');
  }
  if (block.title === BADGE) {
    return renderBadge(block, context);
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

// Inlines the logo, so it takes the theme's logo grey through currentColor.
function renderLogo(block, context) {
  const { viewBox, shapes } = readSvg(block, context.logos);
  const color = shapes.match(/\s(fill|stroke|style)=|<(style|image|linearGradient|radialGradient)\b/);
  if (color) {
    throw lineError(
      block.line,
      `${block.src} sets its own ${color[1] ?? `<${color[2]}>`}. Logos take the theme's grey, so draw them in one color without fill, stroke or style.`,
    );
  }
  const { width, height } = logoSize(viewBox);
  return `<svg class="logo" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(inlineText(block.alt))}">\n${shapes}\n</svg>`;
}

// Inlines the badge. Without alt text it only repeats the text beside it, so screen readers skip it.
function renderBadge(block, context) {
  const { viewBox, shapes } = readSvg(block, context.badges);
  const label = inlineText(block.alt);
  const name = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg class="badge" viewBox="${viewBox}" ${name}>\n${shapes}\n</svg>`;
}

// Returns the viewBox and the shapes of an inlined SVG, without its comments.
function readSvg(block, sources) {
  const source = sources[publishedPath(block.src, block.line)];
  if (source === undefined) {
    throw lineError(block.line, `${block.src} does not exist`);
  }
  const svg = source.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/);
  const viewBox = svg?.[1].match(/\bviewBox="([^"]+)"/)?.[1];
  if (!viewBox) {
    throw lineError(block.line, `${block.src} needs an <svg> element with a viewBox`);
  }
  return { viewBox, shapes: svg[2].replace(/<!--[\s\S]*?-->/g, '').trim() };
}

function logoSize(viewBox) {
  const [, , width, height] = viewBox.trim().split(/[\s,]+/).map(Number);
  const scale = Math.min(LOGO_BOX.width / width, LOGO_BOX.height / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function renderActions(context) {
  const { meta, ui } = context;
  return `<div class="actions">
<a class="button button--primary" href="mailto:${escapeHtml(meta.email)}">${icon('mail')}${ui.writeEmail}</a>
<a class="button" href="${escapeHtml(meta.linkedin)}"${linkRel(meta.linkedin)}>${icon('linkedin')}LinkedIn</a>
<a class="button" href="${escapeHtml(meta.github)}"${linkRel(meta.github)}>${icon('github')}GitHub</a>
${printLink('button', context)}
</div>`;
}

// "Save as PDF" leads to the one-page CV, which main.js prints in place where it can.
function printLink(className, { ui, base, cvPath }) {
  return `<a class="${className}" href="${base}${cvPath}" data-print>${icon('download')}${ui.print}</a>`;
}

// On screen the link shows the network's name, in print its address.
function profileLink(url, name, iconName) {
  return `<a href="${escapeHtml(url)}"${linkRel(url)}>${icon(iconName)}<span class="screen-only">${name}</span><span class="print-only">${escapeHtml(address(url))}</span></a>`;
}

function addressLink(url, iconName) {
  return `<a href="${escapeHtml(url)}"${linkRel(url)}>${icon(iconName)}<span>${escapeHtml(address(url))}</span></a>`;
}

// Shortens a URL to the address people read and type: no protocol, www or trailing slash.
function address(url) {
  return decodeURI(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
}

function languageLink(className, href, lang) {
  return `<a class="${className}" href="${href}" hreflang="${lang}" lang="${lang}"><span aria-hidden="true">${lang.toUpperCase()}</span><span class="visually-hidden">${UI[lang].language}</span></a>`;
}

function eyebrow(index, title, context) {
  return `<span class="eyebrow__number" aria-hidden="true">${number(index)} //</span> ${inline(title, context)}`;
}

function inline(text, { base, linkBase = base }) {
  return renderInline(text, { href: (url) => (url.startsWith('site/') ? linkBase + url.slice('site/'.length) : url) });
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
