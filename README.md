  # Portfolio · Daniel Eissing

Static personal portfolio and one-page CV in English and German, built from Markdown without npm dependencies.

- German: [chunksnbits.github.io/portfolio/](https://chunksnbits.github.io/portfolio/) from `portfolio.de.md`
- English: [chunksnbits.github.io/portfolio/en/](https://chunksnbits.github.io/portfolio/en/) from `portfolio.md`
- German CV: [chunksnbits.github.io/portfolio/cv/](https://chunksnbits.github.io/portfolio/cv/) from `cv.de.md`
- English CV: [chunksnbits.github.io/portfolio/en/cv/](https://chunksnbits.github.io/portfolio/en/cv/) from `cv.md`

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later. The project has no npm dependencies.
- [Google Chrome](https://www.google.com/chrome/) for `npm run check`. Set `CHROME_PATH` if Chrome is installed in a custom location.
- Optional (new screenshots): macOS with `brew install webp libavif`.
- Optional (new client logos): [Python](https://www.python.org/) 3 with `pip install picosvg skia-pathops`.
- Optional (tailored variants): [Claude Code](https://claude.com/claude-code) for `npm run tailor`, and Antigravity's CLI `agy`, signed in, for `npm run letter`.

## Commands

| Command | Action |
| --- | --- |
| `npm start` | Build and serve at `http://127.0.0.1:4173/portfolio/`, rebuilding on file changes. Includes draft variants. |
| `npm run build` | Compile Markdown files and copy `site/` assets into `dist/`, with the published variants. |
| `npm test` | Run unit tests for parser, model, parity, and renderer. |
| `npm run check` | Validate CV page counts and WCAG contrast in headless Chrome. `-- --variant <slug>` checks only that variant, `-- --drafts` adds all. |
| `npm run check -- --shots <dir>` | Save screen captures and CV PDFs to directory. |
| `npm run images` | Generate WebP and AVIF assets from `raw/`. |
| `npm run logos` | Generate monochrome SVG logos from `raw/logos/`. |
| `npm run tailor -- <job-url>` | Start Claude Code on `/tailor`: a new variant for one job posting. |
| `npm run variant -- list` | List the variants, published or draft, with their URLs. |
| `npm run variant -- publish <slug>` | Mark a variant for the next deploy. `unpublish` takes it down. |
| `npm run docs -- <slug>` | Print a variant's brief and cover letters to PDF and check their length and contrast. |
| `npm run letter -- <slug>` | Draft a variant's cover letters with Gemini through `agy`. |
| `npm run brand -- <url>... --out <dir>` | Capture a company's fonts, colors and components from its pages. |

## Updating content

1. Edit `portfolio.de.md` and `portfolio.md`. Keep both files in the same structure.
2. Carry career, intro, or skill changes over to `cv.de.md` and `cv.md`.
3. Run `npm start` and open `http://127.0.0.1:4173/portfolio/` (or `/portfolio/cv/` for the CV).
4. Check by hand that every desktop screen fits 1440×760, then run `npm run check` to verify CV page limits and WCAG 2.2 AA contrast.
5. Commit and push. GitHub Actions runs checks and deploys `master`.

**NOTE:** `npm run build` warns when the two languages drift in structure, but still builds every page.

**NOTE:** Restart `npm start` after modifying files in `scripts/`.

## Adding assets

### Screenshots

1. Place source images in `raw/`.
2. Add the file to `IMAGES` in `scripts/images.mjs` with target width and pixel density.
3. Run `npm run images` to generate WebP and AVIF files in `site/assets/img/`.
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
3. Run `npm run logos` to generate monochrome SVGs in `site/assets/logos/`.
4. Reference in Markdown.
   E.g. `![ZEISS](site/assets/logos/zeiss.svg "logo")`.

## Variants

A **variant** is a tailored copy of the portfolio for one job application: the same pages in the company's visual language, with copy aimed at the posting.
Each variant goes online below its own folder name, next to the base site, e.g. `chunksnbits.github.io/portfolio/acme/` and `…/acme/en/`.
Variants stay out of search results.

### Tailoring the portfolio to a job posting

1. Run `npm run tailor -- <job-url>`, or `/tailor <job-url>` in Claude Code.
   The skill in `.claude/skills/tailor/SKILL.md` researches the company, captures its visual language, proposes a theme, has it reviewed by Claude and Gemini, implements it, tailors the copy, writes the interview brief and has Gemini draft the cover letters.
2. Restart `npm start` and open `http://127.0.0.1:4173/portfolio/<slug>/`. Drafts show in the preview, never online.
3. Edit the copy in `variants/<slug>/portfolio.de.md`, `portfolio.md`, `cv.de.md` and `cv.md`, and the letters in `variants/<slug>/private/cover-letter.de.md` and `.en.md`.
4. Run `npm run docs -- <slug>` after editing a letter or the brief, and `npm run check -- --variant <slug>` after editing the copy.

### Publishing and taking down

1. Run `npm run variant -- publish <slug>`.
2. Commit the variant's folder and push to `master`. The next deploy puts it online.
3. To take it down, run `npm run variant -- unpublish <slug>`, commit and push. Its URL then answers with the 404 page, and its files stay in `variants/<slug>/`.

**NOTE:** the repository is public. A committed variant shows which company it was made for, even before it is published.

**NOTE:** CI checks every published variant like the base site. A variant that fails `npm run check` stops the deploy of the whole site, so run `npm run check -- --variant <slug>` before publishing.

### Layout of a variant

```
variants/
  VOICE.md                ← how Daniel writes, for copy and letters
  <slug>/
    variant.json          ← company, role, posting URL, language, published, theme it opens in
    portfolio.de.md, portfolio.md, cv.de.md, cv.md   ← tailored copies of the base files
    theme.css             ← loaded after styles.css and cv.css on the variant's pages
    fonts/                ← self-hosted fonts of the theme, with their licence
    documents.css         ← colors of the cover letter and the brief
    private/              ← ignored by git, never published
      job.md              ← the posting's text
      brand/              ← captures and tokens from npm run brand
      research.md         ← company research with sources
      design.md           ← design proposal, review findings and decisions
      review/             ← reviews and screenshots of each round
      brief.body.html     ← two-page interview brief, the body of a house-style page
      cover-letter.de.md, cover-letter.en.md          ← cover letters
      *.html, *.pdf       ← generated by npm run docs
```

Only the pages, `theme.css` and `fonts/` go online. Everything else in a variant's folder stays local.

`variant.json` keys:

| Key | Description |
| --- | --- |
| `company`, `role` | Company and job title, as the posting names them. |
| `job` | URL of the posting. |
| `language` | Language of the posting: `de` or `en`. The cover letter and the first link to send lead with it. |
| `published` | `true` puts the variant online with the next deploy. |
| `theme` | `dark` (default) or `light`: the theme its pages open in. |

### Themes

`theme.css` restyles the base site through its custom properties and selectors.
Set light tokens on `:root`, dark ones under `@media screen { :root:not([data-theme='light']) { … } }`, and reset print to white under `@media print`.
The same file styles the one-page CV through `cv.css`'s tokens (`--ink`, `--body`, `--muted`, `--accent`, `--rule`). The cover letter and the brief take their colors from the variant's `documents.css` instead.
`--ascii-dim` and `--ascii-bright` tint the dots of ASCII keyvisuals in two colors instead of the photo's own.

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
variants/                       ← tailored copies per job application, see "Variants"
.claude/skills/tailor/          ← the /tailor procedure for Claude Code
scripts/
  build.mjs                     ← compiles Markdown to dist/, base site and variants
  check.mjs                     ← checks CV pages and contrast in headless Chrome
  images.mjs                    ← raw/ → site/assets/img/
  logos.py                      ← raw/logos/ → site/assets/logos/
  serve.mjs                     ← local development server
  variant.mjs                   ← creates, lists, publishes and unpublishes variants
  brand.mjs                     ← captures a company's visual language
  documents.mjs, documents.css  ← prints a variant's brief and cover letters
  letter.mjs, letter.prompt.md  ← drafts cover letters with Gemini through agy
  tailor.mjs                    ← starts Claude Code on /tailor
  lib/
    markdown.mjs                ← Markdown parser
    portfolio.mjs               ← AST transforms for sections and meta lines
    parity.mjs                  ← German/English structural comparison
    render.mjs                  ← HTML generator
    variants.mjs                ← variant settings and paths
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
