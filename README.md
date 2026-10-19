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

## Commands

| Command | Action |
| --- | --- |
| `npm start` | Build and serve at `http://127.0.0.1:4173/portfolio/`, rebuilding on file changes. |
| `npm run build` | Compile Markdown files and copy `site/` assets into `dist/`. |
| `npm test` | Run unit tests for parser, model, parity, and renderer. |
| `npm run check` | Validate screen budget, CV page counts, and WCAG contrast in headless Chrome. |
| `npm run check -- --shots <dir>` | Save screen captures and CV PDFs to directory. |
| `npm run images` | Generate WebP and AVIF assets from `raw/`. |
| `npm run logos` | Generate monochrome SVG logos from `raw/logos/`. |

## Updating content

1. Edit `portfolio.de.md` and `portfolio.md`. Keep both files in the same structure.
2. Carry career, intro, or skill changes over to `cv.de.md` and `cv.md`.
3. Run `npm start` and open `http://127.0.0.1:4173/portfolio/` (or `/portfolio/cv/` for the CV).
4. Run `npm run check` to verify screen budgets, CV page limits, and WCAG 2.2 AA contrast.
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
scripts/
  build.mjs                     ← compiles Markdown to dist/
  check.mjs                     ← measures screen budgets and CV pages in headless Chrome
  images.mjs                    ← raw/ → site/assets/img/
  logos.py                      ← raw/logos/ → site/assets/logos/
  serve.mjs                     ← local development server
  lib/
    markdown.mjs                ← Markdown parser
    portfolio.mjs               ← AST transforms for sections and meta lines
    parity.mjs                  ← German/English structural comparison
    render.mjs                  ← HTML generator
site/                           ← static assets copied to dist/
  assets/styles.css             ← screen, themes, and printed CV styles
  assets/cv.css                 ← one-page CV stylesheet
  assets/main.js                ← client interactions
  assets/logos/                 ← generated client SVGs
  docs/                         ← downloadable PDF documents
test/                           ← unit tests
```
