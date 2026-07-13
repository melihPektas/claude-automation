import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';

/**
 * @smoke — En kritik sayfaların ayakta olduğunu hızlıca doğrular.
 * n8n'de "hızlı sağlık kontrolü" için: `npx playwright test --grep @smoke`
 */
test.describe('Smoke @smoke', () => {
  test('ana sayfa yükleniyor', async ({ home }) => {
    await home.open();
    await home.expectLoaded();
  });

  test('kritik sayfalar 200 ile açılıyor', async ({ page, static: staticPage }) => {
    for (const path of [paths.phones, paths.cart, paths.sellPhone, paths.faq]) {
      const res = await staticPage.goto(path);
      expect(res?.status(), `${path} durum kodu`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
