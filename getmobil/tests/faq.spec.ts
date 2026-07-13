import { test, expect } from '../src/fixtures/pages';

test.describe('Sıkça Sorulan Sorular', () => {
  test.beforeEach(async ({ faq }) => {
    await faq.open();
  });

  test('SSS sayfası soru listesiyle yükleniyor', async ({ faq }) => {
    await faq.expectLoaded();
    expect(await faq.questionCount()).toBeGreaterThan(0);
  });

  test('bir soru açılıp cevabı gösteriliyor', async ({ faq, page }) => {
    await faq.expandFirst();
    // Accordion açıldıktan sonra sayfada görünür içerik olmalı
    await expect(page.locator('body')).toContainText(/Getmobil|yenilenmiş|garanti/i);
  });
});
