import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate, launchChrome, openTab } from '../scripts/lib/chrome.mjs';
import { serve } from '../scripts/lib/server.mjs';

// Starts a real headless Chrome. Skipped where none is installed, see CHROME_PATH in scripts/lib/chrome.mjs.
test('rejects a page that fails to load instead of opening the browser\'s error page', async (t) => {
  let chrome;
  try {
    chrome = await launchChrome();
  } catch (error) {
    t.skip(error.message);
    return;
  }
  try {
    // Chrome refuses port 9, the discard port, so the load fails at once without a network.
    await assert.rejects(openTab(chrome.client, 'http://127.0.0.1:9/', { width: 800, height: 600 }), /Cannot open http:\/\/127\.0\.0\.1:9\/: net::ERR_\w+/);
  } finally {
    await chrome.close();
  }
});

test('runs a script of its own in the tab before the page\'s scripts', async (t) => {
  let chrome;
  try {
    chrome = await launchChrome();
  } catch (error) {
    t.skip(error.message);
    return;
  }
  const folder = await mkdtemp(join(tmpdir(), 'portfolio-chrome-'));
  await writeFile(join(folder, 'index.html'), '<!doctype html><title>?</title><script>document.title = String(window.early);</script>');
  const server = await serve(folder, { prefix: '/' });
  try {
    const tab = await openTab(chrome.client, server.url, { width: 800, height: 600, beforeLoad: 'window.early = 42;' });
    assert.equal(await evaluate(tab.send, 'document.title'), '42');
    await tab.close();
  } finally {
    await server.close();
    await chrome.close();
    await rm(folder, { recursive: true, force: true });
  }
});
