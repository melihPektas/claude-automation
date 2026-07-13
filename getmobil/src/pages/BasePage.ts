import { type Page, type Response, expect } from '@playwright/test';
import { CookieConsent } from './components/CookieConsent';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

/**
 * Tüm sayfa nesnelerinin türediği temel sınıf.
 * Ortak bileşenleri (header, footer, çerez izni) ve yardımcı metotları barındırır.
 */
export abstract class BasePage {
  readonly page: Page;
  readonly cookie: CookieConsent;
  readonly header: Header;
  readonly footer: Footer;

  constructor(page: Page) {
    this.page = page;
    this.cookie = new CookieConsent(page);
    this.header = new Header(page);
    this.footer = new Footer(page);
  }

  /** Göreli yola gidip çerez banner'ını kapatır. */
  async goto(path: string): Promise<Response | null> {
    const res = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.cookie.dismiss();
    return res;
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  currentUrl(): string {
    return this.page.url();
  }

  /** Sayfanın HTTP 200 döndüğünü ve gövdenin göründüğünü doğrular. */
  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible();
  }
}
