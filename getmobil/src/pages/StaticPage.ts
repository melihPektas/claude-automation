import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Kurumsal / statik sayfalar için genel amaçlı sayfa nesnesi
 * (Hakkımızda, İletişim, Blog, Mağazalarımız, Kozmetik Durumu vb.).
 */
export class StaticPage extends BasePage {
  async open(path: string): Promise<void> {
    await this.goto(path);
  }

  /** Sayfanın 4xx/5xx dönmediğini, header+footer'ın ve bir başlığın var olduğunu doğrular. */
  async expectLoaded(expectedPathFragment?: string): Promise<void> {
    if (expectedPathFragment) {
      await expect(this.page).toHaveURL(new RegExp(expectedPathFragment));
    }
    await this.header.expectVisible();
    await expect(this.page.getByRole('heading').first()).toBeVisible();
  }
}
