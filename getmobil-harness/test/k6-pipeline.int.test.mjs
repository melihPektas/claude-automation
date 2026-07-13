import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { summarizeK6 } from '../src/k6.mjs';

/**
 * INTEGRATION: k6 özet JSON dosyası → summarizeK6 dosya-okuma pipeline'ı.
 * Gerçek dosya sistemi round-trip'i ile çeşitli metrik senaryolarını doğrular.
 */
function writeK6File(metrics) {
  const dir = mkdtempSync(resolve(tmpdir(), 'k6i-'));
  const f = resolve(dir, 'k6-summary.json');
  writeFileSync(f, JSON.stringify({ metrics }));
  return f;
}

// Metrik matrisi
const metricCases = [
  { reqs: 100, avg: 120, p95: 300, fail: 0, ok: true },
  { reqs: 500, avg: 80, p95: 200, fail: 0.01, ok: true },
  { reqs: 50, avg: 2000, p95: 4000, fail: 0.5, ok: true }, // ok, çıkış kodu 0 ise
  { reqs: 1000, avg: 45, p95: 90, fail: 0, ok: true },
];

for (const c of metricCases) {
  test(`k6-pipeline: reqs=${c.reqs} avg=${c.avg} p95=${c.p95}`, () => {
    const f = writeK6File({
      http_reqs: { values: { count: c.reqs, rate: 10 } },
      http_req_duration: { values: { avg: c.avg, 'p(95)': c.p95, 'p(99)': c.p95 + 50, max: c.p95 + 100 } },
      http_req_failed: { values: { rate: c.fail } },
    });
    const s = summarizeK6(f, 0);
    assert.equal(s.requests, c.reqs);
    assert.equal(s.avgMs, c.avg);
    assert.equal(s.p95Ms, c.p95);
    assert.equal(s.failRate, c.fail);
  });
}

// Eşik / çıkış kodu matrisi
const thresholdCases = [
  { code: 0, ok: true },
  { code: 99, ok: false },
  { code: 104, ok: false },
];
for (const c of thresholdCases) {
  test(`k6-pipeline: çıkış kodu ${c.code} → thresholdsPassed=${c.ok}`, () => {
    const f = writeK6File({ http_reqs: { values: { count: 10 } } });
    const s = summarizeK6(f, c.code);
    assert.equal(s.thresholdsPassed, c.ok);
    assert.equal(s.ok, c.ok);
  });
}

test('k6-pipeline: checks alanları uçtan uca taşınır', () => {
  const f = writeK6File({ checks: { values: { passes: 40, fails: 2 } } });
  const s = summarizeK6(f, 0);
  assert.equal(s.checksPassed, 40);
  assert.equal(s.checksFailed, 2);
});

test('k6-pipeline: p99 ve max uçtan uca yuvarlanır', () => {
  const f = writeK6File({ http_req_duration: { values: { 'p(99)': 499.6, max: 812.4 } } });
  const s = summarizeK6(f, 0);
  assert.equal(s.p99Ms, 500);
  assert.equal(s.maxMs, 812);
});

test('k6-pipeline: rps değeri taşınır', () => {
  const f = writeK6File({ http_reqs: { values: { count: 100, rate: 9.87 } } });
  assert.equal(summarizeK6(f, 0).rps, 9.87);
});
