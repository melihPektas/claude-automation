import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, parseArgs } from '../src/config.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const FAKE_E2E = resolve(here, 'fixtures', 'fake-e2e');

test('loadConfig --browsers listesini diziye böler', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E, '--browsers', 'chromium,firefox,webkit']);
  assert.deepEqual(c.projects, ['chromium', 'firefox', 'webkit']);
});

test('loadConfig --grep ve --workers argümanlarını alır', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E, '--grep', '@smoke', '--workers', '4']);
  assert.equal(c.grep, '@smoke');
  assert.equal(c.workers, '4');
});

test('loadConfig tek --project değerini projects dizisine koyar', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E, '--project', 'webkit']);
  assert.deepEqual(c.projects, ['webkit']);
});

test('loadConfig argümansızken projects boş dizi olur', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E]);
  assert.deepEqual(c.projects, []);
  assert.equal(c.grep, null);
});

test('loadConfig rapor yollarını e2e dizinine göre çözer', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E]);
  assert.equal(c.reportPath, resolve(FAKE_E2E, 'reports', 'results.json'));
  assert.equal(c.htmlReport, resolve(FAKE_E2E, 'reports', 'html', 'index.html'));
});

test('loadConfig geçersiz e2e dizininde hata fırlatır', () => {
  assert.throws(() => loadConfig(['--e2e-dir', '/olmayan/dizin/xyz']), /bulunamadı/);
});

test('loadConfig boş/whitespace tarayıcı girdilerini temizler', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E, '--browsers', 'chromium, , firefox,']);
  assert.deepEqual(c.projects, ['chromium', 'firefox']);
});

// --- parseArgs birim testleri (mutation kapsamını artırır) ---

test('parseArgs değerli argümanı okur', () => {
  assert.deepEqual(parseArgs(['--grep', '@smoke']), { grep: '@smoke' });
});

test('parseArgs değeri olmayan (son) bayrağı true yapar', () => {
  assert.deepEqual(parseArgs(['--headed']), { headed: true });
});

test('parseArgs ardışık bayrakları ayırır (değer sızmaz)', () => {
  assert.deepEqual(parseArgs(['--a', '--b', '2']), { a: true, b: '2' });
});

test('parseArgs -- ile başlamayan pozisyonel argümanları yok sayar', () => {
  assert.deepEqual(parseArgs(['pozisyonel', '--x', '1']), { x: '1' });
});

test('parseArgs boş dizi için boş nesne döner', () => {
  assert.deepEqual(parseArgs([]), {});
});

test('parseArgs bayrak adını -- öneki olmadan alır', () => {
  assert.deepEqual(parseArgs(['--workers', '8']), { workers: '8' });
});

// --- Ek: data-driven argüman ayrıştırma ---
const browserCases = [
  { input: 'chromium', expected: ['chromium'] },
  { input: 'chromium,firefox', expected: ['chromium', 'firefox'] },
  { input: 'chromium,firefox,webkit', expected: ['chromium', 'firefox', 'webkit'] },
  { input: ' chromium , firefox ', expected: ['chromium', 'firefox'] },
  { input: ',,chromium,,', expected: ['chromium'] },
];
for (const c of browserCases) {
  test(`loadConfig --browsers "${c.input}" → [${c.expected}]`, () => {
    const cfg = loadConfig(['--e2e-dir', FAKE_E2E, '--browsers', c.input]);
    assert.deepEqual(cfg.projects, c.expected);
  });
}

const parseCases = [
  { argv: ['--a', 'b'], expected: { a: 'b' } },
  { argv: ['--flag'], expected: { flag: true } },
  { argv: ['--a', '1', '--b', '2'], expected: { a: '1', b: '2' } },
  { argv: ['--a', '--b'], expected: { a: true, b: true } },
  { argv: ['x', 'y', '--z', '3'], expected: { z: '3' } },
  { argv: [], expected: {} },
];
for (const c of parseCases) {
  test(`parseArgs ${JSON.stringify(c.argv)} → ${JSON.stringify(c.expected)}`, () => {
    assert.deepEqual(parseArgs(c.argv), c.expected);
  });
}

test('loadConfig grep null varsayılanı', () => {
  assert.equal(loadConfig(['--e2e-dir', FAKE_E2E]).grep, null);
});

test('loadConfig workers null varsayılanı', () => {
  assert.equal(loadConfig(['--e2e-dir', FAKE_E2E]).workers, null);
});

test('loadConfig reportPath/htmlReport aynı e2e köküne bağlı', () => {
  const c = loadConfig(['--e2e-dir', FAKE_E2E]);
  assert.ok(c.reportPath.startsWith(FAKE_E2E));
  assert.ok(c.htmlReport.startsWith(FAKE_E2E));
});
