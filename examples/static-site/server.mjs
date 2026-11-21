#!/usr/bin/env node
// A small development server for the example site, with the things real ones have and that a
// preview in front of them must handle: a hot-reload WebSocket, a cookie, a Content-Security-Policy
// that forbids framing, and a service worker. No dependencies.
//
//   node server.mjs [--port 4175] [--plain] [--dir <folder>]
//
// --plain leaves out the security headers (for trying "attach": "tag", where the page is framed
// from this server directly). --dir serves another copy of the site.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const port = Number(flag('--port') ?? 4175);
const plain = args.includes('--plain');
const site = resolve(flag('--dir') ?? join(dirname(fileURLToPath(import.meta.url)), 'site'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const sockets = new Set();

/** Send one text frame to every connected page. */
function broadcast(text) {
  const data = Buffer.from(text);
  const frame = Buffer.concat([Buffer.from([0x81, data.length]), data]); // short, unmasked text frame
  for (const socket of sockets) socket.write(frame);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/__dev/update') {
    // What a file watcher would do after a save.
    broadcast(url.searchParams.get('reload') ? 'reload' : 'update');
    res.writeHead(204).end();
    return;
  }
  const path = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
  if (path.includes('..')) return void res.writeHead(400).end();
  try {
    const body = await readFile(join(site, path));
    const headers = { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (extname(path) === '.html') {
      headers['Set-Cookie'] = 'harbor_visit=1; Path=/; SameSite=Lax';
      if (!plain) {
        headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'";
        headers['X-Frame-Options'] = 'DENY';
      }
    }
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

// The hot-reload socket: a WebSocket handshake by hand, then frames from broadcast().
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (req.url !== '/__live' || !key) return void socket.destroy();
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  sockets.add(socket);
  const drop = () => sockets.delete(socket);
  socket.on('close', drop);
  socket.on('error', drop);
  socket.on('end', () => socket.destroy());
  socket.on('data', () => {}); // nothing is expected from the page
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Harbor Bikes is running at http://127.0.0.1:${server.address().port}/${plain ? ' (without security headers)' : ''}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(0));
