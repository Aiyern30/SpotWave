const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(getDisplayMedia) {
  let value, cleanup;
  const contexts = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useCallback: fn => fn,
    useContext: () => value,
    useEffect: fn => { cleanup = fn(); },
    useRef: current => ({ current }),
    useState: initial => [initial, () => {}],
  };
  class AudioContext {
    state = 'running';
    constructor() { contexts.push(this); }
    createAnalyser() { return {}; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    async close() { this.state = 'closed'; }
  }
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/contexts/AudioCaptureContext.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => name === 'react' ? react : { jsx: (_, props) => { value = props.value; } },
    navigator: { mediaDevices: { getDisplayMedia } }, AudioContext });
  exports.AudioCaptureProvider({ children: null });
  return { capture: value, dispose: () => cleanup(), contexts };
}
function stream(audio = true) {
  const tracks = [track(), ...(audio ? [track()] : [])];
  return { tracks, getTracks: () => tracks, getVideoTracks: () => [tracks[0]], getAudioTracks: () => audio ? [tracks[1]] : [] };
}
function track() {
  return { getSettings: () => ({ displaySurface: 'browser' }), readyState: 'live', stopped: false, stop() { this.stopped = true; }, addEventListener(_, fn) { this.ended = fn; } };
}
test('sharing keeps all tracks alive until explicit stop, then closes audio context', async () => {
  const media = stream(); const h = harness(async () => media);
  await h.capture.startListening('speaker');
  assert.ok(h.capture.analyser.current);
  assert.ok(media.tracks.every(t => !t.stopped));
  h.capture.stopListening();
  assert.ok(media.tracks.every(t => t.stopped));
  assert.equal(h.contexts[0].state, 'closed');
  assert.equal(h.capture.analyser.current, null);
});
test('browser stop and provider unmount both release capture', async () => {
  for (const action of ['browser', 'unmount']) {
    const media = stream(); const h = harness(async () => media);
    await h.capture.startListening('speaker');
    if (action === 'browser') media.tracks[0].ended(); else h.dispose();
    assert.ok(media.tracks.every(t => t.stopped));
    assert.equal(h.contexts[0].state, 'closed');
  }
});
test('no audio and late permission responses do not leak tracks', async () => {
  const silent = stream(false); const h = harness(async () => silent);
  await h.capture.startListening('speaker');
  assert.ok(silent.tracks.every(t => t.stopped));
  let resolve; const late = stream();
  const pending = harness(() => new Promise(r => { resolve = r; }));
  const request = pending.capture.startListening('speaker');
  pending.dispose(); resolve(late); await request;
  assert.ok(late.tracks.every(t => t.stopped));
  assert.equal(pending.contexts.length, 0);
});

test('entire-screen capture is rejected and released', async () => {
  const media = stream();
  media.tracks[0].getSettings = () => ({ displaySurface: 'monitor' });
  const h = harness(async options => {
    assert.equal(options.monitorTypeSurfaces, 'exclude');
    return media;
  });
  await h.capture.startListening('speaker');
  assert.ok(media.tracks.every(t => t.stopped));
  assert.equal(h.capture.analyser.current, null);
});
