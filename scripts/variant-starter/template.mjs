// Page template of the COMPANY variant: renders the body of its portfolio pages from the Markdown content.
// see: DEVELOPMENT.md, "Templates"
//
// npm run variant -- new copies this starter. /tailor replaces it with a page built from the company's own patterns.
// The kit holds the base page's renderers, bound to this page. main.js still runs here and looks for:
// - .screen with an id: a section the language switch returns to and npm run check captures
// - .nav__link and [data-nav]: the nav link of the section in view gets aria-current
// - [data-theme-toggle], [data-print] and .language: the theme switch, "Save as PDF" and the other language
// - .keyvisual--ascii layers and .screen[data-keyvisual]: an ASCII drawing of a photo while it is near the window

export default function render({ meta, sections }, kit) {
  const nav = sections.map((section) => `<li><a class="nav__link" href="#${section.id}">${kit.inline(section.title)}</a></li>`);
  return `<a class="skip-link" href="#main">${kit.ui.skip}</a>
<header class="bar">
<a class="bar__name" href="#top">${kit.text(meta.name)}</a>
<nav aria-label="${kit.ui.sections}"><ul class="bar__nav">
${nav.join('\n')}
</ul></nav>
${kit.language()}
${kit.themeToggle()}
</header>
<main id="main">
<section class="screen hero" id="top">
<p class="status">${kit.inline(meta.status)}</p>
<h1>${kit.text(meta.name)}</h1>
<p class="hero__title">${kit.inline(meta.title)}</p>
<p>${kit.inline(meta.intro)}</p>
${kit.print('button')}
</section>
${sections.map((section) => (section.id === 'projects' ? projects(section, kit) : screen(section, kit))).join('\n')}
</main>`;
}

function screen(section, kit) {
  return `<section class="screen" id="${section.id}" data-nav>
<h2>${kit.inline(section.title)}</h2>
${kit.blocks(section.blocks, { lead: true })}
${section.id === 'contact' ? kit.contactActions() : ''}
${section.entries.map((entry) => kit.entry(entry)).join('\n')}
</section>`;
}

// One screen per project. The text after its [show more] marker opens in a native expandable.
function projects(section, kit) {
  const screens = section.entries.map((entry) => {
    const { keyvisual, visuals, text, rest, tags } = kit.project(entry);
    return `<section class="screen project" id="${entry.id}">
${keyvisual ? kit.picture(keyvisual, { className: 'project__photo' }) : ''}
<h3>${kit.inline(entry.title)}</h3>
${kit.metaLine(entry.meta)}
${kit.blocks(text)}
${rest.length > 0 ? `<details><summary>${kit.ui.showMore}</summary>\n${kit.blocks(rest)}\n</details>` : ''}
${kit.blocks(tags)}
${visuals.map((block) => kit.visual(block)).join('\n')}
</section>`;
  });
  return `<div id="${section.id}" data-nav>
<h2 class="visually-hidden">${kit.inline(section.title)}</h2>
${screens.join('\n')}
</div>`;
}
