import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUnitTap, summarizeMutation } from '../src/quality.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const MUT = resolve(here, 'fixtures', 'mutation.sample.json');

// ---------------- parseUnitTap ----------------

const TAP_PASS = `TAP version 13
ok 1 - ilk test
ok 2 - ikinci test
1..2
# tests 2
# pass 2
# fail 0
# duration_ms 12.5`;

const TAP_MIXED = `TAP version 13
ok 1 - geçen
not ok 2 - kalan
1..2
# tests 2
# pass 1
# fail 1
# duration_ms 30`;

test('parseUnitTap tümü geçince ok=true', () => {
  const s = parseUnitTap(TAP_PASS, 0);
  assert.equal(s.ok, true);
  assert.equal(s.total, 2);
  assert.equal(s.passed, 2);
  assert.equal(s.failed, 0);
});

test('parseUnitTap süreyi okur', () => {
  assert.equal(parseUnitTap(TAP_PASS, 0).durationMs, 12.5);
});

test('parseUnitTap test adlarını ve durumlarını çıkarır', () => {
  const s = parseUnitTap(TAP_PASS, 0);
  assert.equal(s.tests.length, 2);
  assert.deepEqual(s.tests[0], { title: 'ilk test', status: 'passed' });
});

test('parseUnitTap başarısız testi failed işaretler', () => {
  const s = parseUnitTap(TAP_MIXED, 1);
  assert.equal(s.ok, false);
  assert.equal(s.failed, 1);
  const fail = s.tests.find((t) => t.title === 'kalan');
  assert.equal(fail.status, 'failed');
});

test('parseUnitTap fail=0 ama çıkış kodu !=0 ise ok=false', () => {
  const s = parseUnitTap(TAP_PASS, 1);
  assert.equal(s.ok, false);
});

test('parseUnitTap dosya-seviyesi (.mjs) rollup satırlarını dışlar', () => {
  const tap = `ok 1 - test/foo.unit.test.mjs
ok 2 - gerçek test
# tests 1
# pass 1
# fail 0`;
  const s = parseUnitTap(tap, 0);
  assert.equal(s.tests.length, 1);
  assert.equal(s.tests[0].title, 'gerçek test');
});

test('parseUnitTap boş çıktıda çökmüyor', () => {
  const s = parseUnitTap('', 0);
  assert.equal(s.passed, 0);
  assert.deepEqual(s.tests, []);
});

// Data-driven: çeşitli TAP kombinasyonları
const tapCases = [
  { name: 'yorumlu isim', line: 'ok 3 - test adı # SKIP', title: 'test adı' },
  { name: 'sade', line: 'ok 4 - basit', title: 'basit' },
  { name: 'not ok', line: 'not ok 5 - hata', title: 'hata', failed: true },
];
for (const c of tapCases) {
  test(`parseUnitTap satırı ayrıştırır: ${c.name}`, () => {
    const s = parseUnitTap(c.line + '\n# pass 1\n# fail 0', 0);
    const t = s.tests.find((x) => x.title === c.title);
    assert.ok(t, 'test bulunmalı');
    assert.equal(t.status, c.failed ? 'failed' : 'passed');
  });
}

// ---------------- summarizeMutation ----------------

test('summarizeMutation genel skoru doğru hesaplar', () => {
  const s = summarizeMutation(MUT);
  // killed=4, timeout=1, survived=2, noCoverage=1 → (5)/(8)=62.5
  assert.equal(s.killed, 4);
  assert.equal(s.timeout, 1);
  assert.equal(s.survived, 2);
  assert.equal(s.noCoverage, 1);
  assert.equal(s.score, 62.5);
  assert.equal(s.total, 8);
});

test('summarizeMutation dosya bazında skor üretir', () => {
  const s = summarizeMutation(MUT);
  // a.mjs: 3 killed / 4 = 75
  assert.equal(s.byFile['src/a.mjs'].score, 75);
  // b.mjs: (1 killed + 1 timeout) / 4 = 50
  assert.equal(s.byFile['src/b.mjs'].score, 50);
});

test('summarizeMutation eşik >=60 ise ok=true', () => {
  assert.equal(summarizeMutation(MUT).ok, true);
});

// Data-driven skor hesabı (saf fonksiyon davranışı)
const scoreCases = [
  { killed: 10, timeout: 0, survived: 0, noCoverage: 0, expected: 100 },
  { killed: 0, timeout: 0, survived: 10, noCoverage: 0, expected: 0 },
  { killed: 5, timeout: 5, survived: 0, noCoverage: 0, expected: 100 },
  { killed: 3, timeout: 0, survived: 1, noCoverage: 0, expected: 75 },
];
for (const c of scoreCases) {
  test(`summarizeMutation skoru: k${c.killed}/t${c.timeout}/s${c.survived}/n${c.noCoverage} → ${c.expected}%`, async () => {
    // Geçici fixture yaz
    const { writeFileSync, mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(resolve(tmpdir(), 'mut-'));
    const f = resolve(dir, 'm.json');
    writeFileSync(
      f,
      JSON.stringify({
        files: {
          'src/x.mjs': {
            mutants: [
              ...Array(c.killed).fill({ status: 'Killed' }),
              ...Array(c.timeout).fill({ status: 'Timeout' }),
              ...Array(c.survived).fill({ status: 'Survived' }),
              ...Array(c.noCoverage).fill({ status: 'NoCoverage' }),
            ],
          },
        },
      }),
    );
    assert.equal(summarizeMutation(f).score, c.expected);
  });
}
