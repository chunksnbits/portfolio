import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../scripts/lib/server.mjs';

test('answers a missing file with 404, also in a folder without a 404 page', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'portfolio-server-'));
  await writeFile(join(folder, 'index.html'), '<p>Home</p>');
  const server = await serve(folder, { prefix: '/' });
  try {
    const missing = await fetch(`${server.url}favicon.ico`);
    const home = await fetch(server.url);

    assert.equal(missing.status, 404);
    assert.equal(await home.text(), '<p>Home</p>');
  } finally {
    await server.close();
    await rm(folder, { recursive: true, force: true });
  }
});
