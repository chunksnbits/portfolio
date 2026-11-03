import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, launchChrome, openTab } from '../scripts/lib/chrome.mjs';
import { auditContrast } from '../scripts/lib/contrast.mjs';

// Starts a real headless Chrome. Skipped where none is installed, see CHROME_PATH in scripts/lib/chrome.mjs.
test('reports text below the WCAG AA minimum and lets text above it pass', async (t) => {
  let chrome;
  try {
    chrome = await launchChrome();
  } catch (error) {
    t.skip(error.message);
    return;
  }
  try {
    const page = `data:text/html,${encodeURIComponent('<body style="background: #fff"><p class="faint" style="color: #999">faint</p><p style="color: #595e6a">clear</p></body>')}`;
    const tab = await openTab(chrome.client, page, { width: 800, height: 600 });
    const failures = await evaluate(tab.send, `(${auditContrast})()`);

    assert.equal(failures.length, 1, failures.join('\n'));
    assert.match(failures[0], /<p\.faint> "faint" text 2\.\d\d:1, needs 4\.5:1/);
  } finally {
    await chrome.close();
  }
});
