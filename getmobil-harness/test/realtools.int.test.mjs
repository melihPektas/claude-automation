import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseUnitTap } from '../src/quality.mjs';
import { loadConfig } from '../src/config.mjs';
import { summarizeK6 } from '../src/k6.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * INTEGRATION: gerçek araçlarla uçtan uca (subprocess, gerçek dosya sistemi).
 */

/** Geçici bir node:test dosyası koşup TAP çıktısını döndürür. */
function runNodeTest(body) {
  const dir = mkdtempSync(resolve(tmpdir(), 'nt-'));
  const f = resolve(dir, 'x.test.mjs');
  writeFileSync(f, body);
  // node:test içinden alt node:test koşarken bağlam env'lerini temizle
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const r = spawnSync('node', ['--test', '--test-reporter=tap', f], { encoding: 'utf8', env });
  return r.stdout + r.stderr;
}

const tapScenarios = [
  {
    name: 'iki geçen',
    body: `import {test} from 'node:test';\ntest('bir',()=>{});\ntest('iki',()=>{});`,
    passed: 2,
    failed: 0,
    ok: true,
  },
  {
    name: 'bir kalan',
    body: `import {test} from 'node:test';import assert from 'node:assert';\ntest('ok1',()=>{});\ntest('fail1',()=>assert.equal(1,2));`,
    passed: 1,
    failed: 1,
    ok: false,
  },
  {
    name: 'üç geçen',
    body: `import {test} from 'node:test';\ntest('a',()=>{});\ntest('b',()=>{});\ntest('c',()=>{});`,
    passed: 3,
    failed: 0,
    ok: true,
  },
];

for (const sc of tapScenarios) {
  test(`realtools: gerçek node:test TAP çıktısı ayrıştırılır — ${sc.name}`, () => {
    const tap = runNodeTest(sc.body);
    const s = parseUnitTap(tap, sc.ok ? 0 : 1);
    assert.equal(s.passed, sc.passed);
    assert.equal(s.failed, sc.failed);
    assert.equal(s.ok, sc.ok);
    assert.equal(s.tests.length, sc.passed + sc.failed);
  });
}

test('realtools: gerçek TAP test adlarını korur', () => {
  const tap = runNodeTest(`import {test} from 'node:test';\ntest('özel isim ışĞ',()=>{});`);
  const s = parseUnitTap(tap, 0);
  assert.ok(s.tests.some((t) => t.title.includes('özel isim')));
});

// --- Gerçek e2e dizinine karşı config ---

const REAL_E2E = resolve(here, '..', '..', 'getmobil');

test('realtools: loadConfig gerçek getmobil dizinini bulur', { skip: !existsSync(resolve(REAL_E2E, 'package.json')) }, () => {
  const c = loadConfig(['--e2e-dir', REAL_E2E, '--browsers', 'chromium,firefox']);
  assert.deepEqual(c.projects, ['chromium', 'firefox']);
  assert.ok(c.reportPath.endsWith('results.json'));
  assert.ok(c.reportPath.startsWith(REAL_E2E));
});

test('realtools: gerçek k6-summary varsa özetlenebilir', () => {
  const k6 = resolve(here, '..', 'k6-summary.json');
  if (!existsSync(k6)) return; // henüz koşulmadıysa atla
  const s = summarizeK6(k6, 0);
  assert.equal(s.tool, 'k6');
  assert.ok(typeof s.ok === 'boolean');
});
