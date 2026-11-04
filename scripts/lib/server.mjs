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
    // A web page can point a domain of its own at this machine and read the drafts through it.
    // Its requests name that domain, so only this machine's own names get an answer.
    const { port: listening } = server.address();
    if (request.headers.host !== `127.0.0.1:${listening}` && request.headers.host !== `localhost:${listening}`) {
      response.writeHead(403).end();
      return;
    }

    let pathname;
    let path;
    try {
      ({ pathname } = new URL(request.url, 'http://localhost'));
      path = pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length)) : null;
    } catch {
      // A broken escape like %E0%A4%A would otherwise stop the whole server.
      response.writeHead(400).end();
      return;
    }
    if (path === null) {
      response.writeHead(302, { location: prefix }).end();
      return;
    }

    const file = normalize(join(folder, path));
    if (!file.startsWith(normalize(folder + sep)) && file !== normalize(folder)) {
      response.writeHead(403).end();
      return;
    }
    const target = await resolve(file);
    if (!target) {
      // The site's own 404 page where the folder has one, like dist/, and an empty answer elsewhere.
      const notFound = await resolve(join(folder, '404.html'));
      response.writeHead(404, { 'content-type': TYPES['.html'] });
      if (notFound) createReadStream(notFound).pipe(response);
      else response.end();
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
