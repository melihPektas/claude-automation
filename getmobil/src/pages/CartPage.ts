import { type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { paths } from '../data/urls';

/**
 * Sepet sayfası (/sepetim/).
 * NOT: Bu sayfa sitenin geri kalanından farklı, sadeleştirilmiş bir yerleşim
 * kullanır (standart header/footer yoktur). Bu yüzden doğrulamalar sepete
 * özgü elemanlara dayanır. Ürün adedi "Sepetim (N Ürün)" metninden okunur.
 */
export class CartPage extends BasePage {
  get heading(): Locator {
    return this.page.getByText(/Sepet/i).first();
  }

  get countText(): Locator {
    return this.page.getByText(/\(\s*\d+\s*Ürün\s*\)/i).first();
  }

  get emptyState(): Locator {
    return this.page.getByText(/sepet.*boş|boş.*sepet/i);
  }

  async open(): Promise<void> {
    await this.goto(paths.cart);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sepetim\//);
    await expect(this.heading).toBeVisible();
  }

  async isEmpty(): Promise<boolean> {
    return (await this.itemCount()) === 0;
  }

  /** "Sepetim (N Ürün)" metnindeki sayıyı döndürür; bulunamazsa 0. */
  async itemCount(): Promise<number> {
    const text = (await this.countText.textContent().catch(() => null)) ?? '';
    const match = text.match(/\(\s*(\d+)\s*Ürün/i);
    return match ? Number(match[1]) : 0;
  }
}
