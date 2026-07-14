import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLocust, attachExchanges } from '../src/backend.mjs';

/**
 * UNIT: backend.mjs saf mantığı — Locust çıktısı özetleme + exchange iliştirme.
 */

// ---------------- summarizeLocust ----------------

function locustStats(entries) {
  // Gerçek locust --json çıktısı: log satırları YOK, saf JSON dizisi stdout'ta
  return JSON.stringify(entries);
}

const ENTRY = {
  name: 'GET /api/products',
  method: 'GET',
  num_requests: 10,
  num_failures: 0,
  total_response_time: 50,
  max_response_time: 9,
  response_times: { 3: 5, 5: 3, 9: 2 },
};

test('summarizeLocust temel metrikleri hesaplar', () => {
  const s = summarizeLocust(locustStats([ENTRY]), 0, { users: 5, duration: '10s' });
  assert.equal(s.ok, true);
  assert.equal(s.requests, 10);
  assert.equal(s.failures, 0);
  assert.equal(s.avgMs, 5); // 50/10
  assert.equal(s.maxMs, 9);
  assert.equal(s.users, 5);
  assert.equal(s.duration, '10s');
});

test('summarizeLocust endpoint kırılımı üretir', () => {
  const s = summarizeLocust(locustStats([ENTRY]), 0);
  assert.equal(s.endpoints.length, 1);
  assert.equal(s.endpoints[0].name, 'GET /api/products');
  assert.equal(s.endpoints[0].avgMs, 5);
});

test('summarizeLocust histogramdan p95 hesaplar', () => {
  // 10 istek: p95 → 10. istek (ceil(10*0.95)=10) → kümülatif 5,8,10 → 9ms kovası
  const s = summarizeLocust(locustStats([ENTRY]), 0);
  assert.equal(s.endpoints[0].p95Ms, 9);
});

test('summarizeLocust çoklu endpoint toplamlarını birleştirir', () => {
  const e2 = { ...ENTRY, name: 'POST /api/products', method: 'POST', num_requests: 5, num_failures: 1, total_response_time: 100, max_response_time: 40 };
  const s = summarizeLocust(locustStats([ENTRY, e2]), 0);
  assert.equal(s.requests, 15);
  assert.equal(s.failures, 1);
  assert.equal(s.avgMs, 10); // 150/15
  assert.equal(s.maxMs, 40);
});

test('summarizeLocust hata oranı %5 üstündeyse ok=false', () => {
  const bad = { ...ENTRY, num_requests: 10, num_failures: 1 }; // %10
  const s = summarizeLocust(locustStats([bad]), 0);
  assert.equal(s.failRate, 0.1);
  assert.equal(s.ok, false);
});

test('summarizeLocust sıfır olmayan çıkış kodunda ok=false', () => {
  const s = summarizeLocust(locustStats([ENTRY]), 1);
  assert.equal(s.ok, false);
});

test('summarizeLocust çıktıda JSON yoksa hata döner (çökmez)', () => {
  const s = summarizeLocust('hic json yok burada', 0);
  assert.equal(s.ok, false);
  assert.match(s.error, /bulunamadı/);
});

test('summarizeLocust bozuk JSON diziyi hata olarak raporlar', () => {
  const s = summarizeLocust('[ { bozuk json ]', 0);
  assert.equal(s.ok, false);
  assert.match(s.error, /ayrıştırılamadı/);
});

test('summarizeLocust boş dizide sıfır istek/failRate=0', () => {
  const s = summarizeLocust('[]', 0);
  assert.equal(s.requests, 0);
  assert.equal(s.failRate, 0);
  assert.equal(s.avgMs, null);
});

// Data-driven: yüzdelik hesabı farklı dağılımlarda
const pctCases = [
  { hist: { 10: 10 }, total: 10, expected: 10 }, // tek kova
  { hist: { 1: 9, 100: 1 }, total: 10, expected: 100 }, // p95 → son istek
  { hist: { 5: 95, 50: 5 }, total: 100, expected: 5 }, // p95=95. istek ilk kovada
];
for (const c of pctCases) {
  test(`summarizeLocust p95 dağılımı ${JSON.stringify(c.hist)} → ${c.expected}`, () => {
    const e = { ...ENTRY, num_requests: c.total, response_times: c.hist };
    const s = summarizeLocust(locustStats([e]), 0);
    assert.equal(s.endpoints[0].p95Ms, c.expected);
  });
}

// ---------------- attachExchanges ----------------

test('attachExchanges başlık eşleşen kayıtları iliştirir', () => {
  const tests = [{ title: 'A', status: 'passed' }, { title: 'B', status: 'passed' }];
  const ex = { A: [{ method: 'GET', url: '/x', status: 200 }] };
  const out = attachExchanges(tests, ex);
  assert.equal(out[0].exchanges.length, 1);
  assert.equal(out[0].exchanges[0].url, '/x');
  assert.deepEqual(out[1].exchanges, []); // eşleşmeyen boş dizi alır
});

test('attachExchanges orijinal alanları korur', () => {
  const out = attachExchanges([{ title: 'A', status: 'failed' }], {});
  assert.equal(out[0].status, 'failed');
  assert.deepEqual(out[0].exchanges, []);
});

test('attachExchanges null/boş girdilerde çökmez', () => {
  assert.deepEqual(attachExchanges(null, {}), []);
  assert.deepEqual(attachExchanges(undefined, {}), []);
  assert.deepEqual(attachExchanges([], { X: [] }), []);
});

test('attachExchanges çoklu exchange kaydını taşır', () => {
  const ex = { A: [{ status: 200 }, { status: 201 }] };
  const out = attachExchanges([{ title: 'A' }], ex);
  assert.equal(out[0].exchanges.length, 2);
});
