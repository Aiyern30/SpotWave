const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const code = ts.transpileModule(fs.readFileSync('src/lib/spotify-devices.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup(response, token = 'test-token') {
 const calls = []; const exports = {};
 new Function('exports', 'localStorage', 'fetch', code)(exports, { getItem: () => token }, async (...args) => { calls.push(args); return response; });
 return { ...exports, calls };
}
const device = { id: 'speaker-1', name: 'Speaker', type: 'Speaker', is_restricted: false };
test('device discovery forwards cancellation and returns available devices', async () => {
 const api = setup({ok:true,json:async()=>({devices:[device]})}); const signal = new AbortController().signal;
 assert.deepEqual(await api.getSpotifyDevices(signal), [device]); assert.equal(api.calls[0][1].signal,signal);
});
test('transfer targets exactly one device and preserves play or pause', async () => {
 const api = setup({ok:true});
 for(const playing of [true,false]) { await api.transferToSpotifyDevice(device,playing); assert.deepEqual(JSON.parse(api.calls.at(-1)[1].body),{device_ids:['speaker-1'],play:playing}); }
});
test('restricted and missing devices cannot initiate transfers', async () => {
 const api=setup({ok:true});
 await assert.rejects(api.transferToSpotifyDevice({...device,is_restricted:true},true));
 await assert.rejects(api.transferToSpotifyDevice({...device,id:null},true)); assert.equal(api.calls.length,0);
});
test('auth, permissions, disconnected devices and rate limits surface actionable errors',async()=>{
 for(const status of [401,403,404,429]) await assert.rejects(setup({ok:false,status}).getSpotifyDevices());
 const api=setup({ok:true},null);await assert.rejects(api.getSpotifyDevices());assert.equal(api.calls.length,0);
});
