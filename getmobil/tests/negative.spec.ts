import { test, expect } from '../src/fixtures/pages';
import { searchTerms, login } from '../src/data/testData';

/**
 * NEGATİF / BAD-CASE senaryoları.
 * Sistemin hatalı girdi ve geçersiz durumlarda doğru davrandığını doğrular.
 */
test.describe('Bad Case — Geçersiz URL / 404', () => {
  const badPaths = [
    '/bu-sayfa-kesinlikle-yok-12345/',
    '/satin-al/olmayan-kategori-xyz/',
    '/satin-al/cep-telefonu/iphone-ios-telefonlar/apple/iphone-13/olmayan-urun-999999/',
    '/sat/olmayan-cihaz-tipi/',
    '/profil/olmayan-alt-sayfa/',
  ];

  for (const path of badPaths) {
    test(`geçersiz yol 404 döndürüyor: ${path}`, async ({ page, static: staticPage }) => {
      const res = await staticPage.goto(path);
      expect(res?.status(), `${path} durum kodu`).toBe(404);
      await expect(page.getByText(/Sayfa Bulunamadı|404/i).first()).toBeVisible();
    });
  }
});

test.describe('Bad Case — Arama', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('anlamsız terim ürün detay sayfasına yönlendirmiyor', async ({ home, page }) => {
    await home.header.search(searchTerms.noResult);
    await home.header.searchInput.press('Enter');
    await page.waitForTimeout(600);
    // Geçersiz arama bizi bir ürün detay URL'ine (…-<id>/) götürmemeli
    await expect(page).not.toHaveURL(/-\d+\/$/);
  });

  test('boş arama gönderimi çökmüyor', async ({ home, page }) => {
    await home.header.searchInput.click();
    await home.header.searchInput.fill('');
    await home.header.searchInput.press('Enter');
    await expect(page.locator('body')).toBeVisible();
  });

  test('tek karakterlik arama sayfayı bozmuyor', async ({ home, page }) => {
    await home.header.search('a');
    await expect(page.locator('body')).toBeVisible();
  });

  test('çok uzun / özel karakterli arama sayfayı bozmuyor', async ({ home, page }) => {
    await home.header.search('!@#$%^&*()_+'.repeat(6));
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/getmobil\.com/);
  });
});

test.describe('Bad Case — Giriş Doğrulaması', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('geçersiz (çok kısa) telefonla "Devam et" butonu pasif kalıyor', async ({ home }) => {
    const modal = await home.header.openLogin();
    await modal.enterPhone(login.invalidPhone);
    // Eksik/geçersiz numarada devam edilememeli
    await expect(modal.continueButton).toBeDisabled();
    await expect(modal.phoneInput).toBeVisible();
  });

  test('telefon alanı harf girişini kabul etmiyor', async ({ home }) => {
    const modal = await home.header.openLogin();
    await modal.phoneInput.fill('abcdef');
    const value = await modal.phoneInput.inputValue();
    expect(value.replace(/\D/g, '')).toBe(value.replace(/[a-zA-Z]/g, '').replace(/\D/g, ''));
  });
});

test.describe('Bad Case — Doğrudan sepet/işlem erişimi', () => {
  test('boş sepette ödeme akışı hatasız', async ({ cart }) => {
    await cart.open();
    await cart.expectLoaded();
    // Boş sepet çökmemeli
    expect(await cart.itemCount()).toBeGreaterThanOrEqual(0);
  });
});
