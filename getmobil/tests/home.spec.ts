import { test, expect } from '../src/fixtures/pages';

test.describe('Ana Sayfa', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('başlık ve header bileşenleri görünüyor', async ({ home }) => {
    await home.expectLoaded();
    await expect(home.page).toHaveTitle(/Getmobil/i);
  });

  test('popüler ürünler bölümü ve ürün kartları listeleniyor', async ({ home }) => {
    await expect(home.popularProducts).toBeVisible();
    expect(await home.productCards.count()).toBeGreaterThan(0);
  });

  test('çerez izni banner\'ı kapatılabiliyor', async ({ home, page }) => {
    // beforeEach içinde goto çerezi zaten kapatıyor; tekrar açılmadığını doğrula
    await page.reload();
    await home.cookie.dismiss();
    expect(await home.cookie.isVisible()).toBeFalsy();
  });

  test('altbilgi görünüyor ve telif metni içeriyor', async ({ home }) => {
    await home.footer.expectVisible();
    expect(await home.footer.hasCopyright()).toBeTruthy();
    expect(await home.footer.linkCount()).toBeGreaterThan(10);
  });

  test('ilk ürün karta tıklayınca ürün detayına gidiyor', async ({ home, page }) => {
    await home.openFirstProduct();
    await expect(page).toHaveURL(/\/satin-al\/.+-\d+\/?$/);
  });
});
