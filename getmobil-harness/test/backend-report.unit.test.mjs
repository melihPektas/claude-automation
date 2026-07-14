import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { writeBackendReport } from '../src/backend-report.mjs';

/**
 * UNIT: backend-report.mjs — API+Locust+Pact JSON'larından HTML rapor üretimi.
 */

function tempReport({ api, locust, pact } = {}) {
  const dir = mkdtempSync(resolve(tmpdir(), 'brep-'));
  const w = (name, obj) => {
    const p = resolve(dir, name);
    writeFileSync(p, JSON.stringify(obj));
    return p;
  };
  const out = resolve(dir, 'index.html');
  const html = readFileSync(
    writeBackendReport({
      apiPath: api ? w('api.json', api) : resolve(dir, 'yok-api.json'),
      locustPath: locust ? w('locust.json', locust) : resolve(dir, 'yok-locust.json'),
      pactPath: pact ? w('pact.json', pact) : resolve(dir, 'yok-pact.json'),
      outPath: out,
    }),
    'utf8',
  );
  return html;
}

const API = {
  ok: true,
  total: 2,
  passed: 2,
  failed: 0,
  durationMs: 80,
  target: 'http://localhost:8089',
  tests: [
    { title: 'GET testi', status: 'passed' },
    { title: 'POST testi', status: 'passed' },
  ],
};
const LOCUST = {
  ok: true,
  requests: 92,
  failures: 0,
  failRate: 0,
  avgMs: 3,
  maxMs: 8,
  users: 5,
  duration: '6s',
  endpoints: [{ name: 'GET /api/products', method: 'GET', requests: 25, failures: 0, avgMs: 3, p95Ms: 6 }],
};
const PACT = {
  ok: true,
  consumer: { name: 'getmobil-dashboard', total: 3, passed: 3, failed: 0 },
  provider: { name: 'getmobil-api', verified: true, url: 'http://localhost:8089' },
  interactions: [{ title: 'kontrat: liste döner', status: 'passed' }],
};

test('rapor üç bölümü de BAŞARILI rozetiyle üretir', () => {
  const html = tempReport({ api: API, locust: LOCUST, pact: PACT });
  assert.equal((html.match(/BAŞARILI/g) ?? []).length >= 3, true);
  assert.ok(html.includes('API Testleri'));
  assert.ok(html.includes('Locust Yük Testi'));
  assert.ok(html.includes('Pact Contract Testi'));
});

test('rapor API test satırlarını ve sayıları içerir', () => {
  const html = tempReport({ api: API });
  assert.ok(html.includes('GET testi'));
  assert.ok(html.includes('POST testi'));
  assert.ok(html.includes('✓ GEÇTİ'));
});

test('rapor başarısız API testini KALDI olarak işaretler', () => {
  const failed = { ...API, ok: false, passed: 1, failed: 1, tests: [{ title: 'kırık test', status: 'failed' }] };
  const html = tempReport({ api: failed });
  assert.ok(html.includes('BAŞARISIZ'));
  assert.ok(html.includes('✗ KALDI'));
});

test('rapor Locust endpoint kırılımını ve metrikleri içerir', () => {
  const html = tempReport({ locust: LOCUST });
  assert.ok(html.includes('GET /api/products'.replace('GET ', ''))); // endpoint adı
  assert.ok(html.includes('92')); // istek sayısı
  assert.ok(html.includes('locust.html')); // grafikli rapora link
});

test('rapor Pact consumer/provider durumunu içerir', () => {
  const html = tempReport({ pact: PACT });
  assert.ok(html.includes('3/3'));
  assert.ok(html.includes('getmobil-dashboard'));
  assert.ok(html.includes('liste döner'));
});

test('veri yoksa bölümler "çalıştırılmadı" gösterir', () => {
  const html = tempReport({});
  assert.equal((html.match(/Henüz çalıştırılmadı/g) ?? []).length, 3);
  assert.equal((html.match(/çalıştırılmadı<\/span>/g) ?? []).length >= 3, true); // rozetler
});

test('rapor HTML-injection karakterlerini kaçışlar', () => {
  const evil = { ...API, tests: [{ title: '<script>alert(1)</script>', status: 'passed' }] };
  const html = tempReport({ api: evil });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('rapor geçerli, kendi-içinde bir HTML belgesidir', () => {
  const html = tempReport({ api: API });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('</html>'));
  assert.ok(!/src=|href="http/.test(html.replace(/href="\.\/locust\.html"/, ''))); // dış kaynak yok
});
