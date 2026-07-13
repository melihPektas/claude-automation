import { test, expect } from '../src/fixtures/pages';

test.describe('Cihaz Sat Akışı', () => {
  test('satış sayfası marka seçenekleriyle yükleniyor', async ({ sell }) => {
    await sell.open();
    await sell.expectLoaded();
  });

  test('header\'daki "Cihaz Sat" bu akışa yönlendiriyor', async ({ home, page }) => {
    await home.open();
    await home.header.sellButton.click();
    await expect(page).toHaveURL(/\/sat\//);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
