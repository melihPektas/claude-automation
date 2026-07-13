import { type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { paths } from '../data/urls';

export class HomePage extends BasePage {
  get popularProducts(): Locator {
    return this.page.getByText('Popüler Ürünler', { exact: false });
  }

  get productCards(): Locator {
    // Ürün detay sayfalarının slug'ında daima "-gb-" (ör. "128-gb-") geçer;
    // bu, kart linklerini kategori/model linklerinden güvenle ayırır.
    return this.page.locator('a[href*="-gb-"]');
  }

  async open(): Promise<void> {
    await this.goto(paths.home);
  }

  async expectLoaded(): Promise<void> {
    await this.header.expectVisible();
    await expect(this.page).toHaveTitle(/Getmobil/i);
  }

  /** Ana sayfadaki ilk görünür ürün kartına tıklayarak ürün detayına gider. */
  async openFirstProduct(): Promise<void> {
    const first = this.productCards.filter({ visible: true }).first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
  }
}
