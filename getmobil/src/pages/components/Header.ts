import { type Page, type Locator, expect } from '@playwright/test';
import { LoginModal } from './LoginModal';

/**
 * Tüm sayfalarda ortak üst bar: logo, arama (autocomplete), kategori navigasyonu,
 * "Cihaz Sat", "Giriş Yap" (modal), sepet ikonu (adet rozeti).
 */
export class Header {
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly loginButton: Locator;
  readonly sellButton: Locator;
  readonly cartLink: Locator;
  readonly searchSuggestions: Locator;

  constructor(private readonly page: Page) {
    this.logo = page.getByRole('link', { name: 'GetMobil' }).first();
    // Sayfada birden çok arama input'u olabilir (desktop + mobil); görünür olanı seçilir
    this.searchInput = page.locator('input[type="text"]').filter({ visible: true }).first();
    // "Giriş Yap" birden fazla yerde geçebilir; header'daki ilk buton hedeflenir
    this.loginButton = page.getByRole('button', { name: 'Giriş Yap', exact: true }).first();
    this.sellButton = page.getByRole('link', { name: 'Cihaz Sat' }).first();
    this.cartLink = page.locator('a[href="/sepetim/"]').first();
    this.searchSuggestions = page.getByRole('link', { name: /iphone|samsung|galaxy|apple/i });
  }

  navLink(label: string): Locator {
    // Bazı menü öğelerinde "YENİ" rozeti erişilebilir ada ekleniyor
    // (ör. "Fırsat SerisiYENİ") — bu yüzden alt-dize eşleşmesi kullanılır.
    return this.page.getByRole('link', { name: label, exact: false }).first();
  }

  async openLogin(): Promise<LoginModal> {
    await this.loginButton.click();
    const modal = new LoginModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /** Aramaya metin yazar ve autocomplete önerilerinin gelmesini bekler. */
  async search(term: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill('');
    await this.searchInput.type(term, { delay: 60 });
  }

  /** Autocomplete listesindeki ilk ürün önerisine tıklar ve yönlendirmeyi bekler. */
  async selectFirstSuggestion(term: string): Promise<void> {
    const suggestion = this.page
      .getByRole('link', { name: new RegExp(term.split(' ')[0], 'i') })
      .first();
    await suggestion.waitFor({ state: 'visible' });
    await Promise.all([this.page.waitForURL(/getmobil\.com\//), suggestion.click()]);
  }

  /** Sepetteki ürün adedini rozet aria-label'ından okur. */
  async cartCount(): Promise<number> {
    const label = (await this.cartLink.getAttribute('aria-label')) ?? '';
    const match = label.match(/(\d+)\s*ürün/);
    return match ? Number(match[1]) : 0;
  }

  async goToCart(): Promise<void> {
    await this.cartLink.click();
    await this.page.waitForURL(/\/sepetim\//);
  }

  async expectVisible(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.cartLink).toBeVisible();
  }
}
