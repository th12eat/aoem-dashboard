// Dev-only sidecar: serves the 1.0 repo's static files (notably /data/**) so
// that `ng serve` can proxy /data to them (see proxy.conf.json). This keeps the
// 1.0 JSON as the single source of truth during development without copying it
// into the v2 app. In production those files are published at
// /aoem-dashboard/data and this sidecar is not used.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../..'); // v2/scripts -> v2 -> repo root
const PORT = Number(process.argv[2] || 4201);
const TYPES = { '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const file = join(REPO_ROOT, rel);
  try {
    const s = await stat(file);
    if (s.isDirectory()) throw new Error('dir');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'access-control-allow-origin': '*',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`1.0 data sidecar on http://localhost:${PORT} root=${REPO_ROOT}`));
