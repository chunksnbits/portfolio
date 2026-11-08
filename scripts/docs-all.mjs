// Regenerates every variant's private documents: the interview brief, the cover letters
// and the combined cover-letter-and-CV application PDF. Runs `npm run docs -- <slug>` for each
// variant in variants/, published or not.
//
// Usage: npm run docs:all
import { spawnSync } from 'node:child_process';
import { loadVariants, ROOT } from './build.mjs';

const variants = await loadVariants();
let failed = false;
for (const variant of variants) {
  console.log(`\n== ${variant.slug} ==`);
  const { status } = spawnSync('node', ['scripts/documents.mjs', variant.slug], { cwd: ROOT, stdio: 'inherit' });
  if (status !== 0) failed = true;
}
if (variants.length === 0) console.log('No variants in variants/.');
process.exit(failed ? 1 : 0);
