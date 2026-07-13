import { type Page } from '@playwright/test';

/**
 * KVKK / çerez izni popup'ı. Getmobil markalı, sol-alt köşede açılır.
 * Butonlar: "Ayarlar" | "Reddet" | "Kabul Et".
 * Gizliliği koruyan seçim olarak varsayılan "Reddet" (gerekli olmayanları reddet).
 */
export class CookieConsent {
  constructor(private readonly page: Page) {}

  private banner() {
    return this.page.getByText('kişisel verilerinizin güvenliğine', { exact: false });
  }

  /** Banner görünürse kapatır; yoksa sessizce geçer. Testlerin başında güvenle çağrılır. */
  async dismiss(preference: 'reject' | 'accept' = 'reject'): Promise<void> {
    const label = preference === 'reject' ? 'Reddet' : 'Kabul Et';
    const button = this.page.getByRole('button', { name: label, exact: true });
    try {
      await button.waitFor({ state: 'visible', timeout: 4000 });
      await button.click();
      await button.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    } catch {
      // Banner hiç görünmedi (zaten kabul edilmiş / cookie set edilmiş) — sorun değil.
    }
  }

  async isVisible(): Promise<boolean> {
    return this.page
      .getByRole('button', { name: 'Kabul Et', exact: true })
      .isVisible()
      .catch(() => false);
  }
}
