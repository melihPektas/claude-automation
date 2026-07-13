import { test, before } from 'node:test';
import assert from 'node:assert/strict';

/**
 * API testleri — WireMock mock backend'ine karşı tam CRUD doğrulaması.
 * Tüm HTTP metotları kapsanır: GET, POST, PUT, PATCH, DELETE (+ bad case'ler).
 * Mock DİNAMİK yanıt verir (id/body echo, rastgele stok, zaman damgası, UUID)
 * — testler bu dinamikliği de doğrular.
 *
 * WIREMOCK_URL ortam değişkeniyle hedef değiştirilebilir (varsayılan :8089).
 */
const BASE = process.env.WIREMOCK_URL ?? 'http://localhost:8089';

before(async () => {
  const res = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`WireMock ayakta değil: ${BASE} — önce mock sunucuyu başlatın`);
  }
});

// ---------- GET ----------

test('GET /api/health → 200 UP', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'UP');
});

test('GET /api/products → 200, ürün listesi döner', async () => {
  const res = await fetch(`${BASE}/api/products`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  const body = await res.json();
  assert.equal(body.total, 3);
  assert.equal(body.items.length, 3);
  assert.ok(body.items[0].name.includes('iPhone'));
});

test('GET /api/products/{id} → dinamik: id yanıtta echo edilir', async () => {
  const res = await fetch(`${BASE}/api/products/42`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 42);
  assert.equal(body.name, 'Yenilenmiş Ürün #42');
});

test('GET /api/products/{id} → dinamik: her istekte farklı traceId (UUID)', async () => {
  const [a, b] = await Promise.all([
    fetch(`${BASE}/api/products/1`).then((r) => r.json()),
    fetch(`${BASE}/api/products/1`).then((r) => r.json()),
  ]);
  assert.match(a.traceId, /^[0-9a-f-]{36}$/);
  assert.notEqual(a.traceId, b.traceId); // dinamiklik kanıtı
});

test('GET /api/products/{id} → dinamik: zaman damgası mevcut ve geçerli', async () => {
  const body = await fetch(`${BASE}/api/products/9`).then((r) => r.json());
  assert.match(body.requestedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.ok(typeof body.stock === 'number');
});

// ---------- POST ----------

test('POST /api/products → 201, body echo + üretilen id + Location header', async () => {
  const res = await fetch(`${BASE}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Yenilenmiş iPhone 15 Pro', price: 55999 }),
  });
  assert.equal(res.status, 201);
  assert.match(res.headers.get('location') ?? '', /\/api\/products\/\d+/);
  const body = await res.json();
  assert.equal(body.name, 'Yenilenmiş iPhone 15 Pro'); // dinamik echo
  assert.equal(body.price, 55999);
  assert.equal(body.status, 'created');
  assert.ok(body.id > 0);
});

test('POST → dinamik: her istekte farklı id üretilir', async () => {
  const mk = () =>
    fetch(`${BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', price: 1 }),
    }).then((r) => r.json());
  const [a, b] = await Promise.all([mk(), mk()]);
  assert.notEqual(a.id, b.id);
});

// ---------- PUT ----------

test('PUT /api/products/{id} → 200, tam güncelleme echo', async () => {
  const res = await fetch(`${BASE}/api/products/837`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'iPhone 13 Güncellendi', price: 29999 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 837); // path'ten
  assert.equal(body.name, 'iPhone 13 Güncellendi'); // body'den
  assert.equal(body.price, 29999);
  assert.equal(body.status, 'updated');
});

// ---------- PATCH ----------

test('PATCH /api/products/{id} → 200, kısmi alan echo', async () => {
  const res = await fetch(`${BASE}/api/products/109`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: 11499 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 109);
  assert.deepEqual(body.patched, { price: 11499 });
  assert.equal(body.status, 'patched');
});

// ---------- DELETE ----------

test('DELETE /api/products/{id} → 204 No Content', async () => {
  const res = await fetch(`${BASE}/api/products/837`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  const text = await res.text();
  assert.equal(text, '');
});

// ---------- Bad case'ler ----------

test('BAD: GET olmayan endpoint → 404 + hata gövdesi', async () => {
  const res = await fetch(`${BASE}/api/olmayan`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'Not Found');
});

test('BAD: POST name alanı olmadan → 400 doğrulama hatası', async () => {
  const res = await fetch(`${BASE}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: 10 }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.message, /name alanı zorunludur/);
});

test('BAD: tanımsız path → WireMock 404 döner', async () => {
  const res = await fetch(`${BASE}/api/hic/yok/boyle/bir/sey`);
  assert.equal(res.status, 404);
});
