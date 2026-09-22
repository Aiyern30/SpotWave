const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/lyrics.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('exports', source)(moduleUnderTest.exports);
const { parseSyncedLyrics, lyricIndexAt, estimateLyricPosition } = moduleUnderTest.exports;

test('LRC timestamps support repeated lines, fractional precision and instrumental breaks', () => {
  assert.deepEqual(parseSyncedLyrics('[ar:Example]\n[01:02.3][00:02.045]Repeated\n[00:04]\n[00:03.25]Middle'), [
    { time: 2045, text: 'Repeated' }, { time: 3250, text: 'Middle' },
    { time: 4000, text: '' }, { time: 62300, text: 'Repeated' },
  ]);
});
test('LRC positive offset advances timestamps, negative offset delays them', () => {
  assert.equal(parseSyncedLyrics('[offset:200]\n[00:01.00]Line')[0].time, 800);
  assert.equal(parseSyncedLyrics('[offset:-200]\n[00:01.00]Line')[0].time, 1200);
});
test('active line is correct before vocals, at boundaries and after seeking backward', () => {
  const lines = parseSyncedLyrics('[00:01]First\n[00:03]\n[00:05]Last');
  assert.equal(lyricIndexAt(lines, 999), -1);
  assert.equal(lyricIndexAt(lines, 1000), 0);
  assert.equal(lyricIndexAt(lines, 4000), 1);
  assert.equal(lyricIndexAt(lines, 5000), 2);
  assert.equal(lyricIndexAt(lines, 1500), 0);
  assert.equal(lyricIndexAt([], 1500), -1);
});
test('clock uses elapsed time, stops while paused and clamps stale samples and track end', () => {
  assert.equal(estimateLyricPosition(1000, 100, 475, true, 10000), 1375);
  assert.equal(estimateLyricPosition(1000, 100, 475, false, 10000), 1000);
  assert.equal(estimateLyricPosition(1000, 100, 10000, true, 10000), 6000);
  assert.equal(estimateLyricPosition(9900, 100, 500, true, 10000), 10000);
});
