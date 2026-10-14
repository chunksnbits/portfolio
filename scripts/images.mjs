// Turns the original screenshots in raw/ into the WebP and AVIF copies the page loads.
// Run it after adding or replacing a screenshot. It needs macOS (sips) plus cwebp and avifenc
// (brew install webp libavif). The build reads only its output, so CI never runs it.
//
// NOTE: raw/ is not in git. The originals live in Daniel's job-search folder.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, 'raw');
const OUT = join(ROOT, 'site/assets/img');

// - source: file in raw/
// - name: published file name, without extension
// - width: pixels to scale down to. Omitted keeps the original size.
// - density: device pixels per CSS pixel the copy is made for. The page never shows it wider than width / density.
const IMAGES = [
  { source: 'screencapture-adac-motorsport-de-drm-2026-10-03-07_26_54.png', name: 'adac-drm', width: 800, density: 2 },
  { source: 'screencapture-myzeissvision-zeiss-2026-10-04-10_45_39.png', name: 'myzeiss-vision-desktop', width: 800, density: 2 },
  { source: 'myzeissvision.zeiss.com_(iPhone SE).png', name: 'myzeiss-vision-phone', width: 320, density: 2 },
  // The FC Bayern and MediaMarkt originals are small thumbnails, so they keep their size.
  { source: 'image 7.png', name: 'fcbayern-mobile', density: 1 },
  { source: 'image 14.png', name: 'mms-campaign', density: 1 },
  // Keyvisuals cover the whole window behind a project, so they show larger than their size.
  // Bigger originals would look sharper.
  { source: 'zeiss_keyvisual.jpg', name: 'zeiss-keyvisual', density: 1 },
  { source: 'adac_keyvisual.webp', name: 'adac-keyvisual', density: 1 },
  { source: 'fcb_keyvisual.png', name: 'fcbayern-keyvisual', density: 1 },
  { source: 'mms_keyvisual.jpg', name: 'mms-keyvisual', density: 1 },
];

const WEBP_QUALITY = '82';
const AVIF_QUALITY = '62';

const scratch = mkdtempSync(join(tmpdir(), 'portfolio-images-'));
const manifest = {};

try {
  for (const image of IMAGES) {
    const scaled = join(scratch, `${image.name}.png`);
    const resize = image.width ? ['--resampleWidth', String(image.width)] : [];
    // sips writes no file without an operation, so the format is always set.
    execFileSync('sips', ['-s', 'format', 'png', ...resize, join(RAW, image.source), '--out', scaled], {
      stdio: 'ignore',
    });

    const webp = `assets/img/${image.name}.webp`;
    const avif = `assets/img/${image.name}.avif`;
    execFileSync('cwebp', ['-quiet', '-q', WEBP_QUALITY, scaled, '-o', join(ROOT, 'site', webp)]);
    execFileSync('avifenc', ['-q', AVIF_QUALITY, '-s', '4', scaled, join(ROOT, 'site', avif)], { stdio: 'ignore' });

    const { width, height } = dimensions(scaled);
    manifest[webp] = { width, height, density: image.density, avif };
    console.log(`${webp}  ${width}×${height} @${image.density}x`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

function dimensions(file) {
  const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return {
    width: Number(output.match(/pixelWidth: (\d+)/)[1]),
    height: Number(output.match(/pixelHeight: (\d+)/)[1]),
  };
}
