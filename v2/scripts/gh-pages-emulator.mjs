// Minimal GitHub Pages emulator for local verification of the subpath +
// SPA deep-link fallback. Models a PROJECT pages site: the repo content in
// ROOT is mounted under a base prefix (e.g. /aoem-dashboard) and the project's
// custom 404.html (ROOT/404.html) is served with HTTP 404 for any miss under
// that prefix — exactly like GH Pages.
// NOT used in production; a dev/verification aid only.
//   node gh-pages-emulator.mjs <repoDir> [port] [basePrefix]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = process.argv[2];
const PORT = Number(process.argv[3] || 8899);
const BASE = process.argv[4] || '/aoem-dashboard';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  // Strip the project base prefix, then resolve within ROOT (the repo content).
  const underBase = urlPath.startsWith(BASE) ? urlPath.slice(BASE.length) || '/' : urlPath;
  let rel = normalize(underBase).replace(/^(\.\.[/\\])+/, '');
  if (rel.endsWith('/')) rel += 'index.html';
  const file = join(ROOT, rel);
  try {
    const s = await stat(file);
    if (s.isDirectory()) throw new Error('dir');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    // GH Pages fallback: single root 404.html, served with 404 status.
    try {
      const body = await readFile(join(ROOT, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}).listen(PORT, () => console.log(`GH Pages emulator on http://localhost:${PORT} root=${ROOT}`));
