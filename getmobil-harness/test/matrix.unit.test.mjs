import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { summarize } from '../src/summary.mjs';
import { summarizeK6 } from '../src/k6.mjs';

/**
 * UNIT: saf fonksiyonların geniş girdi aralıklarında davranış matrisi.
 */
function repFile(report) {
  const dir = mkdtempSync(resolve(tmpdir(), 'm-'));
  const f = resolve(dir, 'results.json');
  writeFileSync(f, JSON.stringify(report));
  return f;
}
function k6File(metrics) {
  const dir = mkdtempSync(resolve(tmpdir(), 'mk-'));
  const f = resolve(dir, 'k6.json');
  writeFileSync(f, JSON.stringify({ metrics }));
  return f;
}

// k6 yuvarlama süpürmesi (Math.round davranışı)
const roundSweep = [
  [0, 0], [0.4, 0], [0.5, 1], [1.5, 2], [2.5, 3], [10.49, 10],
  [10.5, 11], [99.99, 100], [123.45, 123], [999.5, 1000], [1000.4, 1000],
];
for (const [input, expected] of roundSweep) {
  test(`k6 yuvarlama: ${input} → ${expected}`, () => {
    assert.equal(summarizeK6(k6File({ http_req_duration: { values: { avg: input } } }), 0).avgMs, expected);
  });
}

// summarize: N geçen test → total=N, ok=true
for (const n of [1, 2, 5, 10, 25]) {
  test(`summarize ${n} geçen test → total=${n}`, () => {
    const specs = Array.from({ length: n }, (_, i) => ({
      title: `t${i}`,
      tests: [{ projectName: 'chromium', status: 'expected', results: [{ duration: 1 }] }],
    }));
    const s = summarize(repFile({ suites: [{ specs }] }));
    assert.equal(s.total, n);
    assert.equal(s.passed, n);
    assert.equal(s.ok, true);
  });
}

// summarize: failed sayısı ok'u belirler
for (const [pass, fail] of [[3, 0], [3, 1], [0, 2], [10, 3]]) {
  test(`summarize ${pass} geçen / ${fail} kalan → ok=${fail === 0}`, () => {
    const specs = [
      ...Array.from({ length: pass }, (_, i) => ({ title: `p${i}`, tests: [{ projectName: 'x', status: 'expected', results: [] }] })),
      ...Array.from({ length: fail }, (_, i) => ({ title: `f${i}`, tests: [{ projectName: 'x', status: 'unexpected', results: [] }] })),
    ];
    const s = summarize(repFile({ suites: [{ specs }] }));
    assert.equal(s.passed, pass);
    assert.equal(s.failed, fail);
    assert.equal(s.ok, fail === 0);
  });
}

// summarize: süre toplama (çoklu results)
for (const durations of [[10], [10, 20], [5, 5, 5], [100, 200, 300]]) {
  const total = durations.reduce((a, b) => a + b, 0);
  test(`summarize süre toplamı [${durations}] → ${total}`, () => {
    const s = summarize(repFile({ suites: [{ specs: [{ title: 't', tests: [{ projectName: 'x', status: 'flaky', results: durations.map((d) => ({ duration: d })) }] }] }] }));
    assert.equal(s.tests[0].durationMs, total);
  });
}

// Watcher canlı demo: yeni eklenen test piramidi otomatik güncellemeli
test('summarize tek skipped test toplamda sayılır', () => {
  const s = summarize(repFile({ suites: [{ specs: [{ title: 't', tests: [{ projectName: 'x', status: 'skipped', results: [] }] }] }] }));
  assert.equal(s.total, 1);
  assert.equal(s.skipped, 1);
});
