const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
function setup(fetcher, entries = {}) {
  const data = new Map(Object.entries(entries));
  const localStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) };
  const window = new EventTarget(); window.fetch = fetcher; window.location = { href: 'http://127.0.0.1:3000/Home' };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/spotify-session.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, window, localStorage, fetch: (...args) => window.fetch(...args), Event, Request, Headers, URL, URLSearchParams, process: { env: { NEXT_PUBLIC_SPOTIFY_CLIENT_ID: 'test-client' } } });
  return { api: exports, window, data };
}
const initial = { Token: 'old', RefreshToken: 'refresh', TokenExpiresAt: '1' };
test('concurrent renewal is deduplicated and retains refresh token when omitted', async () => {
  let count = 0;
  const h = setup(async () => { count++; return Response.json({ access_token:'new', expires_in:3600 }); }, initial);
  assert.deepEqual(await Promise.all([h.api.getSpotifyToken(), h.api.getSpotifyToken()]), ['new','new']);
  assert.equal(count,1); assert.equal(h.data.get('RefreshToken'),'refresh');
  assert.ok(Number(h.data.get('TokenExpiresAt')) > Date.now());
});
test('revoked refresh clears session and emits authorization event', async () => {
  const h = setup(async () => Response.json({ error:'invalid_grant' }, { status:400 }), initial);
  let expired = false; h.window.addEventListener(h.api.SESSION_EXPIRED, () => expired = true);
  await assert.rejects(h.api.getSpotifyToken()); assert.ok(expired); assert.equal(h.data.size,0);
});
test('temporary network failures preserve credentials', async () => {
  const h = setup(async () => { throw new Error('offline'); }, initial);
  await assert.rejects(h.api.getSpotifyToken()); assert.equal(h.data.get('RefreshToken'),'refresh');
});
test('API 401 refreshes and retries once with fresh token and unchanged body', async () => {
  const calls = [];
  const h = setup(async (input) => {
    if (typeof input === 'string') return Response.json({ access_token:'new', refresh_token:'rotated', expires_in:3600 });
    calls.push([input.headers.get('Authorization'), await input.text()]);
    return new Response(null, {status: calls.length === 1 ? 401 : 204});
  }, { ...initial, TokenExpiresAt:String(Date.now()+3600000) });
  const restore = h.api.installSpotifyFetchGuard();
  const response = await h.window.fetch('https://api.spotify.com/v1/me/player/play', { method:'PUT', body:'{"uris":[]}' });
  assert.equal(response.status,204); assert.deepEqual(calls, [['Bearer old','{"uris":[]}'],['Bearer new','{"uris":[]}']]);
  assert.equal(h.data.get('RefreshToken'),'rotated'); restore();
});
test('logout during refresh cannot restore credentials', async () => {
  let resolve;
  const h = setup(() => new Promise(r => resolve = r), initial);
  const pending = h.api.getSpotifyToken(); h.api.clearSpotifySession();
  resolve(Response.json({ access_token:'new', expires_in:3600 }));
  await assert.rejects(pending); assert.equal(h.data.size,0);
});
