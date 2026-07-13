import { test, expect } from '../src/fixtures/pages';
import { login } from '../src/data/testData';

/**
 * Giriş telefon/OTP tabanlıdır — gerçek SMS gerektirdiği için tam kimlik
 * doğrulaması otomatize EDİLMEZ. Modal davranışı ve alanlar doğrulanır.
 */
test.describe('Giriş Modalı', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('"Giriş Yap" modalı telefon alanıyla açılıyor', async ({ home }) => {
    const modal = await home.header.openLogin();
    await modal.expectOpen();
    await expect(modal.countryButton).toBeVisible();
    await expect(modal.continueButton).toBeVisible();
  });

  test('geçerli telefon numarası girilebiliyor', async ({ home }) => {
    const modal = await home.header.openLogin();
    await modal.enterPhone(login.validPhone);
    await expect(modal.phoneInput).toHaveValue(/\d/);
  });

  test('modal kapatılabiliyor', async ({ home }) => {
    const modal = await home.header.openLogin();
    await modal.close();
    await expect(modal.dialog).toBeHidden();
  });
});
