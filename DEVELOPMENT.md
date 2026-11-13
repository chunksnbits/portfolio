## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later. The project has no npm dependencies.
- [Google Chrome](https://www.google.com/chrome/) for `npm run check`. Set `CHROME_PATH` if Chrome is installed in a custom location.
- Optional (new screenshots): macOS with `brew install webp libavif`.
- Optional (new client logos): [Python](https://www.python.org/) 3 with `pip install picosvg skia-pathops`.
- Optional (tailored variants): [Claude Code](https://claude.com/claude-code) for `npm run tailor`, and Antigravity's CLI `agy`, signed in, for `node scripts/letter.mjs`.
- Optional (tailored variants): the private repository [chunksnbits/portfolio-variants](https://github.com/chunksnbits/portfolio-variants), cloned into `variants/`, see "Variants".

## Commands

| Command | Action |
| --- | --- |
| `npm start` | Build and serve at `http://127.0.0.1:4173/portfolio/`, rebuilding on file changes. |
| `npm run build` | Compile Markdown files and copy `site/` assets into `dist/`, with every variant. |
| `npm test` | Run unit tests for parser, model, parity, and renderer. |
| `npm run check` | Validate CV page counts, WCAG contrast and the Content-Security-Policy in headless Chrome. `-- --variant <slug>` checks only that variant. |
| `npm run check -- --shots <dir>` | Save screen captures and CV PDFs to directory. |
| `npm run tailor -- <job-url>` | Start Claude Code on `/tailor`: a new variant for one job posting. |
| `node scripts/variant.mjs list` | List the variants with their URLs. |
| `node scripts/variant.mjs show <slug>` | Print a variant's Markdown files with their changes applied to the base files. |
| `npm run docs [-- <slug-or-job-url>]` | Print the brief and cover letters to PDF and check their length and contrast. Without an argument, process every variant. |

## Updating content

1. Edit `portfolio.de.md` and `portfolio.md`. Keep both files in the same structure.
2. Carry career, intro, or skill changes over to `cv.de.md` and `cv.md`.
3. Run `npm start` and open `http://127.0.0.1:4173/portfolio/` (or `/portfolio/cv/` for the CV).
4. Check by hand that every desktop screen fits 1440×760, then run `npm run check` to verify CV page limits and WCAG 2.2 AA contrast.
5. Commit and push. GitHub Actions runs checks and deploys `main`.

**NOTE:** `npm run build` warns when the two languages drift in structure, but still builds every page.

**NOTE:** Restart `npm start` after modifying files in `scripts/`.

## Adding assets

### Screenshots

1. Place source images in `raw/`.
2. Add the file to `IMAGES` in `scripts/images.mjs` with target width and pixel density.
3. Run `node scripts/images.mjs` to generate WebP and AVIF files in `site/assets/img/`.
4. Reference the WebP copy in Markdown.
   E.g. `![Dashboard](site/assets/img/myzeiss-vision-desktop.webp)`.
5. For `"keyvisual ascii"`, add flash coordinates to `FLASH_AREAS` in `site/assets/main.js`.
6. Run `node scripts/check.mjs --og` to regenerate social preview images when the hero changes.

### Certification badges

1. Save the issuer SVG into `site/assets/badges/`.
2. Move colors into `fill` attributes and remove `id` attributes.
3. Assign class `badge__disc` to white backgrounds and `badge__ink` to dark text for theme styling.
4. Reference on its own line above the certificate entry in Markdown.
   E.g. `![](site/assets/badges/pspo-1.svg "badge")`.

### Client logos

1. Save source SVG into `raw/logos/`.
2. Add an entry to `LOGOS` in `scripts/logos.py` with cutout colors.
3. Run `python3 scripts/logos.py` to generate monochrome SVGs in `site/assets/logos/`.
4. Reference in Markdown.
   E.g. `![ZEISS](site/assets/logos/zeiss.svg "logo")`.

## Variants

A **variant** is a tailored copy of the portfolio for one job application: a page of its own, built from the company's page patterns in its visual language, with copy aimed at the posting.
Each variant goes online below its own folder name, next to the base site, e.g. `chunksnbits.github.io/portfolio/acme-k3q9x2/` and `…/acme-k3q9x2/en/`.
`node scripts/variant.mjs new` ends the folder name with 6 random characters, so nobody finds a new variant by trying company names. A variant from before keeps its plain name until its folder is renamed.
Variants stay out of search results.

The variants live in the private repository [chunksnbits/portfolio-variants](https://github.com/chunksnbits/portfolio-variants), so the public repository never shows which companies they are for.
Clone it into `variants/`, which this repository's git ignores:

```sh
git clone git@github.com:chunksnbits/portfolio-variants.git variants
cp scripts/pre-push "$(git rev-parse --git-common-dir)/hooks/pre-push"
```

The hook refuses any push whose commits touch `variants/`, from every worktree and branch of the clone.
The Pages workflow checks the private repository out with the read-only deploy key in the secret `VARIANTS_DEPLOY_KEY`. The built pages of every variant go online.
A push to any branch there starts the Pages workflow on `main` here, through the private repository's Deploy workflow and its token in the secret `PORTFOLIO_ACTIONS_TOKEN`. The deployment builds the private repository's `main` branch. Its `README.md` describes the token.

### Tailoring the portfolio to a job posting

1. Run `npm run tailor -- <job-url>`, or `/tailor <job-url>` in Claude Code.
   The skill in `.claude/skills/tailor/SKILL.md` researches the company, captures its page patterns and visual language, proposes a page built from them, has it reviewed by Claude and Gemini, implements it as the variant's template, tailors the copy, writes the interview brief and has Gemini draft the cover letters.
2. Restart `npm start` and open `http://127.0.0.1:4173/portfolio/<slug>/`. Every variant in the private repository goes online on the next deploy.
3. Edit the copy in `variants/<slug>/portfolio.de.md`, `portfolio.md`, `cv.de.md` and `cv.md`, and the letters in `variants/<slug>/private/cover-letter.de.md` and `.en.md`.
   The four Markdown files hold only what changes in the base files, see "Variant files".
4. Run `npm run docs -- <slug>` after editing a letter or the brief, and `npm run check -- --variant <slug>` after editing the copy.

### Publishing and taking down

1. Run `npm run check` to check the base site and every variant.
2. Commit and push changes to `main` in the private repository. Its Deploy workflow starts the Pages workflow here.
3. To take a variant down, remove its directory from the private repository and push the change.

Every push to either repository starts a deployment from both repositories' `main` branches. A push to another branch here first checks that branch.
If the Deploy workflow fails, e.g. on an expired token, start the deployment with `gh workflow run Pages --ref main -R chunksnbits/portfolio`.

**NOTE:** never commit `variants/` to this repository, which is public. The pre-push hook above refuses such a push.

**NOTE:** the logs of the Pages workflow are public while a run lasts. They show each variant's folder name, company, role and posting as `***`. Only a deploy uploads the build artifact, which holds the variants' pages. Once a run has finished, the Clean up workflow deletes its log and its artifact. Its jobs and steps stay visible, so rerun a failed step's command locally to see its output. After a failed deploy, rerun all jobs, since the deploy job alone finds no artifact any more. `gh workflow run "Clean up"` sweeps every finished run, e.g. the runs from before the workflow.

**NOTE:** CI checks every variant like the base site. A variant that fails `npm run check` stops the deploy of the whole site, so run `npm run check -- --variant <slug>` before pushing.

### Layout of a variant

```
variants/
  VOICE.md                ← how Daniel writes, for copy and letters
  <slug>/
    variant.json          ← company, role, posting URL, language, published, theme it opens in
    portfolio.de.md, portfolio.md, cv.de.md, cv.md   ← changes to the base files of the same name
    template.mjs          ← renders the body of the variant's portfolio pages, see "Templates"
    page.css              ← stylesheet of the variant's portfolio pages, in place of styles.css
    page.js               ← optional: behavior of the variant's own patterns, loaded after main.js
    cv.css                ← optional: loaded after cv.css on the variant's one-page CVs
    fonts/                ← self-hosted fonts of the page, with their licence
    img/                  ← images of the page, like its hero photo, as WebP and AVIF
    documents.css         ← colors of the cover letter and the brief
    private/              ← ignored by git, never published
      job.md              ← the posting's text
      brand/              ← captures and tokens from scripts/brand.mjs
      research.md         ← company research with sources
      design.md           ← design proposal, review findings and decisions
      review/             ← reviews and screenshots of each round
      brief.body.html     ← two-page interview brief, the body of a house-style page
      cover-letter.de.md, cover-letter.en.md          ← cover letters
      *.html, *.pdf       ← generated by npm run docs
```

Only the pages, `page.css`, `page.js` and `cv.css` without their comments, the woff2 fonts and `LICENSE*.txt` in `fonts/`, and the WebP and AVIF images in `img/` go online.
Any other file in `fonts/` or `img/` fails the build. `template.mjs` runs at build time, and everything else in a variant's folder stays local.

`variant.json` keys:

| Key | Description |
| --- | --- |
| `company`, `role` | Company and job title, as the posting names them. |
| `job` | URL of the posting. |
| `language` | Language of the posting: `de` or `en`. The cover letter and the first link to send lead with it. |
| `published` | Legacy setting. All variants go online regardless of its value. |
| `theme` | `dark` (default) or `light`: the theme its pages open in. |

### Variant files

A variant's `portfolio.de.md`, `portfolio.md`, `cv.de.md` and `cv.md` hold only what changes in the base file of the same name.
Everything they leave out comes from the base file, so a fix there reaches every variant.
Run `node scripts/variant.mjs show <slug>` to read a variant's files the way the build reads them, with the changes applied.

```md
---
title: Senior Software Engineer
---

## About {#about}

I engineer web and cloud systems that ==are built to last==.

### Pixel to cloud {#pixel-to-cloud}
The glue between clients, PMs, design and engineering.

## Skills {#skills}

### Frontend and mobile {#frontend}
`TypeScript` `React` `React Native` `Expo`

### Mobile {.remove}
```

- **Frontmatter**: a key the variant sets replaces the base's. `lang` stays as in the base file.
- **Headings**: a `##` heading finds the base section with the same id. A `###` heading finds the entry in that section with the same id, or else with the same title. A heading that finds nothing fails the build.
- **Content**: the content under a heading replaces the base content of the same kind and keeps the other kinds. The kinds are the meta line, the text with its `[show more]` marker, a bullet list, a numbered list, images and tags.
  E.g. new paragraphs under `## About {#about}` keep its list and its cards.
- **Empty heading**: changes nothing. Use it to reach the entries below it, or to place one in a `{.reorder}` section.
- **Renaming**: write the entry's id with the new title, e.g. `### Frontend and mobile {#frontend}`. Give the base entry the id first, in both languages.
- **Flags** in the heading's braces add, drop and sort:

| Flag | Effect |
| --- | --- |
| `{.remove}` | Drops the section or entry. Takes no content. |
| `{.new}` | Adds a section or entry after the heading above it in the variant file, or first. A new section keeps its entries as written. |
| `{.reorder}` | On a `##` section only. Its entries follow the order of the variant file, then the ones it leaves out, in base order. |

**NOTE:** a variant can't drop one kind of content and keep the rest, e.g. a project's screenshots.

### Templates

A variant's page is its own: `template.mjs` renders the body of both portfolio pages from the Markdown content, and `page.css` styles them in place of `styles.css`.
`node scripts/variant.mjs new` starts a variant with the plain page in `scripts/variant-starter/`. `/tailor` replaces it with one built from the company's patterns.

`template.mjs` exports a default function that takes the portfolio and a kit, and returns the HTML of the page's `<body>`:

```js
export default function render({ meta, sections }, kit) {
  return `<main id="main">${sections.map((section) => kit.blocks(section.blocks, { lead: true })).join('\n')}</main>`;
}
```

- **Portfolio**: `meta` is the frontmatter, `sections` the `##` sections with their `blocks` and `entries`, after the variant's changes.
- **Head**: the build writes it. It loads `page.css`, the fonts in `fonts/`, `main.js`, then `page.js`, keeps the page out of search results and opens it in the variant's theme.
  Its Content-Security-Policy lets the page load only files of the site, and run no inline script but the build's own, so a template writes no `<script>` and no `on…` attribute. `npm run check` fails a page whose policy blocks anything.
- **Kit**: the base page's renderers, bound to the page. They render content the way the base page does and fail the build on invalid content with the same errors.
- **Limits**: an LLM writes the template and `page.js` from pages it has read, so the build refuses names that reach past their job.
  A template exports only its default function, writes no escapes in names, and may not use `import`, `require`, `process`, `global`, `globalThis`, `fetch`, `WebSocket`, `EventSource`, `eval`, `Function`, `constructor` or `__proto__`. `page.js` may not use the network, `import`, `eval` or `Function`.
  The stylesheets load only files of the site. The check catches mistakes, not a file written to get past it, so read both files' changes before publishing.

| Kit member | Renders |
| --- | --- |
| `blocks(blocks, { lead })` | paragraphs, lists, tags, images, logos and badges; `lead` makes the first paragraph the lead |
| `entry(entry)`, `metaLine(meta)` | an entry as on the base page, a meta line with its period and details |
| `project(entry)` | splits a project into `keyvisual`, `visuals`, `text`, `rest` after the `[show more]` marker, and `tags` |
| `visual(block)` | a screenshot in its frame, or a numbered list as a flow |
| `picture(block, { className })` | an image without a frame, e.g. a keyvisual as a photo |
| `ascii(image, { avif })`, `path(image)` | the layer of an ASCII drawing, and the path a screen's `data-keyvisual` names. The image is a keyvisual block, or a file of the variant's folder, e.g. `'img/hero.webp'` |
| `inline(text)`, `text(text)` | inline Markdown as HTML, and as plain text for attributes |
| `print(className)`, `language()`, `themeToggle()` | "Save as PDF", the other language, the theme switch |
| `contactActions()`, `profile(url, name, icon)`, `icon(name)` | the contact buttons, a profile link, a Lucide icon |
| `ui` | the interface words of the page's language, from `UI` in `scripts/lib/render.mjs` |

`main.js` runs on a variant's page too. It finds its parts by these names:

- `.screen` with an `id`: a section that fills the window or less. The language switch returns to it, and `npm run check` saves a screenshot of each.
- `.nav__link` and `[data-nav]`: the link of the section in view gets `aria-current`.
- `[data-theme-toggle]`, `[data-print]`, `.language`: the theme switch, "Save as PDF" and the other language, as the kit renders them.
- `.keyvisual--ascii`: drawn as ASCII art. Inside a `.screen`, a layer is drawn while it is within half a window of the view and gets `is-shown`, so it can show without a fade. The screen's `data-keyvisual` makes `npm run check` wait for the drawing.
- `.more`, `.panel`, `.spotlight`: the base page's show-more button, sliding panels and cursor glow. Use other names for a variant's own parts.

`page.css` sets light tokens on `:root`, dark ones under `@media screen { :root:not([data-theme='light']) { … } }`, and white print under `@media print`.
`npm run check` audits text and the outlines of `.button`, `.language` and `.theme-toggle`, in both themes. Give every screen a `scroll-margin-top` as tall as a sticky header, so links and screenshots start below it.

**NOTE:** printing the page must fit two A4 pages. `details::details-content { content-visibility: visible; }` prints closed expandables open.

`cv.css` restyles the one-page CV through `cv.css`'s tokens (`--ink`, `--body`, `--muted`, `--accent`, `--rule`). The cover letter and the brief take their colors from the variant's `documents.css` instead.

### Cover letters and brief

Both are pages in Daniel's house style, the look of the `design-doc-html` skill: serif headings, sans text, mono labels, and numbered sections that open with their core findings.
`scripts/documents.css` holds the style, and the variant's `documents.css` sets its colors through the tokens named there.
`npm run docs -- <slug>` writes each document as a self-contained HTML page and a PDF beside its source, and fails when a text misses the WCAG 2.2 AA contrast minimum as printed.

**NOTE:** printed documents take their contrast from the primary color's own range. A blue primary pairs with navy and cyan, never with orange or red.

`private/cover-letter.<lang>.md` uses the Markdown subset with this frontmatter, and only paragraphs below it:

```md
---
lang: de
to: Acme GmbH + Recruiting + Hauptstraße 1 + 10115 Berlin
date: 2026-11-01
subject: Bewerbung als *Senior Software Engineer (w/m/d)*
greeting: Guten Tag,
closing: Viele Grüße
---
```

The part of the subject in `*asterisks*` gets the headline's emphasis.
The sender comes from the variant's `portfolio.<lang>.md`. `npm run docs` fails when a letter's text, from greeting to signature, takes more than half an A4 page.

`private/brief.body.html` is the body of a house-style page in the posting's language, and must print on at most two A4 pages, in two columns.
It uses the house components:

- `header.masthead` with a `p.eyebrow`, an `h1` with exactly one `em`, and a `p.intro`
- numbered `section`s with `.sec-head` and `.sec-body`, each opening with a `.sec-summary` of core findings
- `table` with `.ok`, `.meh` and `.bad` verdicts, `.callout` with `.warn` or `.kill`, and `ol.fixes`
- a last section that sums up what matters most

## Markdown format

### portfolio.md

Files use strict Markdown. Syntax errors fail the build with a line number.

Write a **separator** as a plus between spaces: `2021 – today + Munich`. Never start a line with a plus. Typed dots (`·`) and HTML entities fail the build.

Links and images lead to `https:`, `http:` and `mailto:` addresses, or to paths and `#ids` of the site. Any other scheme, like `javascript:` or `data:`, fails the build, and so does a control character.

#### Frontmatter

| Key | Description |
| --- | --- |
| `lang` | Language code: `de` or `en`. |
| `name` | Name displayed in rail and page title. |
| `title` | Job title displayed under name. |
| `subtitle` | Single line under job title. |
| `status` | Availability badge text above name. |
| `intro` | Three lines of introductory text in rail. |
| `location` | Location in rail and CV header. |
| `email`, `github`, `linkedin` | Contact links. Both language files must match. |
| `description` | Metadata description for SEO and link previews. |

#### Sections and entries

- `## Title {#id}` creates a section: one viewport screen and one nav item.
- `### Title` creates an entry inside a section. Project entries require an ID: `### MyZEISS {#myzeiss}`.
- `{.new}`, `{.remove}` and `{.reorder}` only work in a variant's files, see "Variant files".
- Section `#projects` converts child entries into sliding project screens.
- Section `#contact` renders contact links and PDF buttons.

#### Entry content

- First paragraph of a section is its **lead**. Use `==text==` to highlight words.
- First line starting with a year is the entry's **meta line**: `2021 – today + Munich + Lead developer`.
- Indent `- ` by two spaces to create sub-items rendered on a single line.
- A line of code spans creates **tags**: `` `React` `TypeScript` ``.
- Images stand on their own lines. The title attribute selects the display frame:
  - `none`: browser frame
  - `"phone"`: phone frame overlapping preceding browser frame
  - `"app"`: whole app screen in a current iPhone frame, side by side with the next one
  - `"plain"`: unbordered image
  - `"keyvisual"`: full-screen project background photo
  - `"keyvisual ascii"`: project background photo rendered as colored ASCII art
  - `"logo"`: monochrome client logo from `site/assets/logos/`
  - `"badge"`: certification badge SVG from `site/assets/badges/`
  - any other title: browser frame with that caption
- Numbered lists in projects render as flow diagrams: `1. **Device**: measures the sample`.
- `[show more]` on its own line truncates project body text behind an expandable toggle.
- `<!-- comments -->` are omitted from the build output.

### cv.md

One-page CVs share the Markdown parser with the portfolio.

- **Frontmatter**: Only `lang`. Name, title, and contact details inherit from `portfolio.md`.
- **Wording**: Mirror copy from portfolio files. Avoid rewriting text from scratch.
- **Columns**: Sections before `## Skills {#skills}` populate the main timeline column. Remaining sections populate the sidebar.
- **Timeline**: In the main column, meta lines format as timeline markers: `2021 – today + Munich`.
- **Page limit**: `npm run check` fails if the rendered CV exceeds one A4 page. Shorten text before adjusting layout.

## Project structure

```
portfolio.md, portfolio.de.md   ← content files
cv.md, cv.de.md                 ← one-page CV content
variants/                       ← clone of the private variants repository, ignored here, see "Variants"
.claude/skills/tailor/          ← the /tailor procedure for Claude Code
scripts/
  build.mjs                     ← compiles Markdown to dist/, base site and variants
  check.mjs                     ← checks CV pages and contrast in headless Chrome
  images.mjs                    ← raw/ → site/assets/img/
  logos.py                      ← raw/logos/ → site/assets/logos/
  serve.mjs                     ← local development server
  variant.mjs                   ← creates, lists and shows variants
  brand.mjs                     ← captures a company's visual language
  documents.mjs, documents.css  ← prints a variant's brief and cover letters
  letter.mjs, letter.prompt.md  ← drafts cover letters with Gemini through agy
  tailor.mjs                    ← starts Claude Code on /tailor
  pre-push                      ← git hook that refuses a push touching variants/, see "Variants"
  variant-starter/              ← the plain page a new variant starts with
  lib/
    markdown.mjs                ← Markdown parser
    portfolio.mjs               ← AST transforms for sections and meta lines
    parity.mjs                  ← German/English structural comparison
    render.mjs                  ← HTML generator
    variants.mjs                ← variant settings and paths
    overlay.mjs                 ← applies a variant's Markdown files to the base files
    variant-files.mjs           ← checks a variant's code, strips the comments from what goes online
    documents.mjs               ← cover letter model and house-style document pages
    contrast.mjs                ← WCAG contrast audit, run in the page
    chrome.mjs                  ← headless Chrome over the DevTools protocol
site/                           ← static assets copied to dist/
  assets/styles.css             ← screen, themes, and printed CV styles
  assets/cv.css                 ← one-page CV stylesheet
  assets/main.js                ← client interactions
  assets/logos/                 ← generated client SVGs
  docs/                         ← downloadable PDF documents
test/                           ← unit tests
```
