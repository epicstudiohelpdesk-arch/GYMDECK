#!/usr/bin/env node
// Disposable cap-contract drill against a MOCK OpenWA API. Not Chromium capacity.
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';

const compose = fs.readFileSync(new URL('../docker/docker-compose.prod.yml', import.meta.url), 'utf8');
const cap = Number(compose.match(/MAX_CONCURRENT_SESSIONS:\s*(\d+)/)?.[1]);
if (!cap) { console.error('FAIL: cap missing'); process.exit(1); }
const sessions = new Map();
const chunk = 32 * 1024 * 1024;
let failOnce = true;
const started = Date.now();
const send = (res, code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'POST' && url.pathname === '/api/sessions') {
    const name = JSON.parse(body).name;
    if (name === 'fail-once' && failOnce) { failOnce = false; return send(res, 500, { message: 'engine failure' }); }
    if (sessions.size >= cap) return send(res, 400, { message: `Maximum concurrent sessions reached (${cap})` });
    const id = `s${sessions.size + 1}`;
    sessions.set(id, { id, name, status: 'ready', memory: Buffer.alloc(chunk, 1) });
    return send(res, 201, { id, status: 'ready' });
  }
  const id = decodeURIComponent(url.pathname.split('/')[3] || '');
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/sessions/')) {
    const s = sessions.get(id); if (s) s.memory.fill(0);
    sessions.delete(id); return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && url.pathname === '/api/sessions') return send(res, 200, [...sessions.values()].map(({ id, name, status }) => ({ id, name, status })));
  return send(res, 404, { message: 'not found' });
});

const call = async (method, path, body) => {
  const r = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
};
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
let peak = process.memoryUsage().rss;
const created = [];
for (let i = 1; i <= cap; i++) {
  const r = await call('POST', '/api/sessions', { name: `drill-${i}` });
  if (r.status !== 201) { console.error(`FAIL: session ${i} rejected: ${r.status}`); process.exit(1); }
  created.push(r.data.id);
  peak = Math.max(peak, process.memoryUsage().rss);
}
const ninth = await call('POST', '/api/sessions', { name: 'ninth' });
if (ninth.status !== 400) { console.error(`FAIL: ninth session accepted (${ninth.status})`); process.exit(1); }
const failed = await call('POST', '/api/sessions', { name: 'fail-once' });
if (failed.status !== 500) { console.error('FAIL: simulated failure not raised'); process.exit(1); }
const retried = await call('POST', '/api/sessions', { name: 'fail-once' });
if (retried.status !== 400) { console.error('FAIL: recovery retry changed cap state'); process.exit(1); }
await call('DELETE', `/api/sessions/${created[0]}`);
const replacement = await call('POST', '/api/sessions', { name: 'replacement' });
if (replacement.status !== 201) { console.error('FAIL: slot not released after stop'); process.exit(1); }
console.log(JSON.stringify({
  mode: 'MOCK OpenWA API (not real Chromium/WhatsApp)',
  cap,
  sessions_created: cap,
  ninth_rejected: ninth.status,
  failure_recovery: `${failed.status}->${retried.status}`,
  slot_release: replacement.status,
  peak_rss_mb: Math.round(peak / 1048576),
  duration_ms: Date.now() - started,
  hardware: { platform: os.platform(), arch: os.arch(), cpus: os.cpus().length, total_mem_mb: Math.round(os.totalmem() / 1048576) }
}, null, 2));
server.close();
