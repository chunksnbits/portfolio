// Local preview: builds, serves dist/ at /portfolio/ like GitHub Pages, and rebuilds when content or site/ changes.
// Reload the browser to see a rebuild. Changes to scripts/ need a restart.
import { existsSync, watch } from 'node:fs';
import { join } from 'node:path';
import { build, DIST, PAGES, ROOT } from './build.mjs';
import { serve } from './lib/server.mjs';
import { VARIANTS } from './lib/variants.mjs';

const WATCHED = [...PAGES.flatMap((page) => [page.source, page.cvSource]), 'site', VARIANTS];

let timer = null;
let variants = [];
const rebuild = async () => {
  try {
    variants = await build();
    console.log(`${new Date().toLocaleTimeString()} rebuilt`);
  } catch (error) {
    console.error(`${new Date().toLocaleTimeString()} ${error.message}`);
  }
};

await rebuild();
const { url } = await serve(DIST, { port: Number(process.env.PORT ?? 4173) });
console.log(`Serving ${url} (English: ${url}en/, one-page CVs: ${url}cv/ and ${url}en/cv/)`);
for (const variant of variants) {
  console.log(`Variant ${variant.slug}: ${url}${variant.slug}/ and ${url}${variant.slug}/en/`);
}

for (const path of WATCHED.filter((candidate) => existsSync(join(ROOT, candidate)))) {
  watch(join(ROOT, path), { recursive: true }, (event, file) => {
    // A variant's private files, like its cover letter, aren't part of the site, and neither is the variants repository's .git.
    if (file?.split(/[\\/]/).some((part) => part === 'private' || part === '.git')) return;
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}
