import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { summarize } from '../src/summary.mjs';

/**
 * INTEGRATION: summarize + gerçek results.json/steps.json dosya pipeline'ı,
 * çok-projeli ve çok-durumlu senaryo matrisi.
 */
function write(results, steps) {
  const dir = mkdtempSync(resolve(tmpdir(), 'sm-'));
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify(results));
  if (steps) writeFileSync(resolve(dir, 'steps.json'), JSON.stringify(steps));
  return resolve(dir, 'results.json');
}
function spec(title, project, status) {
  return { title, tests: [{ projectName: project, status, results: [{ duration: 10 }] }] };
}

const projects = ['chromium', 'firefox', 'webkit'];
const statuses = ['expected', 'unexpected', 'skipped', 'flaky'];

// Her (proje × durum) kombinasyonu doğru byProject kırılımı üretmeli
for (const project of projects) {
  for (const status of statuses) {
    test(`summarize-matrix: ${project}/${status} byProject kırılımı`, () => {
      const s = summarize(write({ suites: [{ specs: [spec('t', project, status)] }] }));
      const bucket = status === 'expected' ? 'passed' : status === 'unexpected' ? 'failed' : status;
      assert.equal(s.byProject[project][bucket], 1);
    });
  }
}

// Çok-projeli birleşik raporlar
const multiCases = [
  { name: '3 proje hepsi geçti', specs: projects.map((p) => spec('t', p, 'expected')), passed: 3, ok: true },
  { name: '2 geçen 1 kalan', specs: [spec('a', 'chromium', 'expected'), spec('b', 'firefox', 'expected'), spec('c', 'webkit', 'unexpected')], passed: 2, failed: 1, ok: false },
  { name: 'her projede 1 kalan', specs: projects.map((p) => spec('t', p, 'unexpected')), passed: 0, failed: 3, ok: false },
];
for (const c of multiCases) {
  test(`summarize-matrix: ${c.name}`, () => {
    const s = summarize(write({ suites: [{ specs: c.specs }] }));
    assert.equal(s.passed, c.passed);
    if (c.failed != null) assert.equal(s.failed, c.failed);
    assert.equal(s.ok, c.ok);
  });
}

// failures listesi proje etiketiyle uçtan uca
test('summarize-matrix: failures her başarısız için proje etiketi taşır', () => {
  const s = summarize(write({ suites: [{ specs: [spec('kırık A', 'firefox', 'unexpected'), spec('kırık B', 'webkit', 'unexpected')] }] }));
  assert.ok(s.failures.includes('kırık A [firefox]'));
  assert.ok(s.failures.includes('kırık B [webkit]'));
});

// steps eşleşmesi çok-projeli senaryoda doğru
test('summarize-matrix: adımlar doğru projeye eşleşir', () => {
  const results = { suites: [{ specs: [spec('ortak', 'chromium', 'expected'), spec('ortak', 'firefox', 'expected')] }] };
  const steps = [
    { project: 'chromium', title: 'ortak', steps: [{ title: 'c-step', category: 'pw:api', duration: 1 }] },
    { project: 'firefox', title: 'ortak', steps: [{ title: 'f-step', category: 'pw:api', duration: 2 }, { title: 'f-step2', category: 'expect', duration: 1 }] },
  ];
  const s = summarize(write(results, steps));
  const chr = s.tests.find((t) => t.project === 'chromium');
  const ff = s.tests.find((t) => t.project === 'firefox');
  assert.equal(chr.steps.length, 1);
  assert.equal(ff.steps.length, 2);
});

// büyük suite dayanıklılığı
for (const n of [10, 25, 50]) {
  test(`summarize-matrix: ${n} testlik büyük suite doğru sayılır`, () => {
    const specs = Array.from({ length: n }, (_, i) => spec(`t${i}`, 'chromium', i % 5 === 0 ? 'unexpected' : 'expected'));
    const s = summarize(write({ suites: [{ specs }] }));
    assert.equal(s.total, n);
    const expectedFail = Array.from({ length: n }, (_, i) => i).filter((i) => i % 5 === 0).length;
    assert.equal(s.failed, expectedFail);
  });
}
