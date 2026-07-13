import { type Page, type Locator, expect } from '@playwright/test';

/**
 * "Giriş Yap" butonuna tıklanınca açılan telefon/OTP tabanlı giriş modalı.
 * Alanlar: ülke kodu ("Turkey: + 90"), telefon (tel input), "Devam et", kapat.
 * NOT: Gerçek OTP SMS gerektirir; bu yüzden yalnızca modal davranışı ve
 *       istemci-tarafı doğrulama test edilir, tam kimlik doğrulaması değil.
 */
export class LoginModal {
  readonly dialog: Locator;
  readonly phoneInput: Locator;
  readonly countryButton: Locator;
  readonly continueButton: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.phoneInput = this.dialog.locator('input[type="tel"]');
    this.countryButton = this.dialog.getByRole('button', { name: /Turkey|\+ ?90/i });
    this.continueButton = this.dialog.getByRole('button', { name: /Devam et/i });
    this.closeButton = this.dialog.getByRole('button', { name: /Close modal|Kapat/i });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
  }

  async enterPhone(phone: string): Promise<void> {
    await this.phoneInput.fill(phone);
  }

  async submit(): Promise<void> {
    await this.continueButton.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
