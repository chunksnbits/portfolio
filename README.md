# Portfolio · Daniel Eissing

A single page per language, built from two plain Markdown files.

- German: https://chunksnbits.github.io/portfolio/ from `portfolio.de.md`
- English: https://chunksnbits.github.io/portfolio/en/ from `portfolio.md`

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later. The project has no npm dependencies.
- [Google Chrome](https://www.google.com/chrome/) for `npm run check`. Set `CHROME_PATH` if it lives elsewhere.
- Only for new screenshots: macOS plus `brew install webp libavif`.
- Only for new client logos: [Python](https://www.python.org/) 3 plus `pip install picosvg skia-pathops`.

## Updating the content

1. Edit `portfolio.de.md` and `portfolio.md`. Keep both in the same structure, see [Writing portfolio.md](#writing-portfoliomd).
2. Run `npm start` and open http://127.0.0.1:4173/portfolio/. Edits rebuild the page, reload the browser to see them.
3. Run `npm run check`. It fails if a screen outgrows 1440×760, the printed CV runs past two A4 pages, or a color falls below the [WCAG 2.2 AA contrast minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum) in either theme.
4. Commit and push. GitHub Actions runs the same checks and publishes `master`.

**NOTE:** `npm run build` warns when the two files drift apart, but still builds both pages. The warning names the lines in both files.

## Adding a screenshot

1. Put the original into `raw/`. The folder is not in git.
2. Add it to `IMAGES` in `scripts/images.mjs`, with the width and pixel density to publish.
3. Run `npm run images`. It writes WebP and AVIF copies plus `site/assets/img/manifest.json`.
4. Reference the WebP copy in both Markdown files, e.g. `![MyZEISS dashboard](site/assets/img/myzeiss-vision-desktop.webp)`.
5. If the top of the page changed, run `node scripts/check.mjs --og` to redraw the link preview images.

## Adding a client logo

1. Download the client's current logo as SVG into `raw/logos/`, ideally from the client's own website or press page.
2. Add it to `LOGOS` in `scripts/logos.py`, with its source and the colors to cut out.
3. Run `npm run logos`. It writes a one-color copy to `site/assets/logos/`: the colored parts become the logo, the knock-out colors become holes.
4. Reference it in both Markdown files, e.g. `![ZEISS](site/assets/logos/zeiss.svg "logo")`.

## Before the first release

- [ ] Add AURA screenshots, or keep the flow diagram that stands in for them.
- [ ] Rewrite the two MyZEISS paragraphs in your own words. A comment in both files marks them.
- [ ] Read the German copy once more.
- [ ] Ask Satellytes and Accenture Song, or the brands themselves, whether the logos under Brands may be shown, and check your contracts for confidentiality clauses. Lawyers advise written consent for logos even when the work is real.
- [ ] Switch the Pages source from the `gh-pages` branch to GitHub Actions: **Settings → Pages → Source → GitHub Actions**.
- [ ] Merge the branch into `master`.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Builds, serves `dist/` at `/portfolio/` like GitHub Pages, rebuilds on content changes |
| `npm run build` | Writes both pages and the files from `site/` into `dist/` |
| `npm test` | Runs the parser, model, parity and render tests |
| `npm run check` | Builds, then measures every screen, the printed CV and the color contrast in headless Chrome |
| `npm run check -- --shots <dir> [--theme light] [--mobile] [--scale 2]` | Also saves a screenshot per screen and the CVs as PDF |
| `npm run images` | Turns the originals in `raw/` into the published WebP and AVIF copies |

## Writing portfolio.md

The files use plain Markdown with a few position rules. Anything outside them fails the build with a line number.

### Frontmatter

| Key | Shown as |
| --- | --- |
| `lang` | `de` or `en` |
| `name` | Name in the rail and the page title |
| `title` | Job title under the name |
| `subtitle` | One line under the title |
| `status` | Badge above the name, e.g. "Open to senior roles" |
| `intro` | Three lines of text in the rail |
| `location` | Location in the rail and the CV header |
| `email`, `github`, `linkedin` | Contact links. Both files must use the same values. |
| `description` | Search engine and link preview text |

### Structure

- `## Title {#id}` opens a section: one screen, one entry in the nav.
- `### Title` opens an entry inside a section. Projects need an id: `### MyZEISS {#myzeiss}`.
- The section with the id `projects` turns each entry into its own sliding screen.
- The section with the id `contact` also gets the email, LinkedIn, GitHub and PDF buttons.

### Inside a section or an entry

- The first paragraph of a section is its **lead**, set large. `==text==` highlights words in it.
- A first line that starts with a year is the entry's **meta line**: `2021 – today · Munich · Lead developer`. Its first part is the period.
- A line of code spans becomes **tags**: `` `React` `TypeScript` ``.
- Images stand on their own lines and point into `site/`. The title picks the frame:
  - none: browser frame
  - `"phone"`: phone frame, overlapping a browser frame before it
  - `"plain"`: no frame
  - `"keyvisual"`: no frame. In a project, the image fills the window behind its screen, see [Keyvisuals](#how-it-works). Projects of one customer can share it.
  - `"logo"`: a one-color SVG from `site/assets/logos/`, drawn in the logo grey of the theme. Consecutive logos form a grid, see [Logos](#how-it-works).
  - any other text: browser frame with that caption
- A numbered list in a project becomes a flow diagram. `1. **Device**: measures the sample` gives each step a title.
- `<!-- comments -->` never reach the page.

## How it works

```
portfolio.md, portfolio.de.md   ← the content
scripts/
  build.mjs                     ← Markdown → dist/index.html and dist/en/index.html
  check.mjs                     ← screen budget and CV page count in headless Chrome
  images.mjs                    ← raw/ → site/assets/img/
  logos.py                      ← raw/logos/ → site/assets/logos/, in one color
  serve.mjs                     ← local preview
  lib/
    markdown.mjs                ← the strict Markdown subset
    portfolio.mjs               ← sections, entries, meta lines
    parity.mjs                  ← compares the German and English structure
    render.mjs                  ← HTML, plus the interface words in both languages
site/                           ← copied into dist/ as is
  assets/styles.css             ← screen, both themes and the printed CV
  assets/main.js                ← theme switch, spotlight, nav, slide-in, keyvisuals
  assets/logos/                 ← client logos, inlined into the pages instead
  docs/                         ← papers, at the paths the 2019 site used
test/                           ← node --test
```

- **Screens.** Every section is at least one window tall. Content must fit 1440×760: a 13" MacBook Air at its default resolution, minus the menu bar, Chrome's toolbars and the Dock.
- **Slide-in.** Project panels slide in from the right edge as you scroll, tied to the scroll position. Once a panel has arrived, it stays in place when you scroll back up. Browsers with CSS scroll-driven animations run it in CSS, others in `main.js`. With "reduce motion" the panels stay in place.
- **Keyvisuals.** When a project screen reaches the middle of the window, its customer's photo fades in behind the page, from blurred to sharp. It spans the full width but stays within the projects, so it never sits behind other sections. Behind the rail it is dimmed until the rail's text and buttons keep their contrast over any photo. With "reduce motion" it fades without blur or zoom.
- **Logos.** Client logos are inlined, so they take the logo grey of the theme, and their holes show the page behind them. The build scales every logo to fit the same box, as in a logo wall: a round crest fills its height, a wide wordmark its width.
- **Hover.** Tiles rise one step under the mouse: a lighter surface and edge in the dark theme, a soft shadow in the light theme. They don't move, since they aren't links.
- **Spotlight.** A soft glow follows the mouse, modeled on [brittanychiang.com](https://brittanychiang.com/). Touch screens don't show it.
- **Themes.** The page follows the system theme until the visitor picks one with the switch. Text reaches 4.5:1 against its background, large text and the outlines of buttons 3:1.
- **Printed CV.** "Save as PDF" prints the page as a white A4 CV of up to two pages, without screenshots. The brands print as their logos only.

## Background

- The design follows the "Kinetic Slate" design system from a [Google Stitch](https://stitch.withgoogle.com/) export: dark from its first variant, light from its second.
- Fonts are self-hosted, so the page makes no requests to Google: [Inter](https://rsms.me/inter/), [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), all under the SIL Open Font License, files from [Fontsource](https://fontsource.org/). The licenses sit next to the fonts in `site/assets/fonts/`.
- Icons are from [Lucide](https://lucide.dev/) (ISC license), inlined by `scripts/lib/render.mjs`.
- The 2019 version of this site, built with VuePress, lives in the git history up to tag `v0.8.0`.
