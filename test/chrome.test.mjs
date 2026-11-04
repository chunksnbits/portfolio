import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launchChrome, openTab } from '../scripts/lib/chrome.mjs';

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
