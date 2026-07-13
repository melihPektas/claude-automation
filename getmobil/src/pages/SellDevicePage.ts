import { type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { paths } from '../data/urls';

/**
 * "Cihaz Sat" akışı (/sat/telefon/). Kullanıcı cihazını satmak için
 * marka/model seçimiyle fiyat teklifi alır.
 */
export class SellDevicePage extends BasePage {
  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 }).first();
  }

  get brandOptions(): Locator {
    return this.page
      .getByRole('link', { name: /Apple|Samsung|Xiaomi|Huawei|Oppo/i })
      .or(this.page.getByRole('button', { name: /Apple|Samsung|Xiaomi/i }));
  }

  async open(): Promise<void> {
    await this.goto(paths.sellPhone);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sat\//);
    await this.header.expectVisible();
    await expect(this.brandOptions.first()).toBeVisible();
  }
}
