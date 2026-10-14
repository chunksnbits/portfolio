# Turns the client logos in raw/logos/ into the one-color SVGs in site/assets/logos/.
# Run it after adding or replacing a logo: npm run logos.
# It needs Python 3 plus picosvg and skia-pathops (pip install picosvg skia-pathops).
# The build reads only its output, so CI never runs it.
#
# Each logo becomes a single path that the page fills with the logo grey of its theme.
# The shapes are replayed in paint order: a colored shape adds ink, a knock-out shape cuts a hole.
# So the white letters on the blue ZEISS box become holes that show the tile behind the logo.
#
# NOTE: raw/ is not in git. The originals live in Daniel's job-search folder.

import re
from pathlib import Path

import pathops
from picosvg.svg import SVG
from picosvg.svg_pathops import skia_path, svg_commands
from picosvg.svg_types import SVGPath

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw" / "logos"
OUT = ROOT / "site" / "assets" / "logos"

# - name: published file name, without extension
# - source: file in raw/logos/
# - url: where the source was downloaded
# - retrieved: when, as YYYY-MM-DD
# - knockout: the colors that become holes, "light" for white and near-white or "dark" for black and near-black
LOGOS = [
    {
        "name": "zeiss",
        "source": "zeiss.svg",
        "url": "https://www.zeiss.com/etc.clientlibs/zeiss-aem-app/jupiter/clientlibs/jupiter-components.app/resources/assets/icons/symbols/zeiss-logo.svg",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    {
        "name": "adac",
        "source": "adac.svg",
        "url": "https://www.adac.de/, the logo in its footer",
        "retrieved": "2026-10-12",
        "knockout": "dark",
    },
    {
        "name": "fcbayern",
        "source": "fcbayern.svg",
        "url": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-00000G.svg",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    # MediaMarkt above Saturn. The red and black blocks of the group logo would merge in one color.
    {
        "name": "mediamarktsaturn",
        "source": "mediamarktsaturn-stacked.svg",
        "url": "https://www.ceconomy-mms.com/logos/mediaMarkt/Mediamarkt.svg above https://www.ceconomy-mms.com/logos/saturn/Saturn.svg",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    {
        "name": "bmw",
        "source": "bmw.svg",
        "url": "https://www.bmw.de/content/dam/bmw/common/images/logo-icons/BMW/BMW_Grey-Colour_RGB.svg.asset.1756199978277.svg",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    {
        "name": "allianz",
        "source": "allianz.svg",
        "url": "https://www.allianz.com/content/dam/onemarketing/system/allianz-logo.svg",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    {
        "name": "audi",
        "source": "audi.svg",
        "url": "https://static.audi.com/assets/images/frontend/rings18-2GJCA2FU.svg",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    {
        "name": "telefonica",
        "source": "telefonica.svg",
        "url": "https://www.telefonica.com/en/wp-content/themes/telefonica-theme/img/svg/symbol/sprite.svg, symbol isotype-text",
        "retrieved": "2026-10-12",
        "knockout": "light",
    },
    # SINNER above SCHRADER with "Part of Accenture Interactive", as on its social media profiles around 2019.
    # No stacked file is public, so raw/logos/sinnerschrader-stacked.svg arranges the letters of the two Commons files.
    {
        "name": "sinnerschrader",
        "source": "sinnerschrader-stacked.svg",
        "url": "https://commons.wikimedia.org/wiki/File:SinnerSchrader_Logo_2022.svg and https://commons.wikimedia.org/wiki/File:SinnerSchrader_Logo_2017.svg",
        "retrieved": "2026-10-13",
        "knockout": "light",
    },
]

# Output units for the height of the logo itself. Coordinates are rounded to whole units.
HEIGHT = 1000


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for logo in LOGOS:
        path, holes = flatten(RAW / logo["source"], logo["knockout"])
        svg = render(path, logo, holes)
        (OUT / f"{logo['name']}.svg").write_text(svg)
        print(f"site/assets/logos/{logo['name']}.svg  {len(svg)} bytes")


# Unites the ink shapes and subtracts the knock-out shapes, in paint order.
def flatten(source, knockout):
    picture = SVG.fromstring(simplify(source.read_text())).topicosvg(allow_text=False)
    tree = picture.toetree()
    result = pathops.Path()
    holes = 0
    for shape in picture.shapes():
        if not shape.fill or shape.fill == "none" or shape.opacity * shape.fill_opacity == 0:
            continue
        color = gradient_color(tree, shape.fill) if shape.fill.startswith("url(") else parse_color(shape.fill)
        cut = is_knockout(color, knockout)
        holes += cut
        operation = pathops.PathOp.DIFFERENCE if cut else pathops.PathOp.UNION
        result = pathops.op(result, skia_path(shape.as_cmd_seq(), shape.fill_rule), operation)
    return result, holes


# Writes the logo as SVG, moved to the origin and scaled to HEIGHT.
def render(path, logo, holes):
    left, top, right, bottom = path.bounds
    scale = HEIGHT / (bottom - top)
    placed = pathops.Path(fillType=path.fillType)
    path.draw(MovingPen(placed.getPen(), scale, -left * scale, -top * scale))
    width = round((right - left) * scale)

    d = SVGPath.from_commands(svg_commands(placed)).round_floats(0).d
    d = re.sub(r"(\d)\.0\b", r"\1", d)
    fill_rule = ' fill-rule="evenodd"' if placed.fillType == pathops.FillType.EVEN_ODD else ""
    knocked = f"its {logo['knockout']} parts cut out" if holes else "all of it filled"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {HEIGHT}">\n'
        f"<!-- {logo['url']}, retrieved {logo['retrieved']}. Redrawn in one color by scripts/logos.py, {knocked}. -->\n"
        f'<path{fill_rule} d="{d}"/>\n'
        "</svg>\n"
    )


# Rewrites what picosvg refuses: fills set by a <style> class, and <switch> wrappers from Illustrator.
def simplify(text):
    styles = " ".join(re.findall(r"<style[^>]*>([\s\S]*?)</style>", text))
    fills = dict(re.findall(r"\.([\w-]+)\s*\{\s*fill\s*:\s*([^;}]+)", styles))
    text = re.sub(r"<style[^>]*>[\s\S]*?</style>", "", text)
    text = re.sub(r'class="([\w-]+)"', lambda match: f'fill="{fills.get(match.group(1), "#000")}"', text)
    return text.replace("<switch>", "<g>").replace("</switch>", "</g>")


def is_knockout(color, knockout):
    if knockout == "light":
        return luminance(color) > 0.8
    if knockout == "dark":
        return luminance(color) < 0.05
    raise ValueError(f'knockout is "{knockout}", but must be "light" or "dark"')


def parse_color(value):
    value = {"white": "#ffffff", "black": "#000000"}.get(value.strip().lower(), value.strip().lower())
    if value.startswith("rgb"):
        return tuple(float(channel) / 255 for channel in re.findall(r"[\d.]+", value)[:3])
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(digit * 2 for digit in value)
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


# A gradient counts as the average of its stop colors.
def gradient_color(tree, reference):
    target = reference[len("url(#") : -1]
    for element in tree.iter():
        if element.get("id") != target:
            continue
        linked = element.get("{http://www.w3.org/1999/xlink}href") or element.get("href")
        stops = [parse_color(stop.get("stop-color", "#000")) for stop in element.iter() if stop.tag.endswith("stop")]
        if not stops and linked:
            return gradient_color(tree, f"url({linked})")
        return tuple(sum(stop[channel] for stop in stops) / len(stops) for channel in range(3))
    raise ValueError(f"gradient {reference} not found")


# Relative luminance, see https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
def luminance(color):
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in color]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


# Scales and moves every point it passes on to the wrapped pen.
class MovingPen:
    def __init__(self, pen, scale, dx, dy):
        self.pen, self.scale, self.dx, self.dy = pen, scale, dx, dy

    def _move(self, points):
        return [(x * self.scale + self.dx, y * self.scale + self.dy) for x, y in points]

    def moveTo(self, point):
        self.pen.moveTo(*self._move([point]))

    def lineTo(self, point):
        self.pen.lineTo(*self._move([point]))

    def curveTo(self, *points):
        self.pen.curveTo(*self._move(points))

    def qCurveTo(self, *points):
        self.pen.qCurveTo(*self._move(points))

    def closePath(self):
        self.pen.closePath()

    def endPath(self):
        self.pen.endPath()


if __name__ == "__main__":
    main()
