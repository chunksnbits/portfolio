import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves a folder below `prefix`, the way GitHub Pages serves the site below /portfolio/.
 *
 * Resolves with the site's URL once listening. Port 0 picks a free port.
 */
export function serve(folder, { port = 0, prefix = '/portfolio/' } = {}) {
  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (!pathname.startsWith(prefix)) {
      response.writeHead(302, { location: prefix }).end();
      return;
    }

    const file = normalize(join(folder, decodeURIComponent(pathname.slice(prefix.length))));
    if (!file.startsWith(normalize(folder + sep)) && file !== normalize(folder)) {
      response.writeHead(403).end();
      return;
    }
    const target = await resolve(file);
    if (!target) {
      response.writeHead(404, { 'content-type': TYPES['.html'] });
      createReadStream(join(folder, '404.html')).pipe(response);
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(target).pipe(response);
  });

  return new Promise((resolvePromise) => {
    server.listen(port, '127.0.0.1', () => {
      resolvePromise({
        url: `http://127.0.0.1:${server.address().port}${prefix}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

// Finds the file to send, falling back to index.html for a folder.
async function resolve(file) {
  try {
    const info = await stat(file);
    if (info.isFile()) return file;
    const index = join(file, 'index.html');
    return (await stat(index)).isFile() ? index : null;
  } catch {
    return null;
  }
}
