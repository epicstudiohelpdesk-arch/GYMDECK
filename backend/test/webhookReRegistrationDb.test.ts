import assert from 'node:assert/strict';
import http from 'node:http';
import { Client } from 'pg';
import { config } from '../shared/config';
import { reRegisterWebhooks, WebhookRecord } from '../services/whatsapp/webhookReRegistration';

const url = process.env.DATABASE_URL || '';
if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error('Refusing non-local DATABASE_URL');
const canonical = 'http://backend_staging:8080/v1/webhooks/openwa';
const secret = 'disposable-webhook-secret';
const events = ['message.received'];
const state = new Map<string, WebhookRecord[]>();
let failOnce = true;
const calls: string[] = [];

const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const parts = req.url!.split('/');
  const session = decodeURIComponent(parts[3] || '');
  const send = (code: number, data: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (session === 'fail-session' && failOnce) {
    failOnce = false;
    return send(500, { message: 'simulated OpenWA failure' });
  }
  const rows = state.get(session) || [];
  if (req.method === 'GET') return send(200, rows);
  calls.push(`${req.method} ${session}`);
  if (req.method === 'POST') {
    const data = JSON.parse(body);
    const row = { sessionId: session, id: `wh-${rows.length + 1}`, url: data.url };
    state.set(session, [...rows, row]);
    return send(201, row);
  }
  if (req.method === 'PUT') {
    const id = decodeURIComponent(parts[5] || '');
    state.set(session, rows.map((r) => (r.id === id ? { ...r, url: JSON.parse(body).url } : r)));
    return send(200, { ok: true });
  }
  return send(404, { message: 'not found' });
});

async function run() {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as any).port;
  const original = config.OPENWA_API_URL;
  config.OPENWA_API_URL = `http://127.0.0.1:${port}/api`;
  const pg = new Client({ connectionString: url });
  await pg.connect();
  try {
    await pg.query('CREATE TEMP TABLE disposable_webhooks (session_id text, url text)');
    await pg.query('INSERT INTO disposable_webhooks VALUES ($1,$2),($3,$4),($5,$6)', [
      's1', 'http://127.0.0.1:3001/v1/webhooks/openwa',
      's2', canonical,
      'fail-session', 'http://localhost:3001/v1/webhooks/openwa'
    ]);
    const { rows } = await pg.query<WebhookRecord>('SELECT session_id AS "sessionId", url FROM disposable_webhooks');
    const first = await reRegisterWebhooks(rows, canonical, secret, events);
    assert.deepEqual(first.map((r) => r.sessionId), ['s1', 'fail-session']);
    assert.equal(first[0]?.status, 'updated');
    assert.equal(first[1]?.status, 'failed');
    assert.ok(!calls.some((c) => c.includes('s2')), 'valid registration was modified');

    const refreshed = [...state.entries()].map(([sessionId, list]) => ({ sessionId, url: list[0]?.url || '' }));
    const before = calls.length;
    const second = await reRegisterWebhooks(refreshed, canonical, secret, events);
    assert.equal(second.length, 0);
    assert.equal(calls.length, before, 'idempotent retry made API calls');

    const retry = await reRegisterWebhooks([{ sessionId: 'fail-session', url: 'http://localhost:3001/v1/webhooks/openwa' }], canonical, secret, events);
    assert.equal(retry[0]?.status, 'updated');
    assert.equal(state.get('fail-session')?.[0]?.url, canonical);
    console.log('PASS webhook re-registration: loopback replaced, valid row preserved, retry idempotent, partial failure recovered');
  } finally {
    await pg.end();
    config.OPENWA_API_URL = original;
    server.close();
  }
}
run().catch((e) => { console.error(e); process.exit(1); });
