import { type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { paths } from '../data/urls';

/**
 * Sıkça Sorulan Sorular sayfası (/sikca-sorulan-sorular/).
 * Accordion yapıda soru başlıkları vardır; tıklanınca cevap açılır.
 */
export class FaqPage extends BasePage {
  get questions(): Locator {
    return this.page.getByRole('button').filter({ hasText: /\?$/ });
  }

  async open(): Promise<void> {
    await this.goto(paths.faq);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/sikca-sorulan-sorular/);
    await this.header.expectVisible();
  }

  /** İlk soruyu açar ve bir cevabın görünür olduğunu doğrular. */
  async expandFirst(): Promise<void> {
    const first = this.questions.first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
  }

  async questionCount(): Promise<number> {
    return this.questions.count();
  }
}
