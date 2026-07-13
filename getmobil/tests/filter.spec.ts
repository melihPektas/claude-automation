import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';
import { filterGroups } from '../src/data/testData';

/**
 * Sol filtre paneli + sayfalama (?pageNumber) doğruluğu.
 * Örnek: /satin-al/cep-telefonu/iphone-ios-telefonlar/apple/?pageNumber=2
 */
test.describe('Filtreleme ve Sayfalama', () => {
  test('sol filtre paneli beklenen grupları içeriyor', async ({ category }) => {
    await category.open(paths.apple);
    await expect(category.filterPanel).toBeVisible();
    for (const group of filterGroups) {
      await expect(category.filterGroup(group)).toBeVisible();
    }
  });

  test('?pageNumber=2 ikinci sayfayı yüklüyor', async ({ category, page }) => {
    await category.open(paths.apple + '?pageNumber=2');
    await expect(page).toHaveTitle(/Sayfa 2/i);
    await expect(page).toHaveURL(/pageNumber=2/);
    expect(await category.productCount()).toBeGreaterThan(0);
  });

  test('depolama filtresi sonuç sayısını azaltıyor (filtre doğruluğu)', async ({ category }) => {
    await category.open(paths.apple);
    await expect(category.resultCounter).toBeVisible();
    const before = await category.resultCount();
    expect(before).toBeGreaterThan(0);

    await category.openFilter('Depolama');
    await category.selectFilterOption('256 GB');

    // Filtre uygulanınca sonuç sayısı azalmalı (yalnızca 256 GB modeller)
    await expect
      .poll(() => category.resultCount(), { timeout: 15_000 })
      .toBeLessThan(before);
  });

  test('filtre uygulanınca ürün kartları yeniden listeleniyor', async ({ category }) => {
    await category.open(paths.apple);
    await category.openFilter('Depolama');
    await category.selectFilterOption('128 GB');
    // Filtreden sonra hâlâ tutarlı bir liste görünmeli
    await expect(category.heading).toBeVisible();
    expect(await category.productCount()).toBeGreaterThan(0);
  });

  test('birden çok sayfada gezinme URL üzerinden çalışıyor', async ({ category, page }) => {
    await category.open(paths.apple + '?pageNumber=1');
    await expect(category.heading).toBeVisible();
    await category.open(paths.apple + '?pageNumber=2');
    await expect(page).toHaveURL(/pageNumber=2/);
    await expect(category.productCards.first()).toBeVisible();
  });
});
