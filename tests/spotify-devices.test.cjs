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

function sessionSetup(before, after) {
 const calls = []; const exports = {}; let reads = 0;
 new Function('exports','localStorage','fetch','setTimeout',code)(exports,{getItem:()=> 'test-token'},async(url,init)=>{
  calls.push([url,init]);
  return {ok:true,status:init?.method==='PUT'?204:200,json:async()=>reads++===0?before:after};
 },fn=>fn());
 return {...exports,calls};
}
const state = (deviceId, position, uri = 'spotify:track:one') => ({device:{id:deviceId},progress_ms:position,is_playing:true,item:{uri,duration_ms:240000}});
test('session transfer preserves an advancing song without restarting or seeking',async()=>{
 const api=sessionSetup(state('old',60000),state(device.id,61000));
 await api.transferSpotifySession(device);
 const writes=api.calls.filter(([,init])=>init.method==='PUT');
 assert.equal(writes.length,1);assert.deepEqual(JSON.parse(writes[0][1].body),{device_ids:[device.id],play:true});
});
test('session transfer repairs a backward reset using seek, never play',async()=>{
 const api=sessionSetup(state('old',60000),state(device.id,0));
 await api.transferSpotifySession(device);
 const seek=api.calls.find(([url])=>url.includes('/seek?'));assert.ok(seek);
 assert.ok(Number(new URL(seek[0]).searchParams.get('position_ms'))>=60000);
 assert.equal(api.calls.some(([url])=>url.includes('/play?')),false);
});
test('session transfer does not seek a different song or retransfer the current device',async()=>{
 const changed=sessionSetup(state('old',60000),state(device.id,0,'spotify:track:two'));
 await changed.transferSpotifySession(device);assert.equal(changed.calls.some(([url])=>url.includes('/seek?')),false);
 const same=sessionSetup(state(device.id,60000),null);await same.transferSpotifySession(device);assert.equal(same.calls.length,1);
});

test('switching from a paused session requests playback on the destination',async()=>{
 const before={...state('old',60000),is_playing:false};
 const api=sessionSetup(before,state(device.id,60000));
 await api.transferSpotifySession(device);
 const writes=api.calls.filter(([,init])=>init.method==='PUT');
 assert.equal(writes.length,1);
 assert.deepEqual(JSON.parse(writes[0][1].body),{device_ids:[device.id],play:true});
});
