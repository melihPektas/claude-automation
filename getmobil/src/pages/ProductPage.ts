import { type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Ürün detay sayfası (PDP).
 * İçerir: başlık, fiyat, kozmetik durum seçenekleri (Mükemmel/Çok İyi/Outlet),
 * "Sepete Ekle", takas (GetmobilTakas), teknik özellik bölümleri.
 * "Sepete Ekle" sonrası "Ürün sepete eklendi" onay modalı açılır.
 */
export class ProductPage extends BasePage {
  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get price(): Locator {
    return this.page.getByText(/₺\s?\d/).first();
  }

  get addToCartButton(): Locator {
    return this.page.getByRole('button', { name: 'Sepete Ekle', exact: true }).first();
  }

  /** Kozmetik durum seçenekleri (Mükemmel/Çok İyi/İyi/Outlet) — stabil testid'ler. */
  get cosmeticOptions(): Locator {
    return this.page.locator('[data-testid^="product-detail__condition-option-"]');
  }

  get specSections(): Locator {
    return this.page.getByText(/EKRAN|BATARYA|KAMERA/).first();
  }

  get confirmationDialog(): Locator {
    return this.page.getByText('Ürün sepete eklendi', { exact: false });
  }

  get goToCartButton(): Locator {
    return this.page.getByRole('button', { name: /Sepete Git/i }).or(
      this.page.getByRole('link', { name: /Sepete Git/i }),
    );
  }

  async open(path: string): Promise<void> {
    await this.goto(path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.price).toBeVisible();
    await expect(this.addToCartButton).toBeVisible();
  }

  async productTitle(): Promise<string> {
    return (await this.heading.textContent())?.trim() ?? '';
  }

  /** Sepete ekler ve onay modalının göründüğünü doğrular. */
  async addToCart(): Promise<void> {
    await this.addToCartButton.scrollIntoViewIfNeeded();
    await this.addToCartButton.click();
    await expect(this.confirmationDialog).toBeVisible();
  }

  /** Ekleme sonrası açılan onay modalındaki "Sepete Git" ile sepete geçer. */
  async goToCartFromConfirmation(): Promise<void> {
    await this.goToCartButton.first().click();
    await this.page.waitForURL(/\/sepetim\//);
  }
}
