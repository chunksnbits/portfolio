import { inlineLinks } from './markdown.mjs';

// Contact details that must read the same in every language.
const SHARED_KEYS = ['email', 'github', 'linkedin'];
// Image titles that change how an image is shown. Any other title is a caption.
const IMAGE_KINDS = ['phone', 'plain', 'keyvisual', 'keyvisual ascii', 'logo'];

/**
 * Lists the structural differences between two language versions of the portfolio.
 *
 * Wording may differ freely. Ids, the order and kind of blocks, image files and frames,
 * link targets, list lengths and tag counts must match.
 * An empty list means the versions are in step.
 */
export function compareStructure(a, b) {
  const differences = [];
  const report = (left, right, message) => differences.push(`${message} (line ${left.line} vs ${right.line})`);

  for (const key of SHARED_KEYS) {
    if (a.meta[key] !== b.meta[key]) {
      differences.push(`frontmatter "${key}" differs: ${a.meta[key]} vs ${b.meta[key]}`);
    }
  }

  pairUp(a.sections, b.sections, 'number of sections', differences, (left, right) => {
    if (left.id !== right.id) report(left, right, `section id "${left.id}" vs "${right.id}"`);
    compareBlocks(left, right, report);

    pairUp(left.entries, right.entries, `number of entries in "${left.id}"`, differences, (x, y) => {
      if (x.id !== y.id) report(x, y, `entry id "${x.id}" vs "${y.id}"`);
      if (Boolean(x.meta) !== Boolean(y.meta)) report(x, y, `"${x.title}" has a meta line in only one version`);
      compareBlocks(x, y, report);
    });
  });

  return differences;
}

function pairUp(left, right, label, differences, compare) {
  if (left.length !== right.length) {
    differences.push(`${label}: ${left.length} vs ${right.length}`);
  }
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    compare(left[index], right[index]);
  }
}

// A different sequence of block kinds is reported once, since pairing the blocks up would only add noise.
function compareBlocks(left, right, report) {
  const kinds = (container) => container.blocks.map(kind).join(', ');
  if (kinds(left) !== kinds(right)) {
    report(left, right, `blocks under "${left.title}" differ: ${kinds(left)} vs ${kinds(right)}`);
    return;
  }

  left.blocks.forEach((x, index) => {
    const y = right.blocks[index];
    if (x.type === 'image' && x.src !== y.src) {
      report(x, y, `image ${x.src} vs ${y.src}`);
    }
    if (x.type === 'list' && x.items.length !== y.items.length) {
      report(x, y, `list with ${x.items.length} vs ${y.items.length} items`);
    }
    if (x.type === 'tags' && x.tags.length !== y.tags.length) {
      report(x, y, `${x.tags.length} vs ${y.tags.length} tags`);
    }
    if (links(x) !== links(y)) {
      report(x, y, `links differ: ${links(x) || 'none'} vs ${links(y) || 'none'}`);
    }
  });
}

function kind(block) {
  if (block.type === 'image') {
    return `image (${IMAGE_KINDS.includes(block.title) ? block.title : block.title ? 'browser, captioned' : 'browser'})`;
  }
  if (block.type === 'list') {
    return block.ordered ? 'numbered list' : 'list';
  }
  return block.type;
}

function links(block) {
  const texts = block.type === 'paragraph' ? [block.text] : block.type === 'list' ? block.items : [];
  return texts.flatMap(inlineLinks).sort().join(', ');
}
