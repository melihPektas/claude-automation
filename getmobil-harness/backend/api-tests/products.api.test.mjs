import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * API testleri — WireMock mock backend'ine karşı tam CRUD doğrulaması.
 * Tüm HTTP metotları kapsanır: GET, POST, PUT, PATCH, DELETE (+ bad case'ler).
 * Mock DİNAMİK yanıt verir (id/body echo, rastgele stok, zaman damgası, UUID).
 *
 * Her istek/yanıt çifti kaydedilir ve reports/api-exchanges.json'a yazılır —
 * dashboard, test satırının üzerine gelince gerçek yanıtı gösterir.
 */
const BASE = process.env.WIREMOCK_URL ?? 'http://localhost:8089';
const here = fileURLToPath(new URL('.', import.meta.url));
const EXCHANGES_FILE = resolve(here, '..', '..', 'reports', 'api-exchanges.json');

/** test adı → o testte yapılan [{method,url,requestBody,status,responseBody}] listesi */
const exchanges = {};

/** fetch sarmalayıcı: isteği yapar, istek/yanıt çiftini test adı altında kaydeder. */
async function api(t, method, path, body) {
  const opts = { method };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text.slice(0, 200);
  }
  (exchanges[t.name] ??= []).push({
    method,
    url: path,
    requestBody: body ?? null,
    status: res.status,
    responseBody: parsed,
  });
  return { res, body: parsed };
}

before(async () => {
  const res = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`WireMock ayakta değil: ${BASE} — önce mock sunucuyu başlatın`);
  }
});

after(() => {
  mkdirSync(dirname(EXCHANGES_FILE), { recursive: true });
  writeFileSync(EXCHANGES_FILE, JSON.stringify(exchanges, null, 2));
});

// ---------- GET ----------

test('GET /api/health → 200 UP', async (t) => {
  const { res, body } = await api(t, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(body.status, 'UP');
});

test('GET /api/products → 200, ürün listesi döner', async (t) => {
  const { res, body } = await api(t, 'GET', '/api/products');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(body.total, 3);
  assert.equal(body.items.length, 3);
  assert.ok(body.items[0].name.includes('iPhone'));
});

test('GET /api/products/{id} → dinamik: id yanıtta echo edilir', async (t) => {
  const { res, body } = await api(t, 'GET', '/api/products/42');
  assert.equal(res.status, 200);
  assert.equal(body.id, 42);
  assert.equal(body.name, 'Yenilenmiş Ürün #42');
});

test('GET /api/products/{id} → dinamik: her istekte farklı traceId (UUID)', async (t) => {
  const { body: a } = await api(t, 'GET', '/api/products/1');
  const { body: b } = await api(t, 'GET', '/api/products/1');
  assert.match(a.traceId, /^[0-9a-f-]{36}$/);
  assert.notEqual(a.traceId, b.traceId); // dinamiklik kanıtı
});

test('GET /api/products/{id} → dinamik: zaman damgası mevcut ve geçerli', async (t) => {
  const { body } = await api(t, 'GET', '/api/products/9');
  assert.match(body.requestedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.ok(typeof body.stock === 'number');
});

// ---------- POST ----------

test('POST /api/products → 201, body echo + üretilen id + Location header', async (t) => {
  const { res, body } = await api(t, 'POST', '/api/products', {
    name: 'Yenilenmiş iPhone 15 Pro',
    price: 55999,
  });
  assert.equal(res.status, 201);
  assert.match(res.headers.get('location') ?? '', /\/api\/products\/\d+/);
  assert.equal(body.name, 'Yenilenmiş iPhone 15 Pro'); // dinamik echo
  assert.equal(body.price, 55999);
  assert.equal(body.status, 'created');
  assert.ok(body.id > 0);
});

test('POST → dinamik: her istekte farklı id üretilir', async (t) => {
  const { body: a } = await api(t, 'POST', '/api/products', { name: 'X', price: 1 });
  const { body: b } = await api(t, 'POST', '/api/products', { name: 'X', price: 1 });
  assert.notEqual(a.id, b.id);
});

// ---------- PUT ----------

test('PUT /api/products/{id} → 200, tam güncelleme echo', async (t) => {
  const { res, body } = await api(t, 'PUT', '/api/products/837', {
    name: 'iPhone 13 Güncellendi',
    price: 29999,
  });
  assert.equal(res.status, 200);
  assert.equal(body.id, 837); // path'ten
  assert.equal(body.name, 'iPhone 13 Güncellendi'); // body'den
  assert.equal(body.price, 29999);
  assert.equal(body.status, 'updated');
});

// ---------- PATCH ----------

test('PATCH /api/products/{id} → 200, kısmi alan echo', async (t) => {
  const { res, body } = await api(t, 'PATCH', '/api/products/109', { price: 11499 });
  assert.equal(res.status, 200);
  assert.equal(body.id, 109);
  assert.deepEqual(body.patched, { price: 11499 });
  assert.equal(body.status, 'patched');
});

// ---------- DELETE ----------

test('DELETE /api/products/{id} → 204 No Content', async (t) => {
  const { res, body } = await api(t, 'DELETE', '/api/products/837');
  assert.equal(res.status, 204);
  assert.equal(body, null);
});

// ---------- Bad case'ler ----------

test('BAD: GET olmayan endpoint → 404 + hata gövdesi', async (t) => {
  const { res, body } = await api(t, 'GET', '/api/olmayan');
  assert.equal(res.status, 404);
  assert.equal(body.error, 'Not Found');
});

test('BAD: POST name alanı olmadan → 400 doğrulama hatası', async (t) => {
  const { res, body } = await api(t, 'POST', '/api/products', { price: 10 });
  assert.equal(res.status, 400);
  assert.match(body.message, /name alanı zorunludur/);
});

test('BAD: tanımsız path → WireMock 404 döner', async (t) => {
  const { res } = await api(t, 'GET', '/api/hic/yok/boyle/bir/sey');
  assert.equal(res.status, 404);
});
