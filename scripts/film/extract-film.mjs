// Turns the studio clips into scroll-scrubbable frame sequences (public/film/).
// Browsers can't decode video in Node, so this serves a small page: open it in Chrome, it decodes the clips,
// bakes a dissolve between scenes, and posts every frame back here to be saved.
//
//   npm run film            then open http://localhost:4570 and wait for "Done"
//
// Edit CLIPS to change the scenes or their order. A single continuous clip works too (list just that one).
import { createReadStream, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const CLIPS = ['assets/film/studio-01-exterior.mp4', 'assets/film/studio-02-lounge.mp4', 'assets/film/studio-03-workspace.mp4'];
const SETTINGS = {
  fps: 10, // frames per second of footage; the page blends between neighbouring frames
  overlap: 0.9, // seconds of dissolve between consecutive clips
  desktop: { width: 1280, height: 720, quality: 0.5 },
  mobile: { width: 540, height: 960, quality: 0.52 }, // portrait crop from the centre of the frame
};
const OUT = 'public/film';

rmSync(OUT, { recursive: true, force: true });
for (const variant of ['desktop', 'mobile']) mkdirSync(path.join(OUT, variant), { recursive: true });
const page = readFileSync(new URL('./extract-page.html', import.meta.url), 'utf8').replace('__SETTINGS__', JSON.stringify({ ...SETTINGS, clips: CLIPS.length }));

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(page);
  }
  const clip = /^\/clip\/(\d+)$/.exec(url.pathname);
  if (clip && CLIPS[Number(clip[1])]) {
    const file = CLIPS[Number(clip[1])];
    const size = statSync(file).size;
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    const start = range ? Number(range[1] || 0) : 0;
    const end = range && range[2] ? Number(range[2]) : size - 1;
    res.writeHead(range ? 206 : 200, {
      'content-type': 'video/mp4',
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
    });
    return createReadStream(file, { start, end }).pipe(res);
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (url.pathname === '/frame') {
        const variant = url.searchParams.get('variant') === 'mobile' ? 'mobile' : 'desktop';
        const index = String(Number(url.searchParams.get('i'))).padStart(4, '0');
        writeFileSync(path.join(OUT, variant, `${index}.webp`), Buffer.from(body.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
      } else if (url.pathname === '/manifest') {
        writeFileSync(path.join(OUT, 'manifest.json'), body);
        console.log(`Done: ${JSON.parse(body).count} frames written to ${OUT}`);
      }
      res.end('ok');
    });
    return;
  }
  res.writeHead(404).end();
}).listen(4570, () => console.log('Open http://localhost:4570 in Chrome to extract the film frames'));
