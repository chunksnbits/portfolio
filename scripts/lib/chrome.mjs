// Drives a headless Chrome over the DevTools protocol, for the checks and captures that need a real browser.
//
// NOTE: needs Google Chrome or Chromium. Set CHROME_PATH if it isn't found.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Longest a page may take to load. A URL that starts a download never fires the load event.
const LOAD_TIMEOUT_MS = 60_000;

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/** Starts a headless Chrome and connects to it. Call `close()` when done, also after a failure. */
export async function launchChrome() {
  const path = CHROME_PATHS.find((candidate) => candidate && existsSync(candidate));
  if (!path) {
    throw new Error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.');
  }
  const profile = mkdtempSync(join(tmpdir(), 'portfolio-chrome-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    'about:blank',
  ];
  // Ubuntu runners block the user namespaces Chrome's sandbox needs, so Chrome refuses to start with it.
  if (process.platform === 'linux') args.unshift('--no-sandbox');

  const process_ = spawn(path, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    process_.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    process_.on('exit', (code) => reject(new Error(`Chrome exited with ${code}:\n${output}`)));
  });
  const client = await connect(endpoint);

  return {
    client,
    close: async () => {
      client.close();
      process_.kill();
      await new Promise((done) => process_.once('exit', done));
      await removeProfile(profile);
    },
  };
}

/**
 * Opens `url` in a new tab of the given size and resolves once the page and its fonts have loaded.
 * Rejects when the page fails to load or takes longer than a minute, and closes the tab then.
 *
 * The tab's `send` makes DevTools protocol calls in the tab, and `close` closes it.
 * `scale` is the device pixel ratio, e.g. 2 for a Retina display.
 * `colorScheme` ('light' or 'dark') sets the system preference the page sees, otherwise Chrome's default applies.
 * `beforeLoad` is a script that runs in the page before any of the page's own.
 */
export async function openTab(client, url, { width, height, scale = 1, colorScheme = null, beforeLoad = null }) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => client.send(method, params, sessionId);

  await send('Page.enable');
  if (beforeLoad) await send('Page.addScriptToEvaluateOnNewDocument', { source: beforeLoad });
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: scale,
    mobile: width < 800,
  });
  if (colorScheme) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: colorScheme }] });
  }
  const close = () => client.send('Target.closeTarget', { targetId });
  try {
    const loaded = client.once('Page.loadEventFired', sessionId);
    // Chrome answers an unreachable or failing address with its own error page, and reports why in errorText.
    const { errorText } = await send('Page.navigate', { url });
    if (errorText) throw new Error(`Cannot open ${url}: ${errorText}`);
    await withTimeout(loaded, LOAD_TIMEOUT_MS, `${url} didn't finish loading within ${LOAD_TIMEOUT_MS / 1000} s`);
    await evaluate(send, 'document.fonts.ready.then(() => true)');
  } catch (error) {
    await close().catch(() => {});
    throw error;
  }
  return { send, close };
}

/** Runs a JavaScript expression in the tab and resolves with its value, awaiting a promise. */
export async function evaluate(send, expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

/**
 * Declines a cookie banner, so it doesn't cover the page, by clicking its button for the necessary cookies only.
 * Resolves with whether it found such a button.
 */
export async function dismissCookieBanner(tab) {
  return evaluate(
    tab.send,
    `(() => {
      const named = document.querySelector('#onetrust-reject-all-handler, #CybotCookiebotDialogBodyButtonDecline, [data-testid="uc-deny-all-button"]');
      const label = /^(alle ablehnen|ablehnen|nur notwendige|reject all|reject|decline|refuse|only necessary|necessary only)/i;
      const button = named ?? [...document.querySelectorAll('button, [role="button"]')].find((element) => label.test(element.textContent.trim()));
      button?.click();
      return Boolean(button);
    })()`,
  );
}

/** Prints the tab to a PDF in the page size its CSS sets, with backgrounds. */
export async function printPdf(tab) {
  const { data } = await tab.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  return Buffer.from(data, 'base64');
}

/** Counts the pages of a PDF that Chrome printed. */
export function countPages(pdf) {
  return pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

/**
 * Saves a PNG of the tab's window.
 * With `fullPage`, it saves the whole page instead, cut off at `maxHeight` CSS pixels.
 */
export async function screenshot(tab, file, { fullPage = false, maxHeight = 8000 } = {}) {
  const params = { format: 'png' };
  if (fullPage) {
    const { cssContentSize } = await tab.send('Page.getLayoutMetrics');
    params.captureBeyondViewport = true;
    params.clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, maxHeight), scale: 1 };
  }
  const { data } = await tab.send('Page.captureScreenshot', params);
  await writeFile(file, Buffer.from(data, 'base64'));
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Deletes Chrome's temporary profile, trying again for up to 2 s while Chrome's helper processes finish writing to it.
// On Linux they can still write for a moment after Chrome exits, and rmSync's own retries never delete those late files.
// A profile left behind in the temp folder doesn't affect the checks, so a last failure only warns.
async function removeProfile(profile) {
  for (let attempt = 1; ; attempt++) {
    try {
      rmSync(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 10) {
        console.warn(`\nCouldn't delete Chrome's temporary profile ${profile}: ${error.message}`);
        return;
      }
      await new Promise((done) => setTimeout(done, 200));
    }
  }
}

// A minimal Chrome DevTools Protocol client over Node's built-in WebSocket.
function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const listeners = new Set();
  let lastId = 0;

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id === undefined) {
      for (const listener of listeners) listener(message);
      return;
    }
    const call = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) call.reject(new Error(`${call.method}: ${message.error.message}`));
    else call.resolve(message.result);
  });

  const client = {
    send(method, params = {}, sessionId) {
      const id = ++lastId;
      socket.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(id, { method, resolve, reject }));
    },
    once(method, sessionId) {
      return new Promise((resolve) => {
        const listener = (message) => {
          if (message.method !== method || message.sessionId !== sessionId) return;
          listeners.delete(listener);
          resolve(message.params);
        };
        listeners.add(listener);
      });
    },
    close: () => socket.close(),
  };

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve(client), { once: true });
    socket.addEventListener('error', () => reject(new Error(`Cannot connect to Chrome at ${url}`)), { once: true });
  });
}
