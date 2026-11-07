#!/usr/bin/env node
// Gangstamen self-hosted server: serves the game and relays online play over WebSocket.
// Zero dependencies (Node 18+). Same room model as the claude.ai "room" capability:
// a lobby everyone joins, named rooms ("gm-XXXX") per game, presence (each peer's state)
// and events (moments on topics). The server never simulates the game: clients drive their
// own cars (no input lag) and the game's host drives the bots.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +(process.env.PORT || 8080);
const GAME = process.env.GAME_HTML || path.join(__dirname, '..', 'gangstamen.html');
const MAX_PER_GAME = +(process.env.MAX_PLAYERS || 12);
const MAX_MSG = 4096 + 512;          // presence / event payload cap, like the claude.ai room
const MAX_RATE = 120;                // messages per second per connection

let page = null;
function loadPage() {
  try {
    const html = fs.readFileSync(GAME, 'utf8');
    const inject = '<script>window.GM_SERVER="auto";</script>';
    page = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, '<head$1>' + inject)
      : '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + inject + '</head><body>' + html + '</body></html>';
  } catch (e) { page = null; console.error('Cannot read ' + GAME + ': ' + e.message); }
}
loadPage();
fs.watchFile(GAME, { interval: 2000 }, loadPage);

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, peers: conns.size, rooms: rooms.size })); }
  if (url === '/' || url === '/index.html') {
    if (!page) { res.writeHead(500); return res.end('gangstamen.html missing'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    return res.end(page);
  }
  res.writeHead(404); res.end('not found');
});

// ---------- rooms ----------
const rooms = new Map();   // name -> Map(peer -> conn)
const conns = new Set();
function roomOf(name) { let r = rooms.get(name); if (!r) rooms.set(name, r = new Map()); return r; }
function snapshot(name) { const r = rooms.get(name); return r ? [...r.values()].map(c => ({ peer: c.peer, presence: c.pres.get(name) || {} })) : []; }
function broadcast(name, msg) { const r = rooms.get(name); if (!r) return; const s = JSON.stringify(msg); for (const c of r.values()) c.send(s); }
function join(c, name) {
  const r = roomOf(name);
  if (r.has(c.peer)) return c.send(JSON.stringify({ t: 'peers', room: name, list: snapshot(name) }));
  if (name.startsWith('gm-') && r.size >= MAX_PER_GAME) return c.send(JSON.stringify({ t: 'err', room: name, code: 'limit_reached' }));
  r.set(c.peer, c); c.rooms.add(name); c.pres.set(name, {});
  c.send(JSON.stringify({ t: 'peers', room: name, list: snapshot(name) }));
  broadcast(name, { t: 'pres', room: name, peer: c.peer, data: {} });
}
function leave(c, name) {
  const r = rooms.get(name); if (!r || !r.has(c.peer)) return;
  r.delete(c.peer); c.rooms.delete(name); c.pres.delete(name);
  if (!r.size) rooms.delete(name); else broadcast(name, { t: 'left', room: name, peer: c.peer });
}
const validRoom = n => n === '' || /^[a-z0-9][a-z0-9_.-]{0,47}$/.test(n);
const validTopic = t => typeof t === 'string' && /^[a-z][a-z0-9_.-]{0,47}$/.test(t);
function onMessage(c, text) {
  if (text.length > MAX_MSG + 256) return;
  const now = Date.now();
  if (now - c.rateT > 1000) { c.rateT = now; c.rateN = 0; }
  if (++c.rateN > MAX_RATE) return;
  let m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== 'object' || typeof m.room !== 'string' || !validRoom(m.room)) return;
  if (m.t === 'join') return join(c, m.room);
  if (m.t === 'leave') return leave(c, m.room);
  if (!c.rooms.has(m.room)) return;
  if (m.t === 'pres') {
    const data = m.data && typeof m.data === 'object' && !Array.isArray(m.data) ? m.data : {};
    if (JSON.stringify(data).length > MAX_MSG) return;
    c.pres.set(m.room, data);
    return broadcast(m.room, { t: 'pres', room: m.room, peer: c.peer, data });
  }
  if (m.t === 'emit' && validTopic(m.topic)) {
    if (JSON.stringify(m.data ?? null).length > MAX_MSG) return;
    return broadcast(m.room, { t: 'msg', room: m.room, peer: c.peer, topic: m.topic, data: m.data });
  }
}

// ---------- minimal RFC 6455 WebSocket ----------
server.on('upgrade', (req, socket) => {
  if (req.url.split('?')[0] !== '/ws' || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { peer: crypto.randomBytes(8).toString('hex'), socket, rooms: new Set(), pres: new Map(), rateT: 0, rateN: 0, buf: Buffer.alloc(0), alive: true, frag: null };
  c.send = s => { if (socket.writable) socket.write(frame(Buffer.from(s), 1)); };
  conns.add(c);
  c.send(JSON.stringify({ t: 'hello', peer: c.peer }));
  join(c, '');
  socket.on('data', d => { c.buf = Buffer.concat([c.buf, d]); parse(c); });
  const done = () => { if (!conns.has(c)) return; conns.delete(c); for (const r of [...c.rooms]) leave(c, r); };
  socket.on('close', done); socket.on('error', done); socket.on('end', done);
});
function frame(payload, op) {
  const n = payload.length;
  const head = n < 126 ? Buffer.from([0x80 | op, n]) : n < 65536 ? Buffer.from([0x80 | op, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | op; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
  return Buffer.concat([head, payload]);
}
function parse(c) {
  for (;;) {
    const b = c.buf; if (b.length < 2) return;
    const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    if (len > 65536) { c.socket.destroy(); return; }
    const need = off + (masked ? 4 : 0) + len; if (b.length < need) return;
    let data = b.subarray(off + (masked ? 4 : 0), need);
    if (masked) { const k = b.subarray(off, off + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= k[i & 3]; }
    c.buf = b.subarray(need);
    if (op === 8) { try { c.socket.write(frame(Buffer.alloc(0), 8)); } catch (e) { } c.socket.end(); return; }
    if (op === 9) { c.socket.write(frame(data, 10)); continue; }
    if (op === 10) { c.alive = true; continue; }
    if (op === 1 || op === 0) {
      c.frag = c.frag ? Buffer.concat([c.frag, data]) : Buffer.from(data);
      if (fin) { const text = c.frag.toString('utf8'); c.frag = null; onMessage(c, text); }
    }
  }
}
// keepalive: drop silent connections
setInterval(() => { for (const c of conns) { if (!c.alive) { c.socket.destroy(); continue; } c.alive = false; try { c.socket.write(frame(Buffer.alloc(0), 9)); } catch (e) { } } }, 20000);

server.listen(PORT, () => console.log('Gangstamen server on http://localhost:' + PORT + '  (game: ' + GAME + ')'));
