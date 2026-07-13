import { test, expect } from '../src/fixtures/pages';
import { navItems } from '../src/data/testData';
import { paths } from '../src/data/urls';

test.describe('Header ve Navigasyon', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  for (const item of navItems) {
    test(`"${item.label}" menüsü ${item.path} adresine gidiyor`, async ({ home, page }) => {
      await home.header.navLink(item.label).click();
      await expect(page).toHaveURL(new RegExp(item.path.replace(/\//g, '\\/')));
    });
  }

  test('logo tıklaması ana sayfaya döndürüyor', async ({ home, page }) => {
    await home.goto(paths.phones);
    await home.header.logo.click();
    await expect(page).toHaveURL(/getmobil\.com\/?$/);
  });

  test('"Cihaz Sat" satış sayfasına gidiyor', async ({ home, page }) => {
    await home.header.sellButton.click();
    await expect(page).toHaveURL(/\/sat\//);
  });

  test('sepet ikonu sepet sayfasına gidiyor', async ({ home, page }) => {
    await home.header.goToCart();
    await expect(page).toHaveURL(/\/sepetim\//);
  });
});
