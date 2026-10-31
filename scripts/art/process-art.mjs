// Turns source art into site assets: realism tattoo samples (ink on transparent), the 3D viewer's backdrop,
// and the logo files. Image decoding happens in the browser, so this serves a page that does the work.
//
//   npm run art            then open http://localhost:4571 and wait for "Done"
//
// The jobs (crops, ink levels, fades) are defined in process-art.html.
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const ROOT = process.cwd();
const ALLOWED_OUT = ['public/art/', 'public/brand/', 'src/app/icon.png'];
const page = readFileSync(new URL('./process-art.html', import.meta.url), 'utf8');
const TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(page);
  }
  if (url.pathname.startsWith('/assets/')) {
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(path.join(ROOT, 'assets')) || !existsSync(file)) return res.writeHead(404).end();
    const size = statSync(file).size;
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    const start = range ? Number(range[1] || 0) : 0;
    const end = range && range[2] ? Number(range[2]) : size - 1;
    res.writeHead(range ? 206 : 200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
    });
    return createReadStream(file, { start, end }).pipe(res);
  }
  if (url.pathname === '/out' && req.method === 'POST') {
    const out = url.searchParams.get('path') || '';
    if (!ALLOWED_OUT.some((p) => out.startsWith(p)) || out.includes('..')) return res.writeHead(400).end('bad path');
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const file = path.join(ROOT, out);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(body.replace(/^data:[\w/+-]+;base64,/, ''), 'base64'));
      console.log('wrote', out);
      res.end('ok');
    });
    return;
  }
  res.writeHead(404).end();
}).listen(4571, () => console.log('Open http://localhost:4571 in Chrome to process the art'));
