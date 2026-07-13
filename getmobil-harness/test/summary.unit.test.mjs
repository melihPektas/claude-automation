import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize } from '../src/summary.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const REPORT = resolve(here, 'fixtures', 'report', 'results.json');
const ALLPASS = resolve(here, 'fixtures', 'report-allpass', 'results.json');

test('summarize toplam/geçen/kalan sayılarını doğru hesaplar', () => {
  const s = summarize(REPORT);
  // geçen + flaky(geçmiş sayılır) = 2 passed, 1 unexpected, 1 skipped
  assert.equal(s.passed, 2);
  assert.equal(s.failed, 1);
  assert.equal(s.skipped, 1);
  assert.equal(s.flaky, 1);
  assert.equal(s.total, s.passed + s.failed + s.skipped);
});

test('summarize ok alanı başarısızlık varsa false döner', () => {
  const s = summarize(REPORT);
  assert.equal(s.ok, false);
});

test('summarize byProject kırılımını üretir (flaky ayrı sayılır)', () => {
  const s = summarize(REPORT);
  assert.equal(s.byProject.chromium.passed, 1); // "geçen test"
  assert.equal(s.byProject.chromium.flaky, 1); // "flaky test" ayrı
  assert.equal(s.byProject.firefox.failed, 1);
  assert.equal(s.byProject.webkit.skipped, 1);
});

test('summarize failures listesine proje adını ekler', () => {
  const s = summarize(REPORT);
  assert.deepEqual(s.failures, ['kalan test [firefox]']);
});

test('summarize stats süresini ve başlangıcını taşır', () => {
  const s = summarize(REPORT, { htmlReport: '/x/index.html' });
  assert.equal(s.durationMs, 4321);
  assert.equal(s.startedAt, '2026-07-13T10:00:00.000Z');
  assert.equal(s.htmlReport, '/x/index.html');
});

test('summarize steps.json adımlarını ilgili teste iliştirir', () => {
  const s = summarize(REPORT);
  const passing = s.tests.find((t) => t.title === 'geçen test');
  assert.equal(passing.steps.length, 2);
  assert.equal(passing.steps[0].category, 'pw:api');
  // adım kaydı olmayan test boş dizi almalı
  const failing = s.tests.find((t) => t.title === 'kalan test');
  assert.deepEqual(failing.steps, []);
});

test('summarize flaky testi geçmiş sayar ama flaky olarak işaretler', () => {
  const s = summarize(REPORT);
  const flaky = s.tests.find((t) => t.title === 'flaky test');
  assert.equal(flaky.status, 'flaky');
});

test('summarize test süresini tüm denemelerin toplamı olarak hesaplar', () => {
  const s = summarize(REPORT);
  const flaky = s.tests.find((t) => t.title === 'flaky test');
  assert.equal(flaky.durationMs, 110); // 50 + 60 (iki deneme)
});

test('summarize tüm testler geçince ok=true döner', () => {
  const s = summarize(ALLPASS);
  assert.equal(s.ok, true);
  assert.equal(s.failed, 0);
  assert.equal(s.passed, 1);
});

test('summarize projectName yoksa "default" kullanır', () => {
  const s = summarize(ALLPASS);
  assert.equal(s.tests[0].project, 'default');
  assert.ok(s.byProject.default);
  assert.equal(s.tests[0].durationMs, 20); // 12 + 8
});

test('summarize adım dosyası olmayan raporda testlere boş adım verir', () => {
  const s = summarize(ALLPASS); // report-allpass dizininde steps.json yok
  assert.deepEqual(s.tests[0].steps, []);
});

// --- Ek: data-driven durum sayımı ve dayanıklılık (temp fixture) ---
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

function writeReport(report) {
  const dir = mkdtempSync(resolve(tmpdir(), 'rep-'));
  const f = resolve(dir, 'results.json');
  writeFileSync(f, JSON.stringify(report));
  return f;
}
function oneTest(status, project = 'chromium') {
  return { suites: [{ specs: [{ title: 't', tests: [{ projectName: project, status, results: [{ duration: 10 }] }] }] }] };
}

const statusCases = [
  { status: 'expected', field: 'passed' },
  { status: 'unexpected', field: 'failed' },
  { status: 'skipped', field: 'skipped' },
  { status: 'flaky', field: 'flaky' },
];
for (const c of statusCases) {
  test(`summarize "${c.status}" durumunu ${c.field} sayar`, () => {
    const s = summarize(writeReport(oneTest(c.status)));
    assert.equal(s[c.field], 1);
  });
}

test('summarize boş suite dizisinde sıfır döner', () => {
  const s = summarize(writeReport({ suites: [] }));
  assert.equal(s.total, 0);
  assert.equal(s.ok, true);
});

test('summarize stats yoksa süre/başlangıç null olur', () => {
  const s = summarize(writeReport(oneTest('expected')));
  assert.equal(s.durationMs, null);
  assert.equal(s.startedAt, null);
});

test('summarize results dizisi yoksa süre 0 olur', () => {
  const r = { suites: [{ specs: [{ title: 't', tests: [{ projectName: 'x', status: 'expected' }] }] }] };
  const s = summarize(writeReport(r));
  assert.equal(s.tests[0].durationMs, 0);
});

test('summarize derin iç içe suite yapısını dolaşır', () => {
  const r = { suites: [{ suites: [{ suites: [{ specs: [{ title: 'derin', tests: [{ projectName: 'x', status: 'expected', results: [] }] }] }] }] }] };
  const s = summarize(writeReport(r));
  assert.equal(s.passed, 1);
});

test('summarize çoklu proje için ayrı byProject üretir', () => {
  const r = { suites: [{ specs: [
    { title: 'a', tests: [{ projectName: 'chromium', status: 'expected', results: [] }] },
    { title: 'b', tests: [{ projectName: 'firefox', status: 'unexpected', results: [] }] },
  ] }] };
  const s = summarize(writeReport(r));
  assert.equal(s.byProject.chromium.passed, 1);
  assert.equal(s.byProject.firefox.failed, 1);
});
