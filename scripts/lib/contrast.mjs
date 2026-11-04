// The WCAG contrast audit that `npm run check` runs on every page and `npm run docs` on every document.
//
// It runs inside the page, so it stays one self-contained function.
// Callers evaluate `(${auditContrast})()` in the page.

// Runs in the page and lists text below 4.5:1 (3:1 when large) and controls whose outline is below 3:1.
// see: https://www.w3.org/TR/WCAG22/#contrast-minimum
//
// NOTE: only solid colors count. Text over a screenshot or an image is not checked.
export function auditContrast() {
  // Links and buttons fade their colors, so right after a theme switch they still show the old theme.
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.append(still);
  // A panel that hasn't slid in yet is faded. The audit checks every panel in place.
  const panels = [...document.querySelectorAll('.panel')];
  panels.forEach((panel) => panel.style.setProperty('animation', 'none'));

  const failures = [];
  const checked = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const element = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent.trim() || checked.has(element) || !isVisible(element)) continue;
    checked.add(element);

    const style = getComputedStyle(element);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const background = backgroundBehind(element);
    const ratio = contrast(blend(withOpacity(parse(style.color), element), background), background);
    const minimum = large ? 3 : 4.5;
    if (ratio < minimum) failures.push(`${describe(element)} text ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
  }

  for (const control of document.querySelectorAll('.button, .language, .theme-toggle')) {
    if (!isVisible(control)) continue;
    const style = getComputedStyle(control);
    const page = backgroundBehind(control.parentElement);
    const fill = parse(style.backgroundColor);
    const edge = blend(fill[3] >= 1 ? fill : parse(style.borderTopColor), page);
    const ratio = contrast(edge, page);
    if (ratio < 3) failures.push(`${describe(control)} outline ${ratio.toFixed(2)}:1, needs 3:1`);
  }

  panels.forEach((panel) => panel.style.removeProperty('animation'));
  still.remove();
  return failures;

  function isVisible(element) {
    const { width, height } = element.getBoundingClientRect();
    return width > 0 && height > 0 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('.visually-hidden');
  }

  // Stacks the backgrounds of the element and its ancestors until one is opaque.
  // A gradient counts as its most opaque color, e.g. the amber of a highlight.
  function backgroundBehind(element) {
    const layers = [];
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      const gradient = (style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).map(parse);
      const color = gradient.sort((a, b) => b[3] - a[3])[0] ?? parse(style.backgroundColor);
      if (color[3] > 0) layers.push(color);
      if (color[3] >= 1) break;
    }
    return layers.reduceRight((under, layer) => blend(layer, under), [255, 255, 255, 1]);
  }

  function withOpacity(color, element) {
    let alpha = color[3];
    for (let current = element; current; current = current.parentElement) {
      alpha *= Number(getComputedStyle(current).opacity);
    }
    return [color[0], color[1], color[2], alpha];
  }

  // Reads rgb(), rgba() and color(srgb …), the forms Chrome reports computed colors in.
  function parse(value) {
    const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
    if (srgb) return [srgb[1] * 255, srgb[2] * 255, srgb[3] * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
    const [r = 0, g = 0, b = 0, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number);
    return value === 'transparent' ? [0, 0, 0, 0] : [r, g, b, a];
  }

  function blend([r, g, b, a], [r2, g2, b2]) {
    return [r * a + r2 * (1 - a), g * a + g2 * (1 - a), b * a + b2 * (1 - a), 1];
  }

  function contrast(first, second) {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function luminance([r, g, b]) {
    const linear = (channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }

  function describe(element) {
    const name = element.className ? `.${String(element.className).trim().split(/\s+/).join('.')}` : '';
    return `<${element.tagName.toLowerCase()}${name}> "${element.textContent.trim().slice(0, 32)}"`;
  }
}
