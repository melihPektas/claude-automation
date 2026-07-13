import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Sayfa altbilgisi: kurumsal linkler, kategoriler, markalar, iletişim.
 */
export class Footer {
  readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('footer');
  }

  link(name: string | RegExp): Locator {
    return this.root.getByRole('link', { name }).first();
  }

  async expectVisible(): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
    await expect(this.root).toBeVisible();
  }

  /** Altbilgideki en az beklenen sayıda linkin var olduğunu doğrular. */
  async linkCount(): Promise<number> {
    return this.root.getByRole('link').count();
  }

  async hasCopyright(): Promise<boolean> {
    return this.root.getByText(/Getmobil/i).first().isVisible();
  }
}
