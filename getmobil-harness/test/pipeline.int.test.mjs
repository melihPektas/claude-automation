import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { summarize } from '../src/summary.mjs';
import { buildPlaywrightArgs } from '../src/run.mjs';

/**
 * INTEGRATION: birden çok modülü / gerçek dosya pipeline'ını birlikte doğrular.
 */

function tempReport(results, steps) {
  const dir = mkdtempSync(resolve(tmpdir(), 'pipe-'));
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify(results));
  if (steps) writeFileSync(resolve(dir, 'steps.json'), JSON.stringify(steps));
  return resolve(dir, 'results.json');
}

// --- results.json + steps.json entegrasyonu ---

test('pipeline: results + steps birlikte özete iliştirilir', () => {
  const report = {
    stats: { duration: 500, startTime: '2026-01-01T00:00:00Z' },
    suites: [{ specs: [{ title: 'giriş akışı', tests: [{ projectName: 'chromium', status: 'expected', results: [{ duration: 30 }] }] }] }],
  };
  const steps = [{ project: 'chromium', title: 'giriş akışı', steps: [{ title: 'goto', category: 'pw:api', duration: 20 }] }];
  const s = summarize(tempReport(report, steps));
  assert.equal(s.tests[0].steps.length, 1);
  assert.equal(s.tests[0].steps[0].category, 'pw:api');
});

test('pipeline: steps.json yoksa testler boş adım alır (kırılmaz)', () => {
  const report = { suites: [{ specs: [{ title: 't', tests: [{ projectName: 'x', status: 'expected', results: [] }] }] }] };
  const s = summarize(tempReport(report, null));
  assert.deepEqual(s.tests[0].steps, []);
});

test('pipeline: eşleşmeyen adım kaydı teste sızmaz', () => {
  const report = { suites: [{ specs: [{ title: 'A', tests: [{ projectName: 'chromium', status: 'expected', results: [] }] }] }] };
  const steps = [{ project: 'firefox', title: 'A', steps: [{ title: 'x', category: 'pw:api', duration: 1 }] }];
  const s = summarize(tempReport(report, steps));
  assert.deepEqual(s.tests[0].steps, []); // proje uyuşmuyor
});

// Data-driven: farklı test dağılımları uçtan uca doğru sayılır
const scenarios = [
  { name: 'hepsi geçti', tests: [['expected'], ['expected'], ['expected']], passed: 3, ok: true },
  { name: 'bir kaldı', tests: [['expected'], ['unexpected']], passed: 1, failed: 1, ok: false },
  { name: 'karışık', tests: [['expected'], ['skipped'], ['flaky'], ['unexpected']], passed: 2, failed: 1, ok: false },
  { name: 'hepsi atlandı', tests: [['skipped'], ['skipped']], passed: 0, ok: true },
];
for (const sc of scenarios) {
  test(`pipeline: senaryo "${sc.name}" doğru özetlenir`, () => {
    const report = {
      suites: [{ specs: sc.tests.map(([st], i) => ({ title: `t${i}`, tests: [{ projectName: 'chromium', status: st, results: [] }] })) }],
    };
    const s = summarize(tempReport(report, null));
    assert.equal(s.passed, sc.passed);
    if (sc.failed != null) assert.equal(s.failed, sc.failed);
    assert.equal(s.ok, sc.ok);
  });
}

// --- config → run argümanları entegrasyonu ---

const argCases = [
  { cfg: { projects: ['chromium'] }, expect: ['playwright', 'test', '--project', 'chromium'] },
  { cfg: { grep: '@smoke', projects: [] }, expect: ['playwright', 'test', '--grep', '@smoke'] },
  { cfg: { projects: ['chromium', 'firefox'] }, expect: ['playwright', 'test', '--project', 'chromium', '--project', 'firefox'] },
  { cfg: { workers: 4, projects: [] }, expect: ['playwright', 'test', '--workers', '4'] },
  { cfg: { grep: '@smoke', projects: ['webkit'], workers: 2 }, expect: ['playwright', 'test', '--grep', '@smoke', '--project', 'webkit', '--workers', '2'] },
  { cfg: {}, expect: ['playwright', 'test'] },
];
for (const c of argCases) {
  test(`pipeline: config→args ${JSON.stringify(c.cfg)}`, () => {
    assert.deepEqual(buildPlaywrightArgs(c.cfg), c.expect);
  });
}

test('pipeline: multi-browser + grep + workers doğru sırayla birleşir', () => {
  const args = buildPlaywrightArgs({ grep: '@smoke', projects: ['chromium', 'firefox', 'webkit'], workers: 6 });
  assert.equal(args.filter((a) => a === '--project').length, 3);
  assert.ok(args.includes('@smoke'));
  assert.ok(args.includes('6'));
});
