// Local preview: builds, serves dist/ at /portfolio/ like GitHub Pages, and rebuilds when content or site/ changes.
// Reload the browser to see a rebuild. Changes to scripts/ need a restart.
import { watch } from 'node:fs';
import { join } from 'node:path';
import { build, DIST, PAGES, ROOT } from './build.mjs';
import { serve } from './lib/server.mjs';

const WATCHED = [...PAGES.map((page) => page.source), 'site'];

let timer = null;
const rebuild = async () => {
  try {
    await build();
    console.log(`${new Date().toLocaleTimeString()} rebuilt`);
  } catch (error) {
    console.error(`${new Date().toLocaleTimeString()} ${error.message}`);
  }
};

await rebuild();
const { url } = await serve(DIST, { port: Number(process.env.PORT ?? 4173) });
console.log(`Serving ${url} (English: ${url}en/)`);

for (const path of WATCHED) {
  watch(join(ROOT, path), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}
