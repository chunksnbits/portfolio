import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../scripts/lib/server.mjs';

// Serves a folder with an index page to `use`, and cleans up after it.
async function withServer(use) {
  const folder = await mkdtemp(join(tmpdir(), 'portfolio-server-'));
  await writeFile(join(folder, 'index.html'), '<p>Home</p>');
  const server = await serve(folder, { prefix: '/' });
  try {
    await use(server.url);
  } finally {
    await server.close();
    await rm(folder, { recursive: true, force: true });
  }
}

// Resolves with the status of a GET, which may set its own Host header, unlike fetch().
// A server that never answers fails the test instead of hanging it.
function status(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const sent = request(url, { headers, timeout: 2000 }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    sent.on('timeout', () => sent.destroy(new Error(`${url} gave no answer`)));
    sent.on('error', reject);
    sent.end();
  });
}

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

test('answers a malformed address with 400 and keeps serving', async () => {
  await withServer(async (url) => {
    assert.equal(await status(`${url}%E0%A4%A`), 400);
    assert.equal(await status(url), 200);
  });
});

test('answers only requests for this machine, not for a site that points its domain here', async () => {
  await withServer(async (url) => {
    const { port } = new URL(url);

    assert.equal(await status(url, { host: `attacker.example:${port}` }), 403);
    assert.equal(await status(url, { host: `localhost:${port}` }), 200);
    assert.equal(await status(url), 200);
  });
});
