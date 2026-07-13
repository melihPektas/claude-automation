import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';

test.describe('Ürün Detay Sayfası', () => {
  test.beforeEach(async ({ product }) => {
    await product.open(paths.sampleProduct);
  });

  test('başlık, fiyat ve "Sepete Ekle" görünüyor', async ({ product }) => {
    await product.expectLoaded();
    expect(await product.productTitle()).toContain('iPhone 13');
  });

  test('kozmetik durum seçenekleri listeleniyor', async ({ product }) => {
    // Mükemmel / Çok İyi / İyi / Outlet seçenekleri görünür olmalı
    await expect(product.cosmeticOptions.first()).toBeVisible();
    expect(await product.cosmeticOptions.count()).toBeGreaterThan(1);
  });

  test('teknik özellik bölümleri mevcut', async ({ product }) => {
    await expect(product.specSections).toBeVisible();
  });

  test('sepete ekleme çalışıyor ve sayaç artıyor', async ({ product }) => {
    const before = await product.header.cartCount();
    await product.addToCart();
    await expect
      .poll(() => product.header.cartCount(), { timeout: 10_000 })
      .toBeGreaterThan(before);
  });
});
