import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';

const staticPages: Array<{ name: string; path: string }> = [
  { name: 'Hakkımızda', path: paths.about },
  { name: 'İletişim', path: paths.contact },
  { name: 'Mağazalarımız', path: paths.stores },
  { name: 'Getmobil Güvenilir Mi', path: paths.trust },
  { name: 'Kozmetik Durumu', path: paths.cosmeticCondition },
  { name: 'Kampanyalar', path: paths.campaigns },
];

test.describe('Altbilgi ve Statik Sayfalar', () => {
  for (const { name, path } of staticPages) {
    test(`${name} sayfası hatasız yükleniyor`, async ({ static: page, page: raw }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${name} durum kodu`).toBeLessThan(400);
      await expect(raw.locator('body')).toBeVisible();
      await page.footer.expectVisible();
    });
  }

  test('altbilgideki sözleşmeler linki çalışıyor', async ({ home, page }) => {
    await home.open();
    const link = home.footer.link(/Sözleşmeler|Ön Bilgilendirme/i);
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/sozlesmeler|bilgilendirme/i);
  });
});
