import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';

/**
 * Katalog kapsamı — kategori ve marka sayfalarının yüklenmesi (pozitif, data-driven).
 */
const categories = [
  { name: 'Yenilenmiş Telefon', path: paths.phones },
  { name: 'Akıllı Saat', path: paths.watches },
  { name: 'Bilgisayar / Tablet', path: paths.computers },
  { name: 'Aksesuar', path: paths.accessories },
  { name: 'Fırsat Serisi', path: paths.dealSeries },
];

const brands = [
  { name: 'Apple', path: paths.apple },
  { name: 'Samsung', path: paths.samsung },
  { name: 'Xiaomi', path: paths.xiaomi },
];

test.describe('Katalog — Kategoriler', () => {
  for (const c of categories) {
    test(`${c.name} kategorisi başlıkla yükleniyor`, async ({ category }) => {
      await category.open(c.path);
      await expect(category.heading).toBeVisible();
    });
  }
});

test.describe('Katalog — Markalar', () => {
  for (const b of brands) {
    test(`${b.name} marka sayfası ürün listeliyor`, async ({ category, page }) => {
      await category.open(b.path);
      await expect(category.heading).toBeVisible();
      expect(await category.productCount()).toBeGreaterThan(0);
    });
  }
});

test.describe('Katalog — Sonuç sayacı', () => {
  test('telefon listesinde sonuç sayacı görünüyor', async ({ category }) => {
    await category.open(paths.phones);
    await expect(category.resultCounter).toBeVisible();
  });
});
