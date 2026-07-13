import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pact from '@pact-foundation/pact';

const { PactV3, MatchersV3 } = pact;
const { like, integer, string, eachLike, regex } = MatchersV3;

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * PACT CONSUMER testi — "getmobil-dashboard" tüketicisinin "getmobil-api"
 * sağlayıcısından beklediği kontratı tanımlar ve pacts/*.json dosyasını üretir.
 * Ardından verify.mjs bu kontratı GERÇEK mock sağlayıcıya (WireMock) karşı doğrular.
 */
function makePact() {
  return new PactV3({
    consumer: 'getmobil-dashboard',
    provider: 'getmobil-api',
    dir: resolve(here, 'pacts'),
  });
}

test('kontrat: GET /api/products ürün listesi döner', async () => {
  const provider = makePact();
  provider
    .uponReceiving('ürün listesi isteği')
    .withRequest({ method: 'GET', path: '/api/products' })
    .willRespondWith({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        total: integer(3),
        items: eachLike({
          id: integer(837),
          name: string('Apple iPhone 13 128 GB Yıldız Işığı'),
          price: integer(31599),
        }),
      },
    });

  await provider.executeTest(async (mock) => {
    const res = await fetch(`${mock.url}/api/products`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.total >= 1);
    assert.ok(body.items[0].name.length > 0);
  });
});

test('kontrat: GET /api/products/{id} ürün detayı döner', async () => {
  const provider = makePact();
  provider
    .uponReceiving('ürün detay isteği')
    .withRequest({ method: 'GET', path: '/api/products/837' })
    .willRespondWith({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        id: integer(837),
        name: string('Yenilenmiş Ürün #837'),
        stock: integer(10),
        traceId: regex(/[0-9a-f-]{36}/, '8d3fb2ab-0210-41a3-a324-6c9eb972d387'),
      },
    });

  await provider.executeTest(async (mock) => {
    const res = await fetch(`${mock.url}/api/products/837`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.id, 'number');
    assert.equal(typeof body.stock, 'number');
  });
});

test('kontrat: POST /api/products ürün oluşturur (201)', async () => {
  const provider = makePact();
  provider
    .uponReceiving('ürün oluşturma isteği')
    .withRequest({
      method: 'POST',
      path: '/api/products',
      headers: { 'Content-Type': 'application/json' },
      body: { name: like('Yeni Ürün'), price: like(1000) },
    })
    .willRespondWith({
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: {
        id: integer(4242),
        name: string('Yeni Ürün'),
        price: integer(1000),
        status: string('created'),
      },
    });

  await provider.executeTest(async (mock) => {
    const res = await fetch(`${mock.url}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yeni Ürün', price: 1000 }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'created');
  });
});
