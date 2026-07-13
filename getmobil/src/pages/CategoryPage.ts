import { type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Ürün listeleme / kategori sayfası (ör. /satin-al/cep-telefonu/).
 * İçerir: başlık, filtre grupları (Marka, Model, Fiyat, Depolama, Renk, Satıcı),
 * sıralama, "Cihazları Karşılaştır", ürün kartları.
 */
export class CategoryPage extends BasePage {
  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get productCards(): Locator {
    // Listeleme kartları model/ürün adlarıyla linklenir (ör. "Yenilenmiş Apple iPhone 13").
    // Sadece görünür olanları alarak gizli mega-menü linklerini eleriz.
    return this.page
      .getByRole('link', {
        name: /Yenilenmiş\s+.*(iPhone|Galaxy|Redmi|Note|Nova|Reno|Spark|Poco|Watch|MacBook|iPad|Honor|Oppo|Realme|Huawei|Tecno|Infinix|Vivo|Xiaomi|Samsung|Mi\b)/i,
      })
      .filter({ visible: true });
  }

  get compareButton(): Locator {
    return this.page.getByRole('button', { name: /Cihazları Karşılaştır/i });
  }

  /** Sol taraftaki filtre paneli (Marka, Depolama, Renk … grupları buradadır). */
  get filterPanel(): Locator {
    return this.page.locator('aside').first();
  }

  filterGroup(name: string): Locator {
    return this.filterPanel.getByRole('button', { name, exact: true }).first();
  }

  /** Açık bir filtre grubundaki bir seçeneği (ör. "256 GB", "Beyaz") döndürür. */
  filterOption(label: string): Locator {
    return this.filterPanel.getByText(label, { exact: true }).first();
  }

  async open(path: string): Promise<void> {
    await this.goto(path);
  }

  get resultCounter(): Locator {
    // "348 adet model listeleniyor" gibi sonuç sayacı
    return this.page.getByText(/adet.*listeleniyor/i).first();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.productCards.first()).toBeVisible();
  }

  async productCount(): Promise<number> {
    return this.productCards.count();
  }

  /** Sonuç sayacındaki sayıyı ("36 adet model listeleniyor") okur. */
  async resultCount(): Promise<number> {
    const text = (await this.resultCounter.textContent()) ?? '';
    const m = text.replace(/\./g, '').match(/(\d+)\s*adet/i);
    return m ? Number(m[1]) : 0;
  }

  /** Belirli bir filtre grubunu açar (accordion/panel genişletir). */
  async openFilter(name: string): Promise<void> {
    const group = this.filterGroup(name);
    await group.scrollIntoViewIfNeeded();
    await group.click();
  }

  /** Bir filtre seçeneğini işaretler (grup önceden açılmış olmalı). */
  async selectFilterOption(label: string): Promise<void> {
    const option = this.filterOption(label);
    await option.scrollIntoViewIfNeeded();
    await option.click();
  }

  /** Listedeki ilk ürüne tıklayarak model/detay sayfasına gider. */
  async openFirstProduct(): Promise<void> {
    const first = this.productCards.first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
  }
}
