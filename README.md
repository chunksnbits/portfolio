# Portfolio · Daniel Eissing

A single page per language, built from two plain Markdown files, plus a one-page CV per language from two more.

- German: https://chunksnbits.github.io/portfolio/ from `portfolio.de.md`
- English: https://chunksnbits.github.io/portfolio/en/ from `portfolio.md`
- German CV: https://chunksnbits.github.io/portfolio/cv/ from `cv.de.md`
- English CV: https://chunksnbits.github.io/portfolio/en/cv/ from `cv.md`

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later. The project has no npm dependencies.
- [Google Chrome](https://www.google.com/chrome/) for `npm run check`. Set `CHROME_PATH` if it lives elsewhere.
- Only for new screenshots: macOS plus `brew install webp libavif`.
- Only for new client logos: [Python](https://www.python.org/) 3 plus `pip install picosvg skia-pathops`.

## Updating the content

1. Edit `portfolio.de.md` and `portfolio.md`. Keep both in the same structure, see [Writing portfolio.md](#writing-portfoliomd).
2. If the change touches a career stop, the intro or a skill, carry it over to `cv.de.md` and `cv.md`, see [Writing cv.md](#writing-cvmd).
3. Run `npm start` and open http://127.0.0.1:4173/portfolio/, or `/portfolio/cv/` for the one-page CV. Edits rebuild the pages, reload the browser to see them.
4. Run `npm run check`. It fails if a screen outgrows 1440×760, the printed CV runs past two A4 pages, the one-page CV past one, or a color falls below the [WCAG 2.2 AA contrast minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum) in either theme.
5. Commit and push. GitHub Actions runs the same checks and publishes `master`.

**NOTE:** `npm run build` warns when the two languages drift apart, for the portfolio and for the CV, but still builds every page. The warning names the lines in both files.

**NOTE:** restart `npm start` after changing `scripts/`. Until then it rebuilds with the old code.

## Adding a screenshot

1. Put the original into `raw/`. The folder is not in git.
2. Add it to `IMAGES` in `scripts/images.mjs`, with the width and pixel density to publish.
3. Run `npm run images`. It writes WebP and AVIF copies plus `site/assets/img/manifest.json`.
4. Reference the WebP copy in both Markdown files, e.g. `![MyZEISS dashboard](site/assets/img/myzeiss-vision-desktop.webp)`.
5. For a new `"keyvisual ascii"`, add the area its flashes go off in to `FLASH_AREAS` in `site/assets/main.js`. Without an entry it gets no flashes.
6. If the top of the page changed, run `node scripts/check.mjs --og` to redraw the link preview images.

## Adding a certification badge

1. Download the issuer's SVG into `site/assets/badges/`, e.g. Scrum.org's from `https://static.scrum.org/web/badges/`.
2. Move its colors into `fill` attributes, and drop its ids, so they can't clash with the page.
3. For the dark theme, give its white disc the class `badge__disc` and the dark text on it `badge__ink`. `styles.css` colors both per theme. See `site/assets/badges/pspo-1.svg`.
4. Reference it in both Markdown files on its own line above the certificate, e.g. `![](site/assets/badges/pspo-1.svg "badge")`.

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
| `npm run check` | Builds, then measures every screen, both CVs and the color contrast in headless Chrome |
| `npm run check -- --shots <dir> [--theme light] [--mobile] [--scale 2]` | Also saves a screenshot per screen, plus the printed CV and the one-page CV as PDF |
| `npm run images` | Turns the originals in `raw/` into the published WebP and AVIF copies |

## Writing portfolio.md

The files use plain Markdown with a few position rules. Anything outside them fails the build with a line number.

Write a **separator** as a plus between spaces, e.g. `2021 – today + Munich`. On the page, the plus never starts a line. A typed `·` fails the build. So does any HTML entity.

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
- A first line that starts with a year is the entry's **meta line**: `2021 – today + Munich + Lead developer`. Its first part is the period.
- Indent `- ` by two spaces to give a list item **sub-items**. The page shows them on one line, joined by a plus that never starts a line.
- A line of code spans becomes **tags**: `` `React` `TypeScript` ``.
- Images stand on their own lines and point into `site/`. The title picks the frame:
  - none: browser frame
  - `"phone"`: phone frame, overlapping a browser frame before it
  - `"plain"`: no frame
  - `"keyvisual"`: no frame. In a project, the image fills the window behind its screen, see [Keyvisuals](#how-it-works). Projects of one customer can share it.
  - `"keyvisual ascii"`: a keyvisual drawn as colored ASCII art, see [ASCII keyvisuals](#how-it-works). Projects that share the image must all use this title.
  - `"logo"`: a one-color SVG from `site/assets/logos/`, drawn in the logo grey of the theme. Consecutive logos form a grid, see [Logos](#how-it-works).
  - `"badge"`: a colored SVG from `site/assets/badges/`, inlined. Without alt text, screen readers skip it, since the text beside it names the certificate. See [Adding a certification badge](#adding-a-certification-badge).
  - any other text: browser frame with that caption
- A numbered list in a project becomes a flow diagram. `1. **Device**: measures the sample` gives each step a title.
- `[show more]` on its own line in a project hides the text after it behind a "Show more" link. It needs text before and after it, once per project. Without it, the project shows its whole text. See [Show more](#how-it-works).
- `<!-- comments -->` never reach the page.

## Writing cv.md

The one-page CV uses the same Markdown as the portfolio, see [Writing portfolio.md](#writing-portfoliomd).

- **Frontmatter.** Only `lang`. The name, title, subtitle and contact details come from the frontmatter of the portfolio in the same language.
- **Wording.** Take it from the portfolio files, don't write it from scratch. When a text changes there, change it here too.
- **Columns.** The sections before `## Skills {#skills}` fill the main column. That section and every section after it go into the sidebar, below the contact details.
- **Timeline.** In the main column, an entry's meta line becomes its place on the timeline: `2021 – today + Munich` puts the period left of the entry and the place under its title.
- **Length.** `npm run check` fails when either CV prints on more than one A4 page. Shorten copy before shrinking type.

## How it works

```
portfolio.md, portfolio.de.md   ← the content
cv.md, cv.de.md                 ← the one-page CV, worded like the content
scripts/
  build.mjs                     ← Markdown → dist/index.html, dist/en/index.html and their cv/index.html
  check.mjs                     ← screen budget and CV page counts in headless Chrome
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
  assets/cv.css                 ← the one-page CV, on screen and in print
  assets/main.js                ← theme switch, CV printing, spotlight, nav, slide-in, keyvisuals
  assets/logos/                 ← client logos, inlined into the pages instead
  docs/                         ← papers, at the paths the 2019 site used
test/                           ← node --test
```

- **Screens.** Every section is at least one window tall. Content must fit 1440×760: a 13" MacBook Air at its default resolution, minus the menu bar, Chrome's toolbars and the Dock.
- **Slide-in.** Project panels slide in from the right edge as you scroll, tied to the scroll position. Once a panel has arrived, it stays in place when you scroll back up. Browsers with CSS scroll-driven animations run it in CSS, others in `main.js`. With "reduce motion" the panels stay in place.
- **Keyvisuals.** When a project screen reaches the middle of the window, its customer's photo fades in behind the page, from blurred to sharp. It spans the full width but stays within the projects, so it never sits behind other sections. Behind the rail it is dimmed until the rail's text and buttons keep their contrast over any photo. With "reduce motion" it fades without blur or zoom.
- **ASCII keyvisuals.** A `"keyvisual ascii"` draws its photo on a canvas as colored dots, after [Storm Plains on ascii.rest](https://ascii.rest/storm-plains/). Bright parts of the photo get large dots. In the light theme the dots are ink, so dark parts get them. Flashes go off every second or so while the keyvisual is shown, whether the page scrolls or not: cameras in the stands of the FC Bayern and ADAC photos, glints on the store lamps of MediaMarkt and on the ZEISS microscope. Each burst also brightens the whole picture, so it shows while a panel covers the flashes. `FLASH_AREAS` in `site/assets/main.js` sets where each photo's flashes go off. With "reduce motion" the dots stay still. A hidden keyvisual frees its canvas, so only the one on screen holds a full-window bitmap.
- **Logos.** Client logos are inlined, so they take the logo grey of the theme, and their holes show the page behind them. The build scales every logo to fit the same box, as in a logo wall: a round crest fills its height, a wide wordmark its width.
- **Hover.** Tiles rise one step under the mouse: a lighter surface and edge in the dark theme, a soft shadow in the light theme. They don't move, since they aren't links.
- **Show more.** A project with a `[show more]` marker shows its text up to the marker, then a "Show more" link, then its tags. The last lines above the link fade out, and the link sits on the last one. The link opens the rest for good and goes away. When the pointer enters the panel, the link lights up in warm lamp light, a glint sweeps through its letters, and it returns to its own color. This repeats every 5 seconds while the pointer stays. With "reduce motion" the link lights up once, without the glint. The printed CV shows the whole text. `npm run check` measures the screens with the rest hidden.
- **Highlights.** A `==highlight==` lights up like the "Show more" link when the pointer enters its screen, every 5 seconds while it stays. The amber marker glows and the glint sweeps across it, behind the letters. The letters stay dark, so they keep their contrast on the amber.
- **Spotlight.** A soft glow follows the mouse, modeled on [brittanychiang.com](https://brittanychiang.com/). Touch screens don't show it.
- **Themes.** The page follows the system theme until the visitor picks one with the switch. Text reaches 4.5:1 against its background, large text and the outlines of buttons 3:1.
- **Printed CV.** Printing the page itself, e.g. with Cmd+P, gives a white A4 CV of up to two pages, without screenshots. The brands print as their logos only.
- **One-page CV.** A page of its own per language, below the portfolio page in `cv/`, laid out like the 2019 CV: the career on a timeline in the main column, contact details and skills in a sidebar. On screen it shows as an A4 sheet with its own "Save as PDF" button. The sheet stays white in both themes. Links in its text lead to the published site, so a saved PDF links there wherever it was printed. The page loads `cv.css` only, no `main.js`.
- **Save as PDF.** On the portfolio, both "Save as PDF" buttons link to the one-page CV. With a mouse, `main.js` loads the CV into a hidden frame and prints it, so the visitor stays on the page. Touch screens and browsers without JavaScript open the CV page instead, since some mobile browsers print the page around a frame.
- **Links.** Links to other sites carry `rel="noopener noreferrer"`. The page also sets the referrer policy `no-referrer`. No other site learns that a visitor came from here.

## Background

- The design follows the "Kinetic Slate" design system from a [Google Stitch](https://stitch.withgoogle.com/) export: dark from its first variant, light from its second.
- Fonts are self-hosted, so the page makes no requests to Google: [Inter](https://rsms.me/inter/), [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), all under the SIL Open Font License, files from [Fontsource](https://fontsource.org/). The licenses sit next to the fonts in `site/assets/fonts/`.
- Icons are from [Lucide](https://lucide.dev/) (ISC license), inlined by `scripts/lib/render.mjs`.
- The ASCII keyvisual takes its dot ramp, dither and color curve from [Storm Plains](https://ascii.rest/storm-plains/) on [ascii.rest](https://ascii.rest/) by [bas3line](https://github.com/bas3line) (MIT license).
- The 2019 version of this site, built with VuePress, lives in the git history up to tag `v0.8.0`.
