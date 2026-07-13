import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeK6 } from '../src/k6.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const K6 = resolve(here, 'fixtures', 'k6.sample.json');

test('summarizeK6 metrikleri doğru çıkarır', () => {
  const s = summarizeK6(K6, 0);
  assert.equal(s.tool, 'k6');
  assert.equal(s.requests, 100);
  assert.equal(s.avgMs, 120); // yuvarlanmış
  assert.equal(s.p95Ms, 301); // 300.6 → 301
  assert.equal(s.p99Ms, 500); // 500.2 → 500
  assert.equal(s.maxMs, 813); // 812.9 → 813
  assert.equal(s.failRate, 0.02);
  assert.equal(s.checksPassed, 48);
  assert.equal(s.checksFailed, 2);
});

test('summarizeK6 çıkış kodu 0 iken eşikleri geçmiş kabul eder', () => {
  const s = summarizeK6(K6, 0);
  assert.equal(s.ok, true);
  assert.equal(s.thresholdsPassed, true);
});

test('summarizeK6 sıfır olmayan çıkış kodunu eşik ihlali sayar', () => {
  const s = summarizeK6(K6, 99);
  assert.equal(s.ok, false);
  assert.equal(s.thresholdsPassed, false);
});

// --- Ek: eksik metrik / yuvarlama edge case'leri (temp fixture) ---
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

function writeK6(metrics) {
  const dir = mkdtempSync(resolve(tmpdir(), 'k6-'));
  const f = resolve(dir, 'k6.json');
  writeFileSync(f, JSON.stringify({ metrics }));
  return f;
}

test('summarizeK6 eksik metriklerde null döner, çökmez', () => {
  const f = writeK6({});
  const s = summarizeK6(f, 0);
  assert.equal(s.requests, null);
  assert.equal(s.avgMs, null);
  assert.equal(s.p95Ms, null);
});

const roundCases = [
  { avg: 100.4, expected: 100 },
  { avg: 100.5, expected: 101 },
  { avg: 0.2, expected: 0 },
  { avg: 999.9, expected: 1000 },
];
for (const c of roundCases) {
  test(`summarizeK6 ort. süreyi yuvarlar: ${c.avg} → ${c.expected}`, () => {
    const f = writeK6({ http_req_duration: { values: { avg: c.avg } } });
    assert.equal(summarizeK6(f, 0).avgMs, c.expected);
  });
}

test('summarizeK6 checks sayaçlarını taşır', () => {
  const f = writeK6({ checks: { values: { passes: 7, fails: 3 } } });
  const s = summarizeK6(f, 0);
  assert.equal(s.checksPassed, 7);
  assert.equal(s.checksFailed, 3);
});

const exitCases = [
  { code: 0, ok: true },
  { code: 99, ok: false },
  { code: 1, ok: false },
  { code: 104, ok: false },
];
for (const c of exitCases) {
  test(`summarizeK6 çıkış kodu ${c.code} → ok=${c.ok}`, () => {
    const f = writeK6({ http_reqs: { values: { count: 10 } } });
    assert.equal(summarizeK6(f, c.code).ok, c.ok);
  });
}
