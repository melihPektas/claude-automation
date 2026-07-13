import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';
import { filterGroups } from '../src/data/testData';

test.describe('Kategori / Listeleme Sayfası', () => {
  test('telefon listeleme sayfası ürünlerle yükleniyor', async ({ category }) => {
    await category.open(paths.phones);
    await category.expectLoaded();
    expect(await category.productCount()).toBeGreaterThan(0);
  });

  test('beklenen filtre grupları görünüyor', async ({ category, page }) => {
    await category.open(paths.phones);
    for (const group of filterGroups) {
      await expect(
        page.getByRole('button', { name: group, exact: true }).first(),
      ).toBeVisible();
    }
  });

  test('bir filtre grubu açılıp genişletilebiliyor', async ({ category }) => {
    await category.open(paths.phones);
    await category.openFilter('Marka');
    // Panel açıldıktan sonra sayfa hâlâ tutarlı olmalı
    await expect(category.heading).toBeVisible();
  });

  test('Apple marka kırılımı doğru sayfayı açıyor', async ({ category, page }) => {
    await category.open(paths.apple);
    await expect(page).toHaveURL(/apple\//);
    expect(await category.productCount()).toBeGreaterThan(0);
  });

  test('listeden ürüne tıklayınca detay/model sayfası açılıyor', async ({ category, page }) => {
    await category.open(paths.phones);
    await category.openFirstProduct();
    await expect(page).toHaveURL(/\/satin-al\//);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('bilgisayar/tablet ve aksesuar kategorileri de yükleniyor', async ({ category }) => {
    await category.open(paths.computers);
    await expect(category.heading).toBeVisible();

    await category.open(paths.accessories);
    await expect(category.heading).toBeVisible();
  });
});
